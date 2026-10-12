import {
  IconAlbum2,
  IconArrowLeft,
  IconArrowRight,
  IconBookmark,
  IconBookmarkSlash,
  IconChatBubble,
  IconChevronDown,
  IconClockPlus,
  IconFolder,
  IconFolderBan,
  IconHistory,
  IconPlus,
  IconShuffle,
  IconSidebarLeft,
  IconTrash,
} from "@pond/icons";
import { Logo } from "@pond/ui/logo";
import { clsx as cn } from "clsx";
import type { ReactNode, RefObject } from "react";
import styles from "./styles.module.css";

/** The app is laid out at its real pixel size, then zoomed so the stage reads at 1080p. */
export const ZOOM = 1.25;

type Place = "all" | "assistant";

const PLACES: {
  id: string;
  label: string;
  count?: number;
  icon: ReactNode;
}[] = [
  { id: "all", label: "All", count: 54, icon: <IconAlbum2 /> },
  {
    id: "uncategorized",
    label: "Uncategorized",
    count: 0,
    icon: <IconFolderBan />,
  },
  { id: "assistant", label: "Assistant", icon: <IconChatBubble /> },
  {
    id: "untagged",
    label: "Untagged",
    count: 0,
    icon: <IconBookmarkSlash />,
  },
  { id: "added", label: "Recently Added", count: 54, icon: <IconClockPlus /> },
  { id: "used", label: "Recently Used", count: 0, icon: <IconHistory /> },
  { id: "tags", label: "Tags", count: 39, icon: <IconBookmark /> },
  { id: "random", label: "Random", icon: <IconShuffle /> },
  { id: "trash", label: "Trash", count: 0, icon: <IconTrash /> },
];

const FOLDERS = [
  { label: "Wardrobe", count: 29 },
  { label: "Studio", count: 9 },
  { label: "Objects", count: 4 },
  { label: "Cars", count: 2 },
  { label: "Posts", count: 6 },
  { label: "Videos", count: 4 },
];

const CRUMBS: Record<Place, { label: string; icon: ReactNode }> = {
  all: { label: "All", icon: <IconAlbum2 size={16} /> },
  assistant: { label: "Assistant", icon: <IconChatBubble size={16} /> },
};

interface WindowProps extends React.ComponentPropsWithoutRef<"div"> {
  place: Place;
  counts?: Partial<Record<string, number>>;
  /** The app's own coordinate space, before the stage zoom. */
  ref?: RefObject<HTMLDivElement | null>;
}

/** Pond's window: the gray shell, top bar, and sidebar, with the page in `children`. */
function Window({
  place,
  counts,
  ref,
  className,
  children,
  ...props
}: WindowProps) {
  const crumb = CRUMBS[place];
  return (
    <div className={cn(styles.window, className)} {...props}>
      <div
        ref={ref}
        className={styles.app}
        style={{ transform: `scale(${ZOOM})` }}
      >
        <header className={styles.top}>
          <span className={styles.lights}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.nav}>
            <IconSidebarLeft size={16} />
            <span className={styles.history}>
              <IconArrowLeft size={16} />
              <IconArrowRight size={16} />
            </span>
          </span>
          <span className={styles.crumb}>
            {crumb.icon}
            {crumb.label}
          </span>
          <span className={styles.actions}>
            <IconChatBubble size={16} />
            <IconSidebarLeft size={16} className={styles.flip} />
          </span>
        </header>
        <Sidebar active={place} counts={counts} />
        {children}
      </div>
    </div>
  );
}

function Sidebar({
  active,
  counts = {},
}: {
  active: Place;
  counts?: Partial<Record<string, number>>;
}) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.workspace}>
        <span className={styles.switcher}>
          <span className={styles.mark}>
            <Logo size={11} aria-hidden />
          </span>
          <span className={styles.name}>Personal</span>
          <IconChevronDown size={10} />
        </span>
        <span className={styles.tools}>
          <Logo size={14} aria-hidden />
          <IconPlus size={14} />
        </span>
      </div>
      <div className={styles.group}>
        {PLACES.map((row) => (
          <span
            key={row.id}
            className={styles.row}
            data-active={row.id === active || undefined}
          >
            {row.icon}
            <span className={styles.label}>{row.label}</span>
            {row.count === undefined ? null : (
              <span className={styles.count}>
                {counts[row.id] ?? row.count}
              </span>
            )}
          </span>
        ))}
      </div>
      <span className={styles.section}>
        Smart Folders
        <IconPlus size={14} />
      </span>
      <span className={styles.section}>
        Folders
        <IconPlus size={14} />
      </span>
      <div className={styles.group}>
        {FOLDERS.map((row) => (
          <span key={row.label} className={styles.row}>
            <IconFolder />
            <span className={styles.label}>{row.label}</span>
            <span className={styles.count}>{row.count}</span>
          </span>
        ))}
      </div>
    </nav>
  );
}

/** The white page beside the sidebar. */
function Panel({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.panel, className)} {...props} />;
}

export const Mac = { Window, Panel };
