import styles from "./styles.module.css";

export function Film() {
  return (
    <section className={styles.film} aria-label="Pond launch video">
      <video
        className={styles.video}
        src="/video/pond.mp4"
        poster="/video/pond-poster.jpg"
        width={1600}
        height={900}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    </section>
  );
}
