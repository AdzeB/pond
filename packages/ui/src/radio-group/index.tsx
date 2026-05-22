import { RadioGroup as Base } from "@base-ui/react/radio-group";
import { cn } from "../lib/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Props) {
  return <Base className={cn(styles.root, className)} {...props} />;
}

export const RadioGroup = {
  Root,
};
