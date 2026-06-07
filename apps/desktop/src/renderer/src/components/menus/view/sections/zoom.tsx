import {
  IconMinusOutline18 as Minus,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import { Button, Menu, Slider } from "@pond/ui";
import { useCallback } from "react";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/utils/zoom";
import { useView } from "../context";
import styles from "./zoom.module.css";

export function ZoomSection() {
  const { state, actions } = useView();
  const value = state.zoom;
  const step = useCallback(
    (delta: number) => actions.setZoom(value + delta),
    [actions, value],
  );

  return (
    <Menu.Group>
      <Menu.GroupLabel>Zoom</Menu.GroupLabel>
      <fieldset className={styles.zoom}>
        <legend className={styles["sr-only"]}>Grid zoom</legend>
        <Button
          icon
          variant="ghost"
          size="xs"
          aria-label="Smaller cards"
          onClick={() => step(-ZOOM_STEP)}
          disabled={value <= ZOOM_MIN}
        >
          <Minus size={12} />
        </Button>
        <Slider.Root
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={ZOOM_STEP}
          value={value}
          onValueChange={(next) => {
            const n = typeof next === "number" ? next : next[0];
            if (n !== undefined) actions.setZoom(n);
          }}
          className={styles["zoom-slider"]}
        >
          <Slider.Control className={styles["zoom-slider-control"]}>
            <Slider.Track className={styles["zoom-slider-track"]}>
              <Slider.Indicator className={styles["zoom-slider-indicator"]} />
              <Slider.Thumb
                aria-label="Grid zoom"
                className={styles["zoom-slider-thumb"]}
              />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <Button
          icon
          variant="ghost"
          size="xs"
          aria-label="Larger cards"
          onClick={() => step(ZOOM_STEP)}
          disabled={value >= ZOOM_MAX}
        >
          <Plus size={12} />
        </Button>
      </fieldset>
    </Menu.Group>
  );
}
