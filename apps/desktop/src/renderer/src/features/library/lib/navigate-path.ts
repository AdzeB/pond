import type { useNavigate } from "@tanstack/react-router";
import { primarySelection } from "@/core/data/selection";
import { listBaseFromPath } from "@/core/lib/search-schemas";
import { applyViewStateFromParams } from "@/features/library/stores/view-store";

type TSNavigate = ReturnType<typeof useNavigate>;
type NavigateArg = Parameters<TSNavigate>[0];

// TSR types the search reducer against the current route's schema,
// which is too narrow when the same helper has to run from any route.
// `to:` strings that don't match any route literal type (e.g.
// user-supplied paths) go through this wrapper; callers that already
// know the literal route should use `navigate({ to, params })` directly.
export function navigateTo(
  navigate: TSNavigate,
  to: string,
  opts: {
    replace?: boolean;
    search?: Record<string, unknown>;
  } = {},
): void {
  void navigate({
    to,
    search: opts.search,
    replace: opts.replace,
  } as unknown as NavigateArg);
}

export interface NavigateOpts {
  search?: Record<string, unknown>;
  replace?: boolean;
}

// Thin RR-style adapter so callsites (and external deep links) can keep
// passing a path string (`/foo/bar?baz=1`). The router no longer holds
// view state, so any query string is translated into the view store and
// dropped from the navigation itself.
export type PathNavigate = (path: string, opts?: NavigateOpts) => void;

// Matches the legacy selection deep links (`/save/:id`, `/detail/:id`, and
// their `/:mode/...` variants) that the main process and notifications still
// emit. There's no detail route anymore: opening a save is client state, so we
// translate these into a primary-selection change (which opens the drawer) and
// navigate to the underlying list base instead.
const SELECTION_PATH = /\/(?:save|detail)\/([^/]+)\/?$/;

export function adaptNavigate(tsNav: TSNavigate): PathNavigate {
  return (path, opts) => {
    const [rawToRaw, qs] = path.split("?", 2);
    const rawTo = rawToRaw ?? "";
    let to = rawTo;
    const selectionMatch = SELECTION_PATH.exec(rawTo);
    if (selectionMatch?.[1]) {
      primarySelection.set(decodeURIComponent(selectionMatch[1]));
      to = listBaseFromPath(rawTo);
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
      replace: opts?.replace,
    } as unknown as NavigateArg);
  };
}
