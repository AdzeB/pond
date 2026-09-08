import { IconChevronDownOutline18 } from "@pond/icons/outline/18";
import { Conversation } from "@pond/ui";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./pane.module.css";

export function ConversationThread({
  chatId,
  requestId,
  children,
}: {
  chatId: string | null;
  requestId?: string | null;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const previousChat = useRef(chatId);
  const previousRequest = useRef(requestId);
  const [detached, setDetached] = useState(false);

  useLayoutEffect(() => {
    if (
      previousChat.current !== chatId ||
      (requestId && previousRequest.current !== requestId)
    ) {
      previousChat.current = chatId;
      following.current = true;
      setDetached(false);
    }
    previousRequest.current = requestId;
    if (following.current && viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  });

  useEffect(() => {
    const frame = viewport.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => {
      if (following.current) frame.scrollTop = frame.scrollHeight;
      else if (frame.scrollHeight - frame.scrollTop - frame.clientHeight < 70) {
        following.current = true;
        setDetached(false);
      }
    });
    observer.observe(frame);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles["thread-frame"]}>
      <section
        className={styles.thread}
        ref={viewport}
        aria-label="Conversation"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable conversation must support keyboard navigation.
        tabIndex={0}
        onScroll={(event) => {
          const frame = event.currentTarget;
          following.current =
            frame.scrollHeight - frame.scrollTop - frame.clientHeight < 70;
          setDetached(!following.current);
        }}
      >
        <div ref={content} className={styles["thread-inner"]}>
          {children}
        </div>
      </section>
      <Conversation.ScrollButton
        aria-label="Latest Reply"
        inert={!detached}
        onClick={() => {
          following.current = true;
          setDetached(false);
          if (viewport.current) {
            viewport.current.scrollTop = viewport.current.scrollHeight;
            viewport.current.focus({ preventScroll: true });
          }
        }}
      >
        <IconChevronDownOutline18 />
      </Conversation.ScrollButton>
    </div>
  );
}
