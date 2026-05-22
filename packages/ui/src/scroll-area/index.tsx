import { ScrollArea as Base } from "@base-ui/react/scroll-area";
import { cn } from "../lib/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Viewport({ className, ...props }: Base.Viewport.Props) {
  return (
    <Base.Viewport className={cn(styles.viewport, className)} {...props} />
  );
}

function Scrollbar({ className, ...props }: Base.Scrollbar.Props) {
  return (
    <Base.Scrollbar className={cn(styles.scrollbar, className)} {...props} />
  );
}

function Content({ className, ...props }: Base.Content.Props) {
  return <Base.Content className={cn(styles.content, className)} {...props} />;
}

function Thumb({ className, ...props }: Base.Thumb.Props) {
  return <Base.Thumb className={cn(styles.thumb, className)} {...props} />;
}

function Corner({ className, ...props }: Base.Corner.Props) {
  return <Base.Corner className={cn(styles.corner, className)} {...props} />;
}

export const ScrollArea = {
  Root,
  Viewport,
  Scrollbar,
  Content,
  Thumb,
  Corner,
};
