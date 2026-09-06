from rest_framework.permissions import BasePermission

from .models import WorkspaceMember


class IsWorkspaceMember(BasePermission):
    """
    Allows access only to users who are members of the workspace.
    """

    def has_permission(self, request, view):
        workspace = getattr(view, "workspace", None)

        if workspace is None:
            return False

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
        ).exists()


class IsWorkspaceAdmin(BasePermission):
    """
    Allows access to workspace owners and admins.
    """

    def has_permission(self, request, view):
        workspace = getattr(view, "workspace", None)

        if workspace is None:
            return False

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role__in=[
                WorkspaceMember.Role.OWNER,
                WorkspaceMember.Role.ADMIN,
            ],
        ).exists()


class IsWorkspaceOwner(BasePermission):
    """
    Allows access only to the workspace owner.
    """

    def has_permission(self, request, view):
        workspace = getattr(view, "workspace", None)

        if workspace is None:
            return False

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role=WorkspaceMember.Role.OWNER,
        ).exists()