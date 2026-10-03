import { AlertDialog as Alert } from "@base-ui/react/alert-dialog";
import { Dialog as Base } from "@base-ui/react/dialog";
import { IconAlertQuestionFill12 } from "@pond/icons/fill/12";
import {
  IconChevronLeftOutline12,
  IconXmarkOutline12,
} from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type HTMLAttributes,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "../button";
import { DialogPageContext, useDialogPage } from "./context";
import styles from "./styles.module.css";

const PAGE_EASE = [0.26, 0.08, 0.25, 1] as const;

const scaleVariants = {
  enter: (deeper: boolean) => ({
    opacity: 0,
    scale: deeper ? 0.96 : 1.04,
  }),
  show: { opacity: 1, scale: 1 },
  exit: (deeper: boolean) => ({
    opacity: 0,
    scale: deeper ? 1.04 : 0.96,
    position: "absolute" as const,
    top: 0,
    left: 0,
    pointerEvents: "none" as const,
  }),
};

const fadeVariants = {
  enter: { opacity: 0 },
  show: { opacity: 1 },
  exit: {
    opacity: 0,
    position: "absolute" as const,
    top: 0,
    left: 0,
    pointerEvents: "none" as const,
  },
};

type RootProps<Payload> =
  | ({ variant?: "dialog" } & Base.Root.Props<Payload>)
  | ({ variant: "alert" } & Alert.Root.Props<Payload>);

function Root<Payload = unknown>(props: RootProps<Payload>) {
  if (props.variant === "alert") {
    const { variant: _variant, ...rest } = props;
    return <Alert.Root {...rest} />;
  }
  const { variant: _variant, ...rest } = props;
  return <Base.Root {...rest} />;
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
}

function Backdrop({ className, ...props }: Base.Backdrop.Props) {
  return (
    <Base.Backdrop className={cn(styles.backdrop, className)} {...props} />
  );
}

type PopupProps = Base.Popup.Props &
  ({ pageId: string; depth: number } | { pageId?: never; depth?: never });

function Popup(props: PopupProps) {
  if (props.pageId !== undefined)
    return <PagedPopup {...props} pageId={props.pageId} depth={props.depth} />;
  const { pageId: _pageId, depth: _depth, className, ...rest } = props;
  return <Base.Popup className={cn(styles.popup, className)} {...rest} />;
}

function PagedPopup({
  className,
  style,
  pageId,
  depth,
  children,
  ...props
}: Base.Popup.Props & { pageId: string; depth: number }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [navigation, setNavigation] = useState({ pageId, depth, deeper: true });
  if (navigation.pageId !== pageId || navigation.depth !== depth) {
    setNavigation({ pageId, depth, deeper: depth >= navigation.depth });
  }
  const { deeper } = navigation;
  const [size, setSizeState] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [animateSize, setAnimateSize] = useState(false);

  const setSize = useCallback((width: number, height: number) => {
    setSizeState((prev) =>
      prev && prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  }, []);

  useEffect(() => {
    if (!size) return;
    const id = requestAnimationFrame(() => setAnimateSize(true));
    return () => cancelAnimationFrame(id);
  }, [size]);

  const value = useMemo(
    () => ({ pageId, depth, deeper, reduceMotion, setSize }),
    [pageId, depth, deeper, reduceMotion, setSize],
  );

  const popupStyle: CSSProperties & {
    "--width"?: string;
    "--height"?: string;
  } = {
    ...style,
  };
  if (size) {
    popupStyle["--width"] = `${size.width}px`;
    popupStyle["--height"] = `${size.height}px`;
  }

  return (
    <Base.Popup
      className={cn(styles.popup, className)}
      data-sized={animateSize || undefined}
      style={popupStyle}
      {...props}
    >
      <DialogPageContext value={value}>{children}</DialogPageContext>
    </Base.Popup>
  );
}

interface HeaderProps extends ComponentPropsWithoutRef<"header"> {}

function Header({ className, ...props }: HeaderProps) {
  return <header className={cn(styles.header, className)} {...props} />;
}

function Title({ className, children, ...props }: Base.Title.Props) {
  const page = use(DialogPageContext);
  if (!page)
    return (
      <Base.Title className={cn(styles.title, className)} {...props}>
        {children}
      </Base.Title>
    );
  const { pageId, reduceMotion } = page;
  return (
    <Base.Title className={cn(styles.title, className)} {...props}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={pageId}
          className={styles.heading}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.17,
            ease: PAGE_EASE,
          }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </Base.Title>
  );
}

