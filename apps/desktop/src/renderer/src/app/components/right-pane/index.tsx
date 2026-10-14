import { useRouterState } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  usePresenceData,
  useReducedMotion,
} from "motion/react";
import {
  type ComponentType,
  lazy,
  Suspense,
  useCallback,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  useFolderMemberships,
  useFolders,
} from "@/features/library/state/folders";
import {
  useInspectorSaveId,
  useInspectorTab,
  useRightPane,
} from "@/features/library/state/library-chrome";
import type { SaveInspectorProps } from "@/features/saves/components/detail/pane";
import { useSelectedSaveIds } from "@/features/saves/state/selection";
import { usePrefs } from "@/shared/state/prefs";
import styles from "./styles.module.css";

const AgentPane = lazy(async () => {
  const module = await import("@/features/agent/components/pane");
  return { default: module.AgentPane };
});

const SaveInspector = lazy(async () => {
  const module = await import("@/features/saves/components/detail/pane");
  return { default: module.SaveInspector };
});

function createContentHost() {
  const host = document.createElement("div");
  host.className = styles.content ?? "";
  return host;
}

function Panel({
  kind,
  content,
  reduceMotion,
}: {
  kind: "agent" | "inspector";
  content: HTMLDivElement;
  reduceMotion: boolean;
}) {
  const present = useIsPresent();
  const closingSlot = usePresenceData() === false;
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) node.append(content);
    },
    [content],
  );

  return (
    <motion.div
      ref={attach}
      className={styles.panel}
      data-pane={kind}
      data-active={present || undefined}
      inert={!present || undefined}
      aria-hidden={!present || undefined}
      initial={{ x: reduceMotion ? "0%" : "100%", opacity: 0 }}
      animate={{ x: "0%", opacity: 1 }}
      exit={{
        x: closingSlot || reduceMotion ? "0%" : "100%",
        opacity: 0,
        transition: {
          duration: reduceMotion || closingSlot ? 0 : 0.2,
          delay: closingSlot && !reduceMotion ? 0.2 : 0,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.3,
        delay: reduceMotion ? 0 : 0.03,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  );
}

export function RightPane() {
  const pane = useRightPane();
  const assistantPage = useRouterState({
    select: (s) => s.location.pathname === "/assistant",
  });
  const saveId = useInspectorSaveId();
  const selectedIds = useSelectedSaveIds();
  const viewerOpen = useRouterState({
    select: (s) => s.location.pathname.startsWith("/save/"),
  });
  const saveIds =
    viewerOpen || !selectedIds.length ? (saveId ? [saveId] : []) : selectedIds;
  const memberships = useFolderMemberships();
  const allFolders = useFolders();
  const [folderViews] = usePrefs("folderViews");
  const folderCounts = allFolders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    icon: folderViews[folder.id]?.icon,
    color: folder.color,
    count: saveIds.filter((id) => memberships[id]?.includes(folder.id)).length,
  }));
  const inspectorTab = useInspectorTab();
  const [preferences] = usePrefs("preferences");
  const systemReducedMotion = useReducedMotion();
  const reduceMotion =
    preferences.reduceMotion === "always" ||
    (preferences.reduceMotion !== "never" && Boolean(systemReducedMotion));
  return (
    <RightPaneView
      pane={pane}
      saveId={saveId}
      saveIds={saveIds}
      folders={folderCounts}
      inspectorTab={inspectorTab}
      assistantPage={assistantPage}
      reduceMotion={reduceMotion}
      AgentContent={AgentPane}
      InspectorContent={SaveInspector}
    />
  );
}

interface RightPaneViewProps {
  pane: "agent" | "inspector" | null;
  saveId: string | null;
  saveIds?: readonly string[];
  folders?: SaveInspectorProps["folders"];
  inspectorTab?: SaveInspectorProps["tab"];
  assistantPage: boolean;
  reduceMotion: boolean;
  AgentContent: ComponentType;
  InspectorContent: ComponentType<SaveInspectorProps>;
}

export function RightPaneView({
  pane,
  saveId,
  saveIds,
  folders,
  inspectorTab = "organize",
  assistantPage,
  reduceMotion,
  AgentContent,
  InspectorContent,
}: RightPaneViewProps) {
  const [inspectorId, setInspectorId] = useState(saveId);
  const [agentActivated, setAgentActivated] = useState(pane === "agent");
  const [agentHost] = useState(createContentHost);
  const [inspectorHost] = useState(createContentHost);
  if (saveId && saveId !== inspectorId) setInspectorId(saveId);
  if (pane === "agent" && !agentActivated) setAgentActivated(true);

  return (
    <div className={styles.viewport}>
      {createPortal(
        agentActivated && !assistantPage ? (
          <Suspense fallback={null}>
            <AgentContent />
          </Suspense>
        ) : null,
        agentHost,
      )}
      {createPortal(
        inspectorId ? (
          <Suspense fallback={null}>
            <InspectorContent
              saveId={inspectorId}
              saveIds={saveIds}
              folders={folders}
              tab={inspectorTab}
            />
          </Suspense>
        ) : null,
        inspectorHost,
      )}
      <AnimatePresence initial={false} mode="sync" custom={pane !== null}>
        {pane ? (
          <Panel
            key={pane}
            kind={pane}
            content={pane === "agent" ? agentHost : inspectorHost}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
