import { IconArrowUp } from "@pond/icons";
import { clsx as cn } from "clsx";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
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
    <Button type="submit" icon variant="primary" size="sm" {...props}>
      {children}
    </Button>
  );
}

function Stop({ children, ...props }: ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Button type="button" icon size="sm" variant="primary" {...props}>
      {children}
    </Button>
  );
}

export const Composer = { Root, Input, Send, Stop };

/** Taller than one 28px line means the draft wrapped or gained a line break. */
const SINGLE_LINE = 32;

export function ComposerView({
  leading,
  toolbar,
  placeholder = "Ask about your Saves",
  children,
  inputProps,
  editor,
  empty,
  running,
  onSend,
  onStop,
  ...props
}: ComponentProps<typeof Root> & {
  leading?: ReactNode;
  toolbar?: ReactNode;
  editor?: ReactNode;
  placeholder?: string;
  inputProps?: ComponentProps<typeof Input>;
  empty?: boolean;
  running?: boolean;
  onStop?: () => void;
}) {
  const reduced = useReducedMotionConfig();
  const field = useRef<HTMLDivElement>(null);
  const extra = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [attached, setAttached] = useState(false);
  const blank = empty ?? !inputProps?.value;
  const blankRef = useRef(blank);
  blankRef.current = blank;
  useEffect(() => {
    if (blank) setTall(false);
  }, [blank]);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setAttached((extra.current?.offsetHeight ?? 0) > 0);
      if (!blankRef.current && (field.current?.offsetHeight ?? 0) > SINGLE_LINE)
        setTall(true);
    });
    if (field.current) observer.observe(field.current);
    if (extra.current) observer.observe(extra.current);
    return () => observer.disconnect();
  }, []);
  return (
    <Tooltip.Provider>
      <Root
        {...props}
        data-expanded={(tall && !blank) || attached || undefined}
        onSend={running ? undefined : onSend}
      >
        <div ref={extra} className={styles.extra}>
          {children}
        </div>
        <div ref={field} className={styles.field}>
          {editor ?? (
            <Input
              aria-label="Message"
              placeholder={placeholder}
              {...inputProps}
            />
          )}
        </div>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <div className={styles.trailing}>
          {toolbar}
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
                      <IconArrowUp />
                    </Send>
                  </ActionHint>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Root>
    </Tooltip.Provider>
  );
}
