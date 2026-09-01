import { clsx as cn } from "clsx";
import {
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Tooltip } from "../tooltip";
import {
  useWindow,
  WindowContext,
  type WindowEdge,
  type WindowTrackEdge,
  type WindowTrackResize,
} from "./context";
import styles from "./styles.module.css";
import { nextTrackWidth } from "./track";

interface RootProps extends ComponentPropsWithoutRef<"div"> {
  leftOpen?: boolean;
  rightOpen?: boolean;
}

function Root({
  className,
  children,
  leftOpen,
  rightOpen,
  ...props
}: RootProps) {
  const [state, setState] = useState<Record<WindowEdge, boolean>>({
    top: false,
    left: false,
    right: false,
    bottom: false,
  });
  const [resize, setResizeState] = useState<
    Record<WindowTrackEdge, WindowTrackResize | null>
  >({
    left: null,
    right: null,
  });

  const setOpen = useCallback((edge: WindowEdge, open: boolean) => {
    setState((prev) =>
      prev[edge] === open ? prev : { ...prev, [edge]: open },
    );
  }, []);

  const setResize = useCallback(
    (edge: WindowTrackEdge, value: WindowTrackResize | null) => {
      setResizeState((prev) =>
        prev[edge] === value ? prev : { ...prev, [edge]: value },
      );
    },
    [],
  );

  const resolvedState = useMemo(
    () => ({
      ...state,
      left: leftOpen ?? state.left,
      right: rightOpen ?? state.right,
    }),
    [state, leftOpen, rightOpen],
  );
  const actions = useMemo(() => ({ setOpen, setResize }), [setOpen, setResize]);
  const value = useMemo(
    () => ({
      state: resolvedState,
      resize,
      actions,
      meta: {},
    }),
    [resolvedState, resize, actions],
  );

  return (
    <WindowContext value={value}>
      <div
        className={cn(styles.root, className)}
        data-slot="window"
        data-top-open={resolvedState.top || undefined}
        data-left-open={resolvedState.left || undefined}
        data-right-open={resolvedState.right || undefined}
        data-bottom-open={resolvedState.bottom || undefined}
        {...props}
      >
        {children}
      </div>
    </WindowContext>
  );
}

function useEdgeOpen(edge: WindowEdge, open: boolean) {
  const {
    actions: { setOpen },
  } = useWindow();
  useLayoutEffect(() => {
    setOpen(edge, open);
    return () => {
      setOpen(edge, false);
    };
  }, [setOpen, edge, open]);
}

function useEdgeResize(
  edge: WindowTrackEdge,
  open: boolean,
  value: WindowTrackResize,
) {
  const {
    actions: { setResize },
  } = useWindow();
  useLayoutEffect(() => {
    setResize(
      edge,
      open
        ? {
            minWidth: value.minWidth,
            maxWidth: value.maxWidth,
            defaultWidth: value.defaultWidth,
            resizeLabel: value.resizeLabel,
            onResize: value.onResize,
            onCollapse: value.onCollapse,
          }
        : null,
    );
    return () => {
      setResize(edge, null);
    };
  }, [
    setResize,
    edge,
    open,
    value.minWidth,
    value.maxWidth,
    value.defaultWidth,
    value.resizeLabel,
    value.onResize,
    value.onCollapse,
  ]);
}

interface TopProps extends ComponentPropsWithoutRef<"header"> {
  open?: boolean;
}

function Top({ className, open = true, ...props }: TopProps) {
  useEdgeOpen("top", open);
  return (
    <header
      className={cn(styles.top, className)}
      data-slot="top"
      data-open={open || undefined}
      {...props}
    />
  );
}

interface SideProps extends ComponentPropsWithoutRef<"aside"> {
  open?: boolean;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  resizeLabel?: string;
  onResize?: (width: number) => void;
  onCollapse?: () => void;
}

function Left({
  className,
  open = true,
  children,
  minWidth = 180,
  maxWidth = 420,
  defaultWidth,
  resizeLabel,
  onResize,
  onCollapse,
  ...props
}: SideProps) {
  useEdgeOpen("left", open);
  useEdgeResize("left", open, {
    minWidth,
    maxWidth,
    defaultWidth,
    resizeLabel,
    onResize,
    onCollapse,
  });
  return (
    <aside
      className={cn(styles.left, className)}
      data-slot="left"
      data-open={open || undefined}
      {...props}
      inert={!open || undefined}
      aria-hidden={!open || undefined}
    >
      <div className={styles["edge-content"]}>{children}</div>
    </aside>
  );
}

