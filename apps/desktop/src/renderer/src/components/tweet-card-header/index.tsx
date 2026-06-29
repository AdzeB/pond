import type { TweetCardAuthor } from "@/components/tweet-card/lib/data";
import { VerifiedIcon } from "@/components/tweet-card-icons";
import { initials } from "@/lib/util/initials";
import styles from "./styles.module.css";

export function Header({ author }: { author: TweetCardAuthor }) {
  return (
    <div className={styles.header}>
      <Avatar author={author} />
      <div className={styles.identity}>
        <span className={styles.name}>
          {author.name}
          {author.verified ? (
            <VerifiedIcon className={styles.verified} width={19} height={19} />
          ) : null}
        </span>
        <span className={styles.handle}>@{author.handle}</span>
      </div>
    </div>
  );
}

export function Avatar({
  author,
  size = 40,
}: {
  author: TweetCardAuthor;
  size?: number;
}) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {author.avatarUrl ? (
        <img
          src={author.avatarUrl}
          alt=""
          className={styles.avatarImg}
          draggable={false}
        />
      ) : (
        <span className={styles.avatarFallback}>
          {initials(author.name || author.handle || "?")}
        </span>
      )}
    </span>
  );
}
