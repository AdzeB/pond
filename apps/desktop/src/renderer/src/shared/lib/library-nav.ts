export type LibraryNav =
  | { kind: "all" }
  | { kind: "recents" }
  | { kind: "random" }
  | { kind: "uncategorized" }
  | { kind: "folder"; id: string }
  | { kind: "tag"; name: string }
  | { kind: "trash" }
  | { kind: "downloads" }
  | { kind: "sources" };
