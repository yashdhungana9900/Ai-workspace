from celery import shared_task
from django.db import transaction

from .embedding import EmbeddingService
from .models import Document, DocumentChunk
from .services import chunk_text, extract_document_text


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_document(self, document_id):
    document = Document.objects.get(
        id=document_id
    )

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
        # ---------------------------------------------
        # EXTRACT TEXT
        # ---------------------------------------------

        extracted_text = extract_document_text(
            document
        )

        if not extracted_text:
            raise ValueError(
                "No text could be extracted from the document."
            )

        # ---------------------------------------------
        # CHUNK TEXT
        # ---------------------------------------------

        chunks = chunk_text(
            extracted_text
        )

        if not chunks:
            raise ValueError(
                "No chunks could be created from the document."
            )

        # ---------------------------------------------
        # GENERATE EMBEDDINGS
        # ---------------------------------------------

        embedding_service = EmbeddingService()

        embeddings = (
            embedding_service.generate_embeddings(
                chunks
            )
        )

        if len(embeddings) != len(chunks):
            raise ValueError(
                "Number of embeddings does not match number of chunks."
            )

        # ---------------------------------------------
        # SAVE DOCUMENT + CHUNKS
        # ---------------------------------------------

        with transaction.atomic():

            document.extracted_text = (
                extracted_text
            )

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
                for index, (
                    chunk,
                    embedding,
                ) in enumerate(
                    zip(chunks, embeddings)
                )
            ]

            DocumentChunk.objects.bulk_create(
                document_chunks
            )

            document.status = (
                Document.Status.READY
            )

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

        document.status = (
            Document.Status.FAILED
        )

        document.error_message = str(exc)

        document.save(
            update_fields=[
                "status",
                "error_message",
                "updated_at",
            ]
        )

        raise