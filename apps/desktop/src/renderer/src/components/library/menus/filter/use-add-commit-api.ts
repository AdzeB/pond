import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { readQuery, writeQuery } from "@pond/schema/filters/url";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { patchSearch } from "@/lib/navigate-path";
import { paramsToSearch, searchToParams } from "@/lib/search-schemas";
import {
  type AddCommitApi,
  appendPredicate,
  replacePredicate,
} from "./helpers";

export function useAddCommitApi(): AddCommitApi {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  return useMemo<AddCommitApi>(() => {
    const baseFromCurrent = () => {
      const params = searchToParams(search);
      const current = readQuery(params);
      return current.kind === "and" ? current : EMPTY_QUERY;
    };
    const apply = (mutate: (params: URLSearchParams) => URLSearchParams) => {
      const params = searchToParams(search);
      const next = mutate(params);
      patchSearch(navigate, () => paramsToSearch(next), { replace: true });
    };
    return {
      commitOne: (predicate) => {
        const base = baseFromCurrent();
        apply((params) => writeQuery(params, appendPredicate(base, predicate)));
      },
      liveAdd: (predicate) => {
        const base = baseFromCurrent();
        apply((params) => writeQuery(params, appendPredicate(base, predicate)));
        return base.clauses.length;
      },
      liveUpdate: (idx, predicate) => {
        const base = baseFromCurrent();
        apply((params) =>
          writeQuery(params, replacePredicate(base, idx, predicate)),
        );
      },
    };
  }, [search, navigate]);
}
