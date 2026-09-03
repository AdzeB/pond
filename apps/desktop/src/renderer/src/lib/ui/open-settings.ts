import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { getAppRouter } from "@/lib/ui/app-router";

const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));
const ALIASES = new Map<string, string>(
  Object.entries(SETTINGS_SECTION_ALIASES),
);

export const DEFAULT_SETTINGS_SECTION = SETTINGS_SECTIONS[0]?.path ?? "general";

let lastSection = DEFAULT_SETTINGS_SECTION;

export function resolveSettingsSection(section?: string): string {
  const requested = section ?? lastSection;
  const resolved = ALIASES.get(requested) ?? requested;
  return VALID_PATHS.has(resolved) ? resolved : DEFAULT_SETTINGS_SECTION;
}

export function rememberSettingsSection(section: string): void {
  lastSection = resolveSettingsSection(section);
}

export function settingsHref(section?: string, hash?: string): string {
  const valid = resolveSettingsSection(section);
  lastSection = valid;
  const path = `/settings/${valid}`;
  if (!hash) return path;
  return `${path}#${hash.replace(/^#/, "")}`;
}

export function openSettings(section?: string, hash?: string): void {
  getAppRouter()?.history.push(settingsHref(section, hash));
}
