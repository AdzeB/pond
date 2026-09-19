import { clsx as cn } from "clsx";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { Button } from "../button";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.thread, className)} {...props} />;
}

const Viewport = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  function Viewport({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn(styles.viewport, className)} {...props} />
    );
  },
);

function ViewportFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.footer, className)} {...props} />;
}

function Messages({
  children,
  empty,
}: {
  children: ReactNode;
  empty?: ReactNode;
}) {
  if (!children || (Array.isArray(children) && children.length === 0))
    return empty ? <div className={styles.empty}>{empty}</div> : null;
  return <>{children}</>;
}

function ScrollToLatest({ viewport }: { viewport: HTMLElement | null }) {
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    if (!viewport) return;
    const update = () => {
      setClipped(
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 24,
      );
    };
    update();
    viewport.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [viewport]);
  if (!clipped) return null;
  return (
    <div className={styles["scroll-action"]}>
      <Button
        size="xs"
        variant="secondary"
        onClick={() =>
          viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
        }
      >
        Latest Message
      </Button>
    </div>
  );
}

export const Thread = {
  Root,
  Viewport,
  ViewportFooter,
  Messages,
  ScrollToLatest,
};
