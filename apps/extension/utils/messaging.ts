import type { Source } from "@pond/schema/db";
import { defineExtensionMessaging } from "@webext-core/messaging";
import type {
  PondCapturePayload,
  PondLogEntry,
  PushSessionResult,
} from "./types";

// Typed content/popup -> background message contract. Each entry is
// `(data) => returnValue`; `sendMessage`/`onMessage` infer both ends.
interface PondProtocol {
  capture(payload: PondCapturePayload): boolean;
  pushSession(source: Source): PushSessionResult;
  openPond(path: string | undefined): boolean;
  log(entry: PondLogEntry): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<PondProtocol>();
