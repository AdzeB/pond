import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const STORAGE_KEY = "pond.saveDetail.detailsOpen";
const DEFAULT = true;

function read(): boolean {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT;
    return raw === "1";
  } catch {
    return DEFAULT;
  }
}

const store = new Store<boolean>(read());

function _setSaveDetailsOpen(value: boolean): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* storage denied: keep the in-memory store in sync anyway */
    }
  }
  store.setState((s) => (s === value ? s : value));
}
export function useSaveDetailsOpen(): boolean {
  return useSelector(store, (s) => s);
}
