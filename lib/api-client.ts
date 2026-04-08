export type EvaluationResult = {
  score: number;
  mistakes: string[];
  feedback: string;
  suggestions: string[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 30_000;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

function parseApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const maybeDetail = (payload as { detail?: unknown }).detail;
    if (typeof maybeDetail === "string" && maybeDetail.trim()) {
      return maybeDetail;
    }
  }

  return fallback;
}

async function requestJson<T>(endpoint: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      signal: controller.signal,
    });

    const rawText = await response.text();
    const parsedBody: unknown = rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      throw new ApiError(
        parseApiErrorMessage(parsedBody, `Request failed with status ${response.status}`),
        response.status,
      );
    }

    return parsedBody as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }

    if (error instanceof SyntaxError) {
      throw new ApiError("Received invalid JSON response from server.", 502);
    }

    if (error instanceof Error) {
      throw new ApiError(error.message || "Request failed.", 0);
    }

    throw new ApiError("Unknown API error occurred.", 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadFile(file: File): Promise<{ extracted_text: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await requestJson<{ extracted_text: string }>("/upload", {
    method: "POST",
    body: formData,
  });

  if (!response || typeof response.extracted_text !== "string") {
    throw new ApiError("Upload response is malformed.", 502);
  }

  return response;
}

export async function evaluateAnswer(payload: {
  question: string;
  model_answer: string;
  student_answer: string;
}): Promise<EvaluationResult> {
  const response = await requestJson<EvaluationResult>("/evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const isValid =
    response &&
    typeof response.score === "number" &&
    Array.isArray(response.mistakes) &&
    Array.isArray(response.suggestions) &&
    typeof response.feedback === "string" &&
    response.mistakes.every((item) => typeof item === "string") &&
    response.suggestions.every((item) => typeof item === "string");

  if (!isValid) {
    throw new ApiError("Evaluation response is malformed.", 502);
  }

  return response;
}
