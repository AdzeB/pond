import type { Command } from "./types";

export const NAVIGATION_COMMANDS: Command[] = [
  {
    id: "nav.library",
    label: "Go to Library",
    group: "Navigation",
    scope: "all",
    keywords: ["home", "all saves"],
    chord: ["g", "l"],
    perform: ({ navigate, close }) => {
      navigate("/", { viewTransition: true });
      close();
    },
  },
  {
    id: "nav.trash",
    label: "Go to Trash",
    group: "Navigation",
    scope: "all",
    keywords: ["deleted"],
    chord: ["g", "t"],
    perform: ({ navigate, close }) => {
      navigate("/trash", { viewTransition: true });
      close();
    },
  },
  {
    id: "nav.settings",
    label: "Go to Settings",
    group: "Navigation",
    scope: "all",
    keywords: ["preferences", "options"],
    shortcut: ["⌘", ","],
    chord: ["g", "s"],
    perform: ({ navigate, close }) => {
      navigate("/settings", { viewTransition: true });
      close();
    },
  },
];
