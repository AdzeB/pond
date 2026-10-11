import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import {
  IconAlbum2Outline18,
  IconBookmarkOutline18,
  IconCircleWarningOutline18,
  IconClockRotateClockwiseOutline18,
  IconEyeOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconPlusOutline18,
  IconTrashXmarkOutline18,
  IconUserOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

const library = [
  { label: "All", count: "1,284", icon: <IconAlbum2Outline18 /> },
  {
    label: "Recently Used",
    count: "18",
    icon: <IconClockRotateClockwiseOutline18 />,
  },
  { label: "Tags", count: "58", icon: <IconBookmarkOutline18 /> },
  { label: "Trash", count: "3", icon: <IconTrashXmarkOutline18 /> },
] as const;
const folders = [
  { label: "Inspiration", count: "248" },
  { label: "Photography", count: "96" },
] as const;
const sources = [
  { label: "Accounts", count: "4", icon: <IconUserOutline18 /> },
  { label: "Watches", count: "2", icon: <IconEyeOutline18 /> },
  { label: "Folders", count: "1", icon: <IconFolderOpenOutline18 /> },
] as const;
const queues = [
  { label: "Active", count: "2", icon: <IconWindowDownloadOutline18 /> },
  { label: "Waiting", count: "2", icon: <IconClockRotateClockwiseOutline18 /> },
  { label: "Failed", count: "0", icon: <IconCircleWarningOutline18 /> },
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
        <IconChevronDownOutline12 />
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
        <IconPlusOutline18 />
      </span>
      {folders.map((item) => (
        <Row
          count={item.count}
          icon={<IconFolderOutline18 />}
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
        <IconPlusOutline18 />
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
