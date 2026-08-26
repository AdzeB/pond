import type { TableColumn } from "@pond/ui";
import type { TagsRowData } from "../types";

export const tagsColumns: TableColumn<TagsRowData>[] = [
  {
    id: "name",
    accessor: (r) => (r.kind === "group" ? r.group.name : r.tag.name),
    cell: () => null,
    width: "minmax(0, 1fr)",
  },
];
