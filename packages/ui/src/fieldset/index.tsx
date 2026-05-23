import { Fieldset as Base } from "@base-ui/react/fieldset";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Legend({ className, ...props }: Base.Legend.Props) {
  return <Base.Legend className={cn(styles.legend, className)} {...props} />;
}

export const Fieldset = {
  Root,
  Legend,
};
