import { IconArrowUpRight } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { sendMessage } from "@/utils/messaging";
import type { CaptureStatus } from "@/utils/outcome";
import { clearRecent } from "@/utils/recent";
import { useRecent } from "../hooks";
import styles from "./styles.module.css";

const SHOWN = 5;

const STATUS = {
  sending: "Saving",
  saved: "Saved",
  duplicate: "Already saved",
  failed: "Failed",
  offline: "Pond wasn't running",
} satisfies Record<CaptureStatus, string>;

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function ago(at: number): string {
  const seconds = Math.round((at - Date.now()) / 1000);
  if (seconds > -45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export function Recent() {
  const recent = useRecent().slice(0, SHOWN);
  if (recent.length === 0) return null;

  return (
    <section className={styles.recent} aria-labelledby="pond-recent">
      <header className={styles.header}>
        <h2 id="pond-recent" className={styles.heading}>
          Recent
        </h2>
        <Button size="xs" variant="text" onClick={() => void clearRecent()}>
          Clear
        </Button>
      </header>
      <ul className={styles.list}>
        {recent.map((entry) => (
          <li key={entry.id} className={styles.row} data-status={entry.status}>
            <span className={styles.dot} aria-hidden />
            <div className={styles.text}>
              <p className={styles.title}>{entry.title}</p>
              <p className={styles.meta}>
                {STATUS[entry.status]} · {ago(entry.at)}
              </p>
            </div>
            {entry.saveId ? (
              <Button
                icon
                size="xs"
                variant="ghost"
                aria-label={`Open ${entry.title} in Pond`}
                onClick={() =>
                  void sendMessage("openPond", `item/${entry.saveId}`)
                }
              >
                <IconArrowUpRight size={12} />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
