import type { TableColumn } from "@pond/ui";
import styles from "../styles.module.css";
import { ActionsCell, NameCell } from "./cells";
import { relativeTime, shortDate } from "./helpers";
import type { TagsRowData } from "./types";

export const tagsColumns: TableColumn<TagsRowData>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (r) => (r.kind === "group" ? r.group.name : r.tag.name),
    cell: () => <NameCell />,
    width: "minmax(0, 1.4fr)",
  },
  {
    id: "saves",
    header: "Saves",
    accessor: (r) => (r.kind === "group" ? r.stats.totalSaves : r.saves),
    cell: (r) => {
      const n = r.kind === "group" ? r.stats.totalSaves : r.saves;
      return n > 0 ? <span className={styles.meta}>{n}</span> : null;
    },
    width: "84px",
  },
  {
    id: "recent",
    header: "Last Used",
    accessor: (r) =>
      r.kind === "group"
        ? (r.stats.recentMs ?? Number.NEGATIVE_INFINITY)
        : (r.tag.lastUsedAt ?? Number.NEGATIVE_INFINITY),
    cell: (r) => (
      <span className={styles.meta}>
        {relativeTime(r.kind === "group" ? r.stats.recentMs : r.tag.lastUsedAt)}
      </span>
    ),
    width: "120px",
  },
  {
    id: "created",
    header: "Created",
    accessor: (r) =>
      r.kind === "group"
        ? (r.stats.createdMs ?? Number.NEGATIVE_INFINITY)
        : (r.tag.createdAt ?? Number.NEGATIVE_INFINITY),
    cell: (r) => (
      <span className={styles.meta}>
        {shortDate(r.kind === "group" ? r.stats.createdMs : r.tag.createdAt)}
      </span>
    ),
    width: "132px",
  },
  {
    id: "actions",
    header: "",
    headerHidden: true,
    cell: () => <ActionsCell />,
    width: "48px",
    align: "center",
  },
];
