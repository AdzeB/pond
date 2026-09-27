import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { getAppRouter } from "@/shared/lib/app-router";

const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));
const ALIASES = new Map<string, string>(
  Object.entries(SETTINGS_SECTION_ALIASES),
);

export const DEFAULT_SETTINGS_SECTION = SETTINGS_SECTIONS[0]?.path ?? "general";

let lastSection = DEFAULT_SETTINGS_SECTION;

const LIBRARY_KEYS = new Set([
  "identity",
  "recent",
  "new",
  "open",
  "merge",
  "package",
  "import",
]);
const BACKUP_KEYS = new Set(["backup", "restore"]);
const PROCESSING_KEYS = new Set([
  "enableCaption",
  "enableOcr",
  "enableTranscript",
  "enableClip",
  "enableAesthetic",
  "enableAutoTitle",
  "enableSuggestedTags",
  "captionModelId",
  "clipModelId",
  "whisperModelId",
]);

interface SettingsLocation {
  section: string;
  hash: string | null;
}

export function resolveSettingsSection(section?: string): string {
  const requested = section ?? lastSection;
  const resolved = ALIASES.get(requested) ?? requested;
  return VALID_PATHS.has(resolved) ? resolved : DEFAULT_SETTINGS_SECTION;
}

export function rememberSettingsSection(section: string): void {
  lastSection = resolveSettingsSection(section);
}

export function resolveSettingsLocation(
  section?: string,
  hash?: string,
): SettingsLocation {
  let valid = resolveSettingsSection(section);
  let normalized = hash?.replace(/^#/, "") || null;
  if (!normalized) return { section: valid, hash: null };

  if (normalized === "setting-models-mcp") {
    return { section: "mcp", hash: null };
  }

  if (/^setting-(images|videos)-/.test(normalized)) {
    normalized = normalized.replace(
      /^setting-(images|videos)-/,
      "setting-harvesting-",
    );
    valid = "harvesting";
  } else if (normalized.startsWith("setting-trash-")) {
    normalized = normalized.replace(/^setting-trash-/, "setting-library-");
    valid = "library";
  } else if (normalized === "setting-storage-autoEmptyDays") {
    normalized = "setting-library-autoEmptyDays";
    valid = "library";
  } else if (
    normalized === "setting-storage-watched-folder" ||
    normalized === "setting-harvesting-watched-folder"
  ) {
    normalized = null;
    valid = "harvesting";
  } else if (normalized.startsWith("setting-storage-")) {
    const key = normalized.slice("setting-storage-".length);
    if (LIBRARY_KEYS.has(key)) {
      normalized = `setting-library-${key}`;
      valid = "library";
    } else if (BACKUP_KEYS.has(key)) {
      normalized = `setting-backups-${key}`;
      valid = "backups";
    }
  } else if (normalized.startsWith("setting-search-")) {
    const key = normalized.slice("setting-search-".length);
    if (PROCESSING_KEYS.has(key)) {
      normalized = `setting-processing-${key}`;
      valid = "processing";
    }
  }

  return { section: valid, hash: normalized };
}

export function settingsHref(section?: string, hash?: string): string {
  const resolved = resolveSettingsLocation(section, hash);
  lastSection = resolved.section;
  const path = `/settings/${resolved.section}`;
  return resolved.hash ? `${path}#${resolved.hash}` : path;
}

export function openSettings(section?: string, hash?: string): void {
  const href = settingsHref(section, hash);
  if (window.pond?.openSettingsWindow) {
    const resolved = resolveSettingsLocation(section, hash);
    void window.pond.openSettingsWindow(
      section === undefined && hash === undefined
        ? {}
        : {
            section: resolved.section,
            hash: resolved.hash ?? undefined,
          },
    );
    return;
  }
  getAppRouter()?.history.push(href);
}
