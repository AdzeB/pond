import { Toolbar as Base } from "@base-ui/react/toolbar";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Row({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.row, className)} {...props} />;
}

function Group({
  fill,
  className,
  ...props
}: Base.Group.Props & { fill?: boolean }) {
  return (
    <Base.Group
      data-fill={fill}
      className={cn(styles.group, className)}
      {...props}
    />
  );
}

function Separator({ className, ...props }: Base.Separator.Props) {
  return (
    <Base.Separator className={cn(styles.separator, className)} {...props} />
  );
}

export const Toolbar = {
  Root,
  Row,
  Group,
  Separator,
  Button: Base.Button,
  Input: Base.Input,
  Link: Base.Link,
};
