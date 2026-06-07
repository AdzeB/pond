import { AlertDialog, Button } from "@pond/ui";
import type { RelocatePreviewWire } from "../../../../../preload";
import styles from "./styles.module.css";

export function RelocateDialog({
  preview,
  busy,
  onCancel,
  onConfirm,
}: {
  preview: RelocatePreviewWire | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = preview !== null;
  const mode = preview?.suggestedMode ?? "copy";
  const itemCount = preview?.existing.itemCount ?? 0;

  const title =
    mode === "adopt" ? "Use this Pond library?" : "Move your library here?";

  const primaryLabel = busy
    ? "Relaunching…"
    : mode === "adopt"
      ? "Switch and Relaunch"
      : "Copy and Relaunch";

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>
            {preview ? (
              <div className={styles["relocate-body"]}>
                <p>
                  {mode === "adopt"
                    ? `That's already a Pond library (${itemCount} item${itemCount === 1 ? "" : "s"}). Pond will use it directly without copying anything.`
                    : "Pond will copy your library into a new .pond bundle at this location, then restart. The old library stays put so you can verify everything looks right before deleting it yourself."}
                </p>
                <dl className={styles["relocate-paths"]}>
                  <div>
                    <dt>From</dt>
                    <dd>
                      <code>{preview.currentPath}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>
                      <code>{preview.candidatePath}</code>
                    </dd>
                  </div>
                </dl>
                {preview.cloudKind ? (
                  <p className={styles["relocate-cloud"]}>
                    This folder is inside {preview.cloudKind}. Your saved files
                    will sync across devices, but Pond's index stays on this
                    Mac. Each Mac maintains its own index over the shared files.
                  </p>
                ) : null}
              </div>
            ) : null}
          </AlertDialog.Description>
          <AlertDialog.Actions>
            <AlertDialog.Close
              render={
                <Button variant="ghost" disabled={busy}>
                  Cancel
                </Button>
              }
            />
            <Button
              variant="primary"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {primaryLabel}
            </Button>
          </AlertDialog.Actions>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
