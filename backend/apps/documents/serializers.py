from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "name",
            "file",
            "status",
            "file_size",
            "content_type",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "name",
            "status",
            "file_size",
            "content_type",
            "error_message",
            "created_at",
            "updated_at",
        ]

    def validate_file(self, value):
        max_size = 10 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "File size cannot exceed 10 MB."
            )

        allowed_types = {
            "application/pdf",
            "text/plain",
        }

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only PDF and text files are supported."
            )

        return value

    def create(self, validated_data):
        uploaded_file = validated_data["file"]

        return Document.objects.create(
            user=self.context["request"].user,
            name=uploaded_file.name,
            file=uploaded_file,
            file_size=uploaded_file.size,
            content_type=uploaded_file.content_type,
            status=Document.Status.PENDING,
        )