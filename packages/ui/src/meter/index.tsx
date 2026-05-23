import { Meter as Base } from "@base-ui/react/meter";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Track({ className, ...props }: Base.Track.Props) {
  return <Base.Track className={cn(styles.track, className)} {...props} />;
}

function Indicator({ className, ...props }: Base.Indicator.Props) {
  return (
    <Base.Indicator className={cn(styles.indicator, className)} {...props} />
  );
}

function Value({ className, ...props }: Base.Value.Props) {
  return <Base.Value className={cn(styles.value, className)} {...props} />;
}

function Label({ className, ...props }: Base.Label.Props) {
  return <Base.Label className={cn(styles.label, className)} {...props} />;
}

export const Meter = {
  Root,
  Track,
  Indicator,
  Value,
  Label,
};
