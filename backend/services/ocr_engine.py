from __future__ import annotations

import base64
import io
import os
from imghdr import what as detect_image_type
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError

load_dotenv()
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_VISION_MODEL = os.getenv("OPENROUTER_VISION_MODEL", "qwen/qwen2.5-vl-72b-instruct:free")
REQUEST_TIMEOUT_SECONDS = 45


def _detect_mime_type(file_bytes: bytes) -> str:
    image_kind = detect_image_type(None, file_bytes)
    if image_kind == "jpeg":
        return "image/jpeg"
    if image_kind == "png":
        return "image/png"
    if image_kind == "gif":
        return "image/gif"
    if image_kind == "webp":
        return "image/webp"
    if image_kind == "bmp":
        return "image/bmp"
    if image_kind == "tiff":
        return "image/tiff"
    return "image/png"


def _extract_with_openrouter_vision(file_bytes: bytes) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing OPENROUTER_API_KEY for image OCR fallback.")

    mime_type = _detect_mime_type(file_bytes)
    image_b64 = base64.b64encode(file_bytes).decode("utf-8")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": OPENROUTER_VISION_MODEL,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Extract all readable text from this image. "
                            "Return only plain text with line breaks. "
                            "Do not add explanations."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_b64}"},
                    },
                ],
            }
        ],
    }

    response = requests.post(
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]
    text = content.strip() if isinstance(content, str) else ""

    if not text:
        raise ValueError("No readable text found in image.")

    return text


def extract_text_from_image_bytes(file_bytes: bytes) -> str:
    if not file_bytes:
        raise ValueError("Image content is empty")

    try:
        import pytesseract
    except ModuleNotFoundError:
        try:
            return _extract_with_openrouter_vision(file_bytes)
        except Exception as vision_exc:
            raise ValueError(
                "pytesseract is not installed and OpenRouter vision fallback failed. "
                "Install pytesseract or configure OPENROUTER_API_KEY."
            ) from vision_exc

    tesseract_cmd = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    has_tesseract_binary = Path(tesseract_cmd).exists()
    if has_tesseract_binary:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    try:
        image = Image.open(io.BytesIO(file_bytes))
    except UnidentifiedImageError as exc:
        raise ValueError("Invalid image format") from exc

    # Prefer local Tesseract OCR when available.
    try:
        text = pytesseract.image_to_string(image).strip()
    except pytesseract.pytesseract.TesseractNotFoundError:
        try:
            return _extract_with_openrouter_vision(file_bytes)
        except Exception as vision_exc:
            raise ValueError(
                "Tesseract OCR executable was not found, and OpenRouter vision fallback failed. "
                "Install Tesseract and set TESSERACT_CMD, or configure OPENROUTER_API_KEY with a vision model."
            ) from vision_exc
    except Exception:
        # OCR engine exceptions can still happen even with binary present.
        if not has_tesseract_binary:
            try:
                return _extract_with_openrouter_vision(file_bytes)
            except Exception as vision_exc:
                raise ValueError(
                    "Image OCR failed and OpenRouter vision fallback failed. "
                    "Use a PDF/TXT/CSV file, or configure OCR dependencies."
                ) from vision_exc
        raise

    if not text:
        try:
            return _extract_with_openrouter_vision(file_bytes)
        except Exception as vision_exc:
            raise ValueError("No readable text found in image.") from vision_exc

    return text
