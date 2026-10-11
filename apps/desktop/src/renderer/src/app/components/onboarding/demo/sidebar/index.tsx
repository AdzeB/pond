import {
  IconAlbum2,
  IconBookmark,
  IconChevronDown,
  IconCircleWarning,
  IconEye,
  IconFolder,
  IconFolderOpen,
  IconHistory,
  IconPlus,
  IconTrashXmark,
  IconUser,
  IconWindowDownload,
} from "@pond/icons";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

const library = [
  { label: "All", count: "1,284", icon: <IconAlbum2 /> },
  {
    label: "Recently Used",
    count: "18",
    icon: <IconHistory />,
  },
  { label: "Tags", count: "58", icon: <IconBookmark /> },
  { label: "Trash", count: "3", icon: <IconTrashXmark /> },
] as const;
const folders = [
  { label: "Inspiration", count: "248" },
  { label: "Photography", count: "96" },
] as const;
const sources = [
  { label: "Accounts", count: "4", icon: <IconUser /> },
  { label: "Watches", count: "2", icon: <IconEye /> },
  { label: "Folders", count: "1", icon: <IconFolderOpen /> },
] as const;
const queues = [
  { label: "Active", count: "2", icon: <IconWindowDownload /> },
  { label: "Waiting", count: "2", icon: <IconHistory /> },
  { label: "Failed", count: "0", icon: <IconCircleWarning /> },
] as const;

function Row({
  active = false,
  count,
  icon,
  label,
}: {
  active?: boolean;
  count: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className={styles.row} data-active={active || undefined}>
      {icon}
      <span className={styles.label}>{label}</span>
      <span className={styles.count}>{count}</span>
    </span>
  );
}

function LibraryNav() {
  return (
    <nav className={styles.nav} data-view="library">
      <span className={styles.switcher}>
        <span className={styles.mark} />
        Personal
        <IconChevronDown size={12} />
      </span>
      {library.map((item, index) => (
        <Row
          active={index === 0}
          count={item.count}
          icon={item.icon}
          key={item.label}
          label={item.label}
        />
      ))}
      <span className={styles.section}>
        Folders
        <IconPlus />
      </span>
      {folders.map((item) => (
        <Row
          count={item.count}
          icon={<IconFolder />}
          key={item.label}
          label={item.label}
        />
      ))}
    </nav>
  );
}

function HarvesterNav() {
  return (
    <nav className={styles.nav} data-view="harvest">
      <span className={styles.brand}>
        Harvester
        <IconPlus />
      </span>
      <span className={styles.section}>Sources</span>
      {sources.map((item) => (
        <Row
          count={item.count}
          icon={item.icon}
          key={item.label}
          label={item.label}
        />
      ))}
      <span className={styles.section}>Downloads</span>
      {queues.map((item, index) => (
        <Row
          active={index === 0}
          count={item.count}
          icon={item.icon}
          key={item.label}
          label={item.label}
        />
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <LibraryNav />
      <HarvesterNav />
    </div>
  );
}
