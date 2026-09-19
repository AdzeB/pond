import { Button, Settings, Switch } from "@pond/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { refreshPrefs } from "@/features/settings/state/prefs";
import styles from "./styles.module.css";

const PickedEagleLibrarySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), path: z.string() }),
  z.object({ ok: z.literal(false), path: z.null() }),
]);

const EagleImportSchema = z.object({
  ok: z.boolean(),
  imported: z.number(),
  skipped: z.number(),
  failed: z.number(),
  deletedSkipped: z.number(),
  lockedFolders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      reason: z.enum(["password", "parent_locked"]),
    }),
  ),
  droppedFields: z.array(z.string()),
  error: z.string().optional(),
  shortcuts: z.object({
    status: z.enum([
      "available",
      "missing",
      "invalid",
      "unreadable",
      "apply_failed",
    ]),
    importable: z.number(),
    imported: z.number(),
  }),
});

type EagleImportResult = z.infer<typeof EagleImportSchema>;

interface Preview {
  path: string;
  result: EagleImportResult;
}

function resultMessage(
  result: EagleImportResult,
  mode: "import" | "preview",
): string {
  const locked = result.lockedFolders.length
    ? `Locked folders skipped: ${result.lockedFolders
        .map((folder) =>
          folder.reason === "parent_locked"
            ? `${folder.name} (inside a locked folder)`
            : folder.name,
        )
        .join(", ")}`
    : null;
  const itemCount =
    mode === "preview"
      ? result.imported > 0
        ? `Would import ${result.imported} item${result.imported === 1 ? "" : "s"}`
        : null
      : result.imported > 0
        ? `Imported ${result.imported} item${result.imported === 1 ? "" : "s"}`
        : null;
  const shortcutCount =
    mode === "preview" && result.shortcuts.importable > 0
      ? `${result.shortcuts.importable} compatible hotkey${result.shortcuts.importable === 1 ? "" : "s"} available`
      : result.shortcuts.imported > 0
        ? `Imported ${result.shortcuts.imported} hotkey${result.shortcuts.imported === 1 ? "" : "s"}`
        : result.shortcuts.status === "apply_failed"
          ? "Couldn’t import hotkeys"
          : null;
  const parts = [
    itemCount,
    result.skipped > 0 ? `skipped ${result.skipped}` : null,
    result.deletedSkipped > 0
      ? `skipped ${result.deletedSkipped} deleted`
      : null,
    result.failed > 0 ? `failed ${result.failed}` : null,
    locked,
    result.droppedFields.length
      ? `Not imported: ${result.droppedFields.join(", ")}`
      : null,
    shortcutCount,
  ].filter(Boolean);
  return parts.join(". ") || "Nothing new to import.";
}

export function EagleImport() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importShortcuts, setImportShortcuts] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (mode: "import" | "preview") => {
      setStatus(null);
      let path = mode === "import" ? preview?.path : null;
      if (!path) {
        const picked = PickedEagleLibrarySchema.parse(
          await window.pond.query("saves.pickEagleLibrary", {}),
        );
        if (!picked.ok || !picked.path) return null;
        path = picked.path;
      }
      const result = EagleImportSchema.parse(
        await window.pond.query("saves.importEagleLibrary", {
          path,
          dryRun: mode === "preview",
          importShortcuts:
            mode === "import" && preview?.path === path && importShortcuts,
        }),
      );
      if (!result.ok && result.error === "not_eagle_library")
        throw new Error("That folder doesn’t look like an Eagle library.");
      if (!result.ok && result.imported === 0 && result.skipped === 0)
        throw new Error(result.error ?? "Couldn’t import Eagle library.");
      if (result.shortcuts.imported > 0) {
        await refreshPrefs().catch(() => {});
      }
      return { mode, path, result };
    },
    onSuccess: (value) => {
      if (!value) return;
      if (value.mode === "preview") {
        setPreview({ path: value.path, result: value.result });
        setImportShortcuts(false);
      }
      setStatus(resultMessage(value.result, value.mode));
    },
  });

  const shortcutCount = preview?.result.shortcuts.importable ?? 0;
  return (
    <Settings.Item id="setting-library-import">
      <Settings.ItemDetails>
        <Settings.ItemTitle>Import Eagle Library</Settings.ItemTitle>
        <Settings.ItemDescription>
          Import your Saves. Locked folders are skipped.
        </Settings.ItemDescription>
        {shortcutCount > 0 ? (
          <div className={styles.option}>
            <span id="import-eagle-shortcuts-label">
              Import Hotkeys
              <small>
                Replace Pond hotkeys with {shortcutCount} compatible binding
                {shortcutCount === 1 ? "" : "s"} from Eagle on this Mac.
              </small>
            </span>
            <Switch.Root
              aria-labelledby="import-eagle-shortcuts-label"
              checked={importShortcuts}
              disabled={mutation.isPending}
              onCheckedChange={setImportShortcuts}
            />
          </div>
        ) : null}
        {mutation.error ? (
          <p className={styles.error} role="alert">
            {mutation.error.message}
          </p>
        ) : status ? (
          <p className={styles.status} role="status">
            {status}
          </p>
        ) : null}
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("preview")}
        >
          Preview
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={mutation.isPending}
          loading={mutation.isPending}
          onClick={() => mutation.mutate("import")}
        >
          {mutation.isPending ? "Importing" : "Import"}
        </Button>
      </Settings.ItemControl>
    </Settings.Item>
  );
}
