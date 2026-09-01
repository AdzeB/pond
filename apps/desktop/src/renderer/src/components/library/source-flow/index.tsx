import type { WatchKind } from "@pond/schema/db";
import { PageDialog } from "@pond/ui";
import type { JSX } from "react";
import { ConnectSourceSection } from "@/components/library/source-flow/connect";
import { ConnectHelpSection } from "@/components/library/source-flow/connect/help";
import { ConnectWaitSection } from "@/components/library/source-flow/connect/wait";
import {
  AccountDetailSection,
  AccountMaintenanceSection,
  AccountProfileSection,
  AccountSyncSection,
} from "@/components/library/source-flow/detail";
import { FrequencySection } from "@/components/library/source-flow/detail/frequency";
import { WatchDetailSection } from "@/components/library/source-flow/detail/watch";
import { SourceNewSection } from "@/components/library/source-flow/source-new";
import { WatchSourceSection } from "@/components/library/source-flow/watch";
import { WatchHelpSection } from "@/components/library/source-flow/watch/help";
import { WatchKindSection } from "@/components/library/source-flow/watch/kind";
import { WatchTargetSection } from "@/components/library/source-flow/watch/target";
import { useAccounts } from "@/hooks/use-accounts";
import { useWatches, watchKindsFor } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { connectFlow, useConnectSource } from "@/stores/connect-flow";
import { useDetailAccountId, useDetailWatchId } from "@/stores/source-detail";
import {
  type SourceFlowPage,
  sourceFlow,
  useSourceFlowDepth,
  useSourceFlowPage,
  useSourceFlowStack,
} from "@/stores/source-flow";
import { useWatchKind, useWatchSource } from "@/stores/watch-flow";

const HELP: Partial<Record<SourceFlowPage, SourceFlowPage>> = {
  "connect-source": "connect-help",
  "watch-source": "watch-help",
};

const HERO_PAGES = new Set<SourceFlowPage>(["account-detail", "watch-detail"]);

const KIND_TITLES: Record<WatchKind, string> = {
  user: "Watch an Account",
  channel: "Watch a Channel",
  group: "Watch a Group",
  playlist: "Watch a Playlist",
  board: "Watch a Board",
  cluster: "Watch a Cluster",
  list: "Watch a List",
};

const PAGES: Record<SourceFlowPage, () => JSX.Element | null> = {
  "source-new": SourceNewSection,
  "connect-source": ConnectSourceSection,
  "connect-help": ConnectHelpSection,
  "connect-wait": ConnectWaitSection,
  "watch-source": WatchSourceSection,
  "watch-help": WatchHelpSection,
  "watch-kind": WatchKindSection,
  "watch-target": WatchTargetSection,
  "account-detail": AccountDetailSection,
  "account-profile": AccountProfileSection,
  "account-sync": AccountSyncSection,
  "account-maintenance": AccountMaintenanceSection,
  "watch-detail": WatchDetailSection,
  "sync-frequency": FrequencySection,
};

function usePageTitle(page: SourceFlowPage): string {
  const connectSource = useConnectSource();
  const watchSource = useWatchSource();
  const watchKind = useWatchKind();
  const accountId = useDetailAccountId();
  const watchId = useDetailWatchId();
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const stack = useSourceFlowStack();

  switch (page) {
    case "source-new":
      return "New Source";
    case "connect-source":
      return "Connect a Source";
    case "connect-help":
      return "Connecting a Source";
    case "connect-wait":
      return connectSource
        ? `Connect ${getSourceDef(connectSource).label}`
        : "Connect";
    case "watch-source":
      return "Watch an Account";
    case "watch-help":
      return "Watching an Account";
    case "watch-kind":
      return watchSource
        ? `Watch on ${getSourceDef(watchSource).label}`
        : "Watch";
    case "watch-target": {
      const source = watchSource ?? "youtube";
      const kinds = watchKindsFor(source);
      const kind = watchKind ?? kinds[0] ?? "user";
      return kinds.length > 1
        ? KIND_TITLES[kind]
        : `Watch on ${getSourceDef(source).label}`;
    }
    case "account-detail": {
      const account = accounts.find((a) => a.id === accountId);
      return account?.label ?? "Account";
    }
    case "account-profile":
      return "Profile";
    case "account-sync":
      return "Sync Details";
    case "account-maintenance":
      return "Maintenance";
    case "watch-detail": {
      const watch = watches.find((w) => w.id === watchId);
      return watch?.label ?? "Watch";
    }
    case "sync-frequency":
      return stack.includes("watch-detail")
        ? "Check Frequency"
        : "Sync Frequency";
  }
}

export function SourceFlowHost() {
  const page = useSourceFlowPage();
  const depth = useSourceFlowDepth();
  const open = page != null;
  const title = usePageTitle(page ?? "source-new");
  const help = page ? HELP[page] : undefined;
  const canBack = depth > 1;
  const Page = page ? PAGES[page] : null;

  return (
    <PageDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        sourceFlow.close();
        connectFlow.clear();
      }}
    >
      <PageDialog.Portal>
        <PageDialog.Backdrop />
        {page && Page ? (
          <PageDialog.Popup pageId={page} depth={depth}>
            <PageDialog.Header>
              {canBack ? (
                <PageDialog.Back onClick={() => sourceFlow.back()} />
              ) : help ? (
                <PageDialog.Help onClick={() => sourceFlow.push(help)} />
              ) : null}
              <PageDialog.Title data-hero={HERO_PAGES.has(page) || undefined}>
                {title}
              </PageDialog.Title>
              <PageDialog.Close />
            </PageDialog.Header>
            <PageDialog.Viewport>
              <Page />
            </PageDialog.Viewport>
          </PageDialog.Popup>
        ) : null}
      </PageDialog.Portal>
    </PageDialog.Root>
  );
}
