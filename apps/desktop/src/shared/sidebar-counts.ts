export interface LibrarySidebarCounts {
  library: number;
  uncategorized: number;
  untagged: number;
  recentlyAdded: number;
  recentlyUsed: number;
  trash: number;
  folders: Record<string, number>;
}
