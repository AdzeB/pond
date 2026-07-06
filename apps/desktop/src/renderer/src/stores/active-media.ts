import { Store } from "@tanstack/store";

// Bridges the (deeply nested) active <video> back to sibling chrome — the
// detail modal's chapter list lives outside the player's Video.Root, so the
// in-view player publishes its seek handle and current time here.

interface ActiveMediaState {
  readonly seek: ((seconds: number) => void) | null;
  readonly currentTime: number;
}

const store = new Store<ActiveMediaState>({ seek: null, currentTime: 0 });

export function setActiveMediaSeek(
  seek: ((seconds: number) => void) | null,
): void {
  store.setState((s) => (s.seek === seek ? s : { ...s, seek }));
}

// Clear only if the registered handle is still the one we're tearing down, so a
// fast slide swap (new player mounts before old unmounts) doesn't wipe the live
// handle.
export function clearActiveMediaSeek(seek: (seconds: number) => void): void {
  store.setState((s) => (s.seek === seek ? { seek: null, currentTime: 0 } : s));
}

export function setActiveMediaTime(currentTime: number): void {
  store.setState((s) =>
    s.currentTime === currentTime ? s : { ...s, currentTime },
  );
}
