import { IconXTwitter } from "@pond/icons/social-media";
import styles from "./tweet-card.module.css";

export function TweetCard() {
  return (
    <article className={styles.tweet} aria-hidden>
      <span className={styles.chip}>
        <span className={styles["chip-dot"]} />
        Archived
      </span>
      <header className={styles.header}>
        <span className={styles.avatar} />
        <span className={styles.identity}>
          <span className={styles.name}>Jenny Odell</span>
          <span className={styles.handle}>@the_jennitaur</span>
        </span>
        <IconXTwitter
          width={14}
          height={14}
          fill="currentColor"
          className={styles.mark}
        />
      </header>
      <p className={styles.body}>
        The greatest gift you can give yourself is the time to do nothing,
        without guilt, without a phone, without a plan. The rest is wallpaper.
      </p>
      <p className={styles.time}>3:42 PM · Aug 7, 2025</p>
      <dl className={styles.meta}>
        <div className={styles.field}>
          <dt>Source</dt>
          <dd>x.com</dd>
        </div>
        <div className={styles.field}>
          <dt>Saved</dt>
          <dd className={styles.mono}>2025-08-09</dd>
        </div>
        <div className={styles.field}>
          <dt>Original</dt>
          <dd className={styles.mono}>deleted 2025-08-14</dd>
        </div>
      </dl>
    </article>
  );
}
