import { NumberField as Base } from "@base-ui/react/number-field";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Group({ className, ...props }: Base.Group.Props) {
  return <Base.Group className={cn(styles.group, className)} {...props} />;
}

function Input({ className, ...props }: Base.Input.Props) {
  return <Base.Input className={cn(styles.input, className)} {...props} />;
}

function Increment({ className, ...props }: Base.Increment.Props) {
  return <Base.Increment className={cn(styles.button, className)} {...props} />;
}

function Decrement({ className, ...props }: Base.Decrement.Props) {
  return <Base.Decrement className={cn(styles.button, className)} {...props} />;
}

function ScrubArea({ className, ...props }: Base.ScrubArea.Props) {
  return (
    <Base.ScrubArea
      className={cn(styles["scrub-area"], className)}
      {...props}
    />
  );
}

function ScrubAreaCursor({ className, ...props }: Base.ScrubAreaCursor.Props) {
  return (
    <Base.ScrubAreaCursor
      className={cn(styles["scrub-area-cursor"], className)}
      {...props}
    />
  );
}

export const NumberField = {
  Root,
  Group,
  Input,
  Increment,
  Decrement,
  ScrubArea,
  ScrubAreaCursor,
};
