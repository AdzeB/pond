import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";
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

/** Anti-abuse interstitials mean the platform is suspicious of the account; callers should hard-stop and mark the source at-risk rather than retry. */
export function looksLikeChallenge(currentUrl: string): null | {
  kind: "challenge" | "checkpoint" | "captcha";
} {
  try {
    const u = new URL(currentUrl);
    const p = u.pathname.toLowerCase();
    const hay = `${p}?${u.search.toLowerCase()}`;
    if (p.includes("/challenge") || hay.includes("challenge")) {
      return { kind: "challenge" };
    }
    if (p.includes("/checkpoint")) return { kind: "checkpoint" };
    if (
      p.includes("/account/access") ||
      p.includes("/i/flow/consent") ||
      p.includes("/captcha") ||
      u.hostname.includes("funcaptcha") ||
      u.hostname.includes("arkoselabs")
    ) {
      return { kind: "captcha" };
    }
    return null;
  } catch {
    return null;
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
    const onFail = (
      _e: unknown,
      code: number,
      desc: string,
      failedUrl: string,
      isMainFrame: boolean,
    ) => {
      /** Subframe misses (blocked trackers, dead ad iframes) and ERR_ABORTED from the page's own redirects don't fail the navigation. */
      if (!isMainFrame || code === -3) return;
      log.info("[pond scrape] nav load failed", { code, desc, failedUrl });
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      wc.off("did-finish-load", onDone);
      wc.off("did-fail-load", onFail);
    };
    wc.once("did-finish-load", onDone);
    wc.on("did-fail-load", onFail);
  });

  /** loadURL can hang on stalled hosts; race the whole nav against a timeout and stop on miss. */
  const navPromise = wc.loadURL(url).then(
    () => finished,
    (err: unknown) => {
      /** ERR_ABORTED means the page replaced the navigation (JS redirect, SPA takeover); wait for the successor load instead of failing. */
      if (err instanceof Error && err.message.includes("ERR_ABORTED")) {
        return finished;
      }
      log.info("[pond scrape] loadURL rejected", {
        url,
        err: err instanceof Error ? err.message : String(err),
      });
      return false as const;
    },
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
      /** wc may be destroyed mid-flight; pool drops it. */
    }
    return false;
  }
  return result === true;
}
