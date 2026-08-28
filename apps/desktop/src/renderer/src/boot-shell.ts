import { z } from "zod";
import { pondScopedKey } from "@/lib/pond-scope";

/**
 * Paints the shell before React mounts: theme, colour anchors, and the mac traffic-light gutter.
 * This runs from the bundle because the packaged CSP has no `'unsafe-inline'` for scripts, so an
 * inline <script> in index.html is blocked in every packaged build.
 */

const ShellHintSchema = z
  .object({
    theme: z.enum(["light", "dark"]).optional(),
    bgL: z.number().optional(),
    bgC: z.number().optional(),
    bgH: z.number().optional(),
    fgL: z.number().optional(),
    fgC: z.number().optional(),
    fgH: z.number().optional(),
    accentL: z.number().optional(),
    accentC: z.number().optional(),
    accentH: z.number().optional(),
    contrast: z.number().optional(),
    background: z.string().optional(),
    pointerCursors: z.boolean().optional(),
    /** Older mirrors wrote one base anchor instead of separate bg/fg anchors. */
    baseL: z.number().optional(),
    baseC: z.number().optional(),
    baseH: z.number().optional(),
  })
  .catch({});

type ShellHint = z.infer<typeof ShellHintSchema>;

/** Only the numeric anchors; `theme`, `background` and `pointerCursors` are read on their own. */
type AnchorKey =
  | "bgL"
  | "bgC"
  | "bgH"
  | "fgL"
  | "fgC"
  | "fgH"
  | "accentL"
  | "accentC"
  | "accentH"
  | "contrast"
  | "baseL"
  | "baseC"
  | "baseH";

const ANCHORS: ReadonlyArray<[AnchorKey, string]> = [
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
];

const LEGACY_ANCHORS: ReadonlyArray<[AnchorKey, string]> = [
  ["baseL", "--ds-bg-l"],
  ["baseC", "--ds-bg-c"],
  ["baseH", "--ds-bg-h"],
  ["accentL", "--ds-accent-l"],
  ["accentC", "--ds-accent-c"],
  ["accentH", "--ds-accent-h"],
  ["contrast", "--ds-contrast"],
];

const BOOT_FAILSAFE_MS = 4000;

function readStoredShell(): ShellHint {
  try {
    return ShellHintSchema.parse(
      JSON.parse(localStorage.getItem(pondScopedKey("pondShell")) ?? "{}"),
    );
  } catch {
    return {};
  }
}

function applyAnchors(
  doc: HTMLElement,
  shell: ShellHint,
  anchors: ReadonlyArray<[AnchorKey, string]>,
): void {
  for (const [key, prop] of anchors) {
    const value = shell[key];
    if (value !== undefined) doc.style.setProperty(prop, String(value));
  }
}

function paintShell(): void {
  const hint = ShellHintSchema.parse(window.__pondShell ?? {});
  const shell: ShellHint = { ...readStoredShell(), ...hint };
  const doc = document.documentElement;

  const theme =
    shell.theme ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  doc.setAttribute("data-theme", theme);
  doc.classList.add(theme);

  applyAnchors(doc, shell, ANCHORS);
  if (shell.bgL === undefined) applyAnchors(doc, shell, LEGACY_ANCHORS);
  if (shell.pointerCursors) doc.setAttribute("data-pointer-cursors", "true");

  /** The mac gutter that keeps the toolbar clear of the traffic lights hangs off this. */
  doc.setAttribute(
    "data-platform",
    /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "mac" : "other",
  );

  performance.mark("pondAppStart");
}

/** The React tree dismisses the cover once it paints; this is the escape hatch when it never does. */
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
