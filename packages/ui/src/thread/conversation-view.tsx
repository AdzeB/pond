import { AuiIf, useThreadViewport } from "@assistant-ui/react";
import { IconMsg2Outline18 } from "@pond/icons/outline/18";
import { useReducedMotionConfig } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { ComposerView } from "../composer/composer-view";
import { MessageView } from "../message/message-view";
import { Reveal } from "../reveal";
import { SelectionToolbar } from "../selection-toolbar";
import styles from "./styles.module.css";
import { Thread } from "./thread";

function ScrollToLatest() {
  const isAtBottom = useThreadViewport((state) => state.isAtBottom);
  const reduced = useReducedMotionConfig();
  return (
    <Reveal visible={!isAtBottom}>
      <div className={styles["scroll-action"]}>
        <Thread.ScrollToBottom behavior={reduced ? "instant" : "smooth"}>
          Latest Message
        </Thread.ScrollToBottom>
      </div>
    </Reveal>
  );
}

export function ConversationView({
  empty = "Ask about your Saves",
  composer = <ComposerView />,
  components,
  viewportProps,
  ...props
}: ComponentProps<typeof Thread.Root> & {
  empty?: ReactNode;
  composer?: ReactNode;
  components?: ComponentProps<typeof Thread.Messages>["components"];
  viewportProps?: ComponentProps<typeof Thread.Viewport>;
}) {
  return (
    <Thread.Root {...props}>
      <SelectionToolbar.Root>
        <SelectionToolbar.Quote>
          <IconMsg2Outline18 />
          Quote
        </SelectionToolbar.Quote>
      </SelectionToolbar.Root>
      <Thread.Viewport {...viewportProps}>
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <div className={styles.empty}>{empty}</div>
        </AuiIf>
        <Thread.Messages components={{ Message: MessageView, ...components }} />
        <Thread.ViewportFooter>
          <ScrollToLatest />
          {composer}
        </Thread.ViewportFooter>
      </Thread.Viewport>
    </Thread.Root>
  );
}
