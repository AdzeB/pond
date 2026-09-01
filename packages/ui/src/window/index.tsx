import { clsx as cn } from "clsx";
import {
  type ComponentPropsWithoutRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useWindow, WindowContext, type WindowEdge } from "./context";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"div"> {}

function Root({ className, children, ...props }: RootProps) {
  const [state, setState] = useState<Record<WindowEdge, boolean>>({
    top: false,
    left: false,
    right: false,
    bottom: false,
  });

  const setOpen = useCallback((edge: WindowEdge, open: boolean) => {
    setState((prev) =>
      prev[edge] === open ? prev : { ...prev, [edge]: open },
    );
  }, []);

  const actions = useMemo(() => ({ setOpen }), [setOpen]);
  const value = useMemo(
    () => ({
      state,
      actions,
      meta: {},
    }),
    [state, actions],
  );

  return (
    <WindowContext value={value}>
      <div
        className={cn(styles.root, className)}
        data-top-open={state.top || undefined}
        data-left-open={state.left || undefined}
        data-right-open={state.right || undefined}
        data-bottom-open={state.bottom || undefined}
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
}

function Left({ className, open = true, ...props }: SideProps) {
  useEdgeOpen("left", open);
  return (
    <aside
      className={cn(styles.left, className)}
      data-slot="left"
      data-open={open || undefined}
      {...props}
    />
  );
}

function Center({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  useWindow();
  return (
    <div
      className={cn(styles.center, className)}
      data-slot="center"
      {...props}
    />
  );
}

function Right({ className, open = true, ...props }: SideProps) {
  useEdgeOpen("right", open);
  return (
    <aside
      className={cn(styles.right, className)}
      data-slot="right"
      data-open={open || undefined}
      {...props}
    />
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
