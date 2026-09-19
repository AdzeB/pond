import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import type { Query } from "./filters/types";
import type { JsonObject } from "./json";
import type { ListKind } from "./list-kinds";
import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadSettings,
  type StoredPrefsEnvelope,
  type VideoDownloadSettings,
} from "./prefs";
import type { RawJson } from "./raw";
import type { Source } from "./source-ids";

export * from "./color";
export type { ListKind } from "./list-kinds";
export * from "./prefs";
export { SOURCES, type Source } from "./source-ids";
export * from "./theme-presets";

export const MEDIA_TYPES = [
  "image",
  "video",
  "audio",
  "document",
  "font",
  "file",
  "link",
  "text",
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const SAVE_STATUSES = [
  "ingesting",
  "complete",
  "failed",
  "skipped",
] as const;

export const CANCEL_REASON = "cancelled by user";
export const SKIP_REASON = "skipped by user";
export type SaveStatus = (typeof SAVE_STATUSES)[number];

export const OPS = [
  "harvest_metadata",
  "capture_tweet",
  "render_text_cover",
  "fetch_blobs",
  "archive_page",
  "fetch_video_ytdlp",
  "ensure_poster",
  "fetch_avatar",
  "finalize",
] as const;
export type Op = (typeof OPS)[number];

export const TASK_STATUSES = [
  "pending",
  "running",
  "done",
  "failed",
  "blocked",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface SaveFile {
  kind: string;
  path: string;
  sha256: string;
  size: number;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  sourceUrl?: string | null;
  family?: string | null;
  bpm?: number | null;
}

export interface VideoNote {
  fileIndex?: number;
  id: string;
  timeSec: number;
  text: string;
}

export interface ImageComment {
  fileIndex?: number;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  createdAt?: number;
}

export interface ImageCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const saves = sqliteTable(
  "saves",
  {
    id: text("id").primaryKey(),
    source: text("source").$type<Source>().notNull(),
    sourceId: text("source_id").notNull(),
    accountId: text("account_id"),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    author: text("author"),
    lang: text("lang"),
    siteName: text("site_name"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    notes: text("notes"),
    mediaUrl: text("media_url"),
    mediaType: text("media_type").$type<MediaType>(),
    rawJson: text("raw_json", { mode: "json" }).$type<RawJson | null>(),
    rawSlim: text("raw_slim", { mode: "json" }).$type<RawJson | null>(),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    listKinds: text("list_kinds", { mode: "json" })
      .$type<ListKind[]>()
      .notNull()
      .default(sql`'[]'`),
    files: text("files", { mode: "json" })
      .$type<SaveFile[]>()
      .notNull()
      .default(sql`'[]'`),
    coverIndex: integer("cover_index").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    fileSize: integer("file_size"),
    phash: text("phash"),
    blurhash: text("blurhash"),
    embedding: text("embedding", { mode: "json" }).$type<number[]>(),
    embeddingModel: text("embedding_model"),
    caption: text("caption"),
    captionModel: text("caption_model"),
    ocrText: text("ocr_text"),
    ocrModel: text("ocr_model"),
    transcript: text("transcript"),
    transcriptModel: text("transcript_model"),
    clipEmbedding: text("clip_embedding", { mode: "json" }).$type<number[]>(),
    clipModel: text("clip_model"),
    aesthetic: text("aesthetic", { mode: "json" }).$type<string[]>(),
    aestheticModel: text("aesthetic_model"),
    sensitiveScore: real("sensitive_score"),
    sensitiveModel: text("sensitive_model"),
    autoTitleModel: text("auto_title_model"),
    suggestedTags: text("suggested_tags", { mode: "json" }).$type<string[]>(),
    suggestedTagsModel: text("suggested_tags_model"),
    videoNotes: text("video_notes", { mode: "json" })
      .$type<VideoNote[]>()
      .notNull()
      .default(sql`'[]'`),
    comments: text("comments", { mode: "json" })
      .$type<ImageComment[]>()
      .notNull()
      .default(sql`'[]'`),
    rating: integer("rating"),
    rotate: integer("rotate").notNull().default(0),
    flipX: integer("flip_x", { mode: "boolean" }).notNull().default(false),
    flipY: integer("flip_y", { mode: "boolean" }).notNull().default(false),
    crop: text("crop", { mode: "json" }).$type<ImageCrop | null>(),
    dominantColors: text("dominant_colors", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    status: text("status")
      .$type<SaveStatus>()
      .notNull()
      .default(sql`'ingesting'`),
    ingestStartedAt: integer("ingest_started_at", { mode: "timestamp_ms" }),
    ingestCompletedAt: integer("ingest_completed_at", { mode: "timestamp_ms" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    savedAt: integer("saved_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    sourceSourceIdUnique: unique("saves_source_source_id_unique").on(
      t.source,
      t.sourceId,
    ),
    savedAtIdIdx: index("saves_saved_at_id_idx").on(
      sql`${t.savedAt} DESC`,
      sql`${t.id} DESC`,
    ),
    sourceIdx: index("saves_source_idx").on(t.source),
    accountIdx: index("saves_account_idx").on(t.accountId),
    sizeIdx: index("saves_size_idx").on(t.fileSize),
    dimsIdx: index("saves_dims_idx").on(t.width, t.height),
    deletedIdx: index("saves_deleted_idx").on(t.deletedAt),
    statusIdx: index("saves_status_idx").on(t.status),
  }),
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    saveId: text("save_id")
      .notNull()
      .references(() => saves.id, { onDelete: "cascade" }),
    op: text("op").$type<Op>().notNull(),
    status: text("status")
      .$type<TaskStatus>()
      .notNull()
      .default(sql`'pending'`),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextRunAt: integer("next_run_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastError: text("last_error"),
    payload: text("payload", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    saveOpUnique: unique("tasks_save_op_unique").on(t.saveId, t.op),
    nextRunIdx: index("tasks_next_run_idx").on(t.status, t.nextRunAt),
    saveIdx: index("tasks_save_idx").on(t.saveId),
  }),
);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const tagGroups = sqliteTable("tag_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  collapsed: integer("collapsed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const tagGroupMembers = sqliteTable(
  "tag_group_members",
  {
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => tagGroups.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    pk: unique("tag_group_members_pk").on(t.tagId, t.groupId),
    tagIdx: index("tag_group_members_tag_idx").on(t.tagId),
    groupIdx: index("tag_group_members_group_idx").on(t.groupId),
  }),
);

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const saveFolders = sqliteTable(
  "save_folders",
  {
    saveId: text("save_id")
      .notNull()
      .references(() => saves.id, { onDelete: "cascade" }),
    folderId: text("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: unique("save_folders_pk").on(t.saveId, t.folderId),
    saveIdx: index("save_folders_save_idx").on(t.saveId),
    folderIdx: index("save_folders_folder_idx").on(t.folderId),
  }),
);

export const agentChats = sqliteTable("agent_chats", {
  id: text("id").primaryKey(),
  title: text("title"),
  canonicalTranscript: text("canonical_transcript"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const agentMessages = sqliteTable(
  "agent_messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => agentChats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<JsonObject>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    chatIdx: index("agent_messages_chat_idx").on(t.chatId, t.createdAt),
  }),
);

export const SAVED_VIEW_KINDS = [
  "saved_view",
  "smart_folder",
  "group",
] as const;

export const savedViews = sqliteTable("saved_views", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: SAVED_VIEW_KINDS })
    .notNull()
    .default("saved_view"),
  parentId: text("parent_id"),
  question: text("question"),
  query: text("query", { mode: "json" })
    .$type<Query>()
    .notNull()
    .default(sql`'{"kind":"and","clauses":[]}'`),
  sortKey: text("sort_key").notNull().default("savedAt"),
  sortDir: text("sort_dir").notNull().default("desc"),
  layout: text("layout"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const SYNC_ACTIONS = ["I", "U", "D", "A"] as const;
export type SyncActionKind = (typeof SYNC_ACTIONS)[number];

export const SYNC_MODELS = [
  "save",
  "tag",
  "tag_group",
  "tag_group_member",
  "saved_view",
  "folder",
  "save_folder",
  "settings",
] as const;
export type SyncModel = (typeof SYNC_MODELS)[number];

export const SYNC_ACTORS = ["user", "system", "agent"] as const;
export type SyncActor = (typeof SYNC_ACTORS)[number];

export const syncActions = sqliteTable(
  "sync_actions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: text("batch_id"),
    modelName: text("model_name").$type<SyncModel>().notNull(),
    modelId: text("model_id").notNull(),
    action: text("action").$type<SyncActionKind>().notNull(),
    data: text("data", { mode: "json" }),
    prevData: text("prev_data", { mode: "json" }),
    actor: text("actor").$type<SyncActor>().notNull(),
    actorReason: text("actor_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    modelIdx: index("sync_actions_model_idx").on(t.modelName, t.modelId, t.id),
    actorIdx: index("sync_actions_actor_idx").on(t.actor, t.id),
    batchIdx: index("sync_actions_batch_idx").on(t.batchId),
  }),
);

export const transactionsLog = sqliteTable(
  "__transactions",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id"),
    tx: text("tx", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    committedAt: integer("committed_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    batchIdx: index("transactions_batch_idx").on(t.batchId),
  }),
);

export const libraryScan = sqliteTable("library_scan", {
  itemId: text("item_id").primaryKey(),
  mtimeMs: integer("mtime_ms").notNull(),
  scannedAt: integer("scanned_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("singleton"),
  videoDownload: text("video_download", { mode: "json" })
    .$type<VideoDownloadSettings>()
    .notNull()
    .$defaultFn(() => DEFAULT_VIDEO_DOWNLOAD),
  imageDownload: text("image_download", { mode: "json" })
    .$type<ImageDownloadSettings>()
    .notNull()
    .$defaultFn(() => DEFAULT_IMAGE_DOWNLOAD),
  prefs: text("prefs", { mode: "json" })
    .$type<StoredPrefsEnvelope>()
    .notNull()
    .$defaultFn(() => ({ version: 3, app: {}, pending: null })),
  libraryRoot: text("library_root"),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type Save = typeof saves.$inferSelect;
export type NewSave = typeof saves.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type TagGroup = typeof tagGroups.$inferSelect;
export type NewTagGroup = typeof tagGroups.$inferInsert;
export type TagGroupMember = typeof tagGroupMembers.$inferSelect;
export type NewTagGroupMember = typeof tagGroupMembers.$inferInsert;
export type SavedView = typeof savedViews.$inferSelect;
export type NewSavedView = typeof savedViews.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type SaveFolder = typeof saveFolders.$inferSelect;
export type NewSaveFolder = typeof saveFolders.$inferInsert;
export type AgentChat = typeof agentChats.$inferSelect;
export type NewAgentChat = typeof agentChats.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
export type SyncAction = typeof syncActions.$inferSelect;
export type NewSyncAction = typeof syncActions.$inferInsert;
export type TransactionRow = typeof transactionsLog.$inferSelect;
export type LibraryScanRow = typeof libraryScan.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
