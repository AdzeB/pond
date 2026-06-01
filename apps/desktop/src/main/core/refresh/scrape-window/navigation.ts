import type { BrowserWindow } from "electron";
import { sleep } from "./util";

export function looksLikeAuthWall(currentUrl: string): boolean {
  try {
    const u = new URL(currentUrl);
    const p = u.pathname.toLowerCase();
    if (
      p.startsWith("/login") ||
      p.startsWith("/signin") ||
      p.startsWith("/sign-in") ||
      p.startsWith("/sign_in") ||
      p.startsWith("/i/flow/login") ||
      p.startsWith("/accounts/login") ||
      p.startsWith("/auth")
    ) {
      return true;
    }
    if (u.hostname.includes("accounts.google.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function navigateWithTimeout(
  win: BrowserWindow,
  url: string,
  timeoutMs: number,
): Promise<boolean> {
  const wc = win.webContents;
  const finished = new Promise<boolean>((resolve) => {
    const onDone = () => {
      cleanup();
      resolve(true);
    };
    const onFail = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      wc.off("did-finish-load", onDone);
      wc.off("did-fail-load", onFail);
    };
    wc.once("did-finish-load", onDone);
    wc.once("did-fail-load", onFail);
  });

  // `wc.loadURL` can hang indefinitely on stalled hosts (X under
  // rate-limit / soft-block stops emitting both did-finish-load and
  // did-fail-load, and the loadURL promise never settles). Previously
  // we awaited loadURL before racing the load events against the
  // timeout. A hang there leaked the pool window forever, eventually
  // pinning the reconciler at MAX_GLOBAL_INFLIGHT. Race the entire
  // navigation against a wall-clock budget and forcibly stop the
  // WebContents on miss so the pool slot can be reused.
  const navPromise = wc.loadURL(url).then(
    () => finished,
    () => false as const,
  );
  const TIMEOUT = Symbol("nav-timeout");
  const result = await Promise.race([
    navPromise,
    sleep(timeoutMs).then(() => TIMEOUT),
  ]);
  if (result === TIMEOUT) {
    try {
      wc.stop();
    } catch {
      /* wc may be destroyed mid-flight; pool drops it */
    }
    return false;
  }
  return result === true;
}
