import { useToast } from "@pond/ui";
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
  const toast = useToast();
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
      // Switching repoints the active library and relaunches (or reloads
      // in dev), so there's no success state to settle back into here.
      if (!res.ok) throw new Error(res.reason);
    },
    onError: (err) => {
      toast.add({
        title: "Couldn't switch pond",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
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
