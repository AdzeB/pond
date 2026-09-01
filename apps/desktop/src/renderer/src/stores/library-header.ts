import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ViewPopover = "layout" | "sort" | "zoom" | "display";

interface HeaderState {
  searchNonce: number;
  popover: ViewPopover | null;
}

const store = new Store<HeaderState>({
  searchNonce: 0,
  popover: null,
});

export const libraryHeader = {
  focusSearch(): void {
    store.setState((s) => ({
      searchNonce: s.searchNonce + 1,
      popover: null,
    }));
  },
  openPopover(popover: ViewPopover): void {
    store.setState((s) => (s.popover === popover ? s : { ...s, popover }));
  },
  togglePopover(): void {
    store.setState((s) => ({
      ...s,
      popover: s.popover === null ? "layout" : null,
    }));
  },
  closePopover(): void {
    store.setState((s) => (s.popover === null ? s : { ...s, popover: null }));
  },
};

export function useSearchNonce(): number {
  return useSelector(store, (s) => s.searchNonce);
}

export function useViewPopover(): ViewPopover | null {
  return useSelector(store, (s) => s.popover);
}
