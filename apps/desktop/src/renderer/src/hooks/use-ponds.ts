import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Pond {
  path: string;
  name: string;
  active: boolean;
  exists: boolean;
  avatar: string | null;
}

interface ListKnownResult {
  active: string;
  libraries: Pond[];
}

type ActionResult = { ok: true } | { ok: false; reason: string };

const pondsQueryKey = ["ponds"] as const;

export function usePonds() {
  const qc = useQueryClient();

  const { data: ponds = [] } = useQuery({
    queryKey: pondsQueryKey,
    queryFn: async () => {
      const res = (await window.pond.query(
        "library.listKnown",
        {},
      )) as ListKnownResult;
      return res.libraries;
    },
  });

  const switchMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = (await window.pond.query("library.switchTo", {
        path,
      })) as ActionResult;
      // Switching relaunches (or reloads in dev), so there's no success state to settle into.
      if (!res.ok) throw new Error(res.reason);
    },
  });

  return {
    ponds,
    active: ponds.find((p) => p.active),
    switching: switchMutation.isPending,
    switchTo: switchMutation.mutate,
    refresh: () => void qc.invalidateQueries({ queryKey: pondsQueryKey }),
  };
}
