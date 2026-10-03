export const DOWNLOAD_COLUMN_CATALOG = [
  { id: "name", label: "Name" },
  { id: "source", label: "Source" },
  { id: "stage", label: "Status" },
  { id: "size", label: "Size" },
  { id: "speed", label: "Speed" },
  { id: "remaining", label: "Remaining" },
  { id: "progress", label: "Progress" },
  { id: "elapsed", label: "Elapsed" },
  { id: "files", label: "Files" },
  { id: "attempts", label: "Attempts" },
  { id: "server", label: "Server" },
  { id: "error", label: "Error" },
  { id: "added", label: "Added" },
] as const;

export type DownloadColumnId = (typeof DOWNLOAD_COLUMN_CATALOG)[number]["id"];

export const LOCKED_DOWNLOAD_COLUMN: DownloadColumnId = "name";
