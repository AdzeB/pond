import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadSettings,
  settings as settingsTable,
  type VideoDownloadSettings,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import {
  getImageDownloadPrefs,
  getPrefs,
  getVideoDownloadPrefs,
  setImageDownloadPrefs,
  setPrefs,
  setVideoDownloadPrefs,
} from "../../core/prefs";
import { getGlobalDb } from "../../db";
import { getIngestToken, rotateIngestToken } from "../../keychain";
import type { QueryHandlerMap } from "../helpers";

export const settingsQueries: QueryHandlerMap = {
  async "settings.get"() {
    const db = await getGlobalDb();
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, "singleton"));
    // Read through normalizing getters so a partial blob doesn't blank UI controls.
    const videoDownload = await getVideoDownloadPrefs();
    const imageDownload = await getImageDownloadPrefs();
    if (rows[0]) {
      return { ...rows[0], videoDownload, imageDownload };
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
      videoDownload,
      imageDownload,
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
