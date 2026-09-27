import { Button } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

interface ResponseAnnouncementProps {
  running: boolean;
  responseId?: string;
  requiredAction?: string;
  error?: string | null;
  onRead: () => void;
}

export function ResponseAnnouncement({
  running,
  responseId,
  requiredAction,
  error,
  onRead,
}: ResponseAnnouncementProps) {
  const previous = useRef({ running, responseId, requiredAction, error });
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const before = previous.current;
    previous.current = { running, responseId, requiredAction, error };
    if (
      error &&
      (error !== before.error ||
        before.running ||
        responseId !== before.responseId)
    )
      setAnnouncement(`Agent response failed: ${error}`);
    else if (running) setAnnouncement("");
    else if (
      requiredAction &&
      (before.running ||
        requiredAction !== before.requiredAction ||
        responseId !== before.responseId)
    )
      setAnnouncement(requiredAction);
    else if (responseId && (before.running || responseId !== before.responseId))
      setAnnouncement("Agent response complete.");
  }, [running, responseId, requiredAction, error]);
  return (
    <>
      <span
        className={styles.announcement}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </span>
      {responseId ? (
        <Button
          className={styles.link}
          size="sm"
          variant="ghost"
          onClick={onRead}
        >
          Read latest response
        </Button>
      ) : null}
    </>
  );
}
