import { IconArrowLeftOutline18 } from "@pond/icons/outline/18";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { Button } from "../button";
import { Popover } from "../popover";
import styles from "./styles.module.css";

export function ComposerPopover({
  open,
  onOpenChange,
  anchorRef,
  inputRef,
  page = "options",
  title,
  onBack,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  page?: string;
  title?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotionConfig();
  const popupRef = useRef<HTMLDivElement>(null);
  const lastPage = useRef({ page, title, children });
  const isOpen = useRef(open);
  isOpen.current = open;
  if (open) lastPage.current = { page, title, children };
  const displayed = lastPage.current;
  const stealFocus = displayed.page !== "suggestions";
  function isComposerTrigger(node: EventTarget | null) {
    return (
      node instanceof Element &&
      Boolean(node.closest("[data-composer-options-trigger]"))
    );
  }
  useEffect(() => {
    if (!open || page === "suggestions") return;
    const frame = requestAnimationFrame(() => {
      popupRef.current
        ?.querySelector<HTMLElement>(
          "[data-composer-page] input, [data-composer-page] button:not(:disabled)",
        )
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, page]);
  return (
    <Popover.Root
      open={open}
      modal={false}
      onOpenChange={(next, details) => {
        if (
          !next &&
          (isComposerTrigger(details.event.target) ||
            (details.event instanceof FocusEvent &&
              isComposerTrigger(details.event.relatedTarget)))
        )
          return;
        onOpenChange(next);
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchorRef}
          side="top"
          align="start"
          sideOffset={8}
          className={styles.positioner}
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
        >
          <Popover.Popup
            ref={popupRef}
            className={styles.popup}
            aria-label={displayed.title || "Composer options"}
            initialFocus={stealFocus ? undefined : false}
            finalFocus={() => inputRef.current}
          >
            {displayed.title && (
              <div className={styles["panel-header"]}>
                {onBack && (
                  <Button
                    icon
                    size="xs"
                    variant="ghost"
                    onClick={onBack}
                    aria-label="Back to composer options"
                  >
                    <IconArrowLeftOutline18 />
                  </Button>
                )}
                <Popover.Title>{displayed.title}</Popover.Title>
              </div>
            )}
            <motion.div
              layout
              className={styles["panel-viewport"]}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", duration: 0.22, bounce: 0 }
              }
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={displayed.page}
                  data-composer-page
                  onAnimationComplete={() => {
                    if (
                      isOpen.current &&
                      lastPage.current.page !== "suggestions"
                    )
                      popupRef.current
                        ?.querySelector<HTMLElement>(
                          "[data-composer-page] input, [data-composer-page] button:not(:disabled)",
                        )
                        ?.focus();
                  }}
                  initial={reduced ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduced ? 0 : -3 }}
                  transition={{ duration: reduced ? 0 : 0.12 }}
                >
                  {displayed.children}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
