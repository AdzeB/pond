import { Button, Settings } from "@pond/ui";
import { useEnrichmentStatus } from "@/features/enrichment/state/enrichment-monitor";
import { usePrefs } from "@/features/settings/state/prefs";

export function ProcessingStatus() {
  const status = useEnrichmentStatus();
  const [ai] = usePrefs("ai");
  const enabled =
    ai.semanticSearch ||
    ai.enableCaption ||
    ai.enableOcr ||
    ai.enableTranscript ||
    ai.enableClip;
  return (
    <Settings.List>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Processing status</Settings.ItemTitle>
          <Settings.ItemDescription>
            {status.inflight
              ? `Processing ${status.inflight} items`
              : status.failedKeys.size
                ? `${status.failedKeys.size} tasks need another attempt`
                : enabled
                  ? "Ready for new items"
                  : "Local processing is off"}
            . Local processing pauses when the window is hidden.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            disabled={!enabled || status.inflight > 0}
            onClick={() =>
              void import("@/features/enrichment/lib/tasks").then(
                ({ runEnrichment }) => runEnrichment(),
              )
            }
          >
            {status.failedKeys.size ? "Retry Processing" : "Check Library"}
          </Button>
        </Settings.ItemControl>
      </Settings.Item>
    </Settings.List>
  );
}
