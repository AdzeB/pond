import { useHotkeys } from "@tanstack/react-hotkeys";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { openLibrarySearch } from "@/lib/ui/open-search";
import { dockMode } from "@/stores/dock-mode";

/**
 * Dock shortcuts owned by the renderer; the Go menu shows them display-only.
 * @remarks `ignoreInputs: false` so the dock opens even while a field is focused.
 */
export function AppHotkeys() {
  useHotkeys([
    {
      hotkey: SHORTCUTS["dock.ask"].keys,
      callback: () => dockMode.open("ask"),
      options: { ignoreInputs: false },
    },
    {
      hotkey: SHORTCUTS["dock.search"].keys,
      callback: () => openLibrarySearch(),
      options: { ignoreInputs: false },
    },
  ]);

  return null;
}
