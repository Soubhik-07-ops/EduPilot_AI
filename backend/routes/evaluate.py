from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

try:
    from backend.models.schemas import EvaluationRequest, EvaluationResponse
    from backend.services.ai_engine import evaluate_student_answer
except ModuleNotFoundError:
    from models.schemas import EvaluationRequest, EvaluationResponse
    from services.ai_engine import evaluate_student_answer

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=EvaluationResponse)
def evaluate(payload: EvaluationRequest) -> EvaluationResponse:
    try:
        result = evaluate_student_answer(
            question=payload.question,
            model_answer=payload.model_answer,
            student_answer=payload.student_answer,
        )
        return EvaluationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Evaluation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to evaluate student answer",
        ) from exc
