import { COLOR_PRESETS, readColorMatch } from "@pond/schema/filters/color";
import type { Predicate } from "@pond/schema/filters/types";
import { Button, ColorPicker, Input, Menu, Slider } from "@pond/ui";
import { useId, useState } from "react";
import styles from "./styles.module.css";

export function ColorFilter({
  current,
  onApply,
}: {
  current?: Predicate;
  onApply: (predicate: Predicate) => void;
}) {
  const match = readColorMatch(current?.value);
  const hexId = useId();
  const [hex, setHex] = useState(match?.hex ?? "#0091ff");
  const [text, setText] = useState(hex);
  const [tolerance, setTolerance] = useState(match?.tolerance ?? 60);
  const apply = (color: string, distance = tolerance) => {
    setHex(color);
    setText(color);
    setTolerance(distance);
    onApply({
      field: "color",
      operator: "near",
      value: { hex: color, tolerance: distance },
    });
  };
  return (
    <>
      <fieldset
        className={styles.form}
        onKeyDown={(event) => {
          if (event.key !== "Escape" && event.key !== "Tab")
            event.stopPropagation();
        }}
      >
        <ColorPicker
          value={hex}
          ariaLabel="Filter Color"
          areaWidth={260}
          areaHeight={150}
          onChange={(value) => apply(value)}
        />
        <div className={styles.swatches}>
          {COLOR_PRESETS.map((color) => (
            <Button
              key={color.hex}
              icon
              size="xs"
              variant="ghost"
              aria-label={color.label}
              aria-pressed={
                !!current && hex.toLowerCase() === color.hex.toLowerCase()
              }
              onClick={() => apply(color.hex)}
            >
              <span
                className={styles.swatch}
                style={{ backgroundColor: color.hex }}
              />
            </Button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const next = readColorMatch(text);
            if (next) apply(next.hex);
          }}
        >
          <label className={styles.field} htmlFor={hexId}>
            Hex
            <Input.Root size="sm">
              <Input.Field
                id={hexId}
                aria-label="Color Hex"
                value={text}
                onValueChange={(value) => {
                  setText(value);
                  const next = readColorMatch(value);
                  if (next) apply(next.hex);
                }}
              />
            </Input.Root>
          </label>
        </form>
      </fieldset>
      <Menu.Separator />
      <fieldset
        className={styles.controls}
        onKeyDown={(event) => {
          if (event.key !== "Escape" && event.key !== "Tab")
            event.stopPropagation();
        }}
      >
        <Slider.Root
          className={styles.tolerance}
          min={0}
          max={150}
          step={1}
          value={tolerance}
          onValueChange={(value) => {
            if (typeof value === "number") apply(hex, value);
          }}
        >
          <div className={styles["control-row"]}>
            <Slider.Label>Color Tolerance</Slider.Label>
            <Slider.Value />
          </div>
          <Slider.Control className={styles["tolerance-control"]}>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb aria-label="Color Tolerance" />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <p className={styles.hint}>Lower values match colors more closely.</p>
      </fieldset>
    </>
  );
}
