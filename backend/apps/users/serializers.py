from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Workspace, WorkspaceMember

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


class EmailTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        user = User.objects.filter(
            email__iexact=email
        ).first()

        if user is None or not user.check_password(password):
            raise serializers.ValidationError(
                "No active account found with the given credentials."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "User account is disabled."
            )

        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]
        read_only_fields = [
            "id",
            "email",
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]
        read_only_fields = [
            "id",
            "email",
        ]


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "owner",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "updated_at",
        ]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            "id",
            "user",
            "role",
            "joined_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "joined_at",
        ]

class WorkspaceMemberCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            WorkspaceMember.Role.ADMIN,
            WorkspaceMember.Role.MEMBER,
        ]
    )

    def validate_email(self, value):
        value = value.strip().lower()

        if not User.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "User with this email does not exist."
            )

        return value

    def validate(self, attrs):
        workspace = self.context["workspace"]

        user = User.objects.get(
            email__iexact=attrs["email"]
        )

        if WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user,
        ).exists():
            raise serializers.ValidationError(
                "User is already a member of this workspace."
            )

        return attrs