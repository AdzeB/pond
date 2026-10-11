import { IconArrowUpFill } from "@pond/icons";
import { clsx as cn } from "clsx";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";
import { Button } from "../button";
import { ActionHint } from "../shared/action-hint";
import { Tooltip } from "../tooltip";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"form"> {
  onSend?: () => void;
}

function Root({ className, onSend, onSubmit, ...props }: RootProps) {
  return (
    <form
      className={cn(styles.composer, className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
        onSend?.();
      }}
      {...props}
    />
  );
}

const Input = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function Input({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(styles.input, className)}
      {...props}
    />
  );
});

function Send({ children, ...props }: ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button type="submit" icon variant="secondary" size="sm" {...props}>
      {children}
    </Button>
  );
}

function Stop({ children, ...props }: ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button type="button" icon size="sm" variant="secondary" {...props}>
      {children}
    </Button>
  );
}

function Toolbar({ children }: { children?: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

function Actions({ children }: { children?: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export const Composer = { Root, Input, Send, Stop, Toolbar, Actions };

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
}: ComponentProps<typeof Root> & {
  toolbar?: ReactNode;
  editor?: ReactNode;
  placeholder?: string;
  inputProps?: ComponentProps<typeof Input>;
  running?: boolean;
  onStop?: () => void;
}) {
  const reduced = useReducedMotionConfig();
  return (
    <Tooltip.Provider>
      <Root {...props} onSend={running ? undefined : onSend}>
        {children}
        {editor ?? (
          <Input
            aria-label="Message"
            placeholder={placeholder}
            {...inputProps}
          />
        )}
        <Toolbar>
          <Actions>{toolbar}</Actions>
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
                    <Stop
                      aria-label="Stop"
                      className={styles["send-button"]}
                      onClick={onStop}
                    >
                      <span className={styles["stop-icon"]} />
                    </Stop>
                  </ActionHint>
                ) : (
                  <ActionHint label="Send message">
                    <Send aria-label="Send" className={styles["send-button"]}>
                      <IconArrowUpFill />
                    </Send>
                  </ActionHint>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Toolbar>
      </Root>
    </Tooltip.Provider>
  );
}
