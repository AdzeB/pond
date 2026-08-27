import type { Source } from "@pond/schema/db";
import { asText, at, isRecord, type JsonValue } from "./json";
import { sendMessage } from "./messaging";
import { getSettings } from "./settings";
import {
  POND_EVENT,
  type PondCapturePayload,
  type PondLogEntry,
} from "./types";

export async function bridge(source: Source): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled[source]) return;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return;
    const envelope: JsonValue = event.data;
    if (!isRecord(envelope) || envelope.type !== POND_EVENT) return;
    const message = envelope.message;
    if (!isRecord(message)) return;

    if (message.kind === "capture") {
      const url = asText(at(message, "payload", "url"));
      if (!url) return;
      const payload: PondCapturePayload = { url };
      const trigger = asText(at(message, "payload", "trigger"));
      if (trigger !== undefined) payload.trigger = trigger;
      void sendMessage("capture", payload).catch(() => {});
      return;
    }

    if (message.kind === "log") {
      const level = message.level;
      const text = asText(message.message);
      if (text === undefined) return;
      if (level !== "info" && level !== "warn" && level !== "error") return;
      const entry: PondLogEntry = { level, message: text };
      const detail = asText(message.data);
      if (detail !== undefined) entry.data = detail;
      void sendMessage("log", entry).catch(() => {});
    }
  });
}
