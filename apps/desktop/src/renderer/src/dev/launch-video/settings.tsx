import "./clock";
import "./bridge";
import "./data";
import "./director";

type Listener = (location: { section?: string; hash?: string }) => void;
const listeners = new Set<Listener>();
const section =
  new URLSearchParams(location.search).get("section") ?? "appearance";

Object.assign(window, {
  pondSettings: new Proxy(
    {
      ready: () => Promise.resolve({ section }),
      onLocation: (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as Record<string, unknown>,
    {
      get: (target, prop) =>
        typeof prop === "string" && prop in target
          ? target[prop]
          : typeof prop === "string" && /^on[A-Z]/.test(prop)
            ? () => () => {}
            : () => Promise.resolve(undefined),
    },
  ),
  __settingsGo: (next: string) => {
    for (const listener of listeners) listener({ section: next });
  },
});

await import("@/settings");
