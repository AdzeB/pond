import type { Browser, Platform } from "./platform";

/** Keep in sync with apps/desktop and apps/extension package versions on each release. */
const POND_VERSION = "1.3.0";

const RELEASES_BASE =
  "https://github.com/raphaelsalaja/pond/releases/latest/download";

function dmgUrl(arch: "arm64" | "x64"): string {
  return `${RELEASES_BASE}/Pond-${POND_VERSION}-${arch}.dmg`;
}

function windowsInstallerUrl(): string {
  return `${RELEASES_BASE}/Pond-${POND_VERSION}-x64.exe`;
}

/** Mirrors `EXTENSION_STORE_URLS` in `@pond/schema/native`, which would pull zod into this client bundle. */
const CHROME_WEB_STORE_URL: string | null = null;
const FIREFOX_ADDONS_URL =
  "https://addons.mozilla.org/firefox/addon/desktop%40pond.so/";

/** Sends Chromium visitors to Firefox Add-ons until the Chrome Web Store listing is live. */
export function extensionUrl(browser: Browser): string {
  return (
    (browser === "firefox" ? null : CHROME_WEB_STORE_URL) ?? FIREFOX_ADDONS_URL
  );
}

interface Download {
  label: string;
  href: string;
}

/** The download offered first, matched to the visitor's system. */
export function primaryDownload(platform: Platform): Download {
  return platform === "windows"
    ? { label: "Download for Windows", href: windowsInstallerUrl() }
    : { label: "Download for Mac", href: dmgUrl("arm64") };
}

/** Every other build, listed as secondary links. */
export function otherDownloads(platform: Platform): Download[] {
  return platform === "windows"
    ? [
        { label: "Mac", href: dmgUrl("arm64") },
        { label: "Intel Mac", href: dmgUrl("x64") },
      ]
    : [
        { label: "Intel Mac", href: dmgUrl("x64") },
        { label: "Windows", href: windowsInstallerUrl() },
      ];
}
