import { Toggle as Base } from "@base-ui/react/toggle";
import { cn } from "../lib/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Props) {
  return <Base className={cn(styles.root, className)} {...props} />;
}

export const Toggle = {
  Root,
};
