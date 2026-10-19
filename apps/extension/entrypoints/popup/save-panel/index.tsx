import { IconCircleCheckFill, IconCircleWarning, IconGlobe } from "@pond/icons";
import { parseCaptureTags } from "@pond/schema/capture";
import { Button } from "@pond/ui/button";
import { useState } from "react";
import { CaptureFields } from "@/components/capture-fields";
import { sendMessage } from "@/utils/messaging";
import type { CaptureOutcome } from "@/utils/outcome";
import { useFolders, useRecent } from "../hooks";
import styles from "./styles.module.css";

interface SavePanelProps {
  /** The active tab when it's a web page Pond can save; null otherwise. */
  tab: chrome.tabs.Tab | null;
}

const SAVED_LABELS = {
  saved: "Saved to Pond",
  duplicate: "Already in Pond",
} as const;

function hostname(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export function SavePanel({ tab }: SavePanelProps) {
  const folders = useFolders(tab !== null);
  const recent = useRecent();
  const [tags, setTags] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [attempt, setAttempt] = useState<CaptureOutcome | null>(null);
  const [pending, setPending] = useState(false);

  const live = attempt
    ? recent.find((entry) => entry.id === attempt.id)
    : undefined;
  const status = live?.status ?? attempt?.status;
  const saveId =
    live?.saveId ??
    (attempt?.status === "saved" || attempt?.status === "duplicate"
      ? attempt.saveId
      : undefined);
  const error =
    live?.error ?? (attempt?.status === "failed" ? attempt.message : undefined);
  const sending = pending || status === "sending";

  const save = async () => {
    if (tab?.id === undefined) return;
    setPending(true);
    try {
      setAttempt(
        await sendMessage("savePage", {
          tabId: tab.id,
          tags: parseCaptureTags(tags),
          folderIds,
        }),
      );
    } catch {
      setAttempt({
        status: "failed",
        id: crypto.randomUUID(),
        message: "Pond couldn't save this. Try again.",
      });
    } finally {
      setPending(false);
    }
  };

  if (!tab) {
    return (
      <section className={styles.card}>
        <div className={styles.page}>
          <IconGlobe size={16} className={styles.favicon} />
          <div className={styles.text}>
            <p className={styles.title} data-muted="">
              Nothing to save here
            </p>
            <p className={styles.meta}>Pond can only save web pages.</p>
          </div>
        </div>
      </section>
    );
  }

  const done = status === "saved" || status === "duplicate";

  return (
    <section className={styles.card}>
      <div className={styles.page}>
        {tab.favIconUrl ? (
          <img className={styles.favicon} src={tab.favIconUrl} alt="" />
        ) : (
          <IconGlobe size={16} className={styles.favicon} />
        )}
        <div className={styles.text}>
          <p className={styles.title}>{tab.title || hostname(tab.url)}</p>
          <p className={styles.meta}>{hostname(tab.url)}</p>
        </div>
      </div>

      <CaptureFields.Root>
        <CaptureFields.Tags
          value={tags}
          onValueChange={setTags}
          disabled={sending}
        />
        {folders.length > 0 ? (
          <CaptureFields.Folders
            folders={folders}
            value={folderIds}
            onValueChange={setFolderIds}
          />
        ) : null}
      </CaptureFields.Root>

      {done ? (
        <div className={styles.status} role="status">
          <IconCircleCheckFill size={16} className={styles.check} />
          <span className={styles.label}>{SAVED_LABELS[status]}</span>
          {saveId ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void sendMessage("openPond", `item/${saveId}`)}
            >
              Open in Pond
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {status === "failed" || status === "offline" ? (
            <p className={styles.error} role="alert">
              <IconCircleWarning size={16} />
              {status === "offline"
                ? "Pond stopped responding. Open Pond, then try again."
                : error}
            </p>
          ) : null}
          <Button
            variant="primary"
            width="full"
            loading={sending}
            onClick={() => void save()}
          >
            {sending ? "Saving" : "Save Page"}
          </Button>
        </>
      )}
    </section>
  );
}
