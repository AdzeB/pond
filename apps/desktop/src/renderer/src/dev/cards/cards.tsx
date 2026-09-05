import { Shell } from "@pond/ui";
import { buildTweetCardData, type TweetCardData } from "@shared/tweet-card";
import { useEffect, useMemo, useState } from "react";
import { ThreadsCard } from "@/features/captures/components/threads/card/card";
import { TweetCard } from "@/features/captures/components/tweet/card/card";
import { AppShell } from "@/features/library/components/workspace-shell/workspace-shell";
import { useSave, useSaves } from "@/features/saves/hooks/use-saves";
import { ensureRawJson } from "@/features/saves/lib/raw-json";
import { EnumSelect } from "@/shared/components/enum-select/enum-select";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./cards.module.css";
import { SAMPLE_CARD, SAMPLE_ID } from "./sample";

const SCHEMES = ["light", "dark"] as const;

export function CardsPage() {
  const scrollFade = useScrollFade<HTMLElement>();
  const saves = useSaves();
  const [selectedId, setSelectedId] = useState(SAMPLE_ID);
  const save = useSave(selectedId === SAMPLE_ID ? null : selectedId);

  const options = useMemo(() => {
    const fromLibrary = saves
      .filter(
        (row) =>
          (row.source === "twitter" || row.source === "threads") &&
          !row.deletedAt,
      )
      .slice(0, 40)
      .map((row) => ({
        value: row.id,
        label: row.title || row.author || row.sourceId || row.id,
      }));
    return [{ value: SAMPLE_ID, label: "Sample" }, ...fromLibrary];
  }, [saves]);

  useEffect(() => {
    if (selectedId === SAMPLE_ID) return;
    void ensureRawJson(selectedId);
  }, [selectedId]);

  const data: TweetCardData = useMemo(() => {
    if (selectedId === SAMPLE_ID) return SAMPLE_CARD;
    return (
      buildTweetCardData(save?.rawJson?.capture, save?.author) ?? SAMPLE_CARD
    );
  }, [save, selectedId]);

  return (
    <AppShell.Content>
      <Shell.Body>
        <Shell.Main className={styles.main} {...scrollFade}>
          <div className={styles.page}>
            <header className={styles.header}>
              <div>
                <h1 className={styles.title}>Card Renders</h1>
                <p className={styles.description}>
                  Twitter and Threads cards at the 550px width Pond captures for
                  covers.
                </p>
              </div>
              <EnumSelect
                value={selectedId}
                onValueChange={setSelectedId}
                options={options}
                aria-label="Card source"
              />
            </header>
            <div className={styles.grid}>
              {SCHEMES.map((scheme) => (
                <figure key={`tweet-${scheme}`} className={styles.frame}>
                  <figcaption className={styles.label}>
                    Twitter, {scheme}
                  </figcaption>
                  <div className={styles.canvas} data-scheme={scheme}>
                    <div className={styles.card}>
                      <TweetCard data={data} scheme={scheme} />
                    </div>
                  </div>
                </figure>
              ))}
              {SCHEMES.map((scheme) => (
                <figure key={`threads-${scheme}`} className={styles.frame}>
                  <figcaption className={styles.label}>
                    Threads, {scheme}
                  </figcaption>
                  <div className={styles.canvas} data-scheme={scheme}>
                    <div className={styles.card}>
                      <ThreadsCard data={data} scheme={scheme} />
                    </div>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </Shell.Main>
      </Shell.Body>
    </AppShell.Content>
  );
}
