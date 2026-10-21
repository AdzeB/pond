import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BrowserWindow } from "electron";

/** Wraps a rendered board image in a one-page PDF the exact size of the image. */
export async function canvasPdf(
  png: Uint8Array,
  width: number,
  height: number,
): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "pond-canvas-"));
  const page = new BrowserWindow({
    show: false,
    width: Math.ceil(width),
    height: Math.ceil(height),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      javascript: false,
    },
  });
  try {
    await writeFile(join(directory, "board.png"), png);
    const html = join(directory, "board.html");
    await writeFile(
      html,
      `<!doctype html><style>@page{size:${width}px ${height}px;margin:0}html,body{margin:0}img{display:block;width:${width}px;height:${height}px}</style><img src="board.png">`,
    );
    await page.loadFile(html);
    return await page.webContents.printToPDF({
      preferCSSPageSize: true,
      printBackground: true,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    page.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
