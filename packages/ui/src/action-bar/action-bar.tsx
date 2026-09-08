import { ActionBarPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.actions, className)} />;
}

function Copy({ render, asChild, ...props }: ComponentProps<typeof Base.Copy>) {
  return (
    <Base.Copy
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Reload({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Reload>) {
  return (
    <Base.Reload
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Edit({ render, asChild, ...props }: ComponentProps<typeof Base.Edit>) {
  return (
    <Base.Edit
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Speak({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Speak>) {
  return (
    <Base.Speak
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function StopSpeaking({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.StopSpeaking>) {
  return (
    <Base.StopSpeaking
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function FeedbackPositive({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.FeedbackPositive>) {
  return (
    <Base.FeedbackPositive
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function FeedbackNegative({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.FeedbackNegative>) {
  return (
    <Base.FeedbackNegative
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function ExportMarkdown({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.ExportMarkdown>) {
  return (
    <Base.ExportMarkdown
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const ActionBar = {
  Root,
  Copy,
  Reload,
  Edit,
  Speak,
  StopSpeaking,
  FeedbackPositive,
  FeedbackNegative,
  ExportMarkdown,
} satisfies PrimitiveSurface<typeof Base>;
