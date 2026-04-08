"use client";

import Link from "next/link";
import { type ReactNode, CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { fetchResults, type ResultRow } from "@/lib/database";
import { parseResultRow } from "@/lib/result-adapter";
import { getScoreBadgeClasses, getScoreTier } from "@/lib/score-utils";
import styles from "./dashboard.module.css";

type Metric = {
  key: "total" | "avg" | "weak" | "success";
  title: string;
  value: string;
  trend: string;
  icon: ReactNode;
};

export default function DashboardPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchResults();
    setResults(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await fetchResults();
        if (isMounted) {
          setResults(data);
          setLoading(false);
        }
      } catch (fetchError) {
        if (isMounted) {
          const message = fetchError instanceof Error ? fetchError.message : "Failed to load dashboard data.";
          setError(message);
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const parsedEvaluations = useMemo(() => results.map(parseResultRow), [results]);

  const totalEvaluations = parsedEvaluations.length;
  const averageScore = useMemo(() => {
    if (totalEvaluations === 0) {
      return "0.0";
    }
    const sum = parsedEvaluations.reduce((acc, item) => acc + item.score, 0);
    return (sum / totalEvaluations).toFixed(1);
  }, [parsedEvaluations, totalEvaluations]);

  const successRate = useMemo(() => {
    if (totalEvaluations === 0) {
      return "0%";
    }
    const passed = parsedEvaluations.filter((item) => item.score >= 5).length;
    return `${Math.round((passed / totalEvaluations) * 100)}%`;
  }, [parsedEvaluations, totalEvaluations]);

  const weakTopicsCount = useMemo(() => {
    const uniqueTopics = new Set<string>();
    parsedEvaluations.forEach((item) => {
      item.mistakes.forEach((mistake) => uniqueTopics.add(mistake.toLowerCase()));
    });
    return uniqueTopics.size;
  }, [parsedEvaluations]);

  const metrics: Metric[] = [
    {
      key: "total",
      title: "Total Evaluations",
      value: String(totalEvaluations),
      trend: "+3 this week",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h5v7H4v-7Zm7 4h9v3h-9v-3Z" />
        </svg>
      ),
    },
    {
      key: "avg",
      title: "Average Score",
      value: averageScore,
      trend: "+0.4 from last week",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18h16v2H4v-2Zm2-2H4V9h2v7Zm5 0H9V5h2v11Zm5 0h-2v-6h2v6Zm5 0h-2V3h2v13Z" />
        </svg>
      ),
    },
    {
      key: "weak",
      title: "Weak Topics Count",
      value: String(weakTopicsCount),
      trend: "-1 this week",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2 2 6v6c0 5.2 3.5 10 10 12 6.5-2 10-6.8 10-12V6L12 2Zm-1 6h2v6h-2V8Zm0 8h2v2h-2v-2Z" />
        </svg>
      ),
    },
    {
      key: "success",
      title: "Success Rate",
      value: successRate,
      trend: "+5% improvement",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m10 16 7-7 1.4 1.4L10 18.8 5.6 14.4 7 13l3 3ZM12 2l8 4v6c0 5-3.2 9.6-8 11.7C7.2 21.6 4 17 4 12V6l8-4Z" />
        </svg>
      ),
    },
  ];

  const recentEvaluations = parsedEvaluations.slice(0, 5);

  if (loading) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Dashboard Overview</h1>
        </header>
        <div className={styles.metricGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`metric-skeleton-${index}`} className={styles.metricSkeleton} />
          ))}
        </div>
        <div className={styles.listSkeleton}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`list-skeleton-${index}`} className={styles.listSkeletonRow} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Dashboard Overview</h1>
      </header>

      {error && (
        <div className={styles.errorCard} role="alert">
          <p className={styles.errorTitle}>⚠ Something went wrong</p>
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => void loadDashboard()}>
            Try again
          </button>
        </div>
      )}

      <section className={styles.metricGrid}>
        {metrics.map((metric, index) => (
          <article
            key={metric.title}
            className={`${styles.metricCard} ${styles[`metricCard${metric.key}`]}`}
            style={{ ["--delay" as string]: `${index * 80}ms` } as CSSProperties}
          >
            <span className={styles.metricIcon}>{metric.icon}</span>
            <p className={styles.metricTitle}>{metric.title}</p>
            <p className={styles.metricValue}>{metric.value}</p>
            <p className={styles.metricTrend}>{metric.trend}</p>
          </article>
        ))}
      </section>

      <section className={`${styles.metricCard} ${styles.recentCard}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Evaluations</h2>
          <Link href="/results" className={styles.viewAllLink}>
            View All
          </Link>
        </div>

        {recentEvaluations.length === 0 ? (
          <div className={styles.emptyState}>
            <svg viewBox="0 0 120 120" className={styles.emptyIcon} aria-hidden="true">
              <rect x="20" y="24" width="80" height="70" rx="12" />
              <path d="M36 44h48M36 58h48M36 72h28" />
            </svg>
            <h3 className={styles.emptyTitle}>No data yet</h3>
            <p className={styles.emptyText}>No evaluations yet. Start by uploading a new submission.</p>
            <Link href="/upload" className={styles.emptyCta}>
              Go to Upload →
            </Link>
          </div>
        ) : (
          <ul className={styles.evaluationList}>
            {recentEvaluations.map((item, index) => {
              const tier = getScoreTier(item.score);
              return (
                <li
                  key={item.id}
                  className={styles.evaluationItem}
                  style={{ ["--delay" as string]: `${index * 60}ms` } as CSSProperties}
                >
                  <div className={styles.itemDetails}>
                    <span className={styles.avatar} aria-hidden="true">
                      {item.submissionId.charAt(0).toUpperCase() || "S"}
                    </span>
                    <div className={styles.itemTextWrap}>
                      <span className={styles.studentName}>Submission</span>
                      <span className={styles.assignment}>{item.submissionId}</span>
                    </div>
                  </div>
                  <span className={getScoreBadgeClasses(item.score, styles)}>
                    {item.score} - {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
