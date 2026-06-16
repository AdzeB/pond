import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const DEFAULT_SECTION = SETTINGS_SECTIONS[0]?.path ?? "general";
const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));

function resolveSection(path?: string | null): string {
  if (!path) return DEFAULT_SECTION;
  const aliased = SETTINGS_SECTION_ALIASES[path] ?? path;
  return VALID_PATHS.has(aliased) ? aliased : DEFAULT_SECTION;
}

interface SettingsDialogState {
  open: boolean;
  section: string;
}

const store = new Store<SettingsDialogState>({
  open: false,
  section: DEFAULT_SECTION,
});

export const settings = {
  open(section?: string): void {
    store.setState((s) => ({
      ...s,
      open: true,
      section: section ? resolveSection(section) : s.section,
    }));
  },
  close(): void {
    store.setState((s) => (s.open ? { ...s, open: false } : s));
  },
  toggle(): void {
    store.setState((s) => ({ ...s, open: !s.open }));
  },
  setSection(section: string): void {
    store.setState((s) => ({ ...s, section: resolveSection(section) }));
  },
};

export function useSettingsOpen(): boolean {
  return useSelector(store, (s) => s.open);
}

export function useSettingsSection(): string {
  return useSelector(store, (s) => s.section);
}
