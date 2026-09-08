import { QueueItemPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Text({ className, ...props }: ComponentProps<typeof Base.Text>) {
  return <Base.Text {...props} className={cn(styles.label, className)} />;
}

function Steer({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Steer>) {
  return (
    <Base.Steer
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
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

export const QueueItem = {
  Text,
  Steer,
  Remove,
} satisfies PrimitiveSurface<typeof Base>;
