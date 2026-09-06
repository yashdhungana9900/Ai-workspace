import json

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.documents.rag import RAGService
from apps.users.models import Workspace, WorkspaceMember

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
)
from .services.llm import LLMService


class ConversationListCreateView(
    generics.ListCreateAPIView
):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.request.query_params.get(
            "workspace_id"
        )

        if not workspace_id:
            return Conversation.objects.none()

        return Conversation.objects.filter(
            workspace_id=workspace_id,
            workspace__members__user=self.request.user,
        ).distinct()

    def perform_create(self, serializer):
        workspace_id = self.request.data.get(
            "workspace_id"
        )

        if not workspace_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {
                    "workspace_id": (
                        "Workspace ID is required."
                    )
                }
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
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "You are not a member of this workspace."
            )

        serializer.save(
            user=self.request.user,
            workspace=workspace,
        )


class ConversationDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            workspace__members__user=self.request.user,
        ).distinct()


class MessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_conversation(
        self,
        conversation_id,
        user,
    ):
        return get_object_or_404(
            Conversation,
            id=conversation_id,
            workspace__members__user=user,
        )

    def get(
        self,
        request,
        conversation_id,
    ):
        conversation = self.get_conversation(
            conversation_id,
            request.user,
        )

        messages = conversation.messages.all()

        serializer = MessageSerializer(
            messages,
            many=True,
        )

        return Response(serializer.data)

    def post(
        self,
        request,
        conversation_id,
    ):
        conversation = self.get_conversation(
            conversation_id,
            request.user,
        )

        content = request.data.get(
            "content",
            "",
        ).strip()

        if not content:
            return Response(
                {
                    "detail": (
                        "Message content cannot be empty."
                    )
                },
                status=400,
            )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=content,
        )

        if conversation.title in [
            "New Chat",
            "New conversation",
        ]:
            title = content[:50].strip()

            if len(content) > 50:
                title += "..."

            conversation.title = title

            conversation.save(
                update_fields=[
                    "title",
                    "updated_at",
                ]
            )

        history = list(
            conversation.messages.values(
                "role",
                "content",
            )
        )

        rag_service = RAGService(
            max_results=3,
            max_distance=0.85,
        )

        try:
            context, results = (
                rag_service.retrieve_context(
                    content,
                    conversation.workspace,
                )
            )
        except Exception:
            context = ""
            results = []

        if context:
            system_message = {
                "role": "system",
                "content": (
                    "You are an AI assistant with "
                    "access to the user's uploaded "
                    "documents.\n\n"
                    "Use the document context below "
                    "when it is relevant to the "
                    "user's question.\n"
                    "If the context does not contain "
                    "enough information, say that the "
                    "uploaded documents do not provide "
                    "enough information. Do not invent "
                    "facts from the documents.\n\n"
                    f"DOCUMENT CONTEXT:\n{context}"
                ),
            }

            llm_messages = [
                system_message,
                *history,
            ]
        else:
            llm_messages = history

        sources = [
            {
                "document": result.document.name,
                "chunk": result.chunk_index,
                "distance": round(
                    float(result.distance),
                    4,
                ),
            }
            for result in results
        ]

        def event_stream():
            full_response = []

            try:
                llm_service = LLMService()

                for chunk in (
                    llm_service.stream_response(
                        llm_messages
                    )
                ):
                    full_response.append(chunk)

                    yield (
                        "data: "
                        + json.dumps(
                            {
                                "type": "token",
                                "content": chunk,
                            }
                        )
                        + "\n\n"
                    )

                assistant_content = (
                    "".join(
                        full_response
                    ).strip()
                )

                if assistant_content:
                    Message.objects.create(
                        conversation=conversation,
                        role=Message.Role.ASSISTANT,
                        content=assistant_content,
                        sources=sources,
                    )

                conversation.save(
                    update_fields=[
                        "updated_at",
                    ]
                )

                if sources:
                    yield (
                        "data: "
                        + json.dumps(
                            {
                                "type": "sources",
                                "sources": sources,
                            }
                        )
                        + "\n\n"
                    )

                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "done",
                        }
                    )
                    + "\n\n"
                )

            except Exception as exc:
                print(
                    "LLM STREAM ERROR:",
                    exc,
                )

                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": (
                                "The AI service is "
                                "currently unavailable. "
                                "Please try again later."
                            ),
                        }
                    )
                    + "\n\n"
                )

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )

        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"

        return response