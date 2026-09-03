import {
  canRequestNativeThumbnail,
  classifyLibraryFile,
} from "@shared/file-format";
import type { SaveFile } from "@/lib/types";

export type FileViewerKind =
  | "media"
  | "pdf"
  | "audio"
  | "font"
  | "text"
  | "epub"
  | "model"
  | "archive"
  | "safe-web"
  | "native-preview"
  | "generic";

export interface ViewerCapability {
  kind: FileViewerKind;
  renderer: "built-in" | "generated" | "external";
  originalActions: true;
}

const INTERACTIVE_MODELS = new Set([
  "glb",
  "fbx",
  "obj",
  "3ds",
  "3mf",
  "dae",
  "ply",
  "stl",
]);

function builtIn(kind: FileViewerKind): ViewerCapability {
  return { kind, renderer: "built-in", originalActions: true };
}

export function viewerCapabilityFor(file: SaveFile): ViewerCapability {
  const format = classifyLibraryFile(file.path, file.mimeType);

  switch (format.previewKind) {
    case "direct-image":
    case "native-image":
    case "video":
      return builtIn("media");
    case "pdf":
      return builtIn("pdf");
    case "audio":
      return builtIn("audio");
    case "font":
      return builtIn("font");
    case "text":
      return builtIn("text");
  }

  if (format.extension === "epub") return builtIn("epub");
  if (INTERACTIVE_MODELS.has(format.extension)) return builtIn("model");
  if (["zip", "rar", "7z"].includes(format.extension)) {
    return builtIn("archive");
  }
  if (format.extension === "html") return builtIn("safe-web");
  if (canRequestNativeThumbnail(file.path)) {
    return {
      kind: "native-preview",
      renderer: "generated",
      originalActions: true,
    };
  }
  return { kind: "generic", renderer: "external", originalActions: true };
}
