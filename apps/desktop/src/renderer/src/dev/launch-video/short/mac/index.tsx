import {
  IconAlbum2,
  IconChatBubble,
  IconChevronDown,
  IconClockPlus,
  IconFolder,
  IconPlus,
  IconTags,
  IconTrashXmark,
} from "@pond/icons";
import { clsx as cn } from "clsx";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

type Place = "all" | "assistant";

const LIBRARY: {
  id: Place | "recent" | "tags" | "trash";
  label: string;
  count?: number;
  icon: ReactNode;
}[] = [
  { id: "all", label: "All", count: 54, icon: <IconAlbum2 /> },
  { id: "assistant", label: "Assistant", icon: <IconChatBubble /> },
  { id: "recent", label: "Recently Added", count: 54, icon: <IconClockPlus /> },
  { id: "tags", label: "Tags", count: 39, icon: <IconTags /> },
  { id: "trash", label: "Trash", count: 0, icon: <IconTrashXmark /> },
];

const FOLDERS = [
  { label: "Wardrobe", count: 23 },
  { label: "Studio", count: 9 },
  { label: "Posts", count: 6 },
  { label: "Objects", count: 5 },
];

/** A Mac window drawn for the stage: traffic lights over a gray frame. */
function Window({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(styles.window, className)} {...props}>
      <span className={styles.lights}>
        <i />
        <i />
        <i />
      </span>
      {children}
    </div>
  );
}

/** Pond's library sidebar, with one place selected. */
function Sidebar({ active }: { active: Place }) {
  return (
    <nav className={styles.sidebar}>
      <span className={styles.switcher}>
        <span className={styles.mark} />
        Personal
        <IconChevronDown size={14} />
      </span>
      {LIBRARY.map((row) => (
        <span
          key={row.id}
          className={styles.row}
          data-active={row.id === active || undefined}
        >
          {row.icon}
          <span className={styles.label}>{row.label}</span>
          {row.count === undefined ? null : (
            <span className={styles.count}>{row.count}</span>
          )}
        </span>
      ))}
      <span className={styles.section}>
        Folders
        <IconPlus size={14} />
      </span>
      {FOLDERS.map((row) => (
        <span key={row.label} className={styles.row}>
          <IconFolder />
          <span className={styles.label}>{row.label}</span>
          <span className={styles.count}>{row.count}</span>
        </span>
      ))}
    </nav>
  );
}

/** The white content panel beside the sidebar. */
function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(styles.panel, className)} {...props} />;
}

export const Mac = { Window, Sidebar, Panel };
