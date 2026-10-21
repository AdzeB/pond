import {
  IconAlign2Bottom,
  IconAlign2Horizontal,
  IconAlign2Left,
  IconAlign2Right,
  IconAlign2Top,
  IconAlign2Vertical,
  IconBroom,
  IconCopy,
  IconDuplicate,
  IconTrash,
} from "@pond/icons";
import type { MenuItemSpec } from "@pond/ui";
import type { ReactNode } from "react";
import { platformGlyphs } from "@/shared/lib/shortcuts";
import { type CanvasCommand, glyphsFor } from "./commands";
import type { AlignEdge, LayerMove } from "./document";

export type MenuTarget =
  | { kind: "pane" }
  | { kind: "edge" }
  | {
      kind: "nodes";
      movable: number;
      locked: boolean;
      duplicable: boolean;
    };

type Run = (command: CanvasCommand) => void;

const ALIGNMENTS: ReadonlyArray<{
  edge: AlignEdge;
  label: string;
  icon: ReactNode;
}> = [
  { edge: "left", label: "Align Left", icon: <IconAlign2Left /> },
  {
    edge: "center",
    label: "Align Horizontal Centers",
    icon: <IconAlign2Horizontal />,
  },
  { edge: "right", label: "Align Right", icon: <IconAlign2Right /> },
  { edge: "top", label: "Align Top", icon: <IconAlign2Top /> },
  {
    edge: "middle",
    label: "Align Vertical Centers",
    icon: <IconAlign2Vertical />,
  },
  { edge: "bottom", label: "Align Bottom", icon: <IconAlign2Bottom /> },
];

const LAYERS: ReadonlyArray<{ move: LayerMove; label: string }> = [
  { move: "front", label: "Bring to Front" },
  { move: "forward", label: "Bring Forward" },
  { move: "backward", label: "Send Backward" },
  { move: "back", label: "Send to Back" },
];

function item(
  label: string,
  command: CanvasCommand,
  run: Run,
  extra: Partial<Extract<MenuItemSpec, { type?: "item" }>> = {},
): MenuItemSpec {
  const glyphs = glyphsFor(command);
  return {
    label,
    shortcut: glyphs ? platformGlyphs(glyphs) : undefined,
    onClick: () => run(command),
    ...extra,
  };
}

export function arrangeItems(movable: number, run: Run): MenuItemSpec[] {
  return [
    ...ALIGNMENTS.map(({ edge, label, icon }) =>
      item(label, { type: "align", edge }, run, { icon }),
    ),
    { type: "separator" },
    item(
      "Distribute Horizontal Spacing",
      { type: "distribute", axis: "horizontal" },
      run,
      { disabled: movable < 3 },
    ),
    item(
      "Distribute Vertical Spacing",
      { type: "distribute", axis: "vertical" },
      run,
      { disabled: movable < 3 },
    ),
    item("Tidy Up", { type: "tidy" }, run, { icon: <IconBroom /> }),
  ];
}

export function boardItems(target: MenuTarget, run: Run): MenuItemSpec[] {
  if (target.kind === "pane") {
    return [
      item("Select All", { type: "select-all" }, run),
      { type: "separator" },
      item("Zoom to Fit", { type: "zoom", to: "fit" }, run),
      item("Zoom to 100%", { type: "zoom", to: "actual" }, run),
    ];
  }
  if (target.kind === "edge") {
    return [
      item("Delete", { type: "delete" }, run, {
        icon: <IconTrash />,
        shortcut: platformGlyphs(["⌫"]),
        variant: "destructive",
      }),
    ];
  }
  return [
    item("Cut", { type: "cut" }, run, { disabled: target.locked }),
    item("Copy", { type: "copy" }, run, { icon: <IconCopy /> }),
    ...(target.duplicable
      ? [
          item("Duplicate", { type: "duplicate" }, run, {
            icon: <IconDuplicate />,
          }),
        ]
      : []),
    { type: "separator" },
    ...LAYERS.map(({ move, label }) =>
      item(label, { type: "layer", move }, run),
    ),
    { type: "separator" },
    ...(target.movable > 1
      ? [
          {
            type: "submenu" as const,
            label: "Arrange",
            icon: <IconAlign2Left />,
            items: arrangeItems(target.movable, run),
          },
        ]
      : []),
    item(target.locked ? "Unlock" : "Lock", { type: "lock" }, run),
    { type: "separator" },
    item("Delete", { type: "delete" }, run, {
      icon: <IconTrash />,
      shortcut: platformGlyphs(["⌫"]),
      variant: "destructive",
      disabled: target.locked,
    }),
  ];
}
