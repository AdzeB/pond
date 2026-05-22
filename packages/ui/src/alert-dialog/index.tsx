import { AlertDialog as Base } from "@base-ui/react/alert-dialog";
import dialogStyles from "../dialog/styles.module.css";
import { renderFrozenPopup } from "../freeze/popup";
import { cn } from "../lib/cn";

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
    <Base.Backdrop
      className={cn(dialogStyles.backdrop, className)}
      {...props}
    />
  );
}

function Popup({ className, render, ...props }: Base.Popup.Props) {
  return (
    <Base.Popup
      {...props}
      className={cn(dialogStyles.popup, className)}
      render={render ?? renderFrozenPopup}
    />
  );
}

function Title({ className, ...props }: Base.Title.Props) {
  return (
    <Base.Title className={cn(dialogStyles.title, className)} {...props} />
  );
}

function Description({ className, ...props }: Base.Description.Props) {
  return (
    <Base.Description
      className={cn(dialogStyles.description, className)}
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

export const AlertDialog = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Popup,
  Title,
  Description,
  Close,
  Viewport,
  createHandle: Base.createHandle,
  Handle: Base.Handle,
};
