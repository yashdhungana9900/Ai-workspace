from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import Workspace, WorkspaceMember


User = get_user_model()


class WorkspaceTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="TestPassword123!",
        )

        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="TestPassword123!",
        )

        self.member = User.objects.create_user(
            username="member",
            email="member@example.com",
            password="TestPassword123!",
        )

        self.outsider = User.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="TestPassword123!",
        )

        self.workspaces_url = "/api/v1/auth/workspaces/"

        self.client.force_authenticate(
            user=self.owner
        )

    def create_workspace(self):
        response = self.client.post(
            self.workspaces_url,
            {"name": "Test Workspace"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        return Workspace.objects.get(
            id=response.data["id"]
        )

    def add_member(self, workspace, user, role):
        return WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role=role,
        )

    def test_owner_can_create_workspace(self):
        response = self.client.post(
            self.workspaces_url,
            {"name": "My Workspace"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        workspace = Workspace.objects.get(
            name="My Workspace"
        )

        self.assertEqual(
            workspace.owner,
            self.owner,
        )

        self.assertTrue(
            WorkspaceMember.objects.filter(
                workspace=workspace,
                user=self.owner,
                role=WorkspaceMember.Role.OWNER,
            ).exists()
        )

    def test_owner_can_list_workspace(self):
        workspace = Workspace.objects.create(
            name="My Workspace",
            owner=self.owner,
        )

        self.add_member(
            workspace,
            self.owner,
            WorkspaceMember.Role.OWNER,
        )

        response = self.client.get(
            self.workspaces_url
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
            "My Workspace",
        )

    def test_user_cannot_see_workspace_they_do_not_belong_to(self):
        workspace = Workspace.objects.create(
            name="Private Workspace",
            owner=self.owner,
        )

        self.add_member(
            workspace,
            self.owner,
            WorkspaceMember.Role.OWNER,
        )

        self.client.force_authenticate(
            user=self.outsider
        )

        response = self.client.get(
            f"{self.workspaces_url}{workspace.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_member_can_access_workspace(self):
        workspace = self.create_workspace()

        self.add_member(
            workspace,
            self.member,
            WorkspaceMember.Role.MEMBER,
        )

        self.client.force_authenticate(
            user=self.member
        )

        response = self.client.get(
            f"{self.workspaces_url}{workspace.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["name"],
            "Test Workspace",
        )

    def test_member_can_list_workspace_members(self):
        workspace = self.create_workspace()

        self.add_member(
            workspace,
            self.member,
            WorkspaceMember.Role.MEMBER,
        )

        self.client.force_authenticate(
            user=self.member
        )

        response = self.client.get(
            f"{self.workspaces_url}{workspace.id}/members/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            2,
        )

    def test_owner_can_add_member(self):
        workspace = self.create_workspace()

        response = self.client.post(
            f"{self.workspaces_url}{workspace.id}/members/",
            {
                "email": self.member.email,
                "role": WorkspaceMember.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            WorkspaceMember.objects.filter(
                workspace=workspace,
                user=self.member,
                role=WorkspaceMember.Role.MEMBER,
            ).exists()
        )

    def test_member_cannot_add_member(self):
        workspace = self.create_workspace()

        self.add_member(
            workspace,
            self.member,
            WorkspaceMember.Role.MEMBER,
        )

        self.client.force_authenticate(
            user=self.member
        )

        response = self.client.post(
            f"{self.workspaces_url}{workspace.id}/members/",
            {
                "email": self.outsider.email,
                "role": WorkspaceMember.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_admin_can_add_member(self):
        workspace = self.create_workspace()

        self.add_member(
            workspace,
            self.admin,
            WorkspaceMember.Role.ADMIN,
        )

        self.client.force_authenticate(
            user=self.admin
        )

        response = self.client.post(
            f"{self.workspaces_url}{workspace.id}/members/",
            {
                "email": self.member.email,
                "role": WorkspaceMember.Role.MEMBER,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_member_cannot_rename_workspace(self):
        workspace = self.create_workspace()

        self.add_member(
            workspace,
            self.member,
            WorkspaceMember.Role.MEMBER,
        )

        self.client.force_authenticate(
            user=self.member
        )

        response = self.client.patch(
            f"{self.workspaces_url}{workspace.id}/",
            {"name": "Hacked Workspace"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_owner_can_delete_workspace(self):
        workspace = self.create_workspace()

        response = self.client.delete(
            f"{self.workspaces_url}{workspace.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Workspace.objects.filter(
                id=workspace.id
            ).exists()
        )

    def test_admin_cannot_delete_workspace(self):
        workspace = self.create_workspace()

        self.add_member(
            workspace,
            self.admin,
            WorkspaceMember.Role.ADMIN,
        )

        self.client.force_authenticate(
            user=self.admin
        )

        response = self.client.delete(
            f"{self.workspaces_url}{workspace.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertTrue(
            Workspace.objects.filter(
                id=workspace.id
            ).exists()
        )