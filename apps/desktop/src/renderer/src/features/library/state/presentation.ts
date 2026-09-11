import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const store = new Store(false);

export function openPresentation(): void {
  store.setState(() => true);
}

export function closePresentation(): void {
  store.setState(() => false);
}

export function usePresenting(): boolean {
  return useSelector(store, (open) => open);
}
