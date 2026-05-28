import { Button, Menu, Slider } from "@pond/ui";
import { ChevronRight, Minus, Plus, ZoomIn } from "lucide-react";
import { useCallback } from "react";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/use-zoom";
import { useView } from "../context";
import sectionStyles from "./section.module.css";

export function Zoom() {
  const { state, actions } = useView();
  const value = state.zoom;
  const step = useCallback(
    (delta: number) => actions.setZoom(value + delta),
    [actions, value],
  );

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <ZoomIn width="14" height="14" />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Zoom</Menu.ItemLabel>
        <span className={sectionStyles.badge}>
          {Math.round((value / 130) * 100)}%
        </span>
        <span className={sectionStyles.chevron} aria-hidden>
          <ChevronRight width="12" height="12" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            <fieldset className={sectionStyles.zoom}>
              <legend className={sectionStyles["sr-only"]}>Grid zoom</legend>
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
                className={sectionStyles["zoom-slider"]}
              >
                <Slider.Control
                  className={sectionStyles["zoom-slider-control"]}
                >
                  <Slider.Track className={sectionStyles["zoom-slider-track"]}>
                    <Slider.Indicator
                      className={sectionStyles["zoom-slider-indicator"]}
                    />
                    <Slider.Thumb
                      aria-label="Grid zoom"
                      className={sectionStyles["zoom-slider-thumb"]}
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
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
