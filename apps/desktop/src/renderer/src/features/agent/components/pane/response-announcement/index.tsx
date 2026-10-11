import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

interface ResponseAnnouncementProps {
  running: boolean;
  responseId?: string;
  requiredAction?: string;
  error?: string | null;
}

export function ResponseAnnouncement({
  running,
  responseId,
  requiredAction,
  error,
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
      setAnnouncement(`Assistant response failed: ${error}`);
    else if (running) setAnnouncement("");
    else if (
      requiredAction &&
      (before.running ||
        requiredAction !== before.requiredAction ||
        responseId !== before.responseId)
    )
      setAnnouncement(requiredAction);
    else if (responseId && (before.running || responseId !== before.responseId))
      setAnnouncement("Assistant response complete.");
  }, [running, responseId, requiredAction, error]);
  return (
    <span
      className={styles.announcement}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </span>
  );
}
