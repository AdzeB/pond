import { ComposerPrimitive as Base } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button } from "../button";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root {...props} className={cn(styles.composer, className)} />;
}

function Input({ className, ...props }: ComponentProps<typeof Base.Input>) {
  return <Base.Input {...props} className={cn(styles.input, className)} />;
}

function AttachmentDropzone({
  className,
  ...props
}: ComponentProps<typeof Base.AttachmentDropzone>) {
  return (
    <Base.AttachmentDropzone
      {...props}
      className={cn(styles.dropzone, className)}
    />
  );
}

function DictationTranscript({
  className,
  ...props
}: ComponentProps<typeof Base.DictationTranscript>) {
  return (
    <Base.DictationTranscript
      {...props}
      className={cn(styles.muted, className)}
    />
  );
}

function Quote({ className, ...props }: ComponentProps<typeof Base.Quote>) {
  return <Base.Quote {...props} className={cn(styles.quote, className)} />;
}

function QuoteText({
  className,
  ...props
}: ComponentProps<typeof Base.QuoteText>) {
  return <Base.QuoteText {...props} className={cn(styles.label, className)} />;
}

function Send({ render, asChild, ...props }: ComponentProps<typeof Base.Send>) {
  return (
    <Base.Send
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="primary" />)
      }
    />
  );
}

function Cancel({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Cancel>) {
  return (
    <Base.Cancel
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function AddAttachment({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.AddAttachment>) {
  return (
    <Base.AddAttachment
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function Dictate({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.Dictate>) {
  return (
    <Base.Dictate
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function StopDictation({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.StopDictation>) {
  return (
    <Base.StopDictation
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

function QuoteDismiss({
  render,
  asChild,
  ...props
}: ComponentProps<typeof Base.QuoteDismiss>) {
  return (
    <Base.QuoteDismiss
      {...props}
      asChild={asChild}
      render={
        render ?? (asChild ? undefined : <Button size="xs" variant="ghost" />)
      }
    />
  );
}

export const Composer = {
  Root,
  Input,
  Send,
  Cancel,
  AddAttachment,
  Attachments: Base.Attachments,
  AttachmentByIndex: Base.AttachmentByIndex,
  AttachmentDropzone,
  Dictate,
  StopDictation,
  DictationTranscript,
  If: Base.If,
  Quote,
  QuoteText,
  QuoteDismiss,
  Queue: Base.Queue,
  Unstable_TriggerPopover: Base.Unstable_TriggerPopover,
  Unstable_TriggerPopoverRoot: Base.Unstable_TriggerPopoverRoot,
  Unstable_TriggerPopoverCategories: Base.Unstable_TriggerPopoverCategories,
  Unstable_TriggerPopoverCategoryItem: Base.Unstable_TriggerPopoverCategoryItem,
  Unstable_TriggerPopoverItems: Base.Unstable_TriggerPopoverItems,
  Unstable_TriggerPopoverItem: Base.Unstable_TriggerPopoverItem,
  Unstable_TriggerPopoverBack: Base.Unstable_TriggerPopoverBack,
  unstable_useTriggerPopoverRootContext:
    Base.unstable_useTriggerPopoverRootContext,
  unstable_useTriggerPopoverRootContextOptional:
    Base.unstable_useTriggerPopoverRootContextOptional,
  unstable_useTriggerPopoverScopeContext:
    Base.unstable_useTriggerPopoverScopeContext,
  unstable_useTriggerPopoverScopeContextOptional:
    Base.unstable_useTriggerPopoverScopeContextOptional,
  unstable_useTriggerPopoverTriggers: Base.unstable_useTriggerPopoverTriggers,
  unstable_useTriggerPopoverTriggersOptional:
    Base.unstable_useTriggerPopoverTriggersOptional,
} satisfies PrimitiveSurface<typeof Base>;
