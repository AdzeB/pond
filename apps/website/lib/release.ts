/** Keep in sync with apps/desktop and apps/extension package versions on each release. */
export const POND_VERSION = "0.1.0";

const RELEASES_BASE =
  "https://github.com/raphaelsalaja/pond/releases/latest/download";

export const RELEASES_PAGE =
  "https://github.com/raphaelsalaja/pond/releases/latest";

export function dmgUrl(arch: "arm64" | "x64"): string {
  return `${RELEASES_BASE}/Pond-${POND_VERSION}-${arch}.dmg`;
}

export function extensionZipUrl(): string {
  return `${RELEASES_BASE}/pond-extension-${POND_VERSION}.zip`;
}
