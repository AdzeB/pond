import { Accordion as Base } from "@base-ui/react/accordion";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Item({ className, ...props }: Base.Item.Props) {
  return <Base.Item className={cn(styles.item, className)} {...props} />;
}

function Header({ className, ...props }: Base.Header.Props) {
  return <Base.Header className={cn(styles.header, className)} {...props} />;
}

function Trigger({ className, ...props }: Base.Trigger.Props) {
  return <Base.Trigger className={cn(styles.trigger, className)} {...props} />;
}

function Panel({ className, ...props }: Base.Panel.Props) {
  return <Base.Panel className={cn(styles.panel, className)} {...props} />;
}

export const Accordion = {
  Root,
  Item,
  Header,
  Trigger,
  Panel,
};
