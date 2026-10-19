import { z } from "zod";
import type { JsonValue } from "@/utils/json";
import type { Folder } from "@/utils/messaging";
import { nativeCall } from "@/utils/native";
import { type ProbeResult, probe } from "@/utils/probe";
import { type ThemeVars, themeVarsSchema } from "@/utils/theme";

const THEME_KEY = "libraryTheme";
const foldersSchema = z.array(z.object({ id: z.string(), name: z.string() }));

export async function probeLibrary(): Promise<ProbeResult> {
  const result = await probe().catch((): ProbeResult => ({ state: "offline" }));
  if (result.state === "connected") {
    await browser.storage.session
      .set({ [THEME_KEY]: result.library.theme ?? null })
      .catch(() => {});
  }
  return result;
}

/** Overlays reuse the last theme Pond shared so a toast doesn't cost a native round trip. */
export async function libraryTheme(): Promise<ThemeVars | null> {
  const stored: Record<string, JsonValue> =
    await browser.storage.session.get(THEME_KEY);
  if (THEME_KEY in stored) {
    const cached = themeVarsSchema.nullable().safeParse(stored[THEME_KEY]);
    if (cached.success) return cached.data;
  }
  const result = await probeLibrary();
  return result.state === "connected" ? (result.library.theme ?? null) : null;
}

export async function listFolders(): Promise<Folder[]> {
  const result = await nativeCall({ type: "folders.list" });
  if (!result.ok) return [];
  const folders = foldersSchema.safeParse(result.data);
  return folders.success ? folders.data : [];
}
