import { AlertDialog, Button, Settings, useToast } from "@pond/ui";
import { useEffect, useState } from "react";
import type { RelocatePreviewWire } from "../../../../../../preload";
import type { SettingsRow } from "../_types";
import styles from "./styles.module.css";

export function LocationSection() {
  const toast = useToast();
  const [libraryRoot, setLibraryRoot] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [relocatePreview, setRelocatePreview] =
    useState<RelocatePreviewWire | null>(null);
  const [relocating, setRelocating] = useState(false);

  useEffect(() => {
    void window.pond.query("settings.get", {}).then((s) => {
      setLibraryRoot((s as SettingsRow).libraryRoot ?? null);
    });
  }, []);

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  async function rescan() {
    await withBusy("rescan", async () => {
      const res = (await window.pond.query("library.rescan", {})) as {
        updated: number;
        total: number;
      };
      toast.add({
        title: "Library rescanned",
        description: `${res.total}\u00A0items, ${res.updated}\u00A0updated.`,
        type: "success",
      });
    });
  }

  async function openInFinder() {
    await window.pond.query("library.openInFinder", {});
  }

  async function previewPath(path: string) {
    const preview = (await window.pond.query("library.previewRelocate", {
      path,
    })) as
      | { ok: true; preview: RelocatePreviewWire }
      | { ok: false; reason: string };
    if (!preview.ok) {
      toast.add({
        title: "Couldn't inspect library",
        description: preview.reason,
        type: "error",
      });
      return;
    }
    if (preview.preview.samePath) {
      toast.add({
        title: "Already there",
        description: "That's the library you're already using.",
        type: "info",
      });
      return;
    }
    if (!preview.preview.safety.ok) {
      toast.add({
        title: "Can't use that location",
        description: explainSafety(preview.preview.safety.reason),
        type: "error",
      });
      return;
    }
    setRelocatePreview(preview.preview);
  }

  async function chooseLocation() {
    await withBusy("relocate", async () => {
      const pick = (await window.pond.query("library.pickFolder", {})) as
        | { ok: true; path: string }
        | { ok: false; reason: string };
      if (!pick.ok) {
        if (pick.reason !== "cancelled") {
          toast.add({
            title: "Couldn't open picker",
            description: pick.reason,
            type: "error",
          });
        }
        return;
      }
      await previewPath(pick.path);
    });
  }

  async function openExisting() {
    await withBusy("open", async () => {
      const pick = (await window.pond.query("library.pickExisting", {})) as
        | { ok: true; path: string }
        | { ok: false; reason: string };
      if (!pick.ok) {
        if (pick.reason !== "cancelled") {
          toast.add({
            title: "Couldn't open picker",
            description: pick.reason,
            type: "error",
          });
        }
        return;
      }
      await previewPath(pick.path);
    });
  }

  async function confirmRelocate() {
    if (!relocatePreview) return;
    setRelocating(true);
    try {
      const res = (await window.pond.query("library.relocate", {
        path: relocatePreview.candidatePath,
        mode: relocatePreview.suggestedMode,
        restart: true,
      })) as
        | { ok: true; path: string; mode: "copy" | "adopt"; copied: number }
        | { ok: false; reason: string };
      if (!res.ok) {
        setRelocating(false);
        toast.add({
          title: "Couldn't change location",
          description: res.reason,
          type: "error",
        });
        return;
      }
      // The main process will relaunch ~150ms after responding, so we
      // just leave the dialog showing a "Relaunching…" state.
      toast.add({
        title: "Switching libraries",
        description: "Pond is restarting…",
        type: "success",
      });
    } catch (err) {
      setRelocating(false);
      toast.add({
        title: "Couldn't change location",
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  }

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Location</Settings.Title>
        <Settings.Description>
          Where your library lives on disk and how to move it.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Library Location</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Source of Truth</Settings.ItemTitle>
              <Settings.ItemDescription>
                <code>{libraryRoot ?? "~/Pond/My Pond.pond"}</code>
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button size="sm" onClick={() => void openInFinder()}>
                Open in Finder
              </Button>
              <Button
                size="sm"
                disabled={busy === "rescan"}
                onClick={() => void rescan()}
              >
                Rescan Library
              </Button>
              <Button
                size="sm"
                disabled={busy === "open"}
                onClick={() => void openExisting()}
              >
                Open Existing Library…
              </Button>
              <Button
                size="sm"
                disabled={busy === "relocate"}
                onClick={() => void chooseLocation()}
              >
                Change Location…
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <RelocateConfirmDialog
        preview={relocatePreview}
        busy={relocating}
        onCancel={() => setRelocatePreview(null)}
        onConfirm={() => void confirmRelocate()}
      />
    </Settings.Page>
  );
}

function explainSafety(reason: string | null): string {
  switch (reason) {
    case "inside_user_data":
      return "That folder lives inside Pond's own data directory. Pick somewhere else.";
    case "not_writable":
      return "Pond can't write to that folder.";
    case "not_a_directory":
      return "That path isn't a folder.";
    case "unknown_error":
      return "Something went wrong inspecting that folder.";
    default:
      return "Pond can't use that folder.";
  }
}

function RelocateConfirmDialog({
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
