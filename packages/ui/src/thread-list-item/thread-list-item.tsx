import { ThreadListItemPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return (
    <Base.Root {...props} className={cn(styles["thread-item"], className)} />
  );
}

function Archive({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Archive>) {
  return (
    <Base.Archive
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Unarchive({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Unarchive>) {
  return (
    <Base.Unarchive
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Delete({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Delete>) {
  return (
    <Base.Delete
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
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

export const ThreadListItem = {
  Root,
  Archive,
  Unarchive,
  Delete,
  Trigger,
  Title: Base.Title,
} satisfies PrimitiveSurface<typeof Base>;