interface DescriptionProps extends ComponentPropsWithoutRef<"p"> {}

function Description({ className, ...props }: DescriptionProps) {
  const page = use(DialogPageContext);
  if (page)
    return <p className={cn(styles.description, className)} {...props} />;
  return (
    <Base.Description
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

interface ViewportProps extends ComponentPropsWithoutRef<"div"> {}

function Viewport({ className, children, ...props }: ViewportProps) {
  const { pageId, deeper } = useDialogPage();
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousPage = useRef(pageId);

  useLayoutEffect(() => {
    if (previousPage.current === pageId) return;
    previousPage.current = pageId;
    viewportRef.current
      ?.querySelector<HTMLElement>("[data-dialog-page]:not([inert])")
      ?.focus({ preventScroll: true });
  }, [pageId]);

  return (
    <div
      ref={viewportRef}
      className={cn(styles.viewport, className)}
      {...props}
    >
      <AnimatePresence initial={false} custom={deeper}>
        <Page key={pageId}>{children}</Page>
      </AnimatePresence>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  const { deeper, reduceMotion, setSize } = useDialogPage();
  const present = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !present) return;
    const viewport = node.parentElement;
    const chrome = Array.from(viewport?.parentElement?.children ?? []).filter(
      (element): element is HTMLElement =>
        element !== viewport && element instanceof HTMLElement,
    );
    const measure = () =>
      setSize(
        node.offsetWidth,
        node.offsetHeight +
          (chrome.reduce(
            (height, element) => height + element.offsetHeight,
            0,
          ) || 52),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const element of chrome) observer.observe(element);
    return () => observer.disconnect();
  }, [present, setSize]);

  return (
    <motion.div
      ref={ref}
      data-dialog-page=""
      inert={!present}
      aria-hidden={!present || undefined}
      tabIndex={-1}
      className={styles.page}
      custom={deeper}
      variants={reduceMotion ? fadeVariants : scaleVariants}
      initial="enter"
      animate="show"
      exit="exit"
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: PAGE_EASE }}
    >
      {children}
    </motion.div>
  );
}

interface ActionProps extends ComponentPropsWithoutRef<"button"> {
  position?: "start" | "end";
}

function Action({ className, position = "start", ...props }: ActionProps) {
  return (
    <button
      type="button"
      data-position={position}
      className={cn(styles.action, className)}
      {...props}
    />
  );
}

function Back(props: ComponentPropsWithoutRef<"button">) {
  return (
    <Action aria-label="Back" {...props}>
      <IconChevronLeftOutline12 strokeWidth={2} />
    </Action>
  );
}

function Help(props: ComponentPropsWithoutRef<"button">) {
  return (
    <Action aria-label="Help" {...props}>
      <IconAlertQuestionFill12 strokeWidth={2} />
    </Action>
  );
}

function Close(props: Base.Close.Props) {
  return (
    <Base.Close
      render={
        <button
          type="button"
          className={styles.action}
          data-position="end"
          aria-label="Close"
        >
          <IconXmarkOutline12 strokeWidth={2} />
        </button>
      }
      {...props}
    />
  );
}

interface FooterProps extends HTMLAttributes<HTMLDivElement> {}

function Content({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.content, className)} {...props} />;
}

function Footer({ className, ...props }: FooterProps) {
  const page = use(DialogPageContext);
  return (
    <div
      className={cn(styles.footer, className)}
      data-paged={page ? "" : undefined}
      {...props}
    />
  );
}

function Confirm({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      size="lg"
      width="full"
      variant="primary"
      className={cn(styles.button, className)}
      {...props}
    >
      {children ?? "Confirm"}
    </Button>
  );
}

export const DialogParts = {
  Trigger: Base.Trigger,
  Content,
  Root,
  Portal,
  Backdrop,
  Popup,
  Header,
  Title,
  Description,
  Viewport,
  Back,
  Help,
  Close,
  Footer,
  Confirm,
  Action,
  createHandle: Base.createHandle,
  createAlertHandle: Alert.createHandle,
  Handle: Base.Handle,
};
