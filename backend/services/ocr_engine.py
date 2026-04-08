from __future__ import annotations

import io
import os
from pathlib import Path

from PIL import Image, UnidentifiedImageError


def extract_text_from_image_bytes(file_bytes: bytes) -> str:
    if not file_bytes:
        raise ValueError("Image content is empty")

    try:
        import pytesseract
    except ModuleNotFoundError as exc:
        raise ValueError(
            "pytesseract is not installed in the current Python environment. "
            "Install it with: pip install pytesseract"
        ) from exc

    tesseract_cmd = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    if Path(tesseract_cmd).exists():
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    try:
        image = Image.open(io.BytesIO(file_bytes))
    except UnidentifiedImageError as exc:
        raise ValueError("Invalid image format") from exc

    try:
        text = pytesseract.image_to_string(image).strip()
    except pytesseract.pytesseract.TesseractNotFoundError as exc:
        raise ValueError(
            "Tesseract OCR executable was not found. Install Tesseract and set "
            "TESSERACT_CMD (for example: C:\\Program Files\\Tesseract-OCR\\tesseract.exe)."
        ) from exc

    if not text:
        raise ValueError("No readable text found in image")

    return text
