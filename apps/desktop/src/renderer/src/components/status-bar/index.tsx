import { useState } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useWatches } from "@/hooks/use-watches";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { ActivityPanel } from "./activity";
import { AttentionPanel } from "./attention";
import type { Panel } from "./lib";
import { SyncPanel } from "./sync";

export function StatusBar() {
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const byAccount = useSyncByAccount();
  const [open, setOpen] = useState<Panel | null>(null);

  return (
    <>
      <ActivityPanel open={open === "activity"} onOpenChange={setOpen} />
      <AttentionPanel
        open={open === "attention"}
        onOpenChange={setOpen}
        accounts={accounts}
        watches={watches}
        byAccount={byAccount}
      />
      <SyncPanel
        open={open === "sync"}
        onOpenChange={setOpen}
        accounts={accounts}
        watches={watches}
        byAccount={byAccount}
      />
    </>
  );
}
