import { IconArrowUpFill18 } from "@pond/icons/fill/18";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { ActionHint } from "../shared/action-hint";
import { Tooltip } from "../tooltip";
import { Composer } from "./composer";
import styles from "./styles.module.css";

export function ComposerView({
  toolbar,
  placeholder = "Ask about your Saves",
  children,
  inputProps,
  editor,
  running,
  onSend,
  onStop,
  ...props
}: ComponentProps<typeof Composer.Root> & {
  toolbar?: ReactNode;
  editor?: ReactNode;
  placeholder?: string;
  inputProps?: ComponentProps<typeof Composer.Input>;
  running?: boolean;
  onStop?: () => void;
}) {
  const reduced = useReducedMotionConfig();
  return (
    <Tooltip.Provider>
      <Composer.Root {...props} onSend={running ? undefined : onSend}>
        {children}
        {editor ?? (
          <Composer.Input
            aria-label="Message"
            placeholder={placeholder}
            {...inputProps}
          />
        )}
        <Composer.Toolbar>
          <Composer.Actions>{toolbar}</Composer.Actions>
          <div className={styles["send-slot"]}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={running ? "stop" : "send"}
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
                transition={{ duration: reduced ? 0 : 0.1 }}
              >
                {running ? (
                  <ActionHint label="Stop response">
                    <Composer.Stop
                      aria-label="Stop"
                      className={styles["send-button"]}
                      onClick={onStop}
                    >
                      <span className={styles["stop-icon"]} />
                    </Composer.Stop>
                  </ActionHint>
                ) : (
                  <ActionHint label="Send message">
                    <Composer.Send
                      aria-label="Send"
                      className={styles["send-button"]}
                    >
                      <IconArrowUpFill18 />
                    </Composer.Send>
                  </ActionHint>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Composer.Toolbar>
      </Composer.Root>
    </Tooltip.Provider>
  );
}
