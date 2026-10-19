import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type SetupProfile = "new" | "existing";

interface SetupState {
  open: boolean;
  profile: SetupProfile;
}

const store = new Store<SetupState>({ open: false, profile: "existing" });

export const setupFlow = {
  open(profile: SetupProfile): void {
    store.setState(() => ({ open: true, profile }));
  },
  close(): void {
    store.setState((s) => (s.open ? { ...s, open: false } : s));
  },
};

export function useSetupFlow(): SetupState {
  return useSelector(store, (s) => s);
}
