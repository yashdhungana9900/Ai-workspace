from pgvector.django import CosineDistance

from apps.users.models import Workspace

from .embedding import EmbeddingService
from .models import DocumentChunk


class DocumentSearchService:
    DEFAULT_LIMIT = 5
    DEFAULT_MAX_DISTANCE = 0.85

    def __init__(self):
        self.embedding_service = EmbeddingService()

    def search(
        self,
        query,
        workspace,
        limit=DEFAULT_LIMIT,
        max_distance=DEFAULT_MAX_DISTANCE,
    ):
        if not query or not query.strip():
            raise ValueError("Search query cannot be empty.")

        if limit <= 0:
            raise ValueError("Limit must be greater than zero.")

        if max_distance <= 0:
            raise ValueError("Max distance must be greater than zero.")

        if not isinstance(workspace, Workspace):
            raise ValueError("A valid workspace is required.")

        query_embedding = (
            self.embedding_service.generate_embedding(
                query
            )
        )

        chunks = (
            DocumentChunk.objects
            .filter(
                document__workspace=workspace,
                document__status="ready",
                embedding__isnull=False,
            )
            .annotate(
                distance=CosineDistance(
                    "embedding",
                    query_embedding,
                )
            )
            .filter(distance__lte=max_distance)
            .order_by("distance")[:limit]
        )

        return chunks