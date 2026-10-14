import {
  IconBookmark,
  IconCrop,
  IconEye,
  IconFile,
  IconFileSettings,
  IconFilterPlus,
  IconFolder,
  IconGridPlus,
  IconImageSparkle,
  IconLayers,
  IconSortArrows,
  IconStar,
  IconText,
} from "@pond/icons";
import type { RefObject } from "react";
import styles from "./styles.module.css";

const FILTERS = [
  { label: "Visual Match", Icon: IconImageSparkle },
  { label: "Semantic", Icon: IconText },
  { label: "Tags", Icon: IconBookmark },
  { label: "Folders", Icon: IconFolder },
  { label: "Shape", Icon: IconLayers },
  { label: "Rating", Icon: IconStar },
  { label: "Type", Icon: IconFile },
  { label: "Format", Icon: IconFileSettings },
  { label: "Dimensions", Icon: IconCrop },
];

interface ToolbarProps {
  query?: string;
  caret?: boolean;
  chip?: RefObject<HTMLSpanElement | null>;
  open?: boolean;
  picked?: boolean;
}

/** The library's search row and filter chips, at the app's real size. */
export function Toolbar({
  query = "",
  caret = false,
  chip,
  open = false,
  picked = false,
}: ToolbarProps) {
  return (
    <>
      <div className={styles.bar}>
        <span className={styles.search} data-empty={!query || undefined}>
          {query || "Search your library…"}
          {query ? (
            <i className={styles.caret} style={{ opacity: caret ? 1 : 0 }} />
          ) : null}
        </span>
        <span className={styles.icons}>
          <span data-on>
            <IconFilterPlus size={16} />
          </span>
          <span>
            <IconGridPlus size={16} />
          </span>
          <span>
            <IconSortArrows size={16} />
          </span>
          <span>
            <IconEye size={16} />
          </span>
        </span>
      </div>
      <div className={styles.filters}>
        <span
          ref={chip}
          className={styles.filter}
          data-open={open || undefined}
        >
          <i className={styles.color} data-picked={picked || undefined} />
          Color
        </span>
        {FILTERS.map(({ label, Icon }) => (
          <span key={label} className={styles.filter}>
            <Icon size={16} />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
