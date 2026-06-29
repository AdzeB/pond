import { TweetCard } from "@/components/tweet-card";
import { TWEET_FIXTURES, type TweetFixture } from "./lib/fixtures";
import styles from "./styles.module.css";

export function TweetCardGallery() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Tweet card preview</h1>
        <p className={styles.subtitle}>
          Every tweet shape rendered as our own card, in light and dark.
        </p>
      </header>

      <div className={styles.list}>
        {TWEET_FIXTURES.map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </div>
  );
}

function FixtureRow({ fixture }: { fixture: TweetFixture }) {
  return (
    <section className={styles.row}>
      <div className={styles.rowHead}>
        <h2 className={styles.rowTitle}>{fixture.label}</h2>
        <code className={styles.rowId}>{fixture.id}</code>
      </div>
      <div className={styles.variants}>
        <Variant label="Light">
          <div className={styles.cardFrame}>
            <TweetCard data={fixture.data} scheme="light" />
          </div>
        </Variant>
        <Variant label="Dark">
          <div className={styles.cardFrame}>
            <TweetCard data={fixture.data} scheme="dark" />
          </div>
        </Variant>
      </div>
    </section>
  );
}

function Variant({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.variant}>
      <span className={styles.variantLabel}>{label}</span>
      {children}
    </div>
  );
}
