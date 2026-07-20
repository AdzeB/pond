import {
  type Tag,
  type TagGroup,
  type TagGroupMember,
  tagGroupMembers as tagGroupMembersTable,
  tagGroups as tagGroupsTable,
  tags as tagsTable,
} from "@pond/schema/db";
import log from "electron-log/main.js";
import { getDb } from "../db";
import {
  createDebouncedTask,
  readBundleJson,
  writeBundleJson,
} from "../lib/library-config";
import { resolvePaths } from "../paths";

/** Mirror of the tag tables inside the .pond bundle (tags.json) so tag data survives index deletion and travels with the folder. */

const TAG_MODELS = new Set(["tag", "tag_group", "tag_group_member"]);

export function isTagModel(model: string): boolean {
  return TAG_MODELS.has(model);
}

/** Dates cross the JSON boundary as epoch ms. */
interface WireTag {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  starred: boolean;
  archived: boolean;
  lastUsedAt: number | null;
  usageCount: number;
  createdAt: number;
}

interface WireTagGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  collapsed: boolean;
  createdAt: number;
}

interface WireTagGroupMember {
  tagId: string;
  groupId: string;
  sortOrder: number;
}

interface TagsBundle {
  tags: WireTag[];
  groups: WireTagGroup[];
  members: WireTagGroupMember[];
}

async function dumpTagsToBundle(): Promise<void> {
  const db = await getDb();
  const [tagRows, groupRows, memberRows] = await Promise.all([
    db.select().from(tagsTable),
    db.select().from(tagGroupsTable),
    db.select().from(tagGroupMembersTable),
  ]);
  const body: TagsBundle = {
    tags: tagRows.map(tagToWire),
    groups: groupRows.map(groupToWire),
    members: memberRows,
  };
  writeBundleJson(resolvePaths().tagsFile, body);
}

const debouncedDump = createDebouncedTask(dumpTagsToBundle);

export function scheduleTagsDump(): void {
  debouncedDump.schedule();
}

export async function flushTagsDump(): Promise<void> {
  await debouncedDump.flush();
}

/** Inserts rows missing from the index without clobbering local edits, then re-dumps so both sides converge; deletes only propagate through live transactions, per the bundle's last-write-wins contract. */
export async function hydrateTagsFromBundle(): Promise<void> {
  const paths = resolvePaths();
  const read = readBundleJson<TagsBundle>(paths.tagsFile, paths.backupDir);

  const db = await getDb();
  const existingTags = await db.select({ id: tagsTable.id }).from(tagsTable);
  const existingGroups = await db
    .select({ id: tagGroupsTable.id })
    .from(tagGroupsTable);
  const indexHasRows = existingTags.length > 0 || existingGroups.length > 0;

  if (!read || !Array.isArray(read.data?.tags)) {
    if (indexHasRows) {
      await dumpTagsToBundle();
      log.info("[pond tags-bundle] seeded tags.json from index");
    }
    return;
  }

  const {
    tags: wireTags,
    groups: wireGroups,
    members: wireMembers,
  } = normalizeBundle(read.data);

  const knownTagIds = new Set(existingTags.map((t) => t.id));
  const knownGroupIds = new Set(existingGroups.map((g) => g.id));
  const bundleTagIds = new Set(wireTags.map((t) => t.id));
  const bundleGroupIds = new Set(wireGroups.map((g) => g.id));

  let inserted = 0;
  const raw = db.$raw;
  raw.transaction(() => {
    for (const tag of wireTags) {
      if (knownTagIds.has(tag.id)) continue;
      db.insert(tagsTable).values(tagFromWire(tag)).onConflictDoNothing().run();
      inserted += 1;
    }
    for (const group of wireGroups) {
      if (knownGroupIds.has(group.id)) continue;
      db.insert(tagGroupsTable)
        .values(groupFromWire(group))
        .onConflictDoNothing()
        .run();
      inserted += 1;
    }
    for (const member of wireMembers) {
      /** Skip rows whose endpoints exist neither in the index nor the bundle. */
      const tagOk =
        knownTagIds.has(member.tagId) || bundleTagIds.has(member.tagId);
      const groupOk =
        knownGroupIds.has(member.groupId) || bundleGroupIds.has(member.groupId);
      if (!tagOk || !groupOk) continue;
      db.insert(tagGroupMembersTable)
        .values(member)
        .onConflictDoNothing()
        .run();
    }
  })();

  if (inserted > 0) {
    log.info(`[pond tags-bundle] hydrated ${inserted} rows from tags.json`);
  }
  /** Converge the file with the possibly richer index state. */
  await dumpTagsToBundle();
}

function tagToWire(tag: Tag): WireTag {
  return {
    id: tag.id,
    name: tag.name,
    description: tag.description,
    color: tag.color,
    starred: tag.starred,
    archived: tag.archived,
    lastUsedAt: tag.lastUsedAt ? tag.lastUsedAt.getTime() : null,
    usageCount: tag.usageCount,
    createdAt: tag.createdAt.getTime(),
  };
}

function groupToWire(group: TagGroup): WireTagGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color,
    sortOrder: group.sortOrder,
    collapsed: group.collapsed,
    createdAt: group.createdAt.getTime(),
  };
}

function tagFromWire(tag: WireTag): Tag {
  return {
    id: tag.id,
    name: tag.name,
    description: tag.description ?? null,
    color: tag.color ?? null,
    starred: tag.starred === true,
    archived: tag.archived === true,
    lastUsedAt: toDate(tag.lastUsedAt),
    usageCount: typeof tag.usageCount === "number" ? tag.usageCount : 0,
    createdAt: toDate(tag.createdAt) ?? new Date(),
  };
}

function groupFromWire(group: WireTagGroup): TagGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    color: group.color ?? null,
    sortOrder: typeof group.sortOrder === "number" ? group.sortOrder : 0,
    collapsed: group.collapsed === true,
    createdAt: toDate(group.createdAt) ?? new Date(),
  };
}

function toDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return new Date(ms);
  }
  return null;
}

function normalizeBundle(data: TagsBundle): {
  tags: WireTag[];
  groups: WireTagGroup[];
  members: TagGroupMember[];
} {
  const tags = (Array.isArray(data.tags) ? data.tags : []).filter(
    (t) => typeof t?.id === "string" && typeof t?.name === "string",
  );
  const groups = (Array.isArray(data.groups) ? data.groups : []).filter(
    (g) => typeof g?.id === "string" && typeof g?.name === "string",
  );
  const members = (Array.isArray(data.members) ? data.members : [])
    .filter(
      (m) => typeof m?.tagId === "string" && typeof m?.groupId === "string",
    )
    .map((m) => ({
      tagId: m.tagId,
      groupId: m.groupId,
      sortOrder: typeof m.sortOrder === "number" ? m.sortOrder : 0,
    }));
  return { tags, groups, members };
}
