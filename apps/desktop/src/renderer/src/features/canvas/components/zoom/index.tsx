import { IconMinus, IconPlus } from "@pond/icons";
import { Button, Keyboard, Tooltip } from "@pond/ui";
import { useReactFlow, useViewport } from "@xyflow/react";
import { platformGlyphs } from "@/shared/lib/shortcuts";
import styles from "./styles.module.css";

export function Zoom() {
  const flow = useReactFlow();
  const { zoom } = useViewport();
  return (
    <Tooltip.Group>
      <fieldset className={styles.zoom} aria-label="Zoom">
        <Tooltip label="Zoom Out" side="bottom">
          <Button
            icon
            size="md"
            variant="text"
            aria-label="Zoom Out"
            onClick={() => void flow.zoomOut({ duration: 150 })}
          >
            <IconMinus />
          </Button>
        </Tooltip>
        <Tooltip
          label="Zoom to Fit"
          shortcut={<Keyboard.Cluster keys={platformGlyphs(["⇧", "1"])} />}
          side="bottom"
        >
          <Button
            size="md"
            variant="text"
            className={styles.level}
            aria-label={`Zoom ${Math.round(zoom * 100)}%. Zoom to Fit`}
            onClick={() => void flow.fitView({ duration: 200, padding: 0.2 })}
          >
            {Math.round(zoom * 100)}%
          </Button>
        </Tooltip>
        <Tooltip label="Zoom In" side="bottom">
          <Button
            icon
            size="md"
            variant="text"
            aria-label="Zoom In"
            onClick={() => void flow.zoomIn({ duration: 150 })}
          >
            <IconPlus />
          </Button>
        </Tooltip>
      </fieldset>
    </Tooltip.Group>
  );
}
