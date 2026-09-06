from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Workspace, WorkspaceMember
from .permissions import (
    IsWorkspaceAdmin,
    IsWorkspaceMember,
    IsWorkspaceOwner,
)
from .serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
    WorkspaceMemberCreateSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class WorkspaceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workspaces = Workspace.objects.filter(
            members__user=request.user
        ).distinct()

        serializer = WorkspaceSerializer(
            workspaces,
            many=True,
        )

        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        name = str(
            request.data.get("name", "")
        ).strip()

        if not name:
            return Response(
                {"detail": "Workspace name is required."},
                status=400,
            )

        workspace = Workspace.objects.create(
            name=name,
            owner=request.user,
        )

        WorkspaceMember.objects.create(
            workspace=workspace,
            user=request.user,
            role=WorkspaceMember.Role.OWNER,
        )

        serializer = WorkspaceSerializer(workspace)

        return Response(
            serializer.data,
            status=201,
        )


class WorkspaceAccessMixin:
    def initial(self, request, *args, **kwargs):
        self.workspace = Workspace.objects.filter(
            id=kwargs.get("pk")
        ).first()

        if self.workspace is None:
            from django.http import Http404

            raise Http404

        super().initial(
            request,
            *args,
            **kwargs,
        )


class WorkspaceDetailView(
    WorkspaceAccessMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceMember,
    ]

    def get(self, request, pk):
        serializer = WorkspaceSerializer(
            self.workspace
        )

        return Response(serializer.data)

    def patch(self, request, pk):
        if not WorkspaceMember.objects.filter(
            workspace=self.workspace,
            user=request.user,
            role__in=[
                WorkspaceMember.Role.OWNER,
                WorkspaceMember.Role.ADMIN,
            ],
        ).exists():
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to update this workspace."
                    )
                },
                status=403,
            )

        name = str(
            request.data.get("name", "")
        ).strip()

        if not name:
            return Response(
                {"detail": "Workspace name is required."},
                status=400,
            )

        self.workspace.name = name
        self.workspace.save(
            update_fields=[
                "name",
                "updated_at",
            ]
        )

        serializer = WorkspaceSerializer(
            self.workspace
        )

        return Response(serializer.data)

    def delete(self, request, pk):
        if not WorkspaceMember.objects.filter(
            workspace=self.workspace,
            user=request.user,
            role=WorkspaceMember.Role.OWNER,
        ).exists():
            return Response(
                {
                    "detail": (
                        "Only the workspace owner "
                        "can delete it."
                    )
                },
                status=403,
            )

        self.workspace.delete()

        return Response(status=204)


class WorkspaceMemberListCreateView(
    WorkspaceAccessMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceMember,
    ]

    def get_permissions(self):
        if self.request.method == "POST":
            return [
                IsAuthenticated(),
                IsWorkspaceAdmin(),
            ]

        return [
            IsAuthenticated(),
            IsWorkspaceMember(),
        ]

    def get(self, request, pk):
        members = (
            self.workspace.members
            .select_related("user")
            .all()
        )

        serializer = WorkspaceMemberSerializer(
            members,
            many=True,
        )

        return Response(serializer.data)

    def post(self, request, pk):
        serializer = WorkspaceMemberCreateSerializer(
            data=request.data,
            context={
                "workspace": self.workspace,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = User.objects.get(
            email__iexact=serializer.validated_data[
                "email"
            ]
        )

        member = WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=user,
            role=serializer.validated_data["role"],
        )

        response_serializer = WorkspaceMemberSerializer(
            member
        )

        return Response(
            response_serializer.data,
            status=201,
        )


class WorkspaceMemberDetailView(
    WorkspaceAccessMixin,
    APIView,
):
    permission_classes = [
        IsAuthenticated,
        IsWorkspaceAdmin,
    ]

    def get(self, request, pk, user_id):
        member = (
            WorkspaceMember.objects.filter(
                workspace=self.workspace,
                user_id=user_id,
            )
            .select_related("user")
            .first()
        )

        if member is None:
            return Response(
                {
                    "detail": (
                        "Workspace member not found."
                    )
                },
                status=404,
            )

        serializer = WorkspaceMemberSerializer(
            member
        )

        return Response(serializer.data)

    def patch(self, request, pk, user_id):
        member = (
            WorkspaceMember.objects.filter(
                workspace=self.workspace,
                user_id=user_id,
            )
            .select_related("user")
            .first()
        )

        if member is None:
            return Response(
                {
                    "detail": (
                        "Workspace member not found."
                    )
                },
                status=404,
            )

        if member.role == WorkspaceMember.Role.OWNER:
            return Response(
                {
                    "detail": (
                        "The workspace owner role "
                        "cannot be changed."
                    )
                },
                status=400,
            )

        role = request.data.get("role")

        if role not in [
            WorkspaceMember.Role.ADMIN,
            WorkspaceMember.Role.MEMBER,
        ]:
            return Response(
                {"detail": "Invalid workspace role."},
                status=400,
            )

        member.role = role
        member.save(update_fields=["role"])

        serializer = WorkspaceMemberSerializer(
            member
        )

        return Response(serializer.data)

    def delete(self, request, pk, user_id):
        member = WorkspaceMember.objects.filter(
            workspace=self.workspace,
            user_id=user_id,
        ).first()

        if member is None:
            return Response(
                {
                    "detail": (
                        "Workspace member not found."
                    )
                },
                status=404,
            )

        if member.role == WorkspaceMember.Role.OWNER:
            return Response(
                {
                    "detail": (
                        "The workspace owner "
                        "cannot be removed."
                    )
                },
                status=400,
            )

        member.delete()

        return Response(status=204)