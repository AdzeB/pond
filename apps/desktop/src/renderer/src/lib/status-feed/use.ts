import { useMemo } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useSaves } from "@/hooks/use-saves";
import { useWatches } from "@/hooks/use-watches";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { useActivityEntries } from "./activity";
import { projectStatusFeed } from "./project";

export function useStatusFeed() {
  const saves = useSaves();
  const activity = useActivityEntries();
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const byAccount = useSyncByAccount();
  return useMemo(
    () =>
      projectStatusFeed({
        saves,
        activity,
        accounts,
        watches,
        byAccount,
      }),
    [saves, activity, accounts, watches, byAccount],
  );
}
