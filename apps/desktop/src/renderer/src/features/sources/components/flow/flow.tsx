import { Dialog } from "@pond/ui";
import { type JSX, useState } from "react";
import { ConnectSourceSection } from "@/features/sources/components/flow/connect/connect";
import { ConnectHelpSection } from "@/features/sources/components/flow/connect/help/help";
import { ConnectWaitSection } from "@/features/sources/components/flow/connect/wait/wait";
import {
  AccountDetailSection,
  AccountMaintenanceSection,
  AccountOptionsSection,
  AccountProfileSection,
} from "@/features/sources/components/flow/detail/detail";
import {
  WatchDetailSection,
  WatchOptionsSection,
  WatchProfileSection,
} from "@/features/sources/components/flow/detail/watch/watch";
import { WatchHelpSection } from "@/features/sources/components/flow/watch/help/help";
import { WatchTargetSection } from "@/features/sources/components/flow/watch/target/target";
import { useWatches } from "@/features/sources/hooks/use-watches";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  connectFlow,
  useConnectSource,
} from "@/features/sources/state/connect-flow";
import { useDetailWatchId } from "@/features/sources/state/source-detail";
import {
  type SourceFlowPage,
  sourceFlow,
  useSourceFlowDepth,
  useSourceFlowPage,
} from "@/features/sources/state/source-flow";
import styles from "./flow.module.css";

const HELP = {
  "connect-source": "connect-help",
  "watch-target": "watch-help",
  "account-detail": "connect-help",
  "watch-detail": "watch-help",
} satisfies Partial<Record<SourceFlowPage, SourceFlowPage>>;

const PAGES = {
  "connect-source": ConnectSourceSection,
  "connect-help": ConnectHelpSection,
  "connect-wait": ConnectWaitSection,
  "watch-help": WatchHelpSection,
  "watch-target": WatchTargetSection,
  "account-detail": AccountDetailSection,
  "account-profile": AccountProfileSection,
  "account-maintenance": AccountMaintenanceSection,
  "account-options": AccountOptionsSection,
  "watch-detail": WatchDetailSection,
  "watch-profile": WatchProfileSection,
  "watch-options": WatchOptionsSection,
} satisfies Record<SourceFlowPage, () => JSX.Element | null>;

function usePageTitle(page: SourceFlowPage): string {
  const connectingSource = useConnectSource();
  const watchId = useDetailWatchId();
  const { watches } = useWatches();

  switch (page) {
    case "connect-source":
      return "Choose Source";
    case "connect-help":
      return "Connecting a Source";
    case "connect-wait":
      return connectingSource
        ? getSourceDef(connectingSource).label
        : "Add Connection";
    case "watch-help":
      return "Watching an Account";
    case "watch-target":
      return "Watch Account";
    case "account-detail":
      return "Connection Details";
    case "account-options":
      return "Disconnect";
    case "watch-options":
      return "Stop Watching";
    case "watch-profile":
    case "account-profile":
      return "Profile";
    case "account-maintenance":
      return "Maintenance";
    case "watch-detail": {
      const watch = watches.find((w) => w.id === watchId);
      return watch ? "Watching" : "Watch";
    }
  }
}

export function SourceFlowHost() {
  const activePage = useSourceFlowPage();
  const activeDepth = useSourceFlowDepth();
  const open = activePage != null;
  const [presentation, setPresentation] = useState({
    page: activePage,
    depth: activeDepth,
  });
  // Base UI needs the popup mounted through its exit to release the portal.
  if (
    activePage &&
    (activePage !== presentation.page || activeDepth !== presentation.depth)
  ) {
    setPresentation({ page: activePage, depth: activeDepth });
  }
  const page = activePage ?? presentation.page;
  const depth = open ? activeDepth : presentation.depth;
  const title = usePageTitle(page ?? "connect-source");
  const help =
    page === "connect-source" ||
    page === "watch-target" ||
    page === "account-detail" ||
    page === "watch-detail"
      ? HELP[page]
      : undefined;
  const canBack = depth > 1;
  const Page = page ? PAGES[page] : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        sourceFlow.close();
        connectFlow.clear();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        {page && Page ? (
          <Dialog.Popup className={styles.popup} pageId={page} depth={depth}>
            <Dialog.Header>
              {canBack ? (
                <Dialog.Back onClick={() => sourceFlow.back()} />
              ) : help ? (
                <Dialog.Help onClick={() => sourceFlow.push(help)} />
              ) : null}
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Close />
            </Dialog.Header>
            <Dialog.Viewport>
              <Page />
            </Dialog.Viewport>
          </Dialog.Popup>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
