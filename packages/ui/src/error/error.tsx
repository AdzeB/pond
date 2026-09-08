import { ErrorPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.error, className)} />;
}

function Message({ className, ...props }: ComponentProps<typeof Base.Message>) {
  return <Base.Message {...props} className={cn(styles.label, className)} />;
}

export const AssistantError = {
  Root,
  Message,
} satisfies PrimitiveSurface<typeof Base>;
