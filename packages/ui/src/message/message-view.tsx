import { useAuiState } from "@assistant-ui/react";
import type { ComponentProps, ReactNode } from "react";
import { AttachmentItem } from "../attachment/attachment-item";
import { Activity } from "../chain-of-thought/activity";
import { AssistantError as MessageError } from "../error";
import { FilePart } from "../file-part";
import { Markdown } from "../markdown";
import { MessagePart } from "../message-part";
import { Reasoning } from "../reasoning";
import { Reveal } from "../reveal";
import { RunStatus } from "../run-status";
import { Source } from "../source";
import { ToolCall } from "../tool-call";
import { Message } from "./message";
import { MessageActions } from "./message-actions";
import styles from "./styles.module.css";

function TextPart() {
  return <Markdown />;
}

function ImagePart() {
  return <MessagePart.Image />;
}

function EmptyPart() {
  const running = useAuiState(
    (state) => state.message.status?.type === "running",
  );
  const hasText = useAuiState((state) =>
    state.message.content.some(
      (part) => part.type === "text" && part.text.length > 0,
    ),
  );
  return running && !hasText ? <RunStatus>Thinking</RunStatus> : null;
}

function StoppedStatus() {
  const stopped = useAuiState(
    (state) =>
      state.message.status?.type === "incomplete" &&
      state.message.status.reason === "cancelled",
  );
  return stopped ? (
    <RunStatus state="stopped">Response stopped</RunStatus>
  ) : null;
}

export function MessageView({
  components,
  actions = <MessageActions />,
  ...props
}: ComponentProps<typeof Message.Root> & {
  components?: ComponentProps<typeof Message.Parts>["components"];
  actions?: ReactNode;
}) {
  return (
    <Reveal>
      <Message.Root {...props}>
        <div className={styles.messageBody}>
          <div className={styles.attachments}>
            <Message.Attachments>
              {() => <AttachmentItem />}
            </Message.Attachments>
          </div>
          <Message.Quote>
            {({ text }) => (
              <blockquote className={styles.quote}>{text}</blockquote>
            )}
          </Message.Quote>
          <Message.Parts
            components={
              !components || components.ChainOfThought
                ? {
                    ChainOfThought: Activity,
                    Text: TextPart,
                    Image: ImagePart,
                    Source,
                    File: FilePart,
                    Empty: EmptyPart,
                    ...components,
                  }
                : {
                    Text: TextPart,
                    Image: ImagePart,
                    Reasoning,
                    Source,
                    File: FilePart,
                    Empty: EmptyPart,
                    tools: { Fallback: ToolCall },
                    ...components,
                  }
            }
          />
          <Message.Error>
            <MessageError.Root role="alert">
              <MessageError.Message />
            </MessageError.Root>
          </Message.Error>
          <StoppedStatus />
        </div>
        {actions}
      </Message.Root>
    </Reveal>
  );
}
