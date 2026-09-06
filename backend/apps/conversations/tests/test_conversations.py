from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.conversations.models import Conversation, Message


User = get_user_model()


class ConversationTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="TestPassword123!",
        )

        self.conversations_url = "/api/v1/conversations/"

        self.client.force_authenticate(
            user=self.user
        )

    def test_authenticated_user_can_create_conversation(self):
        response = self.client.post(
            self.conversations_url,
            {
                "title": "My Test Conversation",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Conversation.objects.filter(
                user=self.user,
                title="My Test Conversation",
            ).exists()
        )

    def test_authenticated_user_can_list_own_conversations(self):
        Conversation.objects.create(
            user=self.user,
            title="My Conversation",
        )

        Conversation.objects.create(
            user=self.other_user,
            title="Other Conversation",
        )

        response = self.client.get(
            self.conversations_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            1,
        )

        self.assertEqual(
            response.data[0]["title"],
            "My Conversation",
        )

    def test_user_cannot_access_another_users_conversation(self):
        conversation = Conversation.objects.create(
            user=self.other_user,
            title="Private Conversation",
        )

        response = self.client.get(
            f"{self.conversations_url}{conversation.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_user_can_rename_own_conversation(self):
        conversation = Conversation.objects.create(
            user=self.user,
            title="Old Title",
        )

        response = self.client.patch(
            f"{self.conversations_url}{conversation.id}/",
            {
                "title": "New Title",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        conversation.refresh_from_db()

        self.assertEqual(
            conversation.title,
            "New Title",
        )

    def test_user_can_delete_own_conversation(self):
        conversation = Conversation.objects.create(
            user=self.user,
            title="Delete Me",
        )

        response = self.client.delete(
            f"{self.conversations_url}{conversation.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertFalse(
            Conversation.objects.filter(
                id=conversation.id
            ).exists()
        )

    def test_unauthenticated_user_cannot_access_conversations(self):
        self.client.force_authenticate(
            user=None
        )

        response = self.client.get(
            self.conversations_url
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_user_can_list_messages(self):
        conversation = Conversation.objects.create(
            user=self.user,
            title="Message Test",
        )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content="Hello",
        )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content="Hi there!",
        )

        response = self.client.get(
            f"{self.conversations_url}"
            f"{conversation.id}/messages/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            2,
        )

        self.assertEqual(
            response.data[0]["content"],
            "Hello",
        )

    def test_user_cannot_access_other_users_messages(self):
        conversation = Conversation.objects.create(
            user=self.other_user,
            title="Private Conversation",
        )

        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content="Private message",
        )

        response = self.client.get(
            f"{self.conversations_url}"
            f"{conversation.id}/messages/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_empty_message_is_rejected(self):
        conversation = Conversation.objects.create(
            user=self.user,
            title="Empty Message Test",
        )

        response = self.client.post(
            f"{self.conversations_url}"
            f"{conversation.id}/messages/",
            {
                "content": "",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            response.data["detail"],
            "Message content cannot be empty.",
        )

    @patch(
        "apps.conversations.views.LLMService.stream_response"
    )
    def test_message_creates_user_message_and_streams_response(
        self,
        mock_stream_response,
    ):
        mock_stream_response.return_value = iter(
            ["Hello", " from", " AI"]
        )

        conversation = Conversation.objects.create(
            user=self.user,
            title="New Chat",
        )

        response = self.client.post(
            f"{self.conversations_url}"
            f"{conversation.id}/messages/",
            {
                "content": "Tell me something",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response["Content-Type"],
            "text/event-stream",
        )

        response_content = b"".join(
            response.streaming_content
        ).decode()

        self.assertIn(
            '"type": "token"',
            response_content,
        )

        self.assertIn(
            "Hello",
            response_content,
        )

        self.assertIn(
            '"type": "done"',
            response_content,
        )

        self.assertTrue(
            Message.objects.filter(
                conversation=conversation,
                role=Message.Role.USER,
                content="Tell me something",
            ).exists()
        )

        self.assertTrue(
            Message.objects.filter(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content="Hello from AI",
            ).exists()
        )

        conversation.refresh_from_db()

        self.assertEqual(
            conversation.title,
            "Tell me something",
        )