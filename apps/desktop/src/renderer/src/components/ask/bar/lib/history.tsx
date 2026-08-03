import { IconClockRotateClockwiseOutline18 as History } from "@pond/icons/outline/18";
import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library/dock/lib/context";
import { ClippedScroll } from "@/components/shared/clipped-scroll";
import { useAskHistory } from "@/stores/ask-history";
import styles from "./history.module.css";
import { useAskSubmit } from "./use-ask-submit";

/** The ask card's drill-down page of recent questions; picking one replays it as a fresh ask. */
export function AskHistorySection() {
  const dock = useDock();
  const recents = useAskHistory();
  const submit = useAskSubmit();

  const replay = (question: string) => {
    if (submit(question, [], { refine: false })) dock.openAsk();
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back
          aria-label="Back to ask"
          onClick={() => dock.openAsk()}
        />
        <TrayCard.Title position="center">Recent Asks</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      {recents.length === 0 ? (
        <p className={styles.empty}>No recent asks yet.</p>
      ) : (
        <ClippedScroll maxHeight={300} className={styles.rows}>
          {recents.map((question) => (
            <button
              key={question}
              type="button"
              className={styles.row}
              onClick={() => replay(question)}
            >
              <span className={styles["row-icon"]}>
                <History width={15} height={15} />
              </span>
              <span className={styles["row-label"]}>{question}</span>
            </button>
          ))}
        </ClippedScroll>
      )}
    </>
  );
}
