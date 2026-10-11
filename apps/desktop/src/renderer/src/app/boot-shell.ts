import { type ShellHint, ShellHintSchema } from "@shared/shell-hint";
import { libraryScopedKey } from "@/shared/lib/library-scope";

/** Runs from the bundle because the packaged CSP blocks inline <script>. */

const ANCHORS = [
  ["bgL", "--ds-bg-l"],
  ["bgC", "--ds-bg-c"],
  ["bgH", "--ds-bg-h"],
  ["fgL", "--ds-fg-l"],
  ["fgC", "--ds-fg-c"],
  ["fgH", "--ds-fg-h"],
  ["accentL", "--ds-accent-l"],
  ["accentC", "--ds-accent-c"],
  ["accentH", "--ds-accent-h"],
  ["contrast", "--ds-contrast"],
] as const;

const BOOT_FAILSAFE_MS = 4000;

function readStoredShell(): ShellHint {
  try {
    const stored = ShellHintSchema.safeParse(
      JSON.parse(localStorage.getItem(libraryScopedKey("pondShell")) ?? "{}"),
    );
    return stored.success ? stored.data : {};
  } catch {
    return {};
  }
}

function applyAnchors(shell: ShellHint): void {
  for (const [key, prop] of ANCHORS) {
    const value = shell[key];
    if (value !== undefined) {
      document.documentElement.style.setProperty(prop, String(value));
    }
  }
}

function paintShell(): void {
  const shell: ShellHint = {
    ...readStoredShell(),
    ...window.__pondShell,
  };
  const doc = document.documentElement;

  const theme =
    shell.theme ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  doc.setAttribute("data-theme", theme);
  doc.classList.add(theme);

  applyAnchors(shell);
  if (shell.pointerCursors) doc.setAttribute("data-pointer-cursors", "true");
  doc.setAttribute(
    "data-platform",
    /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "mac" : "other",
  );

  performance.mark("pondAppStart");
}

function armBootFailsafe(): void {
  window.setTimeout(() => {
    const el = document.getElementById("boot");
    if (!el || el.dataset.state === "out") return;
    el.dataset.state = "out";
    el.setAttribute("aria-busy", "false");
    window.setTimeout(() => el.remove(), 220);
  }, BOOT_FAILSAFE_MS);
}

paintShell();
armBootFailsafe();
