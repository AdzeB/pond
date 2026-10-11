import { Checkbox as Base } from "@base-ui/react/checkbox";
import { IconCheck as Check, IconMinus as Minus } from "@pond/icons";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

type RootProps = Base.Root.Props & { size?: "sm" | "md" };

function Root({ className, size = "md", ...props }: RootProps) {
  return (
    <Base.Root
      data-size={size}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}

function Indicator({ className, ...props }: Base.Indicator.Props) {
  return (
    <Base.Indicator className={cn(styles.indicator, className)} {...props}>
      <Check size={12} data-mark="checked" />
      <Minus size={12} data-mark="indeterminate" />
    </Base.Indicator>
  );
}

export const Checkbox = {
  Root,
  Indicator,
};
