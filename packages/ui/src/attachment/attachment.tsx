import { AttachmentPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  const reduced = useReducedMotionConfig();
  return (
    <Base.Root
      {...props}
      data-reduced-motion={reduced || undefined}
      className={cn(styles.attachment, className)}
    />
  );
}

function unstable_Thumb({
  className,
  ...props
}: ComponentProps<typeof Base.unstable_Thumb>) {
  return (
    <Base.unstable_Thumb
      {...props}
      className={cn(styles.thumbnail, className)}
    />
  );
}

function Remove({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Remove>) {
  return (
    <Base.Remove
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const Attachment = {
  Root,
  unstable_Thumb,
  Name: Base.Name,
  Remove,
} satisfies PrimitiveSurface<typeof Base>;
