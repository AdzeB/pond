import { Slider as Base } from "@base-ui/react/slider";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Label({ className, ...props }: Base.Label.Props) {
  return <Base.Label className={cn(styles.label, className)} {...props} />;
}

function Value({ className, ...props }: Base.Value.Props) {
  return <Base.Value className={cn(styles.value, className)} {...props} />;
}

function Control({ className, ...props }: Base.Control.Props) {
  return <Base.Control className={cn(styles.control, className)} {...props} />;
}

function Track({ className, ...props }: Base.Track.Props) {
  return <Base.Track className={cn(styles.track, className)} {...props} />;
}

function Thumb({ className, ...props }: Base.Thumb.Props) {
  return <Base.Thumb className={cn(styles.thumb, className)} {...props} />;
}

function Indicator({ className, ...props }: Base.Indicator.Props) {
  return (
    <Base.Indicator className={cn(styles.indicator, className)} {...props} />
  );
}

export const Slider = {
  Root,
  Label,
  Value,
  Control,
  Track,
  Thumb,
  Indicator,
};
