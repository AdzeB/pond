import { z } from "zod";
import { pondScopedKey } from "@/lib/pond-scope";

/** Runs from the bundle because the packaged CSP blocks the inline <script> this used to live in. */

const num = z.number().optional();

const ShellHintSchema = z
  .object({
    theme: z.enum(["light", "dark"]).optional(),
    background: z.string().optional(),
    pointerCursors: z.boolean().optional(),
    bgL: num,
    bgC: num,
    bgH: num,
    fgL: num,
    fgC: num,
    fgH: num,
    accentL: num,
    accentC: num,
    accentH: num,
    contrast: num,
    baseL: num,
    baseC: num,
    baseH: num,
  })
  .catch({});

type ShellHint = z.infer<typeof ShellHintSchema>;

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

/** Older mirrors wrote one base anchor instead of separate bg and fg anchors. */
const LEGACY_ANCHORS = [
  ["baseL", "--ds-bg-l"],
  ["baseC", "--ds-bg-c"],
  ["baseH", "--ds-bg-h"],
  ["accentL", "--ds-accent-l"],
  ["accentC", "--ds-accent-c"],
  ["accentH", "--ds-accent-h"],
  ["contrast", "--ds-contrast"],
] as const;

type Anchors = typeof ANCHORS | typeof LEGACY_ANCHORS;

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

function applyAnchors(shell: ShellHint, anchors: Anchors): void {
  for (const [key, prop] of anchors) {
    const value = shell[key];
    if (value !== undefined) {
      document.documentElement.style.setProperty(prop, String(value));
    }
  }
}

function paintShell(): void {
  const shell: ShellHint = {
    ...readStoredShell(),
    ...ShellHintSchema.parse(window.__pondShell ?? {}),
  };
  const doc = document.documentElement;

  const theme =
    shell.theme ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  doc.setAttribute("data-theme", theme);
  doc.classList.add(theme);

  applyAnchors(shell, ANCHORS);
  if (shell.bgL === undefined) applyAnchors(shell, LEGACY_ANCHORS);
  if (shell.pointerCursors) doc.setAttribute("data-pointer-cursors", "true");
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
