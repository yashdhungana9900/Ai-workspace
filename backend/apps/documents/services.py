from pypdf import PdfReader


def extract_document_text(document):
    """
    Extract text from a supported document.

    Currently supports:
    - PDF
    - Plain text
    """

    if document.content_type == "application/pdf":
        return extract_pdf_text(document)

    if document.content_type == "text/plain":
        return extract_text_file(document)

    raise ValueError(
        "Unsupported document type."
    )


def extract_pdf_text(document):
    """
    Extract text from every page of a PDF.
    """

    reader = PdfReader(
        document.file.path
    )

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n\n".join(
        pages
    ).strip()


def extract_text_file(document):
    """
    Extract text from a plain text file.
    """

    with document.file.open(
        "rb"
    ) as file:
        content = file.read()

    return content.decode(
        "utf-8",
        errors="replace",
    ).strip()


def chunk_text(
    text,
    chunk_size=1000,
    overlap=200,
):
    """
    Split text into overlapping chunks.

    Example:

    Chunk 1: characters 0-1000
    Chunk 2: characters 800-1800
    Chunk 3: characters 1600-2600
    """

    if not text:
        return []

    if chunk_size <= 0:
        raise ValueError(
            "chunk_size must be greater than zero."
        )

    if overlap < 0:
        raise ValueError(
            "overlap cannot be negative."
        )

    if overlap >= chunk_size:
        raise ValueError(
            "overlap must be smaller than chunk_size."
        )

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(
            start + chunk_size,
            text_length,
        )

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - overlap

    return chunks