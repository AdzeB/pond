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
  IconFlipHorizontal2,
  IconFlipVertical2,
  IconTrash,
} from "@pond/icons";
import type { MenuItemSpec } from "@pond/ui";
import {
  CANVAS_ALIGNS,
  CANVAS_CAPS,
  CANVAS_FONTS,
  CANVAS_TEXT_SIZES,
  type CanvasCap,
  type CanvasOutline,
} from "@shared/canvas-contracts";
import type { ReactNode } from "react";
import { platformGlyphs } from "@/shared/lib/shortcuts";
import { type CanvasCommand, glyphsFor } from "./commands";
import type { AlignEdge, LayerMove } from "./document";
import { OUTLINES } from "./outlines";
import {
  ALIGN_LABELS,
  CODE_LANGUAGES,
  FONT_LABELS,
  TEXT_SIZE_LABELS,
  type TextStyle,
} from "./text-style";

export type MenuTarget =
  | { kind: "pane" }
  | { kind: "edge" }
  | {
      kind: "nodes";
      count: number;
      movable: number;
      locked: boolean;
      grouped: boolean;
      duplicable: boolean;
      canRotate: boolean;
      canFlip: boolean;
      canConvert: boolean;
      canSort: boolean;
      canCrop: boolean;
      cropped: boolean;
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
      { type: "separator" },
      ...exportItems("board", run),
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
    ...(target.count > 1
      ? [item("Group Selection", { type: "group" }, run)]
      : []),
    ...(target.grouped ? [item("Ungroup", { type: "ungroup" }, run)] : []),
    item("Wrap in Section", { type: "wrap" }, run),
    item(target.locked ? "Unlock" : "Lock", { type: "lock" }, run),
    ...(target.canRotate
      ? [
          item("Rotate Clockwise", { type: "rotate", delta: 15 }, run),
          item("Rotate Counterclockwise", { type: "rotate", delta: -15 }, run),
        ]
      : []),
    ...(target.canFlip
      ? [
          item("Flip Horizontal", { type: "flip", axis: "horizontal" }, run, {
            icon: <IconFlipHorizontal2 />,
          }),
          item("Flip Vertical", { type: "flip", axis: "vertical" }, run, {
            icon: <IconFlipVertical2 />,
          }),
        ]
      : []),
    ...(target.canConvert
      ? [item("Convert to Notes", { type: "convert-notes" }, run)]
      : []),
    ...(target.canSort
      ? [item("Sort by Color", { type: "sort-notes" }, run)]
      : []),
    ...(target.canCrop ? [item("Crop", { type: "crop" }, run)] : []),
    ...(target.cropped
      ? [item("Reset Crop", { type: "reset-crop" }, run)]
      : []),
    { type: "separator" },
    ...exportItems("selection", run),
    { type: "separator" },
    item("Delete", { type: "delete" }, run, {
      icon: <IconTrash />,
      shortcut: platformGlyphs(["⌫"]),
      variant: "destructive",
      disabled: target.locked,
    }),
  ];
}

function exportItems(scope: "board" | "selection", run: Run): MenuItemSpec[] {
  const noun = scope === "board" ? "Board" : "Selection";
  const glyphs = glyphsFor({ type: "export", format: "png" });
  return [
    item(
      `Export ${noun} as PNG`,
      { type: "export", format: "png", scope },
      run,
      {
        shortcut: glyphs ? platformGlyphs(glyphs) : undefined,
      },
    ),
    item(
      `Export ${noun} as PDF`,
      { type: "export", format: "pdf", scope },
      run,
    ),
  ];
}

function choice<Value>(
  label: string,
  value: Value,
  current: Value | null,
  pick: (value: Value) => void,
  icon?: ReactNode,
): MenuItemSpec {
  return {
    type: "checkbox",
    label,
    icon,
    indicator: "check",
    checked: current === value,
    onCheckedChange: () => pick(value),
  };
}

export function outlineItems(
  current: CanvasOutline | null,
  pick: (outline: CanvasOutline) => void,
): MenuItemSpec[] {
  return OUTLINES.map(({ outline, label, Icon }) =>
    choice(label, outline, current, pick, <Icon />),
  );
}

export function textItems(
  current: TextStyle,
  pick: (style: TextStyle) => void,
): MenuItemSpec[] {
  return [
    {
      type: "group",
      label: "Size",
      items: CANVAS_TEXT_SIZES.map((size) =>
        choice(TEXT_SIZE_LABELS[size], size, current.textSize ?? null, () =>
          pick({ textSize: size }),
        ),
      ),
    },
    { type: "separator" },
    {
      type: "group",
      label: "Font",
      items: CANVAS_FONTS.map((font) =>
        choice(FONT_LABELS[font], font, current.font ?? null, () =>
          pick({ font }),
        ),
      ),
    },
    { type: "separator" },
    {
      type: "group",
      label: "Align",
      items: CANVAS_ALIGNS.map((align) =>
        choice(ALIGN_LABELS[align], align, current.align ?? null, () =>
          pick({ align }),
        ),
      ),
    },
  ];
}

export type TableChange =
  | "add-row"
  | "add-column"
  | "remove-row"
  | "remove-column";

export function tableItems(
  change: (change: TableChange) => void,
): MenuItemSpec[] {
  return [
    { label: "Add Row", onClick: () => change("add-row") },
    { label: "Add Column", onClick: () => change("add-column") },
    { type: "separator" },
    { label: "Delete Last Row", onClick: () => change("remove-row") },
    { label: "Delete Last Column", onClick: () => change("remove-column") },
  ];
}

export function languageItems(
  current: string | null,
  pick: (language: string) => void,
): MenuItemSpec[] {
  return CODE_LANGUAGES.map(({ id, label }) =>
    choice<string>(label, id, current, pick),
  );
}

const CAP_LABELS = {
  none: "None",
  arrow: "Arrow",
  triangle: "Triangle",
  circle: "Circle",
  diamond: "Diamond",
  one: "One",
  many: "Many",
  "zero-one": "Zero or One",
  "one-many": "One or Many",
  "zero-many": "Zero or Many",
} satisfies Record<CanvasCap, string>;

function isRelation(cap: CanvasCap): boolean {
  return (
    cap === "one" ||
    cap === "many" ||
    cap === "zero-one" ||
    cap === "one-many" ||
    cap === "zero-many"
  );
}

export function capItems(
  current: CanvasCap,
  pick: (cap: CanvasCap) => void,
): MenuItemSpec[] {
  const caps = CANVAS_CAPS.map((cap) =>
    choice(CAP_LABELS[cap], cap, current, pick),
  );
  const relation = CANVAS_CAPS.findIndex(isRelation);
  return [
    ...caps.slice(0, relation),
    { type: "separator" },
    { type: "group", label: "Relation", items: caps.slice(relation) },
  ];
}
