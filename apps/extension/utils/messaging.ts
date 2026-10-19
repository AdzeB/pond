import { defineExtensionMessaging } from "@webext-core/messaging";
import type { CaptureOutcome } from "./outcome";
import type { ProbeResult } from "./probe";
import type { PondCapturePayload, PondLogEntry } from "./types";

export type CaptureTool = "visible" | "region" | "element" | "full" | "images";

export interface Folder {
  id: string;
  name: string;
}

export interface SavePageInput {
  tabId: number;
  tags: string[];
  folderIds: string[];
}

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** What the in-page overlay reports back once the person finishes a pick. */
export type OverlayResult =
  | { kind: "region"; region: CaptureRegion }
  | {
      kind: "images";
      urls: string[];
      /** Raw comma-separated text; the background parses it so pages don't ship zod. */
      tagText: string;
      folderIds: string[];
    };

export type ToolResult = { ok: true } | { ok: false; message: string };

interface PondProtocol {
  capture(payload: PondCapturePayload): CaptureOutcome;
  savePage(input: SavePageInput): CaptureOutcome;
  runTool(input: { tabId: number; tool: CaptureTool }): ToolResult;
  overlayResult(result: OverlayResult): void;
  folders(): Folder[];
  openPond(path: string | undefined): boolean;
  log(entry: PondLogEntry): void;
  probe(): ProbeResult;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<PondProtocol>();
