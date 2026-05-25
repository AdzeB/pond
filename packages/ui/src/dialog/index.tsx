import { Dialog as Base } from "@base-ui/react/dialog";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root(props: Base.Root.Props) {
  return <Base.Root {...props} />;
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
  return <Base.Popup {...props} className={cn(styles.popup, className)} />;
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

function Viewport(props: Base.Viewport.Props) {
  return <Base.Viewport {...props} />;
}

function Actions({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.actions, className)} {...props} />;
}

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Popup,
  Title,
  Description,
  Actions,
  Close,
  Viewport,
  createHandle: Base.createHandle,
  Handle: Base.Handle,
};
