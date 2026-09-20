import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import {
  app,
  clipboard,
  dialog,
  type NativeImage,
  nativeImage,
} from "electron";
import { z } from "zod";
import { libraryItemLink } from "../../../shared/library-links";
import { runLibraryTransfer } from "../../core/library-transfers";
import { materializeLibraryMediaForExternalUse } from "../../core/security/library-media-storage";
import {
  type OpenWithAppInfo,
  openWithListingKey,
  parseOpenWithPayload,
  rankOpenWithApps,
} from "../../lib/open-with-apps";
import { readOrCreatePondId } from "../../lib/pond-identity";
import { libraryRoot } from "../../paths";
import { resolveSaveFilePath } from "../helpers";
import { type QueryHandlerMap, query } from "./params";

const run = promisify(execFile);
const listedAppsByKind = new Map<string, OpenWithAppInfo[]>();
const iconByPath = new Map<string, string | null>();

async function resolveFiles(
  ids: string[],
  fileIndex: number | undefined,
): Promise<{ ok: true; files: string[] } | { ok: false; error: string }> {
  const files: string[] = [];
  for (const id of new Set(ids)) {
    const target = await resolveSaveFilePath(id, fileIndex);
    if (!target.ok)
      return {
        ok: false,
        error: "A selected Save has no available original file.",
      };
    files.push(await materializeLibraryMediaForExternalUse(target.path));
  }
  return { ok: true, files };
}

async function listMacApps(filePath: string) {
  const script = `ObjC.import("AppKit");
const url = $.NSURL.fileURLWithPath(${JSON.stringify(filePath)});
const workspace = $.NSWorkspace.sharedWorkspace;
const fallback = workspace.URLForApplicationToOpenURL(url);
const apps = workspace.URLsForApplicationsToOpenURL(url);
const paths = [];
const count = Number(apps.count);
for (let i = 0; i < count; i++) paths.push(ObjC.unwrap(apps.objectAtIndex(i).path));
JSON.stringify({ defaultPath: fallback ? ObjC.unwrap(fallback.path) : null, paths });`;
  const { stdout } = await run(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", script],
    { timeout: 8000 },
  );
  return rankOpenWithApps(parseOpenWithPayload(stdout.trim()));
}

async function listedApps(filePath: string): Promise<OpenWithAppInfo[]> {
  const key = openWithListingKey(filePath);
  const cached = listedAppsByKind.get(key);
  if (cached) return cached;
  const ranked = await listMacApps(filePath);
  listedAppsByKind.set(key, ranked);
  return ranked;
}

const ICON_SOURCE_PX = 32;

async function cachedAppIcon(path: string): Promise<string | null> {
  const cached = iconByPath.get(path);
  if (cached !== undefined) return cached;
  const icon = await readAppIcon(path);
  iconByPath.set(path, icon);
  return icon;
}

async function readAppIcon(path: string): Promise<string | null> {
  const fromQuickLook = await thumbnailIcon(path);
  if (fromQuickLook) return fromQuickLook;
  try {
    const image = await app.getFileIcon(path, { size: "normal" });
    return encodeIcon(image);
  } catch {
    return null;
  }
}

async function thumbnailIcon(path: string): Promise<string | null> {
  try {
    const image = await nativeImage.createThumbnailFromPath(path, {
      width: ICON_SOURCE_PX,
      height: ICON_SOURCE_PX,
    });
    return encodeIcon(image);
  } catch {
    return null;
  }
}

function encodeIcon(image: NativeImage): string | null {
  if (image.isEmpty()) return null;
  const sized = image.resize({
    width: ICON_SOURCE_PX,
    height: ICON_SOURCE_PX,
    quality: "best",
  });
  if (sized.isEmpty()) return null;
  return sized.toDataURL();
}

async function openFilesWith(
  files: string[],
  application: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    for (let offset = 0; offset < files.length; offset += 100)
      await run("/usr/bin/open", [
        "-a",
        application,
        ...files.slice(offset, offset + 100),
      ]);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not open the selected application.",
    };
  }
}

export const openWithQueries = {
  "saves.copyInternalLinks": query(
    z.object({ ids: z.array(z.string().min(1)).min(1) }),
    async ({ ids }) => {
      const libraryId = readOrCreatePondId(libraryRoot());
      clipboard.writeText(
        [...new Set(ids)]
          .map((id) => libraryItemLink(libraryId, id))
          .join("\n"),
      );
      return { ok: true };
    },
  ),
  "saves.listOpenWith": query(
    z.object({
      ids: z.array(z.string()).min(1),
      fileIndex: z.number().int().nonnegative().optional(),
      includeIcons: z.boolean().optional(),
    }),
    async ({ ids, fileIndex, includeIcons }) => {
      if (process.platform !== "darwin") return { apps: [] };
      const target = await resolveSaveFilePath(ids[0] ?? "", fileIndex);
      if (!target.ok) return { apps: [] };
      try {
        const file = await materializeLibraryMediaForExternalUse(target.path);
        const ranked = await listedApps(file);
        const apps = await Promise.all(
          ranked.map(async (entry) => ({
            ...entry,
            icon: includeIcons
              ? await cachedAppIcon(entry.path)
              : (iconByPath.get(entry.path) ?? null),
          })),
        );
        return { apps };
      } catch {
        return { apps: [] };
      }
    },
  ),
  "saves.openWith": query(
    z.object({
      ids: z.array(z.string()).min(1),
      fileIndex: z.number().int().nonnegative().optional(),
      application: z.string().min(1).optional(),
    }),
    async ({ ids, fileIndex, application }) =>
      runLibraryTransfer(async () => {
        const resolved = await resolveFiles(ids, fileIndex);
        if (!resolved.ok) return resolved;
        const { files } = resolved;
        try {
          if (process.platform === "win32") {
            for (const file of files)
              await run("rundll32.exe", ["shell32.dll,OpenAs_RunDLL", file]);
            return { ok: true };
          }
          if (process.platform !== "darwin")
            return {
              ok: false,
              error:
                "Choose an application from your file manager to open this Save.",
            };
          if (application) {
            if (!application.endsWith(".app") || !existsSync(application))
              return { ok: false, error: "Could not find that application." };
            return openFilesWith(files, application);
          }
          const picked = await dialog.showOpenDialog({
            title: "Open With",
            buttonLabel: "Open",
            defaultPath: "/Applications",
            properties: ["openFile"],
            filters: [{ name: "Applications", extensions: ["app"] }],
          });
          if (picked.canceled || !picked.filePaths[0])
            return { ok: false, cancelled: true };
          return openFilesWith(files, picked.filePaths[0]);
        } catch (error) {
          return {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not open the selected application.",
          };
        }
      }),
  ),
} satisfies QueryHandlerMap;
