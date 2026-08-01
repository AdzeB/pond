import type { Save } from "@/lib/types";
import { activity } from "@/stores/activity";

/** Each engine maps a public image URL to a search URL; local saves are gated upstream. */
export const REVERSE_SEARCH_ENGINES: ReadonlyArray<{
  key: string;
  label: string;
  url: (encoded: string) => string;
}> = [
  {
    key: "google-lens",
    label: "Google Lens",
    url: (u) => `https://lens.google.com/uploadbyurl?url=${u}`,
  },
  {
    key: "yandex",
    label: "Yandex",
    url: (u) => `https://yandex.com/images/search?rpt=imageview&url=${u}`,
  },
  {
    key: "bing",
    label: "Bing",
    url: (u) =>
      `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&q=imgurl:${u}`,
  },
  {
    key: "tineye",
    label: "TinEye",
    url: (u) => `https://www.tineye.com/search?url=${u}`,
  },
];

export async function hasPublicImageUrl(saveId: string): Promise<boolean> {
  const result = (await window.pond.query("saves.publicImageUrl", {
    id: saveId,
  })) as { ok: true; url: string | null } | { ok: false; url: null };
  return Boolean(result.ok && result.url);
}

export async function reverseImageSearch(
  save: Save,
  engineKey: string,
): Promise<void> {
  const engine = REVERSE_SEARCH_ENGINES.find((e) => e.key === engineKey);
  if (!engine) return;
  const result = (await window.pond.query("saves.publicImageUrl", {
    id: save.id,
  })) as { ok: true; url: string | null } | { ok: false; url: null };
  if (!result.ok || !result.url) {
    activity.error(
      "Reverse Image Search",
      "No public image URL is available for this save.",
    );
    return;
  }
  const encoded = encodeURIComponent(result.url);
  await window.pond.openExternal(engine.url(encoded));
}
