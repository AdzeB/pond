import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { ApprovalCard } from "../approval-card";
import { CodeBlock } from "../code-block";
import { Details } from "../details";
import styles from "./styles.module.css";

export function ToolCall({
  toolName,
  argsText,
  result,
  status,
  isError,
  approval,
  respondToApproval,
}: ToolCallMessagePartProps) {
  if (
    approval &&
    approval.approved === undefined &&
    !approval.resolution &&
    !approval.options?.length &&
    (!approval.display || approval.display === "decision")
  ) {
    return (
      <ApprovalCard
        title={approval.prompt || `Allow ${toolName}?`}
        description="Review this action before it runs."
        onApprove={() => respondToApproval({ approved: true })}
        onReject={() => respondToApproval({ approved: false })}
      >
        <CodeBlock language="json" code={argsText} />
      </ApprovalCard>
    );
  }
  const label =
    isError || status.type === "incomplete"
      ? "Failed"
      : status.type === "running"
        ? "Running"
        : status.type === "requires-action"
          ? "Needs input"
          : "Completed";
  return (
    <Details
      title={
        <>
          {toolName}
          <span className={styles.muted}>{label}</span>
        </>
      }
    >
      <CodeBlock language="json" code={argsText} />
      {result !== undefined && (
        <CodeBlock language="json" code={JSON.stringify(result, null, 2)} />
      )}
    </Details>
  );
}
