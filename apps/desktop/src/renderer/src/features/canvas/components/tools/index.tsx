import {
  IconCode2,
  IconCursor,
  IconFigures,
  IconHand,
  IconHighlighter,
  IconImages,
  IconMindMap,
  IconNoteEdit,
  IconSection,
  IconTable,
  IconText,
} from "@pond/icons";
import { Button, cssVars, Keyboard, Toolbar, Tooltip } from "@pond/ui";
import {
  CANVAS_COLORS,
  type CanvasColor,
  type CanvasOutline,
} from "@shared/canvas-contracts";
import { useLayoutEffect, useRef } from "react";
import { platformGlyphs } from "@/shared/lib/shortcuts";
import { CANVAS_COLOR_LABELS, INK } from "../../lib/colors";
import { OUTLINES } from "../../lib/outlines";
import { AddSaves } from "../add-saves";
import styles from "./styles.module.css";

export type CanvasTool =
  | "select"
  | "hand"
  | "note"
  | "figure"
  | "text"
  | "pen"
  | "section"
  | "table"
  | "code"
  | "topic";

function shiftedTool(key: string): CanvasTool | undefined {
  switch (key.toLowerCase()) {
    case "s":
      return "section";
    case "t":
      return "table";
    case "c":
      return "code";
    case "m":
      return "topic";
    default:
      return undefined;
  }
}

export function toolForKey(
  key: string,
  shift: boolean,
): CanvasTool | undefined {
  if (shift) return shiftedTool(key);
  switch (key.toLowerCase()) {
    case "v":
      return "select";
    case "h":
      return "hand";
    case "s":
      return "note";
    case "r":
      return "figure";
    case "t":
      return "text";
    case "m":
      return "pen";
    default:
      return undefined;
  }
}

/** Tools whose items take a color from the palette. */
export const COLORED_TOOLS: ReadonlySet<CanvasTool> = new Set([
  "note",
  "pen",
  "figure",
  "section",
  "table",
  "topic",
]);

const MODES: ReadonlyArray<{
  tool: CanvasTool;
  label: string;
  shortcut: readonly string[];
  Icon: typeof IconCursor;
}> = [
  { tool: "select", label: "Select", shortcut: ["V"], Icon: IconCursor },
  { tool: "hand", label: "Hand", shortcut: ["H"], Icon: IconHand },
  { tool: "pen", label: "Marker", shortcut: ["M"], Icon: IconHighlighter },
  { tool: "note", label: "Sticky Note", shortcut: ["S"], Icon: IconNoteEdit },
  { tool: "figure", label: "Shape", shortcut: ["R"], Icon: IconFigures },
  { tool: "text", label: "Text", shortcut: ["T"], Icon: IconText },
  {
    tool: "section",
    label: "Section",
    shortcut: ["⇧", "S"],
    Icon: IconSection,
  },
  { tool: "table", label: "Table", shortcut: ["⇧", "T"], Icon: IconTable },
  { tool: "code", label: "Code Block", shortcut: ["⇧", "C"], Icon: IconCode2 },
  { tool: "topic", label: "Mind Map", shortcut: ["⇧", "M"], Icon: IconMindMap },
];

function place(mark: HTMLElement, button: HTMLElement, animate: boolean) {
  if (!animate) mark.dataset.snap = "";
  mark.style.translate = `${button.offsetLeft}px ${button.offsetTop}px`;
  mark.style.width = `${button.offsetWidth}px`;
  mark.style.height = `${button.offsetHeight}px`;
  if (!animate) {
    void mark.offsetWidth;
    delete mark.dataset.snap;
  }
}

interface ToolsProps {
  tool: CanvasTool;
  color: CanvasColor;
  outline: CanvasOutline;
  showColors: boolean;
  showOutlines: boolean;
  onCanvas: ReadonlySet<string>;
  onTool(tool: CanvasTool): void;
  onColor(color: CanvasColor): void;
  onOutline(outline: CanvasOutline): void;
  onAddSaves(saveIds: string[]): void;
}

export function Tools({
  tool,
  color,
  outline,
  showColors,
  showOutlines,
  onCanvas,
  onTool,
  onColor,
  onOutline,
  onAddSaves,
}: ToolsProps) {
  const indicator = useRef<HTMLSpanElement>(null);
  const buttons = useRef(new Map<CanvasTool, HTMLElement>());
  const placed = useRef(false);

  useLayoutEffect(() => {
    const mark = indicator.current;
    const button = buttons.current.get(tool);
    if (!mark || !button) return;
    place(mark, button, placed.current);
    placed.current = true;
  }, [tool]);

  useLayoutEffect(() => {
    const mark = indicator.current;
    const bar = mark?.parentElement;
    if (!mark || !bar) return;
    const observer = new ResizeObserver(() => {
      const active = bar.querySelector<HTMLElement>("[data-pressed]");
      if (active) place(mark, active, false);
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <Tooltip.Group>
      <div className={styles.dock}>
        <Toolbar.Root className={styles.bar} aria-label="Canvas Tools">
          <span
            ref={indicator}
            className={styles.indicator}
            aria-hidden="true"
          />
          {MODES.map(({ tool: mode, label, shortcut, Icon }) => (
            <Tooltip
              key={mode}
              label={label}
              shortcut={<Keyboard.Cluster keys={platformGlyphs(shortcut)} />}
              side="top"
            >
              <Toolbar.Button
                ref={(node: HTMLButtonElement | null) => {
                  if (node) buttons.current.set(mode, node);
                  else buttons.current.delete(mode);
                }}
                render={<Button icon size="md" variant="text" />}
                className={styles.mode}
                data-pressed={tool === mode || undefined}
                aria-label={label}
                aria-pressed={tool === mode}
                onClick={() => onTool(mode)}
              >
                <Icon />
              </Toolbar.Button>
            </Tooltip>
          ))}
          <AddSaves onCanvas={onCanvas} onAdd={onAddSaves}>
            <Toolbar.Button
              render={<Button icon size="md" variant="text" />}
              className={styles.mode}
            >
              <IconImages />
            </Toolbar.Button>
          </AddSaves>
        </Toolbar.Root>
        <div
          className={styles.palette}
          data-open={showColors || undefined}
          inert={!showColors}
        >
          {showOutlines ? (
            <fieldset className={styles.choices} aria-label="Shape">
              {OUTLINES.map(({ outline: option, label, Icon }) => (
                <Tooltip key={option} label={label} side="top">
                  <Button
                    icon
                    size="sm"
                    variant="ghost"
                    aria-label={label}
                    aria-pressed={outline === option}
                    data-pressed={outline === option || undefined}
                    onClick={() => onOutline(option)}
                  >
                    <Icon />
                  </Button>
                </Tooltip>
              ))}
            </fieldset>
          ) : null}
          <fieldset className={styles.choices} aria-label="Color">
            {CANVAS_COLORS.map((swatch) => (
              <Tooltip
                key={swatch}
                label={CANVAS_COLOR_LABELS[swatch]}
                side="top"
              >
                <Button
                  icon
                  size="sm"
                  variant="text"
                  aria-label={CANVAS_COLOR_LABELS[swatch]}
                  aria-pressed={color === swatch}
                  data-pressed={color === swatch || undefined}
                  onClick={() => onColor(swatch)}
                >
                  <span
                    className={styles.swatch}
                    style={cssVars({ "--swatch": INK[swatch] })}
                  />
                </Button>
              </Tooltip>
            ))}
          </fieldset>
        </div>
      </div>
    </Tooltip.Group>
  );
}
