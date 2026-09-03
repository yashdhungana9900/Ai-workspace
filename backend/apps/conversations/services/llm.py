from django.conf import settings
from openai import OpenAI


class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY
        )

    def stream_response(self, messages):
        if not messages:
            raise ValueError("Messages cannot be empty.")

        stream = self.client.responses.create(
            model="gpt-4o-mini",
            input=messages,
            stream=True,
        )

        for event in stream:
            if event.type == "response.output_text.delta":
                yield event.delta