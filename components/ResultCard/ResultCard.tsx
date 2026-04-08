import styles from "./ResultCard.module.css";

type ResultCardProps = {
  title: string;
  summary: string;
};

export default function ResultCard({ title, summary }: ResultCardProps) {
  return (
    <article className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.summary}>{summary}</p>
    </article>
  );
}
