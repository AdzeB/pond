import { OTPFieldPreview as Base } from "@base-ui/react/otp-field";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

function Root({ className, ...props }: Base.Root.Props) {
  return <Base.Root className={cn(styles.root, className)} {...props} />;
}

function Input({ className, ...props }: Base.Input.Props) {
  return <Base.Input className={cn(styles.input, className)} {...props} />;
}

function Separator({ className, ...props }: Base.Separator.Props) {
  return (
    <Base.Separator className={cn(styles.separator, className)} {...props} />
  );
}

export const OTPField = {
  Root,
  Input,
  Separator,
};
