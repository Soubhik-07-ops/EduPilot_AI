export type ScoreTier = "high" | "medium" | "low";

export function getScoreTier(score: number): ScoreTier {
  if (score >= 8) {
    return "high";
  }
  if (score >= 5) {
    return "medium";
  }
  return "low";
}

export function getScoreBadgeClasses(score: number, styles: Record<string, string>): string {
  const base = styles.scoreBadge ?? "";
  const tier = getScoreTier(score);

  if (tier === "high") {
    return `${base} ${styles.scoreGreen ?? ""}`.trim();
  }
  if (tier === "medium") {
    return `${base} ${styles.scoreOrange ?? ""}`.trim();
  }
  return `${base} ${styles.scoreRed ?? ""}`.trim();
}
