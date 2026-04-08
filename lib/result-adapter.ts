import { type ResultRow } from "@/lib/database";

export type ParsedResult = {
  id: string;
  submissionId: string;
  score: number;
  mistakes: string[];
  feedback: string;
  suggestions: string[];
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(10, score));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStructuredSummary(value: unknown): value is {
  score: number;
  mistakes: string[];
  feedback: string;
  suggestions: string[];
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    score?: unknown;
    mistakes?: unknown;
    feedback?: unknown;
    suggestions?: unknown;
  };

  return (
    typeof candidate.score === "number" &&
    isStringArray(candidate.mistakes) &&
    typeof candidate.feedback === "string" &&
    isStringArray(candidate.suggestions)
  );
}

export function parseResultRow(row: ResultRow): ParsedResult {
  try {
    const parsed = JSON.parse(row.summary);
    if (isStructuredSummary(parsed)) {
      return {
        id: row.id,
        submissionId: row.submission_id,
        score: clampScore(parsed.score),
        mistakes: parsed.mistakes,
        feedback: parsed.feedback,
        suggestions: parsed.suggestions,
      };
    }
  } catch {
    // Fall through to text/regex fallback.
  }

  const chunks = row.summary
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const scoreMatchSummary = row.summary.match(/\bscore\b[^0-9]*([0-9]+)/i)?.[1];
  const scoreMatchTitle = row.title.match(/\bscore\b[^0-9]*([0-9]+)/i)?.[1];
  const extractedScore = Number(scoreMatchSummary ?? scoreMatchTitle ?? 0);
  const safeScore = Number.isFinite(extractedScore) ? extractedScore : 0;

  return {
    id: row.id,
    submissionId: row.submission_id,
    score: clampScore(safeScore),
    mistakes: chunks.slice(0, 4),
    feedback: row.title || "No feedback available.",
    suggestions: chunks.slice(4, 7),
  };
}
