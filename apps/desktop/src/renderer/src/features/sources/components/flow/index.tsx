import { Dialog } from "@pond/ui";
import { type JSX, useState } from "react";
import { ConnectHelpSection } from "@/features/sources/components/flow/connect/help";
import { ConnectWaitSection } from "@/features/sources/components/flow/connect/wait";
import { WatchHelpSection } from "@/features/sources/components/flow/watch/help";
import { WatchTargetSection } from "@/features/sources/components/flow/watch/target";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  connectFlow,
  useConnectSource,
} from "@/features/sources/state/connect-flow";
import {
  type SourceFlowPage,
  sourceFlow,
  useSourceFlowDepth,
  useSourceFlowPage,
} from "@/features/sources/state/source-flow";
import { useWatchSource, watchFlow } from "@/features/sources/state/watch-flow";
import styles from "./styles.module.css";

const HELP = {
  "connect-wait": "connect-help",
  "watch-target": "watch-help",
} satisfies Partial<Record<SourceFlowPage, SourceFlowPage>>;

const PAGES = {
  "connect-help": ConnectHelpSection,
  "connect-wait": ConnectWaitSection,
  "watch-help": WatchHelpSection,
  "watch-target": WatchTargetSection,
} satisfies Record<SourceFlowPage, () => JSX.Element | null>;

function usePageTitle(page: SourceFlowPage): string {
  const connectingSource = useConnectSource();
  const watchSource = useWatchSource();

  switch (page) {
    case "connect-help":
      return "Connecting a Source";
    case "connect-wait":
      return connectingSource
        ? getSourceDef(connectingSource).label
        : "Add Connection";
    case "watch-help":
      return "Watching an Account";
    case "watch-target":
      return watchSource ? getSourceDef(watchSource).label : "New Watch";
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
  /** Base UI needs the popup mounted through its exit to release the portal. */
  if (
    activePage &&
    (activePage !== presentation.page || activeDepth !== presentation.depth)
  ) {
    setPresentation({ page: activePage, depth: activeDepth });
  }
  const page = activePage ?? presentation.page;
  const depth = open ? activeDepth : presentation.depth;
  const title = usePageTitle(page ?? "connect-wait");
  const help =
    page === "connect-wait" || page === "watch-target" ? HELP[page] : undefined;
  const canBack = depth > 1;
  const Page = page ? PAGES[page] : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        sourceFlow.close();
        connectFlow.clear();
        watchFlow.clear();
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
