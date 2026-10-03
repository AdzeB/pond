import { Button, Input, useVideo, Video } from "@pond/ui";
import { useState } from "react";
import styles from "./styles.module.css";

export function LoopControls({
  range,
  onChange,
}: {
  range: [number, number] | null;
  onChange: (range: [number, number] | null) => void;
}) {
  const { state, actions } = useVideo();
  const [start, setStart] = useState(range?.[0] ?? 0);
  const [end, setEnd] = useState(range?.[1] ?? 0);
  const valid =
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end > start &&
    end <= state.duration;
  return (
    <Video.Row className={styles.loop}>
      <Input.Root>
        <Input.Field
          aria-label="Loop Start in Seconds"
          type="number"
          min={0}
          max={state.duration}
          step={0.001}
          value={start}
          onChange={(event) => {
            setStart(Number(event.target.value));
            onChange(null);
          }}
        />
      </Input.Root>
      <Button
        size="sm"
        variant="ghost"
        className={styles.button}
        onClick={() => {
          setStart(state.currentTime);
          onChange(null);
        }}
      >
        Set Start
      </Button>
      <Input.Root>
        <Input.Field
          aria-label="Loop End in Seconds"
          type="number"
          min={0}
          max={state.duration}
          step={0.001}
          value={end}
          onChange={(event) => {
            setEnd(Number(event.target.value));
            onChange(null);
          }}
        />
      </Input.Root>
      <Button
        size="sm"
        variant="ghost"
        className={styles.button}
        onClick={() => {
          setEnd(state.currentTime);
          onChange(null);
        }}
      >
        Set End
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={styles.button}
        disabled={!range && !valid}
        aria-pressed={!!range}
        onClick={() => {
          if (range) onChange(null);
          else {
            onChange([start, end]);
            actions.seek(start);
            actions.play();
          }
        }}
      >
        {range ? "Stop Loop" : "Loop Range"}
      </Button>
    </Video.Row>
  );
}
