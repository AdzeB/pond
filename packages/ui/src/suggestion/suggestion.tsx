import { SuggestionPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Title({ className, ...props }: ComponentProps<typeof Base.Title>) {
  return <Base.Title {...props} className={cn(styles.label, className)} />;
}

function Description({
  className,
  ...props
}: ComponentProps<typeof Base.Description>) {
  return (
    <Base.Description {...props} className={cn(styles.muted, className)} />
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

export const Suggestion = {
  Title,
  Description,
  Trigger,
} satisfies PrimitiveSurface<typeof Base>;
