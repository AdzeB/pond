import { MessagePrimitive as Base, useAuiState } from "@assistant-ui/react";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import type { ComponentProps } from "react";
import type { PrimitiveSurface } from "../shared/primitive-surface";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<typeof Base.Root>) {
  const role = useAuiState((state) => state.message.role);
  const reduced = useReducedMotionConfig();
  return (
    <Base.Root
      {...props}
      data-reduced-motion={reduced || undefined}
      data-role={role}
      className={cn(styles.message, className)}
    />
  );
}

export const Message = {
  Root,
  Parts: Base.Parts,
  PartByIndex: Base.PartByIndex,
  Content: Base.Content,
  If: Base.If,
  Attachments: Base.Attachments,
  AttachmentByIndex: Base.AttachmentByIndex,
  Quote: Base.Quote,
  Error: Base.Error,
  GroupedParts: Base.GroupedParts,
  GenerativeUI: Base.GenerativeUI,
  Unstable_PartsGrouped: Base.Unstable_PartsGrouped,
  Unstable_PartsGroupedByParentId: Base.Unstable_PartsGroupedByParentId,
} satisfies PrimitiveSurface<typeof Base>;
