import { useAui, useAuiState } from "@assistant-ui/react";
import {
  IconArrowRotateAnticlockwiseOutline18,
  IconCheckOutline18,
  IconChevronLeftOutline18,
  IconChevronRightOutline18,
  IconClone2Outline18,
  IconMsg2Outline18,
} from "@pond/icons/outline/18";
import { ActionBar } from "../action-bar";
import { BranchPicker } from "../branch-picker";
import { Button } from "../button";
import { Reveal } from "../reveal";
import { ActionHint } from "../shared/action-hint";
import { Tooltip } from "../tooltip";
import styles from "./styles.module.css";

export function MessageActions() {
  const aui = useAui();
  const running = useAuiState((state) => state.thread.isRunning);
  const isAssistant = useAuiState(
    (state) => state.message.role === "assistant",
  );
  const copied = useAuiState((state) => state.message.isCopied);
  function quote() {
    const message = aui.message().getState();
    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    aui.thread().composer().setQuote({ messageId: message.id, text });
  }
  return (
    <Reveal visible={!running}>
      <Tooltip.Provider>
        <ActionBar.Root className={styles["message-actions"]}>
          <ActionHint label={copied ? "Copied" : "Copy"}>
            <ActionBar.Copy
              aria-label="Copy"
              render={<Button icon size="xs" variant="ghost" />}
            >
              {copied ? <IconCheckOutline18 /> : <IconClone2Outline18 />}
            </ActionBar.Copy>
          </ActionHint>
          {isAssistant ? (
            <>
              <ActionHint label="Quote">
                <Button
                  icon
                  variant="ghost"
                  size="xs"
                  aria-label="Quote"
                  onClick={quote}
                >
                  <IconMsg2Outline18 />
                </Button>
              </ActionHint>
              <ActionHint label="Retry">
                <ActionBar.Reload
                  aria-label="Retry"
                  render={<Button icon size="xs" variant="ghost" />}
                >
                  <IconArrowRotateAnticlockwiseOutline18 />
                </ActionBar.Reload>
              </ActionHint>
            </>
          ) : null}
          <BranchPicker.Root hideWhenSingleBranch>
            <BranchPicker.Previous
              aria-label="Previous response"
              render={<Button icon size="xs" variant="ghost" />}
            >
              <IconChevronLeftOutline18 />
            </BranchPicker.Previous>
            <span className={styles.muted}>
              <BranchPicker.Number /> / <BranchPicker.Count />
            </span>
            <BranchPicker.Next
              aria-label="Next response"
              render={<Button icon size="xs" variant="ghost" />}
            >
              <IconChevronRightOutline18 />
            </BranchPicker.Next>
          </BranchPicker.Root>
        </ActionBar.Root>
      </Tooltip.Provider>
    </Reveal>
  );
}
