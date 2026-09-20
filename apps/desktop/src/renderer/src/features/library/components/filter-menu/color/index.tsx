import {
  COLOR_PRESETS,
  DEFAULT_COLOR_TOLERANCE,
  readColorMatch,
} from "@pond/schema/filters/color";
import type { Predicate } from "@pond/schema/filters/types";
import { Button, ColorPicker, Input, Slider } from "@pond/ui";
import { useId, useState } from "react";
import { z } from "zod";
import { stopMenuKeys } from "../menu-keys";
import styles from "./styles.module.css";

const FILTER_COLOR_ORDER = [
  "Black",
  "Gray",
  "White",
  "Brown",
  "Pink",
  "Purple",
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Teal",
  "Blue",
] as const;

const FILTER_COLORS = FILTER_COLOR_ORDER.flatMap((name) =>
  COLOR_PRESETS.filter((color) => color.label === name),
);

export function ColorFilter({
  current,
  onApply,
}: {
  current?: Predicate;
  onApply: (predicate: Predicate) => void;
}) {
  const match = readColorMatch(current?.value);
  const hexId = useId();
  const [hex, setHex] = useState(match?.hex ?? "#ff0000");
  const [text, setText] = useState(match?.hex ?? "");
  const [tolerance, setTolerance] = useState(
    match?.tolerance ?? DEFAULT_COLOR_TOLERANCE,
  );
  const apply = (color: string, distance = tolerance) => {
    setHex(color);
    setText(color);
    setTolerance(distance);
    onApply({
      field: "color",
      operator: "near",
      value: { hex: color, tolerance: distance },
      negate: current?.negate || undefined,
    });
  };
  return (
    <fieldset className={styles.root} onKeyDown={stopMenuKeys}>
      <ColorPicker
        value={hex}
        ariaLabel="Filter Color"
        areaWidth={176}
        areaHeight={176}
        onChange={(value) => apply(value)}
      />
      <fieldset className={styles.palette} aria-label="Preset Colors">
        {FILTER_COLORS.map(({ label, hex: preset }) => (
          <Button
            key={preset}
            icon
            size="xs"
            variant="ghost"
            aria-label={label}
            aria-pressed={!!match && preset.toLowerCase() === match.hex}
            title={label}
            style={{ backgroundColor: preset }}
            onClick={() => apply(preset)}
          />
        ))}
      </fieldset>
      <form
        className={styles.hex}
        onSubmit={(event) => {
          event.preventDefault();
          const next = readColorMatch(text);
          if (next) apply(next.hex);
        }}
      >
        <label className={styles.field} htmlFor={hexId}>
          <Input.Root size="sm">
            <Input.Field
              id={hexId}
              aria-label="Color Hex"
              value={text}
              placeholder="#RRGGBB"
              spellCheck={false}
              aria-invalid={!!text && !readColorMatch(text)}
              onBlur={() => {
                if (!readColorMatch(text)) setText(match?.hex ?? "");
              }}
              onValueChange={(value) => {
                setText(value);
                const next = readColorMatch(value);
                if (next) apply(next.hex);
              }}
            />
          </Input.Root>
        </label>
      </form>
      {match ? (
        <Slider.Root
          min={0}
          max={150}
          step={1}
          value={tolerance}
          onValueChange={(value) => {
            const next = z.number().safeParse(value);
            if (next.success) apply(hex, next.data);
          }}
        >
          <Slider.Label>Tolerance:</Slider.Label>
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb aria-label="Color Tolerance" />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      ) : null}
    </fieldset>
  );
}
