from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    extracted_text: str = Field(default="", description="Extracted text from uploaded file")


class EvaluationRequest(BaseModel):
    question: str
    model_answer: str
    student_answer: str


class EvaluationResponse(BaseModel):
    score: int = Field(ge=0, le=10)
    mistakes: list[str]
    feedback: str
    suggestions: list[str]


class AnalyticsRequest(BaseModel):
    mistakes: list[str]


class AnalyticsResponse(BaseModel):
    weak_topics: list[dict[str, Any]]
