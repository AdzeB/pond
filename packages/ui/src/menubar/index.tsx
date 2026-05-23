import { Menubar as Base } from "@base-ui/react/menubar";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Props) {
  return <Base className={cn(styles.root, className)} {...props} />;
}

export const Menubar = {
  Root,
};
