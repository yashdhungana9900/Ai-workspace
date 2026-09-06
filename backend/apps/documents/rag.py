from apps.users.models import Workspace

from .search import DocumentSearchService


class RAGService:
    def __init__(
        self,
        max_results=3,
        max_distance=0.85,
    ):
        self.search_service = DocumentSearchService()
        self.max_results = max_results
        self.max_distance = max_distance

    def retrieve_context(
        self,
        query,
        workspace,
    ):
        if not isinstance(workspace, Workspace):
            raise ValueError(
                "A valid workspace is required."
            )

        results = self.search_service.search(
            query=query,
            workspace=workspace,
            limit=self.max_results,
            max_distance=self.max_distance,
        )

        if not results:
            return "", []

        context_parts = []

        for result in results:
            context_parts.append(
                f"[Document: {result.document.name}]\n"
                f"[Chunk: {result.chunk_index}]\n"
                f"{result.content}"
            )

        context = "\n\n---\n\n".join(
            context_parts
        )

        return context, results