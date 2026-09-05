from rest_framework import serializers

from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation

        fields = [
            "id",
            "title",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message

        fields = [
            "id",
            "conversation",
            "role",
            "content",
            "sources",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "conversation",
            "role",
            "sources",
            "created_at",
        ]

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Message content cannot be empty."
            )

        return value