import { Form as Base } from "@base-ui/react/form";
import type { Ref } from "react";
import { cn } from "../_shared/cn";
import styles from "./styles.module.css";

// biome-ignore lint/suspicious/noExplicitAny: matches base-ui's Form generic constraint
type FormValuesShape = Record<string, any>;

function Root<FormValues extends FormValuesShape = FormValuesShape>({
  className,
  ...props
}: Base.Props<FormValues> & { ref?: Ref<HTMLFormElement> }) {
  return <Base className={cn(styles.root, className)} {...props} />;
}

export const Form = {
  Root,
};
