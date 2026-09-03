import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { BrowserWindow, net } from "electron";
import log from "electron-log/main.js";
import { createManualSave } from "./manual-import";

const MIN_EDGE = 200;
const MAX_ASSETS = 40;
const LOAD_MS = 15_000;

interface PageImage {
  src: string;
  width: number;
  height: number;
}

export async function extractPageAssets(url: string): Promise<{
  ok: boolean;
  imported: number;
  skipped: number;
  error?: string;
}> {
  let href: string;
  try {
    href = new URL(url).toString();
  } catch {
    return { ok: false, imported: 0, skipped: 0, error: "invalid_url" };
  }
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  try {
    await win.loadURL(href, { extraHeaders: "pragma: no-cache\n" });
    const images = (await Promise.race([
      win.webContents.executeJavaScript(
        `([...document.images]).map((img) => ({
          src: img.currentSrc || img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))`,
        true,
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_MS)),
    ])) as PageImage[] | null;
    if (!images)
      return { ok: false, imported: 0, skipped: 0, error: "timeout" };
    const picked = images
      .filter(
        (img) =>
          img.width >= MIN_EDGE &&
          img.height >= MIN_EDGE &&
          /^https?:/i.test(img.src),
      )
      .slice(0, MAX_ASSETS);
    let imported = 0;
    const dir = await mkdtemp(join(tmpdir(), "pond-page-"));
    for (const img of picked) {
      try {
        const res = await net.fetch(img.src);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = extname(new URL(img.src).pathname) || ".jpg";
        const path = join(dir, `asset-${imported}${ext}`);
        await writeFile(path, buf);
        const save = await createManualSave({
          title: new URL(href).hostname,
          filePaths: [path],
          tags: ["page-asset"],
          url: img.src,
        });
        if (save.ok) imported += 1;
      } catch (err) {
        log.warn("[pond page-extract] asset failed", img.src, err);
      }
    }
    return { ok: imported > 0, imported, skipped: picked.length - imported };
  } catch (err) {
    log.warn("[pond page-extract] failed", href, err);
    return { ok: false, imported: 0, skipped: 0, error: "extract_failed" };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
