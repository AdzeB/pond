export type LibraryNav =
  | { kind: "all" }
  | { kind: "uncategorized" }
  | { kind: "folder"; id: string }
  | { kind: "tag"; name: string }
  | { kind: "trash" }
  | { kind: "downloads" }
  | { kind: "sources" };
