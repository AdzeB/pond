import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { readQuery, writeQuery } from "@pond/schema/filters/url";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AddCommitApi,
  appendPredicate,
  replacePredicate,
} from "./helpers";

export function useAddCommitApi(): AddCommitApi {
  const [params, setParams] = useSearchParams();

  return useMemo<AddCommitApi>(() => {
    const baseFromCurrent = () => {
      const current = readQuery(params);
      return current.kind === "and" ? current : EMPTY_QUERY;
    };
    return {
      commitOne: (predicate) => {
        const base = baseFromCurrent();
        setParams(writeQuery(params, appendPredicate(base, predicate)), {
          replace: true,
        });
      },
      liveAdd: (predicate) => {
        const base = baseFromCurrent();
        setParams(writeQuery(params, appendPredicate(base, predicate)), {
          replace: true,
        });
        return base.clauses.length;
      },
      liveUpdate: (idx, predicate) => {
        const base = baseFromCurrent();
        setParams(writeQuery(params, replacePredicate(base, idx, predicate)), {
          replace: true,
        });
      },
    };
  }, [params, setParams]);
}
