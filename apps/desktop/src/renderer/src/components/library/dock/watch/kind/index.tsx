import {
  IconPinFill18 as Board,
  IconTvFill18 as Channel,
  IconLayers2Fill18 as Cluster,
  IconPeopleFill18 as Group,
  IconListFavsFill18 as List,
  IconMediaPlaylistFill18 as Playlist,
  IconUserFill18 as User,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import type { WatchKind } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import type { ReactNode } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import { watchKindsFor } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useWatchSource, watchFlow } from "@/stores/watch-flow";
import styles from "./styles.module.css";

const KIND_ROWS: Record<WatchKind, { label: string; icon: ReactNode }> = {
  user: { label: "Account", icon: <User size={18} /> },
  channel: { label: "Channel", icon: <Channel size={18} /> },
  group: { label: "Group", icon: <Group size={18} /> },
  playlist: { label: "Playlist", icon: <Playlist size={18} /> },
  board: { label: "Board", icon: <Board size={18} /> },
  cluster: { label: "Cluster", icon: <Cluster size={18} /> },
  list: { label: "List", icon: <List size={18} /> },
};

/** Kind chooser between the source picker and the handle card, for sources that can watch more than one thing. */
export function WatchKindSection() {
  const dock = useDock();
  const picked = useWatchSource();
  /** The pick clears before the card swaps out; any multi-kind brand keeps the exit render intact. */
  const source = picked ?? "youtube";

  const pick = (kind: WatchKind) => {
    watchFlow.pickKind(kind);
    dock.openViewMenu("watch-target");
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back onClick={() => dock.openViewMenu("watch-source")} />
        <TrayCard.Title position="center">
          Watch on {getSourceDef(source).label}
        </TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.rows}>
        {watchKindsFor(source).map((kind) => (
          <button
            key={kind}
            type="button"
            className={styles.row}
            onClick={() => pick(kind)}
          >
            <span className={styles["row-icon"]}>{KIND_ROWS[kind].icon}</span>
            <span className={styles["row-label"]}>{KIND_ROWS[kind].label}</span>
            <span className={styles["row-value"]}>
              <ChevronRight width={13} height={13} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
