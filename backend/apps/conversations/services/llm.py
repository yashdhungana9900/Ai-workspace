import json

import requests
from django.conf import settings


class LLMService:
    def __init__(self):
        self.base_url = getattr(
            settings,
            "OLLAMA_BASE_URL",
            "http://127.0.0.1:11434",
        )
        self.model = getattr(
            settings,
            "OLLAMA_MODEL",
            "llama3.2:3b",
        )

    def stream_response(self, messages):
        if not messages:
            raise ValueError("Messages cannot be empty.")

        response = requests.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": messages,
                "stream": True,
            },
            stream=True,
            timeout=120,
        )

        response.raise_for_status()

        for line in response.iter_lines():
            if not line:
                continue

            event = json.loads(line.decode("utf-8"))

            if event.get("done"):
                break

            message = event.get("message", {})
            content = message.get("content", "")

            if content:
                yield content