import { Drawer as Base } from "@base-ui/react/drawer";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root(props: Base.Root.Props) {
  return <Base.Root {...props} />;
}

function Provider(props: Base.Provider.Props) {
  return <Base.Provider {...props} />;
}

function Trigger(props: Base.Trigger.Props) {
  return <Base.Trigger {...props} />;
}

function Portal(props: Base.Portal.Props) {
  return <Base.Portal {...props} />;
}

function Backdrop({ className, ...props }: Base.Backdrop.Props) {
  return (
    <Base.Backdrop className={cn(styles.backdrop, className)} {...props} />
  );
}

function Popup({ className, ...props }: Base.Popup.Props) {
  return <Base.Popup className={cn(styles.popup, className)} {...props} />;
}

function Content({ className, ...props }: Base.Content.Props) {
  return <Base.Content className={cn(styles.content, className)} {...props} />;
}

function Viewport({ className, ...props }: Base.Viewport.Props) {
  return (
    <Base.Viewport className={cn(styles.viewport, className)} {...props} />
  );
}

function Title({ className, ...props }: Base.Title.Props) {
  return <Base.Title className={cn(styles.title, className)} {...props} />;
}

function Description({ className, ...props }: Base.Description.Props) {
  return (
    <Base.Description
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

function Close(props: Base.Close.Props) {
  return <Base.Close {...props} />;
}

function SwipeArea({ className, ...props }: Base.SwipeArea.Props) {
  return (
    <Base.SwipeArea
      className={cn(styles["swipe-area"], className)}
      {...props}
    />
  );
}

function Indent({ className, ...props }: Base.Indent.Props) {
  return <Base.Indent className={cn(styles.indent, className)} {...props} />;
}

function IndentBackground({
  className,
  ...props
}: Base.IndentBackground.Props) {
  return (
    <Base.IndentBackground
      className={cn(styles["indent-background"], className)}
      {...props}
    />
  );
}

export const Drawer = {
  Root,
  Provider,
  Trigger,
  Portal,
  Backdrop,
  Popup,
  Content,
  Viewport,
  Title,
  Description,
  Close,
  SwipeArea,
  Indent,
  IndentBackground,
  createHandle: Base.createHandle,
  Handle: Base.Handle,
};
