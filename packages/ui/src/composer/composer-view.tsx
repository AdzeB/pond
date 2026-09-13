import { useAuiState } from "@assistant-ui/react";
import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import { IconXmarkOutline18 } from "@pond/icons/outline/18";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { AttachmentItem } from "../attachment/attachment-item";
import { Button } from "../button";
import { ActionHint } from "../shared/action-hint";
import { Tooltip } from "../tooltip";
import { Composer } from "./composer";
import styles from "./styles.module.css";

export function ComposerView({
  toolbar,
  placeholder = "Ask about your Saves",
  children,
  inputProps,
  ...props
}: ComponentProps<typeof Composer.Root> & {
  toolbar?: ReactNode;
  placeholder?: string;
  inputProps?: ComponentProps<typeof Composer.Input>;
}) {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const reduced = useReducedMotionConfig();
  return (
    <Tooltip.Provider>
      <Composer.Root {...props}>
        {children}
        <div className={styles.attachments}>
          <Composer.Attachments>
            {() => <AttachmentItem removable />}
          </Composer.Attachments>
        </div>
        <Composer.Quote>
          <span className={styles["quote-text"]}>
            <Composer.QuoteText />
          </span>
          <Composer.QuoteDismiss
            aria-label="Remove quote"
            render={<Button icon size="xs" variant="ghost" />}
          >
            <IconXmarkOutline18 />
          </Composer.QuoteDismiss>
        </Composer.Quote>
        <Composer.Input
          aria-label="Message"
          placeholder={placeholder}
          {...inputProps}
        />
        <div className={styles.toolbar}>
          <div className={styles.actions}>{toolbar}</div>
          <div className={styles["send-slot"]}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={isRunning ? "stop" : "send"}
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
                transition={{ duration: reduced ? 0 : 0.1 }}
              >
                {isRunning ? (
                  <ActionHint label="Stop response">
                    <Composer.Cancel
                      aria-label="Stop"
                      render={
                        <Button
                          icon
                          size="sm"
                          variant="secondary"
                          className={styles["send-button"]}
                        />
                      }
                    >
                      <span className={styles["stop-icon"]} />
                    </Composer.Cancel>
                  </ActionHint>
                ) : (
                  <ActionHint label="Send message">
                    <Composer.Send
                      aria-label="Send"
                      render={
                        <Button
                          icon
                          size="sm"
                          className={styles["send-button"]}
                        />
                      }
                    >
                      <IconArrowUpFill18 />
                    </Composer.Send>
                  </ActionHint>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Composer.Root>
    </Tooltip.Provider>
  );
}
