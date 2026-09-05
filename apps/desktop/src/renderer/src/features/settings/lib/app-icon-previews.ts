import { appIconLabel, appIconTint, sortAppIconIds } from "@shared/app-icons";
import { z } from "zod";

const previews = import.meta.glob(
  "../../../generated/app-icon-previews/*.png",
  {
    eager: true,
    import: "default",
  },
);

export interface AppIconPreview {
  id: string;
  label: string;
  preview: string;
  tint?: string;
}

function idFromPreviewPath(path: string): string | null {
  return path.match(/([^/]+)\.png$/)?.[1] ?? null;
}

const PreviewUrlSchema = z.string();

const previewById = new Map<string, string>();
for (const [path, url] of Object.entries(previews)) {
  const parsed = PreviewUrlSchema.safeParse(url);
  if (!parsed.success) continue;
  const id = idFromPreviewPath(path);
  if (id) previewById.set(id, parsed.data);
}

export function listAppIconPreviews(): AppIconPreview[] {
  return sortAppIconIds(previewById.keys()).map((id) => ({
    id,
    label: appIconLabel(id),
    preview: previewById.get(id) ?? "",
    tint: appIconTint(id),
  }));
}
