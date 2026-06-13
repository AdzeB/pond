import type { useNavigate } from "@tanstack/react-router";
import { primarySelection } from "@/stores/selection";
import { applyViewStateFromParams } from "@/stores/view-store";
import { listBaseFromPath } from "./search-schemas";

type TSNavigate = ReturnType<typeof useNavigate>;
type NavigateArg = Parameters<TSNavigate>[0];

interface NavigateOpts {
  search?: Record<string, unknown>;
  replace?: boolean;
}

// Adapter so callsites keep passing a path string; the query string is translated into the view store, not the route.
export type PathNavigate = (path: string, opts?: NavigateOpts) => void;

// Legacy selection deep links (/save/:id, /detail/:id); translated to a primary-selection change plus a navigate to the list base.
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
