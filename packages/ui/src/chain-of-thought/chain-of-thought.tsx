import { ChainOfThoughtPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.disclosure, className)} />;
}

function AccordionTrigger({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.AccordionTrigger>) {
  return (
    <Base.AccordionTrigger
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const ChainOfThought = {
  AccordionTriggerPrimitive: AccordionTrigger,
  PartsPrimitive: Base.PartsPrimitive,
  RootPrimitive: Root,
  Root,
  AccordionTrigger,
  Parts: Base.Parts,
} satisfies PrimitiveSurface<typeof Base>;
