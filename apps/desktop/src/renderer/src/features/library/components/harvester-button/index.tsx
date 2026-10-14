import { Button, Tooltip } from "@pond/ui";
import { QueueSummarySchema } from "@shared/queue-contracts";
import { useQuery } from "@tanstack/react-query";
import { getAppRouter } from "@/shared/lib/app-router";
import { HarvesterMark } from "./mark";
import styles from "./styles.module.css";

const MAX_SHOWN_COUNT = 99;
const countFormat = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
  useGrouping: false,
});

export function HarvesterButton() {
  const queueSummary = useQuery({
    queryKey: ["queue.summary"],
    queryFn: async () =>
      QueueSummarySchema.parse(await window.pond.query("queue.summary", {})),
    refetchInterval: 2_000,
  });
  const running = queueSummary.data?.running ?? 0;
  const active = running > 0;

  return (
    <Tooltip label="Downloads" side="bottom">
      <Button
        icon={!active}
        size="sm"
        variant="ghost"
        aria-label={active ? `Downloads, ${running} downloading` : "Downloads"}
        onClick={() => getAppRouter()?.history.push("/downloads")}
      >
        <HarvesterMark active={active} />
        {active ? (
          <span className={styles.count}>
            {countFormat.format(Math.min(running, MAX_SHOWN_COUNT))}
          </span>
        ) : null}
      </Button>
    </Tooltip>
  );
}
