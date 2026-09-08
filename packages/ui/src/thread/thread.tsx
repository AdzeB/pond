import { ThreadPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.thread, className)} />;
}

function Viewport({
  className,
  ...props
}: ComponentProps<typeof Base.Viewport>) {
  return (
    <Base.Viewport {...props} className={cn(styles.viewport, className)} />
  );
}

function ViewportFooter({
  className,
  ...props
}: ComponentProps<typeof Base.ViewportFooter>) {
  return (
    <Base.ViewportFooter {...props} className={cn(styles.footer, className)} />
  );
}

function ScrollToBottom({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.ScrollToBottom>) {
  return (
    <Base.ScrollToBottom
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Suggestion({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Suggestion>) {
  return (
    <Base.Suggestion
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const Thread = {
  Root,
  Empty: Base.Empty,
  If: Base.If,
  Viewport,
  ViewportProvider: Base.ViewportProvider,
  ViewportFooter,
  Messages: Base.Messages,
  MessageByIndex: Base.MessageByIndex,
  Unstable_MessageById: Base.Unstable_MessageById,
  ScrollToBottom,
  Suggestion,
  Suggestions: Base.Suggestions,
  SuggestionByIndex: Base.SuggestionByIndex,
} satisfies PrimitiveSurface<typeof Base>;
