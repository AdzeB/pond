import {
  IconEnvelope,
  IconGear3,
  IconRefresh,
  IconWindowDownload,
} from "@pond/icons";
import { IconGithub, IconXTwitterGlyph } from "@pond/icons/social-media";
import type { MenuItemSpec } from "@pond/ui";
import { z } from "zod";
import { openSettings } from "@/shared/lib/open-settings";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";

const TWITTER = "https://x.com/raphaelsalaja";
const GITHUB = "https://github.com/raphaelsalaja";
const EMAIL = "mailto:raphaelsalaja@gmail.com";
const LATEST_RELEASE_API =
  "https://api.github.com/repos/raphaelsalaja/pond/releases/latest";
const RELEASES_PAGE = "https://github.com/raphaelsalaja/pond/releases/latest";
const EXTENSION_ASSET = /^pond-extension-.+\.zip$/;
const ReleaseSchema = z.object({
  assets: z.array(
    z.object({
      name: z.string(),
      browser_download_url: z.string().url(),
    }),
  ),
});

export async function downloadBrowserExtension(): Promise<void> {
  try {
    const response = await fetch(LATEST_RELEASE_API);
    if (!response.ok) throw new Error("Latest release lookup failed");
    const release = ReleaseSchema.safeParse(await response.json());
    if (!release.success)
      throw new Error("Latest release response was invalid");
    const asset = release.data.assets.find(({ name }) =>
      EXTENSION_ASSET.test(name),
    );
    if (!asset) throw new Error("Latest release has no browser extension");
    const result = await window.pond.openExternal(asset.browser_download_url);
    if (!result.ok) throw new Error("Browser extension download failed");
  } catch {
    const fallback = await window.pond.openExternal(RELEASES_PAGE);
    notify({
      id: "browser-extension-download",
      title: "Couldn't start the extension download",
      description: fallback.ok
        ? "Download the extension zip from Releases."
        : "Open GitHub Releases and download the extension zip.",
    });
  }
}

export function buildWorkspaceMenuItems(): MenuItemSpec[] {
  return [
    {
      label: "Settings",
      icon: <IconGear3 />,
      shortcut: shortcutGlyphs("app.settings"),
      onClick: () => openSettings(),
    },
    { type: "separator" },
    {
      label: "Check for Updates",
      icon: <IconRefresh />,
      onClick: () => openSettings("general"),
    },
    {
      label: "Download Browser Extension",
      icon: <IconWindowDownload />,
      onClick: () => void downloadBrowserExtension(),
    },
    { type: "separator" },
    {
      label: "Twitter",
      icon: <IconXTwitterGlyph />,
      onClick: () => void window.pond.openExternal(TWITTER),
    },
    {
      label: "GitHub",
      icon: <IconGithub />,
      onClick: () => void window.pond.openExternal(GITHUB),
    },
    {
      label: "Email",
      icon: <IconEnvelope />,
      onClick: () => void window.pond.openExternal(EMAIL),
    },
  ];
}
