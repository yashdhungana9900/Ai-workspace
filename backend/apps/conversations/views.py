from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from .services.llm import LLMService


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            user=self.request.user
        )


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(
            conversation__user=self.request.user,
            conversation_id=self.kwargs["conversation_id"],
        )

    def create(self, request, *args, **kwargs):
        conversation = get_object_or_404(
            Conversation,
            id=self.kwargs["conversation_id"],
            user=request.user,
        )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.save(
            conversation=conversation,
            role=Message.Role.USER,
        )

        conversation_history = [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in conversation.messages.all()
        ]

        llm_service = LLMService()

        assistant_content = llm_service.generate_response(
            conversation_history
        )

        assistant_message = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=assistant_content,
        )

        conversation.save(
            update_fields=["updated_at"]
        )

        return Response(
            {
                "user_message": MessageSerializer(
                    user_message
                ).data,
                "assistant_message": MessageSerializer(
                    assistant_message
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )