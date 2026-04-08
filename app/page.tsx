import styles from "./page.module.css";

export default function HomePage() {
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome to EduPilot AI.</p>
      </div>
    </section>
  );
}
