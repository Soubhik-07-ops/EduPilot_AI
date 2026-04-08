from __future__ import annotations

import io

import pdfplumber


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    if not file_bytes:
        raise ValueError("PDF content is empty")

    extracted_pages: list[str] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            extracted_pages.append(page_text)

    text = "\n".join(extracted_pages).strip()

    if not text:
        raise ValueError("No readable text found in PDF")

    return text
