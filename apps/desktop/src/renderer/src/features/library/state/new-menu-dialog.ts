import type { LibraryRepairKind } from "@shared/library-repair-contracts";
import type { ScreenshotDraft } from "@shared/screenshot-capture";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type NewMenuDialog =
  | { kind: "links" }
  | { kind: "screenshot" }
  | { kind: "screenshot-organize"; draft: ScreenshotDraft }
  | { kind: "repair"; repair: LibraryRepairKind };

const store = new Store<NewMenuDialog | null>(null);

export const newMenuDialog = {
  open(kind: NewMenuDialog): void {
    store.setState(() => kind);
  },
  close(): void {
    store.setState(() => null);
  },
};

export function useNewMenuDialog(): NewMenuDialog | null {
  return useSelector(store, (state) => state);
}
