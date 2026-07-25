import styles from "./styles.module.css";

export function WelcomeEmpty() {
  return (
    <div className={styles.welcome}>
      <p className={styles.text}>
        No saves yet.
        <br />
        Drop a link, image, or file to get started.
      </p>
      <div className={styles.guide} aria-hidden>
        <span className={styles.guideLabel}>Drop here, or connect below</span>
        <span className={styles.arrow}>
          <svg
            width="20"
            height="36"
            viewBox="0 0 20 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M10 2v26"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M4 22l6 8 6-8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
