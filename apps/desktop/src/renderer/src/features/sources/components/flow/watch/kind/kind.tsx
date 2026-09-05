import {
  IconPinFill18 as Board,
  IconTvFill18 as Channel,
  IconLayers2Fill18 as Cluster,
  IconPeopleFill18 as Group,
  IconListFavsFill18 as List,
  IconMediaPlaylistFill18 as Playlist,
  IconUserFill18 as User,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import type { WatchKind } from "@pond/schema/db";
import { Button } from "@pond/ui";
import type { ReactNode } from "react";
import { watchKindsFor } from "@/features/sources/hooks/use-watches";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { useWatchSource, watchFlow } from "@/features/sources/state/watch-flow";
import styles from "./kind.module.css";

const KIND_ROWS = {
  user: { label: "Account", icon: <User size={18} /> },
  channel: { label: "Channel", icon: <Channel size={18} /> },
  group: { label: "Group", icon: <Group size={18} /> },
  playlist: { label: "Playlist", icon: <Playlist size={18} /> },
  board: { label: "Board", icon: <Board size={18} /> },
  cluster: { label: "Cluster", icon: <Cluster size={18} /> },
  list: { label: "List", icon: <List size={18} /> },
} satisfies Record<WatchKind, { label: string; icon: ReactNode }>;

export function WatchKindSection() {
  const picked = useWatchSource();
  const source = picked ?? "youtube";

  const pick = (kind: WatchKind) => {
    watchFlow.pickKind(kind);
    sourceFlow.push("watch-target");
  };

  return (
    <div className={styles.rows}>
      {watchKindsFor(source).map((kind) => (
        <Button
          key={kind}
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          onClick={() => pick(kind)}
        >
          <span className={styles.icon}>{KIND_ROWS[kind].icon}</span>
          <span className={styles.label}>{KIND_ROWS[kind].label}</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>
      ))}
    </div>
  );
}
