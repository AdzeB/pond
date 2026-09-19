import { join } from "node:path";
import { app } from "electron";

const RECENT_LIBRARIES_FILE = "recent-libraries.json";

export function recentLibrariesFile(): string {
  return join(app.getPath("userData"), RECENT_LIBRARIES_FILE);
}

export function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}
