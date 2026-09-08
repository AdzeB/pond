import { MessagePartPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import type { ComponentProps } from "react";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Text({
  className,
  smooth = true,
  ...props
}: ComponentProps<typeof Base.Text>) {
  const reduced = useReducedMotionConfig();
  return (
    <Base.Text
      {...props}
      smooth={reduced ? false : smooth}
      className={cn(styles.text, className)}
    />
  );
}

function Image({ className, ...props }: ComponentProps<typeof Base.Image>) {
  return <Base.Image {...props} className={cn(styles.image, className)} />;
}

export const MessagePart = {
  Text,
  Image,
  InProgress: Base.InProgress,
  Messages: Base.Messages,
} satisfies PrimitiveSurface<typeof Base>;
