from django.db import transaction

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .embedding import EmbeddingService
from .models import Document, DocumentChunk
from .serializers import DocumentSerializer
from .services import chunk_text, extract_document_text


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        document = serializer.save()

        document.status = Document.Status.PROCESSING
        document.error_message = ""
        document.save(
            update_fields=[
                "status",
                "error_message",
                "updated_at",
            ]
        )

        try:
            extracted_text = extract_document_text(document)

            if not extracted_text:
                raise ValueError(
                    "No text could be extracted from the document."
                )

            chunks = chunk_text(extracted_text)

            if not chunks:
                raise ValueError(
                    "No chunks could be created from the document."
                )

            embedding_service = EmbeddingService()
            embeddings = embedding_service.generate_embeddings(chunks)

            if len(embeddings) != len(chunks):
                raise ValueError(
                    "Number of embeddings does not match number of chunks."
                )

            with transaction.atomic():
                document.extracted_text = extracted_text

                DocumentChunk.objects.filter(
                    document=document
                ).delete()

                document_chunks = [
                    DocumentChunk(
                        document=document,
                        content=chunk,
                        chunk_index=index,
                        embedding=embedding,
                    )
                    for index, (chunk, embedding) in enumerate(
                        zip(chunks, embeddings)
                    )
                ]

                DocumentChunk.objects.bulk_create(document_chunks)

                document.status = Document.Status.READY
                document.error_message = ""

                document.save(
                    update_fields=[
                        "extracted_text",
                        "status",
                        "error_message",
                        "updated_at",
                    ]
                )

        except Exception as exc:
            document.status = Document.Status.FAILED
            document.error_message = str(exc)

            document.save(
                update_fields=[
                    "status",
                    "error_message",
                    "updated_at",
                ]
            )


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.file.delete(save=False)
        instance.delete()