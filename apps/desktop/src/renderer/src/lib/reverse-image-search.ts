import type { useToast } from "@pond/ui";
import type { Save } from "./types";

type Toast = ReturnType<typeof useToast>;

// Reverse image search engines, each mapping a public image URL to a search URL (local saves gated upstream).
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

export async function reverseImageSearch(
  save: Save,
  engineKey: string,
  toast: Toast,
): Promise<void> {
  const engine = REVERSE_SEARCH_ENGINES.find((e) => e.key === engineKey);
  if (!engine) return;
  const result = (await window.pond.query("saves.publicImageUrl", {
    id: save.id,
  })) as { ok: true; url: string | null } | { ok: false; url: null };
  if (!result.ok || !result.url) {
    toast.add({
      title: "No public image URL for this save",
      type: "error",
    });
    return;
  }
  const encoded = encodeURIComponent(result.url);
  await window.pond.openExternal(engine.url(encoded));
}
