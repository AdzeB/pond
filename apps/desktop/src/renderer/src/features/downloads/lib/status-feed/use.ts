import { useMemo } from "react";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useWatches } from "@/features/sources/hooks/use-watches";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
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
