import { useEffect } from "react";
import { z } from "zod";
import { statusFeed } from "@/features/downloads/lib/status-feed";

const NotificationDetailSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

export function NotificationStatusBridge() {
  useEffect(() => {
    const record = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = NotificationDetailSchema.safeParse(event.detail);
      if (detail.success)
        statusFeed.note(detail.data.title, detail.data.description);
    };
    window.addEventListener("pond:notification", record);
    return () => window.removeEventListener("pond:notification", record);
  }, []);
  return null;
}
