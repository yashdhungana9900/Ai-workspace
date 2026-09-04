from functools import lru_cache

from sentence_transformers import SentenceTransformer


class EmbeddingService:
    MODEL_NAME = "all-MiniLM-L6-v2"

    @staticmethod
    @lru_cache(maxsize=1)
    def _get_model():
        return SentenceTransformer(EmbeddingService.MODEL_NAME)

    def generate_embedding(self, text):
        if not text or not text.strip():
            raise ValueError("Text cannot be empty.")

        embedding = self._get_model().encode(
            text,
            normalize_embeddings=True,
        )

        return embedding.tolist()

    def generate_embeddings(self, texts):
        if not texts:
            raise ValueError("Texts cannot be empty.")

        embeddings = self._get_model().encode(
            texts,
            normalize_embeddings=True,
        )

        return embeddings.tolist()