"use client";

import { CSSProperties, ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from "react";
import { evaluateAnswer, type EvaluationResult, uploadFile } from "@/lib/api-client";
import { createSubmission, saveResult, uploadFileToSupabaseStorage } from "@/lib/database";
import { getScoreTier } from "@/lib/score-utils";
import styles from "./upload.module.css";

const STEPS = ["Enter Question", "Upload File", "Evaluate", "Results"] as const;
const ACCEPTED_TYPES = ["application/pdf", "text/plain", "text/csv", "application/csv"] as const;
const ACCEPTED_IMAGE_PREFIX = "image/";

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number]) || file.type.startsWith(ACCEPTED_IMAGE_PREFIX);
}

export default function UploadPage() {
  const [question, setQuestion] = useState<string>("");
  const [modelAnswer, setModelAnswer] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentStep = useMemo(() => {
    if (evaluationResult) {
      return 4;
    }
    if (loading) {
      return 3;
    }
    if (file) {
      return 2;
    }
    return 1;
  }, [evaluationResult, file, loading]);

  const scoreClassName = useMemo(() => {
    if (!evaluationResult) {
      return "";
    }
    if (evaluationResult.score >= 8) {
      return styles.scoreGreen;
    }
    if (evaluationResult.score >= 5) {
      return styles.scoreOrange;
    }
    return styles.scoreRed;
  }, [evaluationResult]);

  const scoreLabel = useMemo(() => {
    if (!evaluationResult) {
      return "";
    }
    const tier = getScoreTier(evaluationResult.score);
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }, [evaluationResult]);

  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const assignSelectedFile = (selected: File | null) => {
    if (selected && !isAcceptedFile(selected)) {
      setError("Unsupported file type. Please upload a PDF, image, TXT, or CSV file.");
      return;
    }
    setError(null);
    setFile(selected);
    setEvaluationResult(null);
    setExtractedText("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    assignSelectedFile(selectedFile);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const selectedFile = event.dataTransfer.files?.[0] ?? null;
    if (selectedFile) {
      assignSelectedFile(selectedFile);
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(selectedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEvaluationResult(null);
    setExtractedText("");

    if (!question.trim() || !modelAnswer.trim()) {
      setError("Please provide both Question and Model Answer.");
      return;
    }

    if (!file) {
      setError("Please upload a PDF, image, TXT, or CSV file.");
      return;
    }

    setLoading(true);
    setLoadingStep("Uploading file...");

    try {
      const uploadData = await uploadFile(file);
      setLoadingStep("Extracting text...");
      const studentAnswer = uploadData.extracted_text?.trim();

      if (!studentAnswer) {
        throw new Error("No text was extracted from the uploaded file.");
      }

      setExtractedText(studentAnswer);

      setLoadingStep("Evaluating answer with AI...");
      const evaluateData = await evaluateAnswer({
        question: question.trim(),
        model_answer: modelAnswer.trim(),
        student_answer: studentAnswer,
      });

      setLoadingStep("Saving to database...");

      // 1. Upload file to Supabase Storage
      let fileUrl = "";
      try {
        fileUrl = await uploadFileToSupabaseStorage(file);
      } catch {
        // Non-fatal: log and continue — evaluation result still usable
        console.warn("Supabase storage upload failed. Continuing without file URL.");
      }

      // 2. Create submission row
      let submissionId = "";
      try {
        const submission = await createSubmission({
          file_name: file.name,
          file_url: fileUrl,
          status: "evaluated",
        });
        submissionId = submission.id;
      } catch (dbError) {
        console.warn("Failed to create submission record:", dbError);
      }

      // 3. Save result row (only if submission was created)
      if (submissionId) {
        try {
          await saveResult({
            submission_id: submissionId,
            title: `Evaluation — ${file.name}`,
            summary: JSON.stringify({
              score: evaluateData.score,
              mistakes: evaluateData.mistakes,
              feedback: evaluateData.feedback,
              suggestions: evaluateData.suggestions,
            }),
          });
        } catch (dbError) {
          console.warn("Failed to save result record:", dbError);
        }
      }

      setEvaluationResult(evaluateData);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <section className={styles.page}>
      <h1 className={styles.heading}>Upload & Evaluate</h1>

      <div className={styles.stepIndicator} aria-label="Progress Steps">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const stepClassName = isActive
            ? `${styles.step} ${styles.stepActive}`
            : isCompleted
              ? `${styles.step} ${styles.stepDone}`
              : styles.step;

          return (
            <div key={step} className={stepClassName}>
              <span className={styles.stepDot}>{isCompleted ? "✓" : stepNumber}</span>
              <span className={styles.stepLabel}>{step}</span>
              {stepNumber < STEPS.length && <span className={styles.stepLine} aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <section className={styles.card}>
          <label className={styles.label} htmlFor="question">
            Question
          </label>
          <textarea
            id="question"
            className={styles.textarea}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Enter the question given to the student"
            rows={4}
            required
          />
        </section>

        <section className={styles.card}>
          <label className={styles.label} htmlFor="modelAnswer">
            Model Answer
          </label>
          <textarea
            id="modelAnswer"
            className={styles.textarea}
            value={modelAnswer}
            onChange={(event) => setModelAnswer(event.target.value)}
            placeholder="Enter the expected answer"
            rows={6}
            required
          />
        </section>

        <section className={styles.card}>
          <label className={styles.label} htmlFor="fileUpload">
            Upload File (PDF, image, TXT, or CSV)
          </label>
          <div
            className={isDragging ? `${styles.dropZone} ${styles.dropZoneActive}` : styles.dropZone}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <svg className={styles.dropIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l4 4h-3v7h-2V7H8l4-4Zm-7 9h2v6h10V12h2v8H5v-8Z" />
            </svg>
            <p className={styles.dropTitle}>Drag and drop your file here</p>
            <p className={styles.dropSubtitle}>Supports PDF, PNG, JPG, TXT, CSV</p>
            <input
              ref={fileInputRef}
              id="fileUpload"
              type="file"
              accept=".pdf,.txt,.csv,image/*"
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className={styles.fileMeta}>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
            </div>
          )}
        </section>

        <button type="submit" className={styles.submitButton} disabled={loading}>
          <span>{loading ? "Processing..." : "Upload & Evaluate"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>

      {loading && (
        <div className={styles.loadingRow}>
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.loading}>{loadingStep || "Processing..."}</p>
        </div>
      )}

      {error && (
        <div className={styles.errorCard} role="alert">
          <p className={styles.errorTitle}>⚠ Something went wrong</p>
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => setError(null)}>
            Try again
          </button>
        </div>
      )}

      {evaluationResult && (
        <section className={styles.resultContainer}>
          <h2 className={styles.resultHeading}>Evaluation Result</h2>
          <div className={styles.scoreRow}>
            <div
              className={styles.scoreRing}
              style={
                {
                  ["--score-angle" as string]: `${(Math.max(0, Math.min(10, evaluationResult.score)) / 10) * 360}deg`,
                } as CSSProperties
              }
            >
              <span className={`${styles.scoreBadge} ${scoreClassName}`}>
                {evaluationResult.score} / 10 {scoreLabel}
              </span>
            </div>
          </div>

          <div className={styles.resultSectionBox}>
            <h3 className={styles.subHeading}>Mistakes</h3>
            {evaluationResult.mistakes.length > 0 ? (
              <ul className={styles.cleanList}>
                {evaluationResult.mistakes.map((mistake) => (
                  <li key={mistake} className={styles.mistakeItem}>
                    <span aria-hidden="true">⚠ </span>
                    {mistake}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyText}>No major mistakes detected.</p>
            )}
          </div>

          <div className={styles.feedbackBox}>
            <h3 className={styles.subHeading}>Feedback</h3>
            <p>{evaluationResult.feedback}</p>
          </div>

          <div className={styles.resultSectionBox}>
            <h3 className={styles.subHeading}>Suggestions</h3>
            <ul className={styles.cleanList}>
              {evaluationResult.suggestions.map((suggestion) => (
                <li key={suggestion} className={styles.suggestionItem}>
                  <span aria-hidden="true">✦ </span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.resultSectionBox}>
            <h3 className={styles.subHeading}>Extracted Student Text</h3>
            <div className={styles.extractedTextBox}>{extractedText}</div>
          </div>
        </section>
      )}
    </section>
  );
}
