import type { BrowserWindowConstructorOptions } from "electron";

export function detachedWindowTitle(title: string): string {
  return `${title} · Pond`;
}

export function detachedWindowChrome(
  platform: NodeJS.Platform = process.platform,
): Pick<
  BrowserWindowConstructorOptions,
  "frame" | "hasShadow" | "roundedCorners"
> {
  return {
    frame: false,
    hasShadow: true,
    roundedCorners: platform === "darwin",
  };
}
