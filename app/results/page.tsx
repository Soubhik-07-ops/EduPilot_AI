"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { fetchResults, type ResultRow } from "@/lib/database";
import { type ParsedResult, parseResultRow } from "@/lib/result-adapter";
import { getScoreBadgeClasses, getScoreTier } from "@/lib/score-utils";
import styles from "./results.module.css";

type ScoreFilter = "all" | "high" | "medium" | "low";

export default function ResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<ParsedResult | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchResults();
      setResults(rows);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch results.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, []);

  useEffect(() => {
    if (!selectedResult) {
      return;
    }

    const modalElement = modalRef.current;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedResult(null);
        return;
      }

      if (event.key === "Tab" && modalElement) {
        const focusable = modalElement.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedResult]);

  const parsedResults = useMemo(() => results.map(parseResultRow), [results]);

  const filteredResults = useMemo(() => {
    const searched = parsedResults.filter((result) =>
      result.submissionId.toLowerCase().includes(searchText.trim().toLowerCase()),
    );

    return searched.filter((result) => {
      if (scoreFilter === "high") {
        return result.score >= 8;
      }
      if (scoreFilter === "medium") {
        return result.score >= 5 && result.score <= 7;
      }
      if (scoreFilter === "low") {
        return result.score <= 4;
      }
      return true;
    });
  }, [parsedResults, scoreFilter, searchText]);

  return (
    <section className={styles.page}>
      <h1 className={styles.heading}>Results History</h1>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <svg viewBox="0 0 24 24" className={styles.searchIcon} aria-hidden="true">
            <path d="M10 2a8 8 0 1 1 5.3 14l4.4 4.4-1.4 1.4-4.4-4.4A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by submission_id..."
          />
        </div>
        <span className={styles.controlsDivider} aria-hidden="true" />
        <select
          className={styles.selectInput}
          value={scoreFilter}
          onChange={(event) => setScoreFilter(event.target.value as ScoreFilter)}
        >
          <option value="all">All</option>
          <option value="high">High (8-10)</option>
          <option value="medium">Medium (5-7)</option>
          <option value="low">Low (0-4)</option>
        </select>
      </div>

      {loading && (
        <div className={styles.skeletonWrap}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`results-skeleton-${index}`} className={styles.skeletonRow} />
          ))}
        </div>
      )}

      {error && (
        <div className={styles.errorCard} role="alert">
          <p className={styles.errorTitle}>? Something went wrong</p>
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => void loadResults()}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filteredResults.length === 0 && (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 120 120" className={styles.emptyIcon} aria-hidden="true">
            <rect x="20" y="24" width="80" height="70" rx="12" />
            <path d="M36 44h48M36 58h48M36 72h28" />
          </svg>
          <h2 className={styles.emptyTitle}>No data yet</h2>
          <p className={styles.emptyText}>No results available. Evaluate a submission to populate this view.</p>
          <Link href="/upload" className={styles.emptyCta}>
            Go to Upload ?
          </Link>
        </div>
      )}

      {!loading && !error && filteredResults.length > 0 && (
        <>
          <div className={styles.mobileCards}>
            {filteredResults.map((result, index) => {
              const tier = getScoreTier(result.score);
              return (
                <article
                  key={`mobile-${result.id}`}
                  className={styles.mobileCard}
                  style={{ ["--delay" as string]: `${index * 50}ms` } as CSSProperties}
                >
                  <div className={styles.mobileHeader}>
                    <p className={styles.mobileSubmission}>{result.submissionId}</p>
                    <span className={getScoreBadgeClasses(result.score, styles)}>
                      <span className={styles.badgeDot} aria-hidden="true" />
                      {result.score} {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.viewButton}
                    aria-label={`View result for ${result.submissionId}`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c4.8 0 8.7 3 10 7-1.3 4-5.2 7-10 7S3.3 16 2 12c1.3-4 5.2-7 10-7Zm0 2c-3.6 0-6.7 2.1-7.9 5 1.2 2.9 4.3 5 7.9 5s6.7-2.1 7.9-5c-1.2-2.9-4.3-5-7.9-5Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z" />
                    </svg>
                  </button>
                </article>
              );
            })}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.cell}>Submission ID</th>
                  <th className={styles.cell}>Score</th>
                  <th className={styles.cell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, index) => {
                  const tier = getScoreTier(result.score);
                  return (
                    <tr
                      key={result.id}
                      className={styles.row}
                      style={{ ["--delay" as string]: `${index * 50}ms` } as CSSProperties}
                    >
                      <td className={styles.cell}>{result.submissionId}</td>
                      <td className={styles.cell}>
                        <span className={getScoreBadgeClasses(result.score, styles)}>
                          <span className={styles.badgeDot} aria-hidden="true" />
                          {result.score} {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </span>
                      </td>
                      <td className={styles.cell}>
                        <button
                          type="button"
                          className={styles.viewButton}
                          aria-label={`View result for ${result.submissionId}`}
                          onClick={() => setSelectedResult(result)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5c4.8 0 8.7 3 10 7-1.3 4-5.2 7-10 7S3.3 16 2 12c1.3-4 5.2-7 10-7Zm0 2c-3.6 0-6.7 2.1-7.9 5 1.2 2.9 4.3 5 7.9 5s6.7-2.1 7.9-5c-1.2-2.9-4.3-5-7.9-5Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z" />
                          </svg>
                        </button>
                        <span className={styles.rowArrow} aria-hidden="true">
                          ?
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedResult && (
        <div className={styles.overlay} onClick={() => setSelectedResult(null)} role="presentation">
          <div
            ref={modalRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle} id="result-modal-title">
                Result Details
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.closeButton}
                aria-label="Close dialog"
                onClick={() => setSelectedResult(null)}
              >
                ?
              </button>
            </div>

            <p>
              <strong>Submission ID:</strong> {selectedResult.submissionId}
            </p>
            <p>
              <strong>Score:</strong> {selectedResult.score} / 10
            </p>

            <div
              className={styles.scoreRing}
              style={
                {
                  ["--score-angle" as string]: `${(Math.max(0, Math.min(10, selectedResult.score)) / 10) * 360}deg`,
                } as CSSProperties
              }
            >
              <span className={getScoreBadgeClasses(selectedResult.score, styles)}>
                <span className={styles.badgeDot} aria-hidden="true" />
                {selectedResult.score} {getScoreTier(selectedResult.score).charAt(0).toUpperCase() + getScoreTier(selectedResult.score).slice(1)}
              </span>
            </div>

            <div className={`${styles.detailSection} ${styles.detailDanger}`}>
              <h3>Mistakes</h3>
              {selectedResult.mistakes.length > 0 ? (
                <ul className={styles.list}>
                  {selectedResult.mistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              ) : (
                <p>No mistakes recorded.</p>
              )}
            </div>

            <div className={`${styles.detailSection} ${styles.detailInfo}`}>
              <h3>Feedback</h3>
              <p>{selectedResult.feedback}</p>
            </div>

            <div className={`${styles.detailSection} ${styles.detailSuccess}`}>
              <h3>Suggestions</h3>
              {selectedResult.suggestions.length > 0 ? (
                <ul className={styles.list}>
                  {selectedResult.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              ) : (
                <p>No suggestions recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
