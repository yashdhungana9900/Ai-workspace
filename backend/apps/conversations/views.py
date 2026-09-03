import json

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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

        user_message_data = MessageSerializer(
            user_message
        ).data

        def event_stream():
            yield self._sse_event(
                "start",
                {
                    "user_message": user_message_data,
                },
            )

            assistant_content = ""

            try:
                llm_service = LLMService()

                for delta in llm_service.stream_response(
                    conversation_history
                ):
                    assistant_content += delta

                    yield self._sse_event(
                        "delta",
                        {
                            "content": delta,
                        },
                    )

                assistant_message = Message.objects.create(
                    conversation=conversation,
                    role=Message.Role.ASSISTANT,
                    content=assistant_content,
                )

                conversation.save(
                    update_fields=["updated_at"]
                )

                yield self._sse_event(
                    "done",
                    {
                        "assistant_message": MessageSerializer(
                            assistant_message
                        ).data,
                    },
                )

            except Exception:
                yield self._sse_event(
                    "error",
                    {
                        "message": (
                            "The AI service is currently "
                            "unavailable. Please try again later."
                        ),
                    },
                )

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )

        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"

        return response

    @staticmethod
    def _sse_event(event_type, data):
        return (
            f"event: {event_type}\n"
            f"data: {json.dumps(data)}\n\n"
        )