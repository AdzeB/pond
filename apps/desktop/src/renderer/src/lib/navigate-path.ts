import type { useNavigate } from "@tanstack/react-router";
import { paramsToSearch } from "@/lib/search-schemas";

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

// Thin RR-style adapter so callsites can keep passing a path string
// (`/foo/bar?baz=1`) without rewriting to TSR's object shape every
// time. The string is split into `to` + `search`, any explicit
// `opts.search` wins.
export type PathNavigate = (path: string, opts?: NavigateOpts) => void;

export function adaptNavigate(tsNav: TSNavigate): PathNavigate {
  return (path, opts) => {
    const [to, qs] = path.split("?", 2);
    const fromPath = qs ? paramsToSearch(new URLSearchParams(qs)) : {};
    const merged = { ...fromPath, ...(opts?.search ?? {}) };
    void tsNav({
      to: to || "/",
      search:
        Object.keys(merged).length > 0
          ? (merged as Record<string, unknown>)
          : undefined,
      viewTransition: opts?.viewTransition,
      replace: opts?.replace,
    } as unknown as NavigateArg);
  };
}
