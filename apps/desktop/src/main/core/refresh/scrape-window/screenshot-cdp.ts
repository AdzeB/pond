import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { sleep } from "./util";

// CDP commands and capturePage can hang indefinitely on a wedged hidden window
// (seen at startup: Emulation.setEmulatedMedia never resolving). Bound them so a
// stuck capture can't hold its window lease forever and starve the pool.
const CDP_COMMAND_TIMEOUT_MS = 10_000;

async function sendCdpCommand(
  dbg: Electron.Debugger,
  method: string,
  params: Record<string, unknown> | undefined,
  timeoutMs: number,
): Promise<void> {
  await Promise.race([
    params === undefined
      ? dbg.sendCommand(method)
      : dbg.sendCommand(method, params),
    sleep(timeoutMs).then(() => {
      throw new Error(`CDP ${method} timed out after ${timeoutMs}ms`);
    }),
  ]);
}

export async function emulateColorScheme(
  win: BrowserWindow,
  scheme: "light" | "dark",
): Promise<() => Promise<void>> {
  const dbg = win.webContents.debugger;
  const alreadyAttached = dbg.isAttached();
  let attachedHere = false;
  try {
    if (!alreadyAttached) {
      dbg.attach("1.3");
      attachedHere = true;
    }
    await sendCdpCommand(
      dbg,
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-color-scheme", value: scheme }] },
      CDP_COMMAND_TIMEOUT_MS,
    );
  } catch (err) {
    log.warn(
      "[pond screenshot:tweet] emulated media setup failed",
      scheme,
      err,
    );
    if (attachedHere) {
      try {
        dbg.detach();
      } catch {
        /* attach failed mid-flight; nothing to detach */
      }
    }
    return async () => {};
  }
  return async () => {
    try {
      await sendCdpCommand(
        dbg,
        "Emulation.setEmulatedMedia",
        { features: [] },
        CDP_COMMAND_TIMEOUT_MS,
      );
    } catch {
      /* override may already be cleared; safe to ignore */
    }
    if (attachedHere) {
      try {
        dbg.detach();
      } catch {
        /* wc may have been destroyed mid-capture; pool drops it */
      }
    }
  };
}

// Override device scale factor for `fn` via CDP; the lever for sharper PNGs.
export async function withDeviceScaleFactor<T>(
  win: BrowserWindow,
  factor: number,
  fn: () => Promise<T>,
): Promise<T> {
  const dbg = win.webContents.debugger;
  const alreadyAttached = dbg.isAttached();
  let attachedHere = false;
  try {
    if (!alreadyAttached) {
      dbg.attach("1.3");
      attachedHere = true;
    }
    const [width, height] = win.getContentSize();
    await sendCdpCommand(
      dbg,
      "Emulation.setDeviceMetricsOverride",
      {
        width: width ?? 1280,
        height: height ?? 1024,
        deviceScaleFactor: factor,
        mobile: false,
      },
      CDP_COMMAND_TIMEOUT_MS,
    );
    return await fn();
  } finally {
    try {
      await sendCdpCommand(
        dbg,
        "Emulation.clearDeviceMetricsOverride",
        undefined,
        CDP_COMMAND_TIMEOUT_MS,
      );
    } catch {
      /* override may already be cleared; safe to ignore */
    }
    if (attachedHere) {
      try {
        dbg.detach();
      } catch {
        /* detach can throw if the wc was destroyed mid-capture */
      }
    }
  }
}
