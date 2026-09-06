from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.users.models import Workspace, WorkspaceMember

from .models import Document
from .serializers import DocumentSerializer
from .tasks import process_document


class DocumentListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_workspace(self):
        workspace_id = self.request.query_params.get(
            "workspace_id"
        )

        if not workspace_id:
            workspace_id = self.request.data.get(
                "workspace_id"
            )

        if not workspace_id:
            raise PermissionDenied(
                "Workspace ID is required."
            )

        workspace = get_object_or_404(
            Workspace,
            id=workspace_id,
        )

        is_member = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=self.request.user,
        ).exists()

        if not is_member:
            raise PermissionDenied(
                "You are not a member of this workspace."
            )

        return workspace

    def get_queryset(self):
        workspace_id = self.request.query_params.get(
            "workspace_id"
        )

        if not workspace_id:
            return Document.objects.none()

        return Document.objects.filter(
            workspace_id=workspace_id,
            workspace__members__user=self.request.user,
        ).distinct()

    def perform_create(self, serializer):
        workspace = self.get_workspace()

        document = serializer.save(
            status=Document.Status.PROCESSING,
            error_message="",
            workspace=workspace,
        )

        process_document.delay(
            document.id
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()

        if self.request.method == "POST":
            context["workspace"] = self.get_workspace()

        return context


class DocumentDetailView(
    generics.RetrieveDestroyAPIView
):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(
            workspace__members__user=self.request.user,
        ).distinct()

    def perform_destroy(self, instance):
        instance.file.delete(
            save=False
        )

        instance.delete()