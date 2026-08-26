import type { Source } from "@pond/schema/db";
import { sendMessage } from "./messaging";
import { getSettings } from "./settings";
import { POND_EVENT, type PondMessage } from "./types";

export async function bridge(source: Source): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled[source]) return;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as { type?: string; message?: PondMessage };
    if (!data || data.type !== POND_EVENT || !data.message) return;
    const message = data.message;
    if (message.kind === "capture") {
      void sendMessage("capture", message.payload).catch(() => {});
    } else if (message.kind === "log") {
      void sendMessage("log", {
        level: message.level,
        message: message.message,
        data: message.data,
      }).catch(() => {});
    }
  });
}
