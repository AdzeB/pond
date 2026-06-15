import type { Source } from "@pond/schema/db";
import { getSourceDef } from "@/lib/sources-registry";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

type TileState = "running" | "error" | "connected" | "idle";

function tileState(status: SyncSourceStatus | undefined): TileState {
  const state = status?.state ?? "idle";
  if (state === "running") return "running";
  if (state === "error" || state === "auth_required") return "error";
  if (status?.connected) return "connected";
  return "idle";
}

// The colored brand square. Each `IconBrand*` is full-bleed (its own
// background rect), so clipping to a rounded box yields the app-icon look.
export function BrandTile({
  source,
  size = 72,
}: {
  source: Source;
  size?: number;
}) {
  const Icon = getSourceDef(source).icon;
  return (
    <span
      className={styles.brandTile}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon width={size} height={size} />
    </span>
  );
}

// Overview grid cell: brand tile + label, with a quiet status dot.
export function OverviewTile({
  source,
  status,
  onSelect,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  onSelect: () => void;
}) {
  const def = getSourceDef(source);
  const state = tileState(status);
  return (
    <button type="button" className={styles.overviewTile} onClick={onSelect}>
      <span className={styles.tileMedia}>
        <BrandTile source={source} />
        {state !== "idle" ? (
          <span className={styles.statusDot} data-state={state} aria-hidden />
        ) : null}
      </span>
      <span className={styles.tileLabel}>{def.label}</span>
    </button>
  );
}
