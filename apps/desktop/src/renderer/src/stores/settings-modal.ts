import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));
const ALIASES = new Map<string, string>(
  Object.entries(SETTINGS_SECTION_ALIASES),
);
const DEFAULT_PATH = SETTINGS_SECTIONS[0]?.path ?? "general";

interface SettingsModalState {
  section: string | null;
  hash: string | null;
}

const store = new Store<SettingsModalState>({ section: null, hash: null });

let lastSection = DEFAULT_PATH;

export const settingsModal = {
  open(section?: string, hash?: string): void {
    const requested = section ?? lastSection;
    const resolved = ALIASES.get(requested) ?? requested;
    const valid = VALID_PATHS.has(resolved) ? resolved : DEFAULT_PATH;
    lastSection = valid;
    store.setState(() => ({ section: valid, hash: hash ?? null }));
  },
  close(): void {
    store.setState((s) =>
      s.section === null ? s : { section: null, hash: null },
    );
  },
};

export function useSettingsModal(): SettingsModalState {
  return useSelector(store, (s) => s);
}
