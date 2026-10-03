import { Dialog } from "@pond/ui";
import type {
  LibraryRepairJob,
  LibraryRepairKind,
} from "@shared/library-repair-contracts";
import { useEffect, useState } from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

const LABELS = {
  thumbnails: "Repair Thumbnails",
  "physical-file-names": "Repair Physical File Names",
  "invalid-content": "Repair Invalid Content",
  "save-metadata": "Repair Save Metadata",
} satisfies Record<LibraryRepairKind, string>;

export function LibraryRepairDialog({
  kind,
  open,
  onClose,
}: {
  kind: LibraryRepairKind;
  open: boolean;
  onClose: () => void;
}) {
  const [job, setJob] = useState<LibraryRepairJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const running = job?.status === "queued" || job?.status === "running";
  const preview = job?.preview;
  const completed = job?.phase === "apply" && job.status === "completed";

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function track(id: string): Promise<void> {
      const next = await window.pond.query("libraryRepairs.get", { id });
      if (!active || !next) return;
      setJob(next);
      if (next.status === "queued" || next.status === "running") {
        timer = setTimeout(() => void track(id), 200);
      }
    }
    void window.pond
      .query("libraryRepairs.preview", { kind })
      .then((next) => {
        if (!active) return;
        setJob(next);
        return track(next.id);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not inspect the Library.",
          );
      });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [kind]);

  async function apply(): Promise<void> {
    if (!preview) return;
    setError(null);
    try {
      const next = await window.pond.query("libraryRepairs.apply", {
        token: preview.token,
      });
      setJob(next);
      await poll(next.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not repair the Library.",
      );
    }
  }

  async function poll(id: string): Promise<void> {
    const next = await window.pond.query("libraryRepairs.get", { id });
    if (!next) return;
    setJob(next);
    if (next.status === "queued" || next.status === "running") {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 200);
      });
      await poll(id);
    }
  }

  async function close(): Promise<void> {
    if (running && job) {
      await window.pond.query("libraryRepairs.cancel", { id: job.id });
    }
    onClose();
  }

  const count = preview?.issues.length ?? 0;
  const progress =
    running && job.total > 0
      ? `${job.processed} of ${job.total}`
      : running
        ? "Inspecting Library"
        : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) void close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>{LABELS[kind]}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>
            Preview targeted changes before Pond updates Library files.
          </Dialog.Description>
          <Dialog.Content className={styles.content}>
            {progress ? <p className={styles.status}>{progress}</p> : null}
            {error || job?.error ? (
              <p className={styles.error}>{error ?? job?.error}</p>
            ) : null}
            {completed ? (
              <p className={styles.status}>
                Repaired {job.result?.repaired ?? 0}{" "}
                {(job.result?.repaired ?? 0) === 1 ? "Save" : "Saves"}.
              </p>
            ) : null}
            {preview && !completed ? (
              <>
                <p className={styles.status}>
                  {count === 0
                    ? "No repairs found."
                    : `${count} ${count === 1 ? "Save needs" : "Saves need"} repair.`}
                </p>
                {count > 0 ? (
                  <>
                    <div className={styles.list} {...scrollFade}>
                      {preview.issues.map((issue) => (
                        <div className={styles.issue} key={issue.id}>
                          <strong>{issue.title || issue.saveId}</strong>
                          <span>{issue.summary}</span>
                          <small>{issue.detail}</small>
                        </div>
                      ))}
                    </div>
                    <div className={styles.confirmation}>
                      <span>
                        Pond snapshots every changed file before applying.
                      </span>
                      {preview.confirmation.movesToTrash ? (
                        <span>
                          Invalid Saves move to Trash. Payload directories stay
                          intact.
                        </span>
                      ) : null}
                      <span>
                        {preview.confirmation.canUndo
                          ? "You can Undo this repair."
                          : "This repair rebuilds metadata and cannot be undone."}
                      </span>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </Dialog.Content>
          {!completed && count > 0 ? (
            <Dialog.Footer>
              <Dialog.Confirm
                type="button"
                loading={job?.phase === "apply" && running}
                disabled={running}
                onClick={() => void apply()}
              >
                Repair
              </Dialog.Confirm>
            </Dialog.Footer>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
