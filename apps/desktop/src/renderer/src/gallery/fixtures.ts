import type { ImportCollection } from "@pond/schema/db";
import type { ImportScopeAccount } from "@/features/sources/state/import-scope-flow";

interface GalleryCollection extends ImportCollection {
  itemCount: number | null;
}

export interface ImportScopeCase {
  id: string;
  title: string;
  note: string;
  account: ImportScopeAccount;
}

const X_FOLDERS: GalleryCollection[] = [
  { id: "x1", name: "Design", itemCount: 214 },
  { id: "x2", name: "Type", itemCount: 58 },
  { id: "x3", name: "Read Later", itemCount: 1 },
];

/** Collections each fixture Account returns from `accounts.importOptions`; a string is the error Pond shows. */
export const IMPORT_OPTIONS = new Map<string, GalleryCollection[] | string>([
  ["x-first", X_FOLDERS],
  ["x-every-folder", X_FOLDERS],
  ["x-folders", X_FOLDERS],
  [
    "instagram-first",
    [
      { id: "ig1", name: "Interiors", itemCount: 96 },
      { id: "ig2", name: "Recipes", itemCount: 31 },
    ],
  ],
  [
    "youtube-playlists",
    [
      { id: "WL", name: "Watch Later", itemCount: null },
      { id: "pl1", name: "Talks", itemCount: 44 },
      { id: "pl2", name: "Motion Studies", itemCount: 12 },
    ],
  ],
  [
    "pinterest-first",
    [
      { id: "pin1", name: "Moodboard", itemCount: 380 },
      { id: "pin2", name: "Packaging", itemCount: 72 },
    ],
  ],
  [
    "pinterest-failed",
    "Pinterest signed you out. Reconnect the Account to load your boards.",
  ],
]);

export const IMPORT_SCOPE_CASES: ImportScopeCase[] = [
  {
    id: "x-first",
    title: "X, first import",
    note: "Right after connecting. Nothing syncs until you press Start.",
    account: {
      id: "x-first",
      source: "twitter",
      sync: { importPending: true },
    },
  },
  {
    id: "x-every-folder",
    title: "X, every folder filed",
    note: "All bookmarks, each filed under Twitter / its folder.",
    account: {
      id: "x-every-folder",
      source: "twitter",
      sync: { importScope: { addToFolders: true } },
    },
  },
  {
    id: "x-folders",
    title: "X, chosen folders",
    note: "Two bookmark folders filed into Folders, images and videos only.",
    account: {
      id: "x-folders",
      source: "twitter",
      sync: {
        importScope: {
          listKinds: ["saved"],
          collections: [
            { id: "x1", name: "Design" },
            { id: "x2", name: "Type" },
          ],
          mediaKinds: ["image", "video"],
        },
      },
    },
  },
  {
    id: "instagram-first",
    title: "Instagram, first import",
    note: "Saved collections sit under Saved Posts.",
    account: {
      id: "instagram-first",
      source: "instagram",
      sync: { importPending: true },
    },
  },
  {
    id: "instagram-liked",
    title: "Instagram, Liked Posts only",
    note: "Saved Posts off, so its collections and Folders are dimmed.",
    account: {
      id: "instagram-liked",
      source: "instagram",
      sync: { importScope: { listKinds: ["liked"] } },
    },
  },
  {
    id: "youtube-playlists",
    title: "YouTube, a playlist without Folders",
    note: "Add to Folders turned off.",
    account: {
      id: "youtube-playlists",
      source: "youtube",
      sync: {
        importScope: {
          collections: [{ id: "pl1", name: "Talks" }],
          addToFolders: false,
        },
      },
    },
  },
  {
    id: "pinterest-first",
    title: "Pinterest, first import",
    note: "No lists, so boards come first.",
    account: {
      id: "pinterest-first",
      source: "pinterest",
      sync: { importPending: true },
    },
  },
  {
    id: "tiktok-first",
    title: "TikTok, first import",
    note: "Lists and a date, no collections.",
    account: {
      id: "tiktok-first",
      source: "tiktok",
      sync: { importPending: true },
    },
  },
  {
    id: "reddit-filters",
    title: "Reddit, filters set",
    note: "Saved Posts only, no text posts, from a custom date.",
    account: {
      id: "reddit-filters",
      source: "reddit",
      sync: {
        importScope: {
          listKinds: ["saved"],
          mediaKinds: ["image", "video"],
          since: "2026-01-01",
        },
      },
    },
  },
  {
    id: "pinterest-failed",
    title: "Pinterest, boards fail to load",
    note: "Open Boards to see the error and Try Again.",
    account: {
      id: "pinterest-failed",
      source: "pinterest",
      sync: {
        importScope: { collections: [{ id: "pin1", name: "Moodboard" }] },
      },
    },
  },
];
