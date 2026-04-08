from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, TypedDict

import requests
from dotenv import load_dotenv

# Load environment variables from current working directory and backend/.env.
load_dotenv()
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "arcee-ai/trinity-large-preview:free")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS = 30

logger = logging.getLogger(__name__)


class EvaluationResult(TypedDict):
    score: int
    mistakes: list[str]
    feedback: str
    suggestions: list[str]


FALLBACK_RESULT: EvaluationResult = {
    "score": 5,
    "mistakes": ["AI parsing failed"],
    "feedback": "AI response could not be parsed.",
    "suggestions": ["Retry evaluation"],
}


NETWORK_FALLBACK_RESULT: EvaluationResult = {
    "score": 5,
    "mistakes": ["AI request failed"],
    "feedback": "AI service request failed.",
    "suggestions": [
        "Allow Python/uvicorn in Windows Firewall or antivirus network rules",
        "Disable restrictive proxy/VPN and retry",
        "Confirm openrouter.ai is reachable from this machine",
    ],
}


def _redact_secrets(raw_text: str) -> str:
    redacted = raw_text

    if OPENROUTER_API_KEY:
        redacted = redacted.replace(OPENROUTER_API_KEY, "[REDACTED_API_KEY]")

    # Redact common Authorization bearer patterns and OpenRouter-style keys in any log text.
    redacted = re.sub(r"Bearer\s+[A-Za-z0-9._\-]+", "Bearer [REDACTED_TOKEN]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(r"sk-or-v1-[A-Za-z0-9]+", "sk-or-v1-[REDACTED]", redacted)

    return redacted


def _build_prompt(question: str, model_answer: str, student_answer: str) -> str:
    return f'''You are an expert engineering professor.

Evaluate the student's answer carefully using the following STRICT scoring rubric.

SCORING RULES:

10 -> Perfect match with model answer
8-9 -> Minor wording differences
6-7 -> Partial understanding
4-5 -> Weak understanding
1-3 -> Incorrect concept
0 -> Completely wrong answer

Return ONLY valid JSON.

Do NOT return explanations outside JSON.

Required JSON format:

{{
"score": integer,
"mistakes": list of strings,
"feedback": string,
"suggestions": list of strings
}}

Question:
{question}

Model Answer:
{model_answer}

Student Answer:
{student_answer}

Use the same score for identical inputs.'''


def _request_evaluation(prompt: str) -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("Missing OPENROUTER_API_KEY")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload: dict[str, Any] = {
        "model": OPENROUTER_MODEL,
        "temperature": 0,
        "top_p": 1,
        "messages": [
            {
                "role": "system",
                "content": "You are a strict engineering professor.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    }

    response = requests.post(
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    response_json = response.json()
    return response_json["choices"][0]["message"]["content"]


def _coerce_result(result_json: dict[str, Any]) -> EvaluationResult:
    score = result_json.get("score")
    mistakes = result_json.get("mistakes")
    feedback = result_json.get("feedback")
    suggestions = result_json.get("suggestions")

    if not isinstance(score, int):
        raise ValueError("score must be an integer")
    if not isinstance(mistakes, list) or not all(isinstance(item, str) for item in mistakes):
        raise ValueError("mistakes must be a list of strings")
    if not isinstance(feedback, str):
        raise ValueError("feedback must be a string")
    if not isinstance(suggestions, list) or not all(isinstance(item, str) for item in suggestions):
        raise ValueError("suggestions must be a list of strings")

    return {
        "score": max(0, min(10, score)),
        "mistakes": mistakes,
        "feedback": feedback,
        "suggestions": suggestions,
    }


def _parse_result_text(result_text: str) -> EvaluationResult:
    parsed = json.loads(result_text)
    if not isinstance(parsed, dict):
        raise ValueError("AI response is not a JSON object")
    return _coerce_result(parsed)


def evaluate_student_answer(question: str, model_answer: str, student_answer: str) -> EvaluationResult:
    question = question.strip()
    model_answer = model_answer.strip()
    student_answer = student_answer.strip()

    if not question or not model_answer or not student_answer:
        raise ValueError("question, model_answer, and student_answer are required")

    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY is missing")
        return {
            "score": 5,
            "mistakes": ["Missing OPENROUTER_API_KEY"],
            "feedback": "OpenRouter API key is not configured.",
            "suggestions": ["Set OPENROUTER_API_KEY in backend/.env"],
        }

    prompt = _build_prompt(question, model_answer, student_answer)

    try:
        first_result_text = _request_evaluation(prompt)
        try:
            return _parse_result_text(first_result_text)
        except (json.JSONDecodeError, ValueError) as parse_error:
            logger.warning("OpenRouter JSON parse failed (attempt 1): %s", parse_error)

        # Retry once if JSON parsing fails.
        second_result_text = _request_evaluation(prompt)
        try:
            return _parse_result_text(second_result_text)
        except (json.JSONDecodeError, ValueError) as parse_error:
            logger.warning("OpenRouter JSON parse failed (attempt 2): %s", parse_error)
            return FALLBACK_RESULT

    except requests.RequestException as request_error:
        safe_message = _redact_secrets(str(request_error))
        logger.error("OpenRouter request failed: %s", safe_message)
        status_code = None
        if isinstance(request_error, requests.HTTPError) and request_error.response is not None:
            status_code = request_error.response.status_code

        if status_code == 402:
            return {
                "score": NETWORK_FALLBACK_RESULT["score"],
                "mistakes": [f"AI request failed: {safe_message[:220]}"],
                "feedback": "OpenRouter billing or model access is required for this request.",
                "suggestions": [
                    "Add credits/enable billing in your OpenRouter account",
                    "Switch OPENROUTER_MODEL to a free model slug ending with ':free'",
                    "Retry evaluation after updating billing or model",
                ],
            }

        return {
            "score": NETWORK_FALLBACK_RESULT["score"],
            "mistakes": [f"AI request failed: {safe_message[:220]}"],
            "feedback": NETWORK_FALLBACK_RESULT["feedback"],
            "suggestions": NETWORK_FALLBACK_RESULT["suggestions"],
        }
    except Exception as unexpected_error:
        safe_message = _redact_secrets(str(unexpected_error))
        logger.error("Unexpected evaluation error: %s", safe_message)
        return FALLBACK_RESULT
