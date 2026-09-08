import { BranchPickerPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.actions, className)} />;
}

function Next({ render, asChild, ...props }: ComponentProps<typeof Base.Next>) {
  return (
    <Base.Next
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Previous({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Previous>) {
  return (
    <Base.Previous
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const BranchPicker = {
  Next,
  Previous,
  Count: Base.Count,
  Number: Base.Number,
  Root,
} satisfies PrimitiveSurface<typeof Base>;
