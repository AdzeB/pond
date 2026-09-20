import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type NewMenuDialog = "links" | "screenshot";

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
