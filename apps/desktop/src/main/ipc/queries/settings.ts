import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadSettings,
  settings as settingsTable,
  type VideoDownloadSettings,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import {
  getPrefs,
  setImageDownloadPrefs,
  setPrefs,
  setVideoDownloadPrefs,
} from "../../core/prefs";
import { getDb } from "../../db";
import { getIngestToken, rotateIngestToken } from "../../keychain";
import type { QueryHandlerMap } from "../helpers";

export const settingsQueries: QueryHandlerMap = {
  async "settings.get"() {
    const db = await getDb();
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, "singleton"));
    if (rows[0]) {
      return {
        ...rows[0],
        videoDownload: rows[0].videoDownload ?? DEFAULT_VIDEO_DOWNLOAD,
        imageDownload: rows[0].imageDownload ?? DEFAULT_IMAGE_DOWNLOAD,
      };
    }
    await db
      .insert(settingsTable)
      .values({
        id: "singleton",
        videoDownload: DEFAULT_VIDEO_DOWNLOAD,
        imageDownload: DEFAULT_IMAGE_DOWNLOAD,
      })
      .onConflictDoNothing()
      .run();
    return {
      id: "singleton",
      videoDownload: DEFAULT_VIDEO_DOWNLOAD,
      imageDownload: DEFAULT_IMAGE_DOWNLOAD,
      libraryRoot: null,
      updatedAt: new Date(),
    };
  },

  async "settings.setVideoDownload"(params) {
    const next = await setVideoDownloadPrefs(
      params as Partial<VideoDownloadSettings>,
    );
    return { ok: true, videoDownload: next };
  },

  async "settings.setImageDownload"(params) {
    const next = await setImageDownloadPrefs(
      params as Partial<ImageDownloadSettings>,
    );
    return { ok: true, imageDownload: next };
  },

  async "settings.ingestToken"() {
    return { token: await getIngestToken() };
  },

  async "settings.onboarded"() {
    const db = await getDb();
    const rows = await db
      .select({ onboarded: settingsTable.onboarded })
      .from(settingsTable)
      .where(eq(settingsTable.id, "singleton"));
    return Boolean(rows[0]?.onboarded);
  },

  async "settings.markOnboarded"(params) {
    const db = await getDb();
    await db
      .insert(settingsTable)
      .values({
        id: "singleton",
        onboarded: Boolean(params.value ?? true),
      })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { onboarded: Boolean(params.value ?? true) },
      })
      .run();
    return { ok: true };
  },

  async "settings.rotateIngestToken"() {
    return { token: await rotateIngestToken() };
  },

  async "settings.getPrefs"() {
    return await getPrefs();
  },

  async "settings.setPrefs"(params) {
    const next = await setPrefs(params as Parameters<typeof setPrefs>[0]);
    return { ok: true, prefs: next };
  },
};
