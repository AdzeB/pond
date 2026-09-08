import type { ReasoningMessagePartProps } from "@assistant-ui/react";
import { Details } from "../details";

export function Reasoning({ text, status }: ReasoningMessagePartProps) {
  return (
    <Details title={status.type === "running" ? "Thinking" : "Reasoning"}>
      {text}
    </Details>
  );
}
