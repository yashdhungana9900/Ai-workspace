from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.documents.models import Document
from apps.users.models import Workspace, WorkspaceMember


User = get_user_model()


class DocumentTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="TestPassword123!",
        )

        self.outsider = User.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="TestPassword123!",
        )

        self.workspace = Workspace.objects.create(
            name="Test Workspace",
            owner=self.user,
        )

        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceMember.Role.OWNER,
        )

        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.other_user,
            role=WorkspaceMember.Role.MEMBER,
        )

        self.other_workspace = Workspace.objects.create(
            name="Other Workspace",
            owner=self.outsider,
        )

        WorkspaceMember.objects.create(
            workspace=self.other_workspace,
            user=self.outsider,
            role=WorkspaceMember.Role.OWNER,
        )

        self.documents_url = "/api/v1/documents/"

        self.client.force_authenticate(
            user=self.user
        )

    def create_file(
        self,
        name="test.txt",
        content=b"Hello document",
        content_type="text/plain",
    ):
        return SimpleUploadedFile(
            name,
            content,
            content_type=content_type,
        )

    def create_document(
        self,
        user,
        workspace,
        name="Test Document",
    ):
        return Document.objects.create(
            user=user,
            workspace=workspace,
            name=name,
            file=self.create_file(),
            status=Document.Status.READY,
            file_size=14,
            content_type="text/plain",
            extracted_text="Hello document",
        )

    @patch(
        "apps.documents.views.process_document.delay"
    )
    def test_user_can_upload_document_to_workspace(
        self,
        mock_process_document,
    ):
        uploaded_file = self.create_file()

        response = self.client.post(
            self.documents_url,
            {
                "file": uploaded_file,
                "workspace_id": self.workspace.id,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        document = Document.objects.get(
            id=response.data["id"]
        )

        self.assertEqual(
            document.user,
            self.user,
        )

        self.assertEqual(
            document.workspace,
            self.workspace,
        )

        self.assertEqual(
            document.status,
            Document.Status.PROCESSING,
        )

        mock_process_document.assert_called_once_with(
            document.id
        )

    def test_workspace_member_can_list_documents(self):
        self.create_document(
            self.user,
            self.workspace,
            "Workspace Document",
        )

        response = self.client.get(
            self.documents_url,
            {
                "workspace_id": self.workspace.id,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            1,
        )

        self.assertEqual(
            response.data[0]["name"],
            "Workspace Document",
        )

    def test_workspace_member_can_access_document(self):
        document = self.create_document(
            self.user,
            self.workspace,
            "Shared Document",
        )

        self.client.force_authenticate(
            user=self.other_user
        )

        response = self.client.get(
            f"{self.documents_url}"
            f"{document.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["name"],
            "Shared Document",
        )

    def test_outsider_cannot_access_document(self):
        document = self.create_document(
            self.user,
            self.workspace,
            "Private Document",
        )

        self.client.force_authenticate(
            user=self.outsider
        )

        response = self.client.get(
            f"{self.documents_url}"
            f"{document.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_outsider_cannot_list_workspace_documents(self):
        self.create_document(
            self.user,
            self.workspace,
            "Private Document",
        )

        self.client.force_authenticate(
            user=self.outsider
        )

        response = self.client.get(
            self.documents_url,
            {
                "workspace_id": self.workspace.id,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            0,
        )

    def test_outsider_cannot_upload_to_workspace(
        self,
    ):
        self.client.force_authenticate(
            user=self.outsider
        )

        uploaded_file = self.create_file()

        response = self.client.post(
            self.documents_url,
            {
                "file": uploaded_file,
                "workspace_id": self.workspace.id,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_upload_requires_workspace_id(self):
        uploaded_file = self.create_file()

        response = self.client.post(
            self.documents_url,
            {
                "file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_upload_rejects_file_over_10_mb(self):
        large_file = self.create_file(
            content=b"x" * (10 * 1024 * 1024 + 1)
        )

        response = self.client.post(
            self.documents_url,
            {
                "file": large_file,
                "workspace_id": self.workspace.id,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_upload_rejects_unsupported_file_type(self):
        uploaded_file = self.create_file(
            name="malware.exe",
            content=b"not allowed",
            content_type="application/octet-stream",
        )

        response = self.client.post(
            self.documents_url,
            {
                "file": uploaded_file,
                "workspace_id": self.workspace.id,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_workspace_member_can_delete_document(self):
        document = self.create_document(
            self.user,
            self.workspace,
            "Delete Me",
        )

        response = self.client.delete(
            f"{self.documents_url}"
            f"{document.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Document.objects.filter(
                id=document.id
            ).exists()
        )

    def test_outsider_cannot_delete_document(self):
        document = self.create_document(
            self.user,
            self.workspace,
            "Private Document",
        )

        self.client.force_authenticate(
            user=self.outsider
        )

        response = self.client.delete(
            f"{self.documents_url}"
            f"{document.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertTrue(
            Document.objects.filter(
                id=document.id
            ).exists()
        )