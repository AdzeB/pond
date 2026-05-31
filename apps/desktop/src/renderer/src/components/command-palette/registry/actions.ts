import { toggleInspector, toggleSidebar } from "@/lib/shell-state";
import type { Command } from "./types";

export const ACTION_COMMANDS: Command[] = [
  {
    id: "view.sidebar.toggle",
    label: "Toggle sidebar",
    group: "Actions",
    scope: "actions",
    keywords: ["sidebar", "navigation", "hide", "show", "collapse"],
    shortcut: ["["],
    perform: ({ close }) => {
      close();
      toggleSidebar();
    },
  },
  {
    id: "view.inspector.toggle",
    label: "Toggle inspector",
    group: "Actions",
    scope: "actions",
    keywords: ["inspector", "metadata", "hide", "show", "pane"],
    shortcut: ["]"],
    perform: ({ close }) => {
      close();
      toggleInspector();
    },
  },
  {
    id: "view.layout.cycle",
    label: "Cycle layout",
    description: "Waterfall → Grid → Justified → List",
    group: "Actions",
    scope: "actions",
    keywords: ["layout", "view", "cycle", "switch", "waterfall", "grid"],
    shortcut: ["⌘", "B"],
    when: (ctx) => !ctx.pathname.startsWith("/settings"),
    perform: ({ close }) => {
      close();
      // `useCardActions` owns the URL. Re-emit Cmd+B instead of
      // duplicating its layout bookkeeping here.
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "b",
          code: "KeyB",
          metaKey: true,
          bubbles: true,
        }),
      );
    },
  },
  {
    id: "action.theme.light",
    label: "Switch to light theme",
    group: "Actions",
    scope: "actions",
    keywords: ["theme", "light", "appearance"],
    chord: ["t", "l"],
    perform: ({ setTheme, close }) => {
      setTheme("light");
      close();
    },
  },
  {
    id: "action.theme.dark",
    label: "Switch to dark theme",
    group: "Actions",
    scope: "actions",
    keywords: ["theme", "dark", "appearance", "night"],
    chord: ["t", "d"],
    perform: ({ setTheme, close }) => {
      setTheme("dark");
      close();
    },
  },
  {
    id: "action.theme.system",
    label: "Match system theme",
    group: "Actions",
    scope: "actions",
    keywords: ["theme", "system", "auto", "appearance"],
    chord: ["t", "s"],
    perform: ({ setTheme, close }) => {
      setTheme("system");
      close();
    },
  },
  {
    id: "action.quick-capture",
    label: "Quick capture",
    description: "Drop a URL into Pond",
    group: "Actions",
    scope: "actions",
    keywords: ["new", "save", "add", "capture"],
    chord: ["n", "s"],
    perform: ({ navigate, close }) => {
      navigate("/?capture=1", { viewTransition: true });
      close();
    },
  },
  {
    id: "action.undo",
    label: "Undo last action",
    group: "Actions",
    scope: "actions",
    keywords: ["revert"],
    shortcut: ["⌘", "Z"],
    perform: async ({ pond, close }) => {
      close();
      await pond.undo();
    },
  },
  {
    id: "action.redo",
    label: "Redo last action",
    group: "Actions",
    scope: "actions",
    keywords: ["repeat"],
    shortcut: ["⇧", "⌘", "Z"],
    perform: async ({ pond, close }) => {
      close();
      await pond.redo();
    },
  },
  {
    id: "action.refresh.start",
    label: "Refresh metadata for all saves",
    description: "Re-run the OG / scraper pipeline against every save",
    group: "Actions",
    scope: "actions",
    keywords: ["refresh", "metadata", "backfill", "all"],
    perform: async ({ pond, toast, close }) => {
      close();
      const r = await pond.refreshBackfillStart({});
      if (r.ok) toast.success(`Refreshing ${r.total} saves`);
      else toast.warn(`Refresh: ${r.reason.replace("_", " ")}`);
    },
  },
  {
    id: "action.refresh.cancel",
    label: "Cancel metadata refresh",
    group: "Actions",
    scope: "actions",
    keywords: ["cancel", "stop", "refresh", "backfill"],
    perform: async ({ pond, close }) => {
      close();
      await pond.refreshBackfillCancel();
    },
  },
  {
    id: "action.sync.now",
    label: "Sync all sources now",
    description:
      "Run an immediate background-style sync against every connected source",
    group: "Actions",
    scope: "actions",
    keywords: ["sync", "pull", "check", "refresh", "update", "fetch"],
    perform: async ({ pond, toast, close }) => {
      close();
      await pond.syncRunAll();
      toast.success("Sync started");
    },
  },
  {
    id: "action.sync.open",
    label: "Open Sync",
    description: "Open the sync page",
    group: "Actions",
    scope: "actions",
    keywords: ["sync", "sources", "schedule", "history"],
    perform: ({ navigate, close }) => {
      navigate("/sync", { viewTransition: true });
      close();
    },
  },
  {
    id: "action.trash.empty",
    label: "Empty Trash",
    description: "Permanently delete every item in Trash",
    group: "Actions",
    scope: "actions",
    keywords: ["empty", "trash", "delete", "purge"],
    // Surface only when the user is already looking at /trash:
    // anywhere else the command is destructive without
    // explanation. Searchable when they type "empty trash".
    when: (ctx) => ctx.pathname.startsWith("/trash"),
    perform: async ({ pond, toast, close }) => {
      close();
      await pond.query("saves.emptyTrash", {});
      toast.success("Trash emptied");
    },
  },
  {
    id: "action.trash.restore-all",
    label: "Restore all from Trash",
    group: "Actions",
    scope: "actions",
    keywords: ["restore", "trash", "undelete"],
    when: (ctx) => ctx.pathname.startsWith("/trash"),
    perform: async ({ pond, toast, close }) => {
      close();
      await pond.query("saves.restoreAll", {});
      toast.success("Restored all saves from Trash");
    },
  },
  {
    id: "action.library.duplicates",
    label: "Find duplicates",
    description: "Review exact and visually similar saves",
    group: "Actions",
    scope: "actions",
    keywords: ["duplicate", "similar", "dedupe", "clean", "redundant"],
    perform: ({ navigate, close }) => {
      navigate("/duplicates", { viewTransition: true });
      close();
    },
  },
  {
    id: "action.library.compute-colors",
    label: "Compute colors for images",
    description: "Extract dominant-color palettes for color search",
    group: "Actions",
    scope: "actions",
    keywords: ["color", "palette", "swatch", "compute", "backfill"],
    perform: async ({ pond, toast, close }) => {
      close();
      const res = (await pond.query("saves.backfillColors", {})) as {
        ok: boolean;
        updated?: number;
      };
      if (res.ok) {
        const n = res.updated ?? 0;
        toast.success(`Computed colors for ${n} image${n === 1 ? "" : "s"}`);
      }
    },
  },
  {
    id: "action.library.rescan",
    label: "Rescan library",
    description: "Re-index every item from disk",
    group: "Actions",
    scope: "actions",
    keywords: ["rescan", "library", "index", "scan"],
    perform: async ({ pond, toast, close }) => {
      close();
      await pond.query("library.rescan", {});
      toast.success("Rescan started");
    },
  },
  {
    id: "action.library.open-in-finder",
    label: "Open library in Finder",
    group: "Actions",
    scope: "actions",
    keywords: ["finder", "explorer", "library", "open", "reveal"],
    perform: async ({ pond, close }) => {
      close();
      await pond.query("library.openInFinder", {});
    },
  },
  {
    id: "action.library.verify",
    label: "Verify library integrity",
    group: "Actions",
    scope: "actions",
    keywords: ["verify", "integrity", "library", "check"],
    perform: async ({ pond, toast, close }) => {
      close();
      await pond.query("library.verifyIntegrity", {});
      toast.success("Integrity check started");
    },
  },
  {
    id: "action.library.move",
    label: "Move library…",
    description: "Pick a new location for the on-disk library",
    group: "Actions",
    scope: "actions",
    keywords: ["move", "library", "relocate"],
    perform: async ({ pond, close }) => {
      close();
      await pond.query("library.move", {});
    },
  },
  {
    id: "action.api.restart",
    label: "Restart local API",
    group: "Actions",
    scope: "actions",
    keywords: ["api", "restart", "server", "extension"],
    perform: async ({ pond, toast, close }) => {
      close();
      await pond.query("api.restart", {});
      toast.success("API restarting");
    },
  },
  {
    id: "action.developer.logs",
    label: "Open developer logs",
    group: "Actions",
    scope: "actions",
    keywords: ["logs", "debug", "developer"],
    perform: async ({ pond, close }) => {
      close();
      await pond.query("developer.openLogs", {});
    },
  },
  {
    id: "action.developer.ipc-inspector",
    label: "Open IPC inspector",
    group: "Actions",
    scope: "actions",
    keywords: ["ipc", "inspect", "debug", "developer"],
    perform: async ({ pond, close }) => {
      close();
      await pond.query("developer.openIpcInspector", {});
    },
  },
  {
    id: "action.updates.check",
    label: "Check for updates",
    group: "Actions",
    scope: "actions",
    keywords: ["update", "check", "version"],
    perform: async ({ pond, close }) => {
      close();
      await pond.query("updates.checkNow", {});
    },
  },
];
