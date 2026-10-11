import {
  IconCheckOutline18,
  IconClone2Outline18,
  IconMsg2Outline18,
} from "@pond/icons/outline/18";
import { useState } from "react";
import { Button } from "../button";
import { ActionHint } from "../shared/action-hint";
import { Tooltip } from "../tooltip";
import styles from "./styles.module.css";

export function ActionBar({
  text,
  onQuote,
}: {
  text?: string;
  onQuote?: () => void;
} = {}) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip.Provider>
      <div className={styles.actions}>
        <ActionHint label={copied ? "Copied" : "Copy"}>
          <Button
            icon
            size="xs"
            variant="text"
            aria-label="Copy"
            onClick={() => {
              if (!text) return;
              void navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
              });
            }}
          >
            {copied ? <IconCheckOutline18 /> : <IconClone2Outline18 />}
          </Button>
        </ActionHint>
        {onQuote ? (
          <ActionHint label="Quote">
            <Button
              icon
              variant="text"
              size="xs"
              aria-label="Quote"
              onClick={onQuote}
            >
              <IconMsg2Outline18 />
            </Button>
          </ActionHint>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}
