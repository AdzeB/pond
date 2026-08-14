import type { Source } from "@pond/schema/db";
import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ProbeResult } from "./probe";
import type {
  PondCapturePayload,
  PondLogEntry,
  PondSettings,
  PushSessionResult,
} from "./types";

/** Content/popup -> background contract; `sendMessage`/`onMessage` infer both ends from each `(data) => returnValue` entry. */
interface PondProtocol {
  capture(payload: PondCapturePayload): boolean;
  pushSession(source: Source): PushSessionResult;
  openPond(path: string | undefined): boolean;
  log(entry: PondLogEntry): void;
  /** Probe from the background so page CORS / private-network rules never block localhost. */
  probe(settings: PondSettings | null): ProbeResult;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<PondProtocol>();
