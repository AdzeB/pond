import { useVideo } from "@pond/ui";
import type { NoteMarker } from "..";
import styles from "./styles.module.css";

export function NoteMarkers({ markers }: { markers: readonly NoteMarker[] }) {
  const { state, actions } = useVideo();
  if (markers.length === 0 || state.duration <= 0) return null;
  return (
    <div className={styles.markers} aria-hidden>
      {markers.map((marker) => {
        const pct = Math.min(
          100,
          Math.max(0, (marker.timeSec / state.duration) * 100),
        );
        return (
          <button
            key={marker.id}
            type="button"
            className={styles.marker}
            style={{ left: `${pct}%` }}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              actions.seek(marker.timeSec);
              actions.play();
            }}
          />
        );
      })}
    </div>
  );
}
