import { ThreadListPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.threadList, className)} />;
}

function New({ render, asChild, ...props }: ComponentProps<typeof Base.New>) {
  return (
    <Base.New
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function LoadMore({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.LoadMore>) {
  return (
    <Base.LoadMore
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const ThreadList = {
  New,
  Items: Base.Items,
  ItemByIndex: Base.ItemByIndex,
  LoadMore,
  Root,
} satisfies PrimitiveSurface<typeof Base>;
