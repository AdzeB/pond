import { SelectionToolbarPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.selection, className)} />;
}

function Quote({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Quote>) {
  return (
    <Base.Quote
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const SelectionToolbar = {
  SelectionToolbarPrimitiveQuote: Quote,
  SelectionToolbarPrimitiveRoot: Root,
  Root,
  Quote,
} satisfies PrimitiveSurface<typeof Base>;
