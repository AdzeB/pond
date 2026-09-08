import { Button, Settings } from "@pond/ui";
import { useQuery } from "@tanstack/react-query";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useWatches } from "@/features/sources/hooks/use-watches";
import { getAppRouter } from "@/shared/lib/app-router";

export function FetchStatus() {
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const guard = useQuery({
    queryKey: ["fetch-storage-guard"],
    queryFn: () => window.pond.query("storage.guardState", {}),
    refetchInterval: 30_000,
  });
  const sources = [...accounts, ...watches];
  const last = sources
    .map((source) => source.sync.lastSyncedAt)
    .filter((at): at is string => Boolean(at))
    .sort()
    .at(-1);
  const errors = sources.filter((source) => source.sync.lastError).length;
  const blocked =
    guard.data?.state === "exceeded" && guard.data.action === "pauseSync";
  return (
    <Settings.Section>
      <Settings.List>
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>
              {blocked
                ? "Fetching paused by storage limit"
                : sources.some((source) => source.syncing)
                  ? "Fetching updates"
                  : errors
                    ? `${errors} ${errors === 1 ? "source needs" : "sources need"} attention`
                    : "Connected sources"}
            </Settings.ItemTitle>
            <Settings.ItemDescription>
              {last
                ? `Last successful fetch: ${new Date(last).toLocaleString()}`
                : "No successful fetch recorded yet."}
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                getAppRouter()?.history.push(
                  blocked ? "/settings/storage" : "/sources",
                )
              }
            >
              {blocked ? "Manage Storage" : "Manage Sources"}
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
      </Settings.List>
    </Settings.Section>
  );
}
