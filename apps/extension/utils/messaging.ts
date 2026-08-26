import type { Source } from "@pond/schema/db";
import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ProbeResult } from "./probe";
import type {
  PondCapturePayload,
  PondLogEntry,
  PushSessionResult,
} from "./types";

interface PondProtocol {
  capture(payload: PondCapturePayload): boolean;
  pushSession(source: Source): PushSessionResult;
  openPond(path: string | undefined): boolean;
  log(entry: PondLogEntry): void;
  probe(): ProbeResult;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<PondProtocol>();
