import { Checkbox as Base } from "@base-ui/react/checkbox";
import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Indicator({ className, ...props }: Base.Indicator.Props) {
  return (
    <Base.Indicator className={cn(styles.indicator, className)} {...props}>
      <Check strokeWidth={2} />
    </Base.Indicator>
  );
}

export const Checkbox = {
  Root,
  Indicator,
};
