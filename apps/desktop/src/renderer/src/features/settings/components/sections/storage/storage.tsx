import { Button, Select, Settings } from "@pond/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { TransferJobsPanel } from "@/features/downloads/components/transfers/transfer-jobs";
import { playUiSuccess } from "@/features/settings/lib/sounds";
import { REVEAL_LABEL } from "@/shared/lib/platform";
import { prettyPath } from "@/shared/lib/pretty-path";
import styles from "./storage.module.css";

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
  deletedSkipped: z.number().optional(),
  lockedFolders: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        reason: z.enum(["password", "parent_locked"]),
      }),
    )
    .optional(),
  droppedFields: z.array(z.string()).optional(),
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
  const client = useQueryClient();
  const { data: info } = useQuery({
    queryKey: ["library-info"],
    queryFn: async () =>
      LibraryInfoSchema.parse(await window.pond.query("library.info", {})),
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-libraries"],
    queryFn: () => window.pond.query("library.recent", {}),
  });
  const openRecent = useMutation({
    mutationFn: async (path: string) => {
      const result = await window.pond.query("library.switchTo", { path });
      if (!result.ok)
        throw new Error(result.reason || "Couldn't open library.");
    },
  });

  const [note, setNote] = useState<{
    row: "backup" | "import" | "package" | "merge";
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

  const createLibrary = useMutation({
    mutationFn: async () => {
      clearNotes();
      const picked = PickedLibrarySchema.parse(
        await window.pond.query("library.pickFolder", {}),
      );
      if (!picked.ok) return;
      const res = ActionResultSchema.parse(
        await window.pond.query("library.createAt", {
          path: picked.path,
          name: "My Pond",
        }),
      );
      if (!res.ok) throw new Error(`Couldn't create library: ${res.reason}`);
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
      void client.invalidateQueries({ queryKey: ["storage-backup"] });
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

  const restore = useMutation({
    mutationFn: async () => {
      clearNotes();
      const result = BackupResultSchema.parse(
        await window.pond.query("library.restoreBackup", {}),
      );
      if (!result.ok && result.reason !== "cancelled")
        throw new Error(result.reason);
    },
  });

  const importPackage = useMutation({
    mutationFn: async () => {
      clearNotes();
      const result = await window.pond.query("saves.importPackage", {});
      if (!result.ok) {
        if (result.error === "canceled") return;
        throw new Error(result.error || "Couldn't import package.");
      }
      setNote({
        row: "package",
        message: `Imported ${result.imported ?? 0} Saves. Skipped ${result.skipped ?? 0} existing Saves.`,
      });
    },
  });

  const mergeLibrary = useMutation({
    mutationFn: async () => {
      clearNotes();
      const result = await window.pond.query("library.mergeFrom", {});
      if (!result.ok) {
        if (result.error === "canceled") return;
        throw new Error(result.error || "Couldn't merge library.");
      }
      setNote({
        row: "merge",
        message: `Imported ${result.imported ?? 0} Saves. Skipped ${result.skipped ?? 0} existing Saves.`,
      });
    },
  });

  const importEagle = useMutation({
    mutationFn: async (mode: "import" | "preview") => {
      clearNotes();
      const picked = PickedEagleLibrarySchema.parse(
        await window.pond.query("saves.pickEagleLibrary", {}),
      );
      if (!picked.ok || !picked.path) return null;
      const res = EagleImportSchema.parse(
        await window.pond.query("saves.importEagleLibrary", {
          path: picked.path,
          dryRun: mode === "preview",
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
    onSuccess: (res, mode) => {
      if (!res) return;
      const locked = res.lockedFolders?.length
        ? `Locked folders skipped: ${res.lockedFolders
            .map((folder) =>
              folder.reason === "parent_locked"
                ? `${folder.name} (inside a locked folder)`
                : folder.name,
            )
            .join(", ")}`
        : null;
      const deleted =
        (res.deletedSkipped ?? 0) > 0
          ? `skipped ${res.deletedSkipped} deleted`
          : null;
      const importedLabel =
        mode === "preview"
          ? res.imported > 0
            ? `Would import ${res.imported} item${res.imported === 1 ? "" : "s"}`
            : null
          : res.imported > 0
            ? `Imported ${res.imported} item${res.imported === 1 ? "" : "s"}`
            : null;
      const parts = [
        importedLabel,
        res.skipped > 0 ? `skipped ${res.skipped}` : null,
        deleted,
        res.failed > 0 ? `failed ${res.failed}` : null,
        locked,
        res.droppedFields?.length
          ? `Not imported: ${res.droppedFields.join(", ")}`
          : null,
      ].filter(Boolean);
      setNote({
        row: "import",
        message: parts.join(". ") || "Nothing new to import.",
      });
    },
  });

  return (
    <>
      <Settings.List>
        <Settings.Item id="setting-storage-location">
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
        <Settings.Item id="setting-storage-move">
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
              loading={move.isPending}
              onClick={() => move.mutate()}
            >
              {move.isPending ? "Moving" : "Move"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        {recent.length > 1 ? (
          <Settings.Item id="setting-storage-recent">
            <Settings.ItemDetails>
              <Settings.ItemTitle>Recent Libraries</Settings.ItemTitle>
              <Settings.ItemDescription>
                Switch to a library you've opened before.
                <StatusNote error={openRecent.error?.message} />
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={recent.find((entry) => entry.active)?.path ?? ""}
                disabled={openRecent.isPending}
                onValueChange={(path) => {
                  if (path) openRecent.mutate(path);
                }}
              >
                <Select.Trigger aria-label="Recent Libraries">
                  <Select.Value>
                    {(path: string) =>
                      recent.find((entry) => entry.path === path)?.name ??
                      "Choose Library"
                    }
                  </Select.Value>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Items
                        items={recent.map((entry) => ({
                          value: entry.path,
                          label: entry.available
                            ? entry.name
                            : `${entry.name} (Unavailable)`,
                          disabled: !entry.available,
                        }))}
                      />
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
        ) : null}
        <Settings.Item id="setting-storage-backup">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Back Up Library</Settings.ItemTitle>
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
              loading={backup.isPending}
              onClick={() => backup.mutate()}
            >
              {backup.isPending ? "Backing up" : "Backup"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        <Settings.Item id="setting-storage-restore">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Restore Backup</Settings.ItemTitle>
            <Settings.ItemDescription>
              Verify a backup and open a restored copy.
              <StatusNote
                error={
                  restore.isError
                    ? mutationError(restore.error, "Couldn't restore backup.")
                    : null
                }
              />
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              disabled={restore.isPending}
              loading={restore.isPending}
              onClick={() => restore.mutate()}
            >
              {restore.isPending ? "Restoring" : "Restore"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        <Settings.Item id="setting-storage-package">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Import Pond Package</Settings.ItemTitle>
            <Settings.ItemDescription>
              Add Saves, original files, and folders from a .pondpack folder.
              <StatusNote
                error={
                  importPackage.isError
                    ? mutationError(
                        importPackage.error,
                        "Couldn't import package.",
                      )
                    : null
                }
                status={note?.row === "package" ? note.message : null}
              />
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              disabled={importPackage.isPending}
              loading={importPackage.isPending}
              onClick={() => importPackage.mutate()}
            >
              {importPackage.isPending ? "Importing" : "Import"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        <Settings.Item id="setting-storage-merge">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Merge Library</Settings.ItemTitle>
            <Settings.ItemDescription>
              Copy new Saves and folders from another library.
              <StatusNote
                error={mergeLibrary.error?.message}
                status={note?.row === "merge" ? note.message : null}
              />
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              disabled={mergeLibrary.isPending}
              loading={mergeLibrary.isPending}
              onClick={() => mergeLibrary.mutate()}
            >
              {mergeLibrary.isPending ? "Merging" : "Merge"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        <Settings.Item id="setting-storage-new">
          <Settings.ItemDetails>
            <Settings.ItemTitle>New Library</Settings.ItemTitle>
            <Settings.ItemDescription>
              Create a .pond folder on this Mac and switch to it.
              <StatusNote
                error={
                  createLibrary.isError
                    ? mutationError(
                        createLibrary.error,
                        "Couldn't create library.",
                      )
                    : null
                }
              />
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              disabled={createLibrary.isPending}
              loading={createLibrary.isPending}
              onClick={() => createLibrary.mutate()}
            >
              {createLibrary.isPending ? "Creating" : "New"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        <Settings.Item id="setting-storage-open">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Open Library</Settings.ItemTitle>
            <Settings.ItemDescription>
              Open another .pond library and relaunch.
              <StatusNote
                error={
                  openExisting.isError
                    ? mutationError(
                        openExisting.error,
                        "Couldn't open library.",
                      )
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
              loading={openExisting.isPending}
              onClick={() => openExisting.mutate()}
            >
              {openExisting.isPending ? "Opening" : "Open"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
        <Settings.Item id="setting-storage-import">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Import Eagle Library</Settings.ItemTitle>
            <Settings.ItemDescription>
              Import your saves. Locked folders are skipped.
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
              variant="ghost"
              disabled={importEagle.isPending}
              onClick={() => importEagle.mutate("preview")}
            >
              Preview
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={importEagle.isPending}
              loading={importEagle.isPending}
              onClick={() => importEagle.mutate("import")}
            >
              {importEagle.isPending ? "Importing" : "Import"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
      </Settings.List>
      <TransferJobsPanel />
    </>
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
