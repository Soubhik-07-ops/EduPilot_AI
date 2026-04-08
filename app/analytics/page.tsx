"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchResults, type ResultRow } from "@/lib/database";
import { parseResultRow } from "@/lib/result-adapter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./analytics.module.css";

type WeakTopicDatum = {
  topic: string;
  count: number;
};

type ScoreDatum = {
  name: "High (8-10)" | "Medium (5-7)" | "Low (0-4)";
  value: number;
};

const pieColors = ["#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        const rows = await fetchResults();
        if (isMounted) {
          setResults(rows);
        }
      } catch (fetchError) {
        if (isMounted) {
          const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch analytics.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();
    const intervalId = window.setInterval(() => {
      void loadAnalytics();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const weakTopicsData = useMemo<WeakTopicDatum[]>(() => {
    const topicCountMap = new Map<string, number>();

    results.forEach((row) => {
      const { mistakes } = parseResultRow(row);
      mistakes.forEach((mistake) => {
        const normalized = mistake.trim();
        if (!normalized) {
          return;
        }
        topicCountMap.set(normalized, (topicCountMap.get(normalized) ?? 0) + 1);
      });
    });

    return Array.from(topicCountMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const scoreData = useMemo<ScoreDatum[]>(() => {
    const buckets: ScoreDatum[] = [
      { name: "High (8-10)", value: 0 },
      { name: "Medium (5-7)", value: 0 },
      { name: "Low (0-4)", value: 0 },
    ];

    results.forEach((row) => {
      const { score } = parseResultRow(row);
      if (score >= 8) {
        buckets[0].value += 1;
      } else if (score >= 5) {
        buckets[1].value += 1;
      } else {
        buckets[2].value += 1;
      }
    });

    return buckets;
  }, [results]);

  const totalEvaluations = results.length;
  const averageScore = useMemo(() => {
    if (results.length === 0) {
      return "0.0";
    }
    const sum = results.reduce((acc, row) => acc + parseResultRow(row).score, 0);
    return (sum / results.length).toFixed(1);
  }, [results]);

  const topWeakTopic = weakTopicsData[0]?.topic ?? "N/A";
  const totalDistribution = scoreData.reduce((acc, item) => acc + item.value, 0);

  if (loading) {
    return (
      <section className={styles.page}>
        <h1 className={styles.heading}>Analytics Overview</h1>
        <div className={styles.skeletonWrap}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.page}>
        <h1 className={styles.heading}>Analytics Overview</h1>
        <div className={styles.errorCard} role="alert">
          <p className={styles.errorTitle}>⚠ Something went wrong</p>
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <section className={styles.page}>
        <h1 className={styles.heading}>Analytics Overview</h1>
        <div className={styles.emptyState}>
          <svg viewBox="0 0 120 120" className={styles.emptyIcon} aria-hidden="true">
            <rect x="20" y="24" width="80" height="70" rx="12" />
            <path d="M36 44h48M36 58h48M36 72h28" />
          </svg>
          <h2 className={styles.emptyTitle}>No data yet</h2>
          <p className={styles.emptyText}>Analytics appears once evaluations are available.</p>
          <Link href="/upload" className={styles.emptyCta}>
            Go to Upload →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.heading}>Analytics Overview</h1>
      <div className={styles.summaryChips}>
        <span className={styles.summaryChip}>📊 {totalEvaluations} total evaluations</span>
        <span className={styles.summaryChip}>⭐ Avg score: {averageScore}</span>
        <span className={styles.summaryChip}>🎯 Top weak topic: {topWeakTopic}</span>
      </div>

      <div className={styles.chartGrid}>
        <article className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Weak Topics</h2>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weakTopicsData}>
                <defs>
                  <linearGradient id="weakTopicsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="topic" tick={{ fill: "#6b7280", fontSize: 12 }} interval={0} angle={-10} height={56} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="count" fill="url(#weakTopicsGradient)" radius={[8, 8, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Score Distribution</h2>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scoreData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={48}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive
                >
                  {scoreData.map((entry, index) => (
                    <Cell key={`${entry.name}-${entry.value}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                  <Label
                    value={totalDistribution}
                    position="center"
                    style={{ fill: "#0f172a", fontSize: 18, fontWeight: 700 }}
                  />
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className={styles.legendList}>
            {scoreData.map((entry, index) => (
              <li key={entry.name} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  aria-hidden="true"
                />
                <span>{entry.name}</span>
                <span className={styles.legendCount}>{entry.value}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className={styles.chartCard}>
        <h2 className={styles.cardTitle}>Top Weak Topics</h2>
        <ul className={styles.topList}>
          {weakTopicsData.slice(0, 8).map((topic, index) => (
            <li key={topic.topic} className={styles.topListItem}>
              <span
                className={`${styles.rankBadge} ${
                  index === 0 ? styles.rankGold : index === 1 ? styles.rankSilver : index === 2 ? styles.rankBronze : ""
                }`}
              >
                {index + 1}
              </span>
              <span className={styles.topicName}>{topic.topic}</span>
              <span className={styles.topicCount}>{topic.count}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
