import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { saves } from "@pond/schema/db";
import { and, eq, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { resolvePaths } from "../../paths";
import { executeBatch } from "../executor";
import { currentPondId } from "../prefs-scope";
import { isLandingOgThreadsSave } from "./harvest/threads/normalize";

const MIGRATION_ID = "threads-landing-og-trash-v1";
const PAGE_SIZE = 200;

function markerPath(): string {
  return join(resolvePaths().indexesDir, `${currentPondId()}.${MIGRATION_ID}`);
}

export async function startThreadsLandingOgTrash(): Promise<{
  ok: true;
  trashed: number;
  skipped: boolean;
}> {
  if (existsSync(markerPath())) {
    return { ok: true, trashed: 0, skipped: true };
  }

  const db = await getDb();
  const ids: string[] = [];
  let offset = 0;

  for (;;) {
    const page = db
      .select({
        id: saves.id,
        source: saves.source,
        title: saves.title,
        description: saves.description,
        rawJson: saves.rawJson,
      })
      .from(saves)
      .where(and(eq(saves.source, "threads"), isNull(saves.deletedAt)))
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    if (page.length === 0) break;
    offset += page.length;
    for (const row of page) {
      if (isLandingOgThreadsSave(row)) ids.push(row.id);
    }
    if (page.length < PAGE_SIZE) break;
  }

  if (ids.length === 0) {
    writeFileSync(markerPath(), `${Date.now()}\n`);
    log.info("[pond threads-landing-og] nothing to trash");
    return { ok: true, trashed: 0, skipped: false };
  }

  log.info("[pond threads-landing-og] trashing", ids.length, "saves");
  await executeBatch(
    ids.map((id) => ({
      kind: "trash" as const,
      model: "save" as const,
      id,
      meta: {
        actor: "system" as const,
        actorReason: "migration:threads-landing-og-trash-v1",
      },
    })),
  );
  writeFileSync(markerPath(), `${Date.now()}\n`);
  log.info("[pond threads-landing-og] trashed", ids.length);
  return { ok: true, trashed: ids.length, skipped: false };
}
