import { useRouterState } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  usePresenceData,
  useReducedMotion,
} from "motion/react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { AgentPane } from "@/components/library/agent-pane";
import { SaveInspector } from "@/components/save/detail/pane";
import { useInspectorSaveId, useRightPane } from "@/stores/library-chrome";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

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
  const [inspectorId, setInspectorId] = useState(saveId);
  const [agentHost] = useState(createContentHost);
  const [inspectorHost] = useState(createContentHost);
  const [preferences] = usePrefs("preferences");
  const systemReducedMotion = useReducedMotion();
  const reduceMotion =
    preferences.reduceMotion === "always" ||
    (preferences.reduceMotion !== "never" && Boolean(systemReducedMotion));

  if (saveId && saveId !== inspectorId) setInspectorId(saveId);

  return (
    <div className={styles.viewport}>
      {createPortal(assistantPage ? null : <AgentPane />, agentHost)}
      {createPortal(
        inspectorId ? (
          <SaveInspector key={inspectorId} saveId={inspectorId} />
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
