import { Button, Settings } from "@pond/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { playUiSuccess } from "@/lib/ui/sounds";
import { prettyPath } from "@/lib/util/pretty-path";
import styles from "./styles.module.css";

const LibraryInfoSchema = z.object({ path: z.string() });

const ActionResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

const BackupResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), path: z.string(), copied: z.number() }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

const MoveResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), path: z.string() }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

const PickedLibrarySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), path: z.string() }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

const PickedEagleLibrarySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), path: z.string() }),
  z.object({ ok: z.literal(false), path: z.null() }),
]);

const EagleImportSchema = z.object({
  ok: z.boolean(),
  imported: z.number(),
  skipped: z.number(),
  failed: z.number(),
  error: z.string().optional(),
});

const FIRST_BACKUP_KEY = "pond.first-library-backup";

function pathActionError(
  reason: string,
  copy: { nested: string; missing: string; fallback: string },
): string {
  switch (reason) {
    case "cancelled":
      return "";
    case "same_path":
      return "Pick a different location than the open library.";
    case "nested_path":
      return copy.nested;
    case "destination_exists":
      return "That folder already has files. Pick a new name.";
    case "no_library":
      return copy.missing;
    default:
      return `${copy.fallback}: ${reason}`;
  }
}

function mutationError(error: Error | null, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function LocationRow() {
  const { data: info } = useQuery({
    queryKey: ["library-info"],
    queryFn: async () =>
      LibraryInfoSchema.parse(await window.pond.query("library.info", {})),
  });

  const [note, setNote] = useState<{
    row: "backup" | "import";
    message: string;
  } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const clearNotes = () => {
    setNote(null);
    setCelebrate(false);
  };

  const openExisting = useMutation({
    mutationFn: async () => {
      clearNotes();
      const picked = PickedLibrarySchema.parse(
        await window.pond.query("library.pickExisting", {}),
      );
      if (!picked.ok) return;
      const res = ActionResultSchema.parse(
        await window.pond.query("library.switchTo", { path: picked.path }),
      );
      if (!res.ok) throw new Error(`Couldn't open library: ${res.reason}`);
    },
  });

  const move = useMutation({
    mutationFn: async () => {
      clearNotes();
      const res = MoveResultSchema.parse(
        await window.pond.query("library.move", {}),
      );
      if (!res.ok) {
        if (res.reason === "cancelled") return;
        throw new Error(
          pathActionError(res.reason, {
            nested: "Can't move into a folder inside the library.",
            missing: "No library is open to move.",
            fallback: "Couldn't move library",
          }) || res.reason,
        );
      }
    },
  });

  const backup = useMutation({
    mutationFn: async () => {
      clearNotes();
      const res = BackupResultSchema.parse(
        await window.pond.query("library.backupTo", {}),
      );
      if (!res.ok) {
        if (res.reason === "cancelled") return;
        throw new Error(
          pathActionError(res.reason, {
            nested: "Can't back up into a folder inside the library.",
            missing: "No library is open to back up.",
            fallback: "Couldn't back up library",
          }) || res.reason,
        );
      }
      return res;
    },
    onSuccess: (res) => {
      if (!res) return;
      const first =
        "localStorage" in globalThis &&
        localStorage.getItem(FIRST_BACKUP_KEY) !== "1";
      if (first) {
        localStorage.setItem(FIRST_BACKUP_KEY, "1");
        setCelebrate(true);
        playUiSuccess();
      }
      setNote({
        row: "backup",
        message: `Backup saved to ${prettyPath(res.path)}`,
      });
    },
  });

  const importEagle = useMutation({
    mutationFn: async () => {
      clearNotes();
      const picked = PickedEagleLibrarySchema.parse(
        await window.pond.query("saves.pickEagleLibrary", {}),
      );
      if (!picked.ok || !picked.path) return null;
      const res = EagleImportSchema.parse(
        await window.pond.query("saves.importEagleLibrary", {
          path: picked.path,
        }),
      );
      if (!res.ok && res.error === "not_eagle_library") {
        throw new Error("That folder doesn't look like an Eagle library.");
      }
      if (!res.ok && res.imported === 0 && res.skipped === 0) {
        throw new Error(res.error ?? "Couldn't import Eagle library.");
      }
      return res;
    },
    onSuccess: (res) => {
      if (!res) return;
      const parts = [
        res.imported > 0
          ? `Imported ${res.imported} item${res.imported === 1 ? "" : "s"}`
          : null,
        res.skipped > 0 ? `skipped ${res.skipped}` : null,
        res.failed > 0 ? `failed ${res.failed}` : null,
      ].filter(Boolean);
      setNote({
        row: "import",
        message: parts.join(", ") || "Nothing new to import.",
      });
    },
  });

  return (
    <Settings.List>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Library Location</Settings.ItemTitle>
          {info ? (
            <Settings.ItemDescription>
              {prettyPath(info.path)}
            </Settings.ItemDescription>
          ) : null}
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void window.pond.query("library.openInFinder", {})}
          >
            {REVEAL_LABEL}
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Move Library</Settings.ItemTitle>
          <Settings.ItemDescription>
            Copy to a new folder and switch to it. The original stays.
            <StatusNote
              error={
                move.isError
                  ? mutationError(move.error, "Couldn't move library.")
                  : null
              }
            />
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            disabled={move.isPending}
            onClick={() => move.mutate()}
          >
            {move.isPending ? "Moving" : "Move"}
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Backup Library</Settings.ItemTitle>
          <Settings.ItemDescription>
            Copy the pond elsewhere. This library stays open.
            <StatusNote
              error={
                backup.isError
                  ? mutationError(backup.error, "Couldn't back up library.")
                  : null
              }
              status={note?.row === "backup" ? note.message : null}
              celebrate={celebrate}
            />
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            disabled={backup.isPending}
            onClick={() => backup.mutate()}
          >
            {backup.isPending ? "Backing up" : "Backup"}
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Restore Library</Settings.ItemTitle>
          <Settings.ItemDescription>
            Open a `.pond` backup and relaunch.
            <StatusNote
              error={
                openExisting.isError
                  ? mutationError(openExisting.error, "Couldn't open library.")
                  : null
              }
            />
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            disabled={openExisting.isPending}
            onClick={() => openExisting.mutate()}
          >
            {openExisting.isPending ? "Opening" : "Restore"}
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Import Eagle Library</Settings.ItemTitle>
          <Settings.ItemDescription>
            Import from Eagle. Tags and folders become Pond tags.
            <StatusNote
              error={
                importEagle.isError
                  ? mutationError(
                      importEagle.error,
                      "Couldn't import Eagle library.",
                    )
                  : null
              }
              status={note?.row === "import" ? note.message : null}
            />
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            disabled={importEagle.isPending}
            onClick={() => importEagle.mutate()}
          >
            {importEagle.isPending ? "Importing" : "Import"}
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
    </Settings.List>
  );
}

function StatusNote({
  error,
  status,
  celebrate,
}: {
  error?: string | null;
  status?: string | null;
  celebrate?: boolean;
}) {
  const message = error || status;
  if (!message) return null;
  return (
    <span
      className={
        error
          ? styles.error
          : celebrate
            ? styles.successCelebrate
            : styles.success
      }
      role={error ? "alert" : "status"}
    >
      {message}
    </span>
  );
}
