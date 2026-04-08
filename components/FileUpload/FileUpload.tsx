import styles from "./FileUpload.module.css";

export default function FileUpload() {
  return (
    <div className={styles.wrapper}>
      <label htmlFor="file" className={styles.label}>
        Choose file
      </label>
      <input id="file" name="file" type="file" className={styles.input} />
      <button type="button" className={styles.button}>
        Upload
      </button>
    </div>
  );
}
