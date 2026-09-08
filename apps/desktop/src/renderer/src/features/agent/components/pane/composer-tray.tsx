import {
  IconArrowLeftOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { Button, Popover } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./composer-tray.module.css";

export type ComposerTrayView =
  | "add"
  | "models"
  | "scope"
  | "references"
  | "context"
  | "suggestions";

const titles = {
  add: "Composer",
  models: "Models",
  scope: "Search Scope",
  context: "Add Context",
  references: "Referenced Saves",
  suggestions: "Suggestions",
} satisfies Record<ComposerTrayView, string>;

export function ComposerTray({
  view,
  anchorRef,
  inputRef,
  onClose,
  onBack,
  render,
}: {
  view: ComposerTrayView | null;
  anchorRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onBack: () => void;
  render: (view: ComposerTrayView) => ReactNode;
}) {
  const popup = useRef<HTMLDivElement>(null);
  const previous = useRef<ComposerTrayView>("add");
  if (view) previous.current = view;
  const displayed = view ?? previous.current;
  const reduced = useReducedMotionConfig();
  useEffect(() => {
    if (!view || view === "suggestions") return;
    const frame = requestAnimationFrame(() => {
      popup.current
        ?.querySelector(`[data-tray-view="${view}"]`)
        ?.querySelector<HTMLElement>("input, button:not(:disabled)")
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [view]);
  return (
    <Popover.Root
      open={Boolean(view)}
      modal={false}
      onOpenChange={(open, details) => {
        if (open) return;
        if (
          details.event.target instanceof Element &&
          details.event.target.closest("[data-composer-tray-trigger]")
        )
          return;
        if (
          details.event instanceof FocusEvent &&
          details.event.relatedTarget instanceof Element &&
          details.event.relatedTarget.closest("[data-composer-tray-trigger]")
        )
          return;
        onClose();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchorRef}
          side="top"
          align="start"
          sideOffset={8}
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          className={styles.positioner}
        >
          <Popover.Popup
            ref={popup}
            className={styles.popup}
            aria-label={titles[displayed]}
            initialFocus={displayed === "suggestions" ? false : undefined}
            finalFocus={() => inputRef.current}
          >
            {displayed !== "add" && displayed !== "suggestions" ? (
              <div className={styles.header}>
                <Button
                  icon
                  size="xs"
                  variant="ghost"
                  aria-label="Back to composer options"
                  onClick={onBack}
                >
                  <IconArrowLeftOutline18 />
                </Button>
                <Popover.Title className={styles.title}>
                  {titles[displayed]}
                </Popover.Title>
                <Button
                  icon
                  size="xs"
                  variant="ghost"
                  aria-label="Close composer options"
                  onClick={onClose}
                >
                  <IconXmarkOutline18 />
                </Button>
              </div>
            ) : null}
            <motion.div
              layout
              className={styles.viewport}
              transition={reduced ? { duration: 0 } : gentleSpring}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={displayed}
                  data-tray-body
                  data-tray-view={displayed}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduced ? 0 : -4 }}
                  transition={reduced ? { duration: 0 } : gentleSpring}
                >
                  {render(displayed)}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
