import { IconArrowDownToLine } from "@pond/icons";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Button } from "../button";
import { ComposerView } from "../composer";
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
  const reduceMotion = useReducedMotionConfig();
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
        aria-label="Read latest response"
        icon
        rounding="pill"
        size="xs"
        variant="secondary"
        onClick={() =>
          viewport?.scrollTo({
            top: viewport.scrollHeight,
            behavior: reduceMotion ? "instant" : "smooth",
          })
        }
      >
        <IconArrowDownToLine aria-hidden="true" />
      </Button>
    </div>
  );
}

function Conversation({
  empty,
  composer = <ComposerView />,
  children,
  viewportProps,
  ...props
}: ComponentProps<typeof Root> & {
  empty?: ReactNode;
  composer?: ReactNode;
  viewportProps?: Omit<ComponentProps<typeof Viewport>, "ref"> & {
    ref?: (node: HTMLDivElement | null) => void;
  };
}) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const { ref: viewportRef, ...restViewport } = viewportProps ?? {};
  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      setViewport(node);
      viewportRef?.(node);
    },
    [viewportRef],
  );
  return (
    <Root {...props}>
      <Viewport {...restViewport} ref={setViewportRef}>
        <Messages empty={empty}>{children}</Messages>
        <ViewportFooter>
          <ScrollToLatest viewport={viewport} />
          {composer}
        </ViewportFooter>
      </Viewport>
    </Root>
  );
}

export const Thread = {
  Root,
  Viewport,
  ViewportFooter,
  Messages,
  ScrollToLatest,
  Conversation,
};
