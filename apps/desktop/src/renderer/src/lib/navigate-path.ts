import type { useNavigate } from "@tanstack/react-router";
import { applyViewStateFromParams, setTrashView } from "@/lib/view-store";

type TSNavigate = ReturnType<typeof useNavigate>;
type NavigateArg = Parameters<TSNavigate>[0];

// TSR types the search reducer against the current route's schema,
// which is too narrow when the same helper has to run from any route.
// Use this small wrapper to call navigate with a generic search reducer
// without dragging route-level generics through every callsite.
export function patchSearch(
  navigate: TSNavigate,
  reducer: (prev: Record<string, unknown>) => Record<string, unknown>,
  opts: { replace?: boolean } = {},
): void {
  void navigate({
    search: reducer,
    replace: opts.replace,
  } as unknown as NavigateArg);
}

// Same shape for `to:` strings that don't match any route literal type
// (e.g. user-supplied paths). Callers that already know the literal route
// should keep using `navigate({ to, params })` directly.
export function navigateTo(
  navigate: TSNavigate,
  to: string,
  opts: {
    viewTransition?: boolean;
    replace?: boolean;
    search?: Record<string, unknown>;
  } = {},
): void {
  void navigate({
    to,
    search: opts.search,
    viewTransition: opts.viewTransition,
    replace: opts.replace,
  } as unknown as NavigateArg);
}

export interface NavigateOpts {
  viewTransition?: boolean;
  search?: Record<string, unknown>;
  replace?: boolean;
}

// Thin RR-style adapter so callsites (and external deep links) can keep
// passing a path string (`/foo/bar?baz=1`). The router no longer holds
// view state, so any query string is translated into the view store and
// dropped from the navigation itself.
export type PathNavigate = (path: string, opts?: NavigateOpts) => void;

export function adaptNavigate(tsNav: TSNavigate): PathNavigate {
  return (path, opts) => {
    const [rawTo, qs] = path.split("?", 2);
    // `/trash` is no longer a route: it's a flag on the library surface.
    // Funnel every path-string navigation (palette, app menu, deep links)
    // through here so they keep working without per-callsite edits.
    let to = rawTo;
    if (to === "/trash") {
      setTrashView(true);
      to = "/";
    } else {
      setTrashView(false);
    }
    const params = new URLSearchParams(qs ?? "");
    if (opts?.search) {
      for (const [key, value] of Object.entries(opts.search)) {
        if (Array.isArray(value)) {
          for (const v of value) params.append(key, String(v));
        } else if (value != null) {
          params.set(key, String(value));
        }
      }
    }
    applyViewStateFromParams(params);
    void tsNav({
      to: to || "/",
      viewTransition: opts?.viewTransition,
      replace: opts?.replace,
    } as unknown as NavigateArg);
  };
}
