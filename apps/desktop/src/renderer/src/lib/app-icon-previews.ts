import { appIconLabel, appIconTint, sortAppIconIds } from "@shared/app-icons";

const defaults = import.meta.glob(
  "../../../../../../packages/icons/brand/tints/*/default.png",
  { eager: true, import: "default" },
);

const dumped = import.meta.glob(
  "../../../../../../packages/icons/brand/tints/*/Pond-iOS-Default-1024x1024@1x.png",
  { eager: true, import: "default" },
);

export interface AppIconPreview {
  id: string;
  label: string;
  preview: string;
  tint?: string;
}

function idFromTintPath(path: string): string | null {
  const match = path.match(/brand\/tints\/([^/]+)\//);
  return match?.[1] ?? null;
}

function collect(
  modules: Record<string, unknown>,
  into: Map<string, string>,
  overwrite: boolean,
): void {
  for (const [path, url] of Object.entries(modules)) {
    if (typeof url !== "string") continue;
    const id = idFromTintPath(path);
    if (!id) continue;
    if (overwrite || !into.has(id)) into.set(id, url);
  }
}

const previewById = new Map<string, string>();
collect(dumped, previewById, false);
collect(defaults, previewById, true);

export function listAppIconPreviews(): AppIconPreview[] {
  return sortAppIconIds(previewById.keys()).map((id) => ({
    id,
    label: appIconLabel(id),
    preview: previewById.get(id) ?? "",
    tint: appIconTint(id),
  }));
}
