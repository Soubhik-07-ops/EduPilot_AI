from __future__ import annotations

import logging
from collections import Counter

from fastapi import APIRouter, HTTPException, status

try:
    from backend.models.schemas import AnalyticsRequest, AnalyticsResponse
except ModuleNotFoundError:
    from models.schemas import AnalyticsRequest, AnalyticsResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=AnalyticsResponse)
def analytics(payload: AnalyticsRequest) -> AnalyticsResponse:
    try:
        cleaned_mistakes = [mistake.strip() for mistake in payload.mistakes if mistake.strip()]

        if not cleaned_mistakes:
            return AnalyticsResponse(weak_topics=[])

        counter = Counter(cleaned_mistakes)
        weak_topics = [
            {"topic": topic, "count": count}
            for topic, count in counter.most_common(5)
        ]

        return AnalyticsResponse(weak_topics=weak_topics)

    except Exception as exc:
        logger.exception("Analytics generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate analytics: {exc}",
        ) from exc