function Center({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { state, resize } = useWindow();
  return (
    <div className={cn(styles.center, className)} data-slot="center" {...props}>
      {state.left && resize.left ? (
        <Handle edge="left" {...resize.left} />
      ) : null}
      {children}
      {state.right && resize.right ? (
        <Handle edge="right" {...resize.right} />
      ) : null}
    </div>
  );
}

function Right({
  className,
  open = true,
  children,
  minWidth = 280,
  maxWidth = 560,
  defaultWidth,
  resizeLabel,
  onResize,
  onCollapse,
  ...props
}: SideProps) {
  useEdgeOpen("right", open);
  useEdgeResize("right", open, {
    minWidth,
    maxWidth,
    defaultWidth,
    resizeLabel,
    onResize,
    onCollapse,
  });
  return (
    <aside
      className={cn(styles.right, className)}
      data-slot="right"
      data-open={open || undefined}
      {...props}
      inert={!open || undefined}
      aria-hidden={!open || undefined}
    >
      <div className={styles["edge-content"]}>{children}</div>
    </aside>
  );
}

function Handle({
  edge,
  minWidth,
  maxWidth,
  defaultWidth,
  resizeLabel,
  onResize,
  onCollapse,
}: {
  edge: "left" | "right";
  minWidth: number;
  maxWidth: number;
  defaultWidth?: number;
  resizeLabel?: string;
  onResize?: (width: number) => void;
  onCollapse?: () => void;
}) {
  const varName =
    edge === "left" ? "--window-left-track" : "--window-right-track";

  const onPointerDown = (event: ReactPointerEvent<HTMLHRElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const root = handle.closest("[data-slot=window]");
    const pane = root?.querySelector(`[data-slot="${edge}"]`);
    if (!(pane instanceof HTMLElement) || !(root instanceof HTMLElement)) {
      return;
    }

    const startX = event.clientX;
    const startWidth = pane.getBoundingClientRect().width;
    const previousTrack = root.style.getPropertyValue(varName);
    let nextWidth = startWidth;
    let dragged = false;
    pane.dataset.resizing = "";
    root.dataset.resizing = edge;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    handle.setPointerCapture(event.pointerId);

    const restoreTrack = () => {
      if (previousTrack) root.style.setProperty(varName, previousTrack);
      else root.style.removeProperty(varName);
    };

    const finish = (ev: PointerEvent) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", cancel);
      handle.removeEventListener("lostpointercapture", cancel);
      try {
        handle.releasePointerCapture(ev.pointerId);
      } catch {}
      delete pane.dataset.resizing;
      delete root.dataset.resizing;
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
    };

    const collapse = (ev: PointerEvent) => {
      finish(ev);
      onCollapse?.();
      restoreTrack();
    };

    const cancel = (ev: PointerEvent) => {
      finish(ev);
      restoreTrack();
    };

    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 3) dragged = true;
      const next = nextTrackWidth({
        edge,
        startWidth,
        startX,
        clientX: ev.clientX,
        min: minWidth,
        max: maxWidth,
        collapseAtMin: edge === "left" && Boolean(onCollapse),
      });
      if (next === null) {
        if (dragged) collapse(ev);
        return;
      }
      nextWidth = next;
      root.style.setProperty(varName, `${next}px`);
    };

    const up = (ev: PointerEvent) => {
      if (!dragged) {
        collapse(ev);
        return;
      }
      finish(ev);
      onResize?.(nextWidth);
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", cancel);
    handle.addEventListener("lostpointercapture", cancel);
  };

  return (
    <Tooltip
      label={
        <span className={styles.hint}>
          <span>Drag to resize</span>
          <span>Click to collapse</span>
        </span>
      }
      side={edge === "left" ? "right" : "left"}
      delay={400}
    >
      <hr
        className={styles.handle}
        data-slot="handle"
        data-edge={edge}
        aria-orientation="vertical"
        aria-label={
          resizeLabel ?? (edge === "left" ? "Resize sidebar" : "Resize Agent")
        }
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={defaultWidth ?? minWidth}
        tabIndex={-1}
        onPointerDown={onPointerDown}
      />
    </Tooltip>
  );
}

interface BottomProps extends ComponentPropsWithoutRef<"footer"> {
  open?: boolean;
}

function Bottom({ className, open = true, ...props }: BottomProps) {
  useEdgeOpen("bottom", open);
  return (
    <footer
      className={cn(styles.bottom, className)}
      data-slot="bottom"
      data-open={open || undefined}
      {...props}
    />
  );
}

export const Window = { Root, Top, Left, Center, Right, Bottom };
export {
  useWindow,
  type WindowContextValue,
  type WindowEdge,
} from "./context";
