import {
  IconFolderFill18 as Folder,
  IconLabel3Fill18 as Label,
} from "@pond/icons/fill/18";
import { ColorPicker, Input, Popover } from "@pond/ui";
import { useReducedMotion } from "motion/react";
import { type MouseEvent, useState } from "react";
import { GROUP_COLORS } from "@/components/settings-tags/lib/helpers";
import styles from "./styles.module.css";

const DEFAULT_CUSTOM = "#4c6ef5";
const HEX_RE = /^#([0-9a-f]{6})$/i;

function asHex(value: string | null): string | null {
  if (!value) return null;
  return HEX_RE.test(value.trim()) ? value.trim().toLowerCase() : null;
}

interface TagColorPickerProps {
  label: string;
  color: string | null;
  fallback: string;
  onSelect: (color: string | null) => void;
  variant?: "dot" | "glyph";
}

export function TagColorPicker({
  label,
  color,
  fallback,
  onSelect,
  variant = "dot",
}: TagColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customHex, setCustomHex] = useState(asHex(color) ?? DEFAULT_CUSTOM);
  const [hexDraft, setHexDraft] = useState(asHex(color) ?? DEFAULT_CUSTOM);

  const reduceMotion = useReducedMotion();
  const swatch = color ?? fallback;

  const _paneTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const };
  const _sizeTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 42 };

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  function reset() {
    setCustom(false);
    const start = asHex(color) ?? DEFAULT_CUSTOM;
    setCustomHex(start);
    setHexDraft(start);
  }

  function pick(next: string | null) {
    onSelect(next);
    setOpen(false);
    setCustom(false);
  }

  function commitCustom() {
    onSelect(asHex(hexDraft) ?? customHex);
  }

  function applyCustom() {
    commitCustom();
    setOpen(false);
    setCustom(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && custom) commitCustom();
        setOpen(next);
        if (next) reset();
      }}
    >
      <Popover.Trigger
        type="button"
        aria-label={`${label} colour`}
        className={styles.trigger}
        onClick={stop}
      >
        {variant === "glyph" ? (
          <Folder width={16} height={16} style={{ color: swatch }} />
        ) : (
          <Label width={16} height={16} style={{ color: swatch }} />
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" sideOffset={6}>
          <Popover.Popup className={styles.popup} onClick={stop}>
            <ColorPicker.Root
              value={customHex}
              ariaLabel={`${label} colour`}
              onChange={(hex) => {
                setCustomHex(hex);
                setHexDraft(hex);
              }}
            >
              <div className={styles.container}>
                <div className={styles.trailing}>
                  {custom && (
                    <div className={styles.header}>
                      <span
                        className={styles.swatch}
                        data-empty={!asHex(hexDraft) || undefined}
                        style={
                          asHex(hexDraft)
                            ? { background: asHex(hexDraft) ?? undefined }
                            : undefined
                        }
                        aria-hidden
                      />
                      <span className={styles.hex}>HEX</span>
                      <Input.Field
                        aria-label={`${label} hex`}
                        className={styles.input}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        value={hexDraft}
                        onChange={(e) => setHexDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") applyCustom();
                        }}
                      />
                    </div>
                  )}
                  {custom ? (
                    <ColorPicker.Area height={200} />
                  ) : (
                    <div className={styles.swatches}>
                      <button
                        type="button"
                        className={styles["swatch-button"]}
                        data-default
                        data-active={color === null || undefined}
                        aria-label="Default colour"
                        title="Default"
                        style={{ background: fallback }}
                        onClick={() => pick(null)}
                      />
                      {GROUP_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          className={styles["swatch-button"]}
                          data-active={color === c.value || undefined}
                          aria-label={c.label}
                          title={c.label}
                          style={{ background: c.value }}
                          onClick={() => pick(c.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.leading}>
                  <button
                    type="button"
                    className={styles.wheel}
                    aria-label={custom ? "Back to presets" : "Custom colour"}
                    title={custom ? "Presets" : "Custom colour"}
                    onClick={() => (custom ? reset() : setCustom(true))}
                  />
                  {custom && <ColorPicker.Hue height={200} />}
                </div>
              </div>
            </ColorPicker.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
