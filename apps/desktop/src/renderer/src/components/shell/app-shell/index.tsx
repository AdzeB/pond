import { clsx as cn } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useLayoutEffect } from "react";
import { snappySpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

interface RootProps {
  header: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}

/** Shell chrome lives on `#root`; the optional right rail sits outside the rounded workspace. */
function Root({ header, children, right, className }: RootProps) {
  const reduceMotion = useReducedMotion();
  useLayoutEffect(() => {
    const el = document.getElementById("root");
    if (!el) return;
    const shell = styles.root;
    if (!shell) return;
    const extra = className?.split(/\s+/).filter(Boolean) ?? [];
    el.classList.add(shell, ...extra);
    return () => {
      el.classList.remove(shell, ...extra);
    };
  }, [className]);

  return (
    <div className={styles.frame}>
      <div className={styles.window}>
        <div className={styles.header}>{header}</div>
        <div className={styles.main}>{children}</div>
      </div>
      <aside className={cn(styles.right, right && styles["right-open"])}>
        <AnimatePresence initial={false}>
          {right ? (
            <motion.div
              className={styles["right-content"]}
              initial={reduceMotion ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
              transition={reduceMotion ? { duration: 0 } : snappySpring}
            >
              {right}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </aside>
    </div>
  );
}

interface ToolbarProps extends React.ComponentPropsWithoutRef<"div"> {}

/** Nav + omnibox row inside main. */
function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={cn(styles.toolbar, className)} {...props} />;
}

interface ContentProps extends React.ComponentPropsWithoutRef<"div"> {}

function Content({ className, ...props }: ContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export const AppShell = { Root, Toolbar, Content };
