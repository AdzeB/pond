import { useAuiState } from "@assistant-ui/react";
import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import { useId } from "react";
import { Reasoning } from "../reasoning";
import { Reveal } from "../reveal";
import { ToolCall } from "../tool-call";
import { ChainOfThought } from "./chain-of-thought";
import styles from "./styles.module.css";

export function Activity() {
  const collapsed = useAuiState((state) => state.chainOfThought.collapsed);
  const status = useAuiState((state) => state.chainOfThought.status.type);
  const count = useAuiState(
    (state) =>
      state.chainOfThought.parts.filter((part) => part.type === "tool-call")
        .length,
  );
  const regionId = useId();
  const expanded = !collapsed || status === "requires-action";
  return (
    <ChainOfThought.Root className={styles.activity}>
      <ChainOfThought.AccordionTrigger
        className={styles.activityTrigger}
        aria-expanded={expanded}
        aria-controls={regionId}
      >
        <span>
          {status === "running"
            ? "Working"
            : status === "requires-action"
              ? "Needs review"
              : count
                ? `${count} ${count === 1 ? "step" : "steps"} completed`
                : "Thought process"}
        </span>
        <IconChevronDownOutline12 />
      </ChainOfThought.AccordionTrigger>
      <Reveal visible={expanded}>
        <div id={regionId} className={styles.activityBody}>
          <ChainOfThought.Parts
            components={{ Reasoning, tools: { Fallback: ToolCall } }}
          />
        </div>
      </Reveal>
    </ChainOfThought.Root>
  );
}
