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

    return "\n\n".join(pages).strip()


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
        errors="replace"
    ).strip()