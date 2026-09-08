import { AssistantModalPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Content({ className, ...props }: ComponentProps<typeof Base.Content>) {
  const reduced = useReducedMotionConfig();
  return (
    <Base.Content
      {...props}
      data-reduced-motion={reduced || undefined}
      className={cn(styles.modal, className)}
    />
  );
}

function Trigger({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Trigger>) {
  return (
    <Base.Trigger
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const AssistantModal = {
  Root: Base.Root,
  Trigger,
  Content,
  Anchor: Base.Anchor,
} satisfies PrimitiveSurface<typeof Base>;
