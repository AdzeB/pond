import { Toolbar as Base } from "@base-ui/react/toolbar";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

type GroupAlign = "start" | "center" | "end";

interface GroupProps extends Base.Group.Props {
  "data-align"?: GroupAlign;
}

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Group({ className, ...props }: GroupProps) {
  return <Base.Group className={cn(styles.group, className)} {...props} />;
}

function Separator({ className, ...props }: Base.Separator.Props) {
  return (
    <Base.Separator className={cn(styles.separator, className)} {...props} />
  );
}

export const Toolbar = {
  Root,
  Group,
  Separator,
  Button: Base.Button,
  Input: Base.Input,
  Link: Base.Link,
};
