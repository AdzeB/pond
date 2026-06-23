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

// Anti-abuse interstitials (challenge / checkpoint / captcha). Unlike a normal
// sign-in wall, hitting one means the platform is suspicious of the account, so
// callers should hard-stop and mark the source at-risk rather than retry.
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

  // loadURL can hang on stalled hosts; race the whole nav against a timeout and stop on miss.
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
