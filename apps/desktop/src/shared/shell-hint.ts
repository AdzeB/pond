import { z } from "zod";

const Anchor = z.number().optional();

/** Theme anchors painted before React mounts so the window never flashes the wrong palette. */
export const ShellHintSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  background: z.string().optional(),
  pointerCursors: z.boolean().optional(),
  bgL: Anchor,
  bgC: Anchor,
  bgH: Anchor,
  fgL: Anchor,
  fgC: Anchor,
  fgH: Anchor,
  accentL: Anchor,
  accentC: Anchor,
  accentH: Anchor,
  contrast: Anchor,
});

export type ShellHint = z.infer<typeof ShellHintSchema>;

export const SHELL_HINT_ARG = "--pond-shell=";
