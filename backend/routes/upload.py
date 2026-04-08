from __future__ import annotations

import csv
import io
import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status

try:
    from backend.models.schemas import UploadResponse
    from backend.services.ocr_engine import extract_text_from_image_bytes
    from backend.services.pdf_parser import extract_text_from_pdf_bytes
except ModuleNotFoundError:
    from models.schemas import UploadResponse
    from services.ocr_engine import extract_text_from_image_bytes
    from services.pdf_parser import extract_text_from_pdf_bytes

router = APIRouter()
logger = logging.getLogger(__name__)

_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}


def clean_text(text: str) -> str:
    return " ".join(text.split())


@router.post("", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file name")

    extension = Path(file.filename).suffix.lower()

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        is_image = (file.content_type is not None and file.content_type.startswith("image/")) or extension in _IMAGE_EXTENSIONS

        if extension == ".txt" or file.content_type == "text/plain":
            extracted_text = content.decode("utf-8", errors="replace").strip()
        elif extension == ".csv" or file.content_type in {"text/csv", "application/csv"}:
            text = content.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(text))
            rows = [", ".join(row) for row in reader if any(cell.strip() for cell in row)]
            extracted_text = "\n".join(rows).strip()
        elif file.content_type == "application/pdf" or extension == ".pdf":
            extracted_text = extract_text_from_pdf_bytes(content)
        elif is_image:
            extracted_text = extract_text_from_image_bytes(content)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Upload a PDF, image, TXT, or CSV file.",
            )

        if not extracted_text.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No text could be extracted.")

        extracted_text = clean_text(extracted_text)
        return UploadResponse(extracted_text=extracted_text)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to process uploaded file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {exc}",
        ) from exc
    finally:
        await file.close()
