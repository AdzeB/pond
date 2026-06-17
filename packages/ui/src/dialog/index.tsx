import { Dialog as Base } from "@base-ui/react/dialog";
import { clsx as cn } from "clsx";
import type React from "react";
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

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
}

function Header(props: HeaderProps) {
  return (
    <div className={cn(styles.header, props.className)} {...props}>
      {props.leading && <div className={styles.leading}>{props.leading}</div>}
      {props.children}
      {props.trailing && (
        <div className={styles.trailing}>{props.trailing}</div>
      )}
    </div>
  );
}

function Content(props: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.content, props.className)} {...props} />;
}

function Footer(props: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.footer, props.className)} {...props} />;
}

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Popup,
  Title,
  Description,
  Header,
  Content,
  Footer,
  Close,
  Viewport,
  createHandle: Base.createHandle,
  Handle: Base.Handle,
};
