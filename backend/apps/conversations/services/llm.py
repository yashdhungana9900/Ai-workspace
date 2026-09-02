from django.conf import settings
from openai import OpenAI


class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY
        )

    def generate_response(self, messages):
        if not messages:
            raise ValueError("Messages cannot be empty.")

        try:
            response = self.client.responses.create(
                model="gpt-4o-mini",
                input=messages,
            )

            return response.output_text

        except Exception:
            return (
                "The AI service is currently unavailable. "
                "Please try again later."
            )