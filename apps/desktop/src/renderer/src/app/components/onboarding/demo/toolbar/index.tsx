import {
  IconAlbum2,
  IconArrowLeft,
  IconArrowRight,
  IconWindowDownload,
} from "@pond/icons";
import styles from "./styles.module.css";

function PanelGlyph() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.75" y="2.75" width="14.5" height="12.5" rx="2" />
      <line x1="6.25" x2="6.25" y1="2.75" y2="15.25" />
    </svg>
  );
}

export function Toolbar() {
  return (
    <div className={styles.toolbar}>
      <span className={styles.lights}>
        <span data-tone="red" />
        <span data-tone="yellow" />
        <span data-tone="green" />
      </span>
      <span className={styles.icons}>
        <PanelGlyph />
        <IconArrowLeft />
        <IconArrowRight />
      </span>
      <span className={styles.crumbs} data-view="library">
        <IconAlbum2 />
        <span>All</span>
        <span className={styles.leaf}>
          <span className={styles.slash}>/</span>
          Sunset over the bay
        </span>
      </span>
      <span className={styles.crumbs} data-view="harvest">
        <IconWindowDownload />
        <span>Downloads</span>
        <span className={styles.slash}>/</span>
        <span>Active</span>
      </span>
    </div>
  );
}
