"""
text_extract.py

Responsibility: PDF (bytes) -> Raw Text

This module ONLY extracts text from a PDF. It does not clean,
analyze, or structure the text in any way. That happens in
text_clean.py and later stages.
"""

import pymupdf


def extract_text(pdf_bytes: bytes) -> str:
    """
    Extract raw text from a PDF file given as bytes.

    Args:
        pdf_bytes: The raw bytes of the uploaded PDF file.
                   (e.g. from `await file.read()` in FastAPI)

    Returns:
        A single string containing the text of every page,
        in page order, separated by newlines.

    Raises:
        ValueError: If the PDF is empty, corrupted, or cannot be opened.
    """
    if not pdf_bytes:
        raise ValueError("No PDF content received (pdf_bytes is empty).")

    try:
        # Open the PDF directly from memory - we never write it to disk.
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as error:
        raise ValueError(f"Could not open PDF file: {error}") from error

    try:
        if doc.page_count == 0:
            raise ValueError("The PDF has no pages.")

        page_texts = []
        for page in doc:
            page_texts.append(page.get_text())

        raw_text = "\n".join(page_texts)

    finally:
        # Always close the document, even if something above failed.
        doc.close()

    return raw_text
