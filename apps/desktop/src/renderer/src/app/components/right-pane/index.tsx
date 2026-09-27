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
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  useFolderMemberships,
  useFolders,
} from "@/features/library/state/folders";
import {
  type LibraryInspectorMode,
  libraryChrome,
  useInspectorMode,
  useInspectorSaveId,
  useInspectorSourceId,
  useInspectorTab,
  useRightPane,
} from "@/features/library/state/library-chrome";
import type { SaveInspectorProps } from "@/features/saves/components/detail/pane";
import { useSelectedSaveIds } from "@/features/saves/state/selection";
import { usePrefs } from "@/features/settings/state/prefs";
import styles from "./styles.module.css";

const AgentPane = lazy(async () => {
  const module = await import("@/features/agent/components/pane");
  return { default: module.AgentPane };
});

const SaveInspector = lazy(async () => {
  const module = await import("@/features/saves/components/detail/pane");
  return { default: module.SaveInspector };
});

const DownloadInspector = lazy(async () => {
  const module = await import("@/features/downloads/components/inspector");
  return { default: module.DownloadInspector };
});

const SourceInspector = lazy(async () => {
  const module = await import("@/features/sources/components/inspector");
  return { default: module.SourceInspector };
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
  const folderCounts = allFolders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    count: saveIds.filter((id) => memberships[id]?.includes(folder.id)).length,
  }));
  const inspectorMode = useInspectorMode();
  const inspectorTab = useInspectorTab();
  const hadSelection = useRef(selectedIds.length > 0);
  useEffect(() => {
    if (
      hadSelection.current &&
      !selectedIds.length &&
      !viewerOpen &&
      inspectorMode === "save"
    )
      libraryChrome.inspectSave(null);
    hadSelection.current = selectedIds.length > 0;
  }, [selectedIds.length, viewerOpen, inspectorMode]);
  const sourceId = useInspectorSourceId();
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
      inspectorMode={inspectorMode}
      inspectorTab={inspectorTab}
      sourceId={sourceId}
      assistantPage={assistantPage}
      reduceMotion={reduceMotion}
      AgentContent={AgentPane}
      InspectorContent={SaveInspector}
      DownloadInspectorContent={DownloadInspector}
      SourceInspectorContent={SourceInspector}
    />
  );
}

interface RightPaneViewProps {
  pane: "agent" | "inspector" | null;
  saveId: string | null;
  saveIds?: readonly string[];
  folders?: SaveInspectorProps["folders"];
  inspectorMode?: LibraryInspectorMode;
  inspectorTab?: SaveInspectorProps["tab"];
  sourceId?: string | null;
  assistantPage: boolean;
  reduceMotion: boolean;
  AgentContent: ComponentType;
  InspectorContent: ComponentType<SaveInspectorProps>;
  DownloadInspectorContent: ComponentType<{ saveId: string }>;
  SourceInspectorContent: ComponentType;
}

export function RightPaneView({
  pane,
  saveId,
  saveIds,
  folders,
  inspectorMode = "save",
  inspectorTab = "organize",
  sourceId = null,
  assistantPage,
  reduceMotion,
  AgentContent,
  InspectorContent,
  DownloadInspectorContent,
  SourceInspectorContent,
}: RightPaneViewProps) {
  const [inspectorId, setInspectorId] = useState(saveId);
  const [retainedInspectorMode, setRetainedInspectorMode] =
    useState(inspectorMode);
  const [agentActivated, setAgentActivated] = useState(pane === "agent");
  const [agentHost] = useState(createContentHost);
  const [inspectorHost] = useState(createContentHost);
  if (saveId && saveId !== inspectorId) setInspectorId(saveId);
  if ((saveId || sourceId) && inspectorMode !== retainedInspectorMode) {
    setRetainedInspectorMode(inspectorMode);
  }
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
        retainedInspectorMode === "source" ? (
          <Suspense fallback={null}>
            <SourceInspectorContent />
          </Suspense>
        ) : inspectorId ? (
          <Suspense fallback={null}>
            {retainedInspectorMode === "download" ? (
              <DownloadInspectorContent
                key={inspectorId}
                saveId={inspectorId}
              />
            ) : (
              <InspectorContent
                saveId={inspectorId}
                saveIds={saveIds}
                folders={folders}
                tab={inspectorTab}
              />
            )}
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
