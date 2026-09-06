from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.email


class Workspace(models.Model):
    name = models.CharField(
        max_length=100,
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owned_workspaces",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="members",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )

    joined_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["joined_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"],
                name="unique_workspace_member",
            )
        ]

    def __str__(self):
        return (
            f"{self.user.email} - "
            f"{self.workspace.name} - "
            f"{self.role}"
        )