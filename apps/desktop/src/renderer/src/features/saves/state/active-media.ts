import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface ActiveMediaState {
  readonly seek: ((seconds: number) => void) | null;
  readonly currentTime: number;
}

const store = new Store<ActiveMediaState>({
  seek: null,
  currentTime: 0,
});

export function setActiveMediaSeek(
  seek: ((seconds: number) => void) | null,
): void {
  store.setState((s) => (s.seek === seek ? s : { ...s, seek }));
}

export function clearActiveMediaSeek(seek: (seconds: number) => void): void {
  store.setState((s) => (s.seek === seek ? { seek: null, currentTime: 0 } : s));
}

export function setActiveMediaTime(currentTime: number): void {
  store.setState((s) =>
    s.currentTime === currentTime ? s : { ...s, currentTime },
  );
}

export function useActiveMediaSeek(): ((seconds: number) => void) | null {
  return useSelector(store, (s) => s.seek);
}

export function useActiveMediaTime(): number {
  return useSelector(store, (s) => s.currentTime);
}
