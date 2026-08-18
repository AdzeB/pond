import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));
const DEFAULT_PATH = SETTINGS_SECTIONS[0]?.path ?? "general";

interface SettingsModalState {
  /** null means the modal is closed. */
  section: string | null;
  /** Element id to scroll to and highlight once the section renders. */
  hash: string | null;
}

const store = new Store<SettingsModalState>({ section: null, hash: null });

/** Reopening without an explicit section resumes where the user left off. */
let lastSection = DEFAULT_PATH;

export const settingsModal = {
  open(section?: string, hash?: string): void {
    const requested = section ?? lastSection;
    const resolved = SETTINGS_SECTION_ALIASES[requested] ?? requested;
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
