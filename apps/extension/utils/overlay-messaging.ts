import { defineExtensionMessaging } from "@webext-core/messaging";
import type { Folder } from "./messaging";
import type { CaptureStatus } from "./outcome";
import type { ThemeVars } from "./theme";

export interface OverlayToast {
  id: string;
  status: CaptureStatus;
  title: string;
  message?: string;
  saveId?: string;
}

export type OverlayRequest =
  | { view: "clear" }
  | { view: "toast"; toast: OverlayToast }
  | { view: "region" }
  | { view: "element" }
  | { view: "images"; folders: Folder[] };

interface OverlayProtocol {
  show(input: { request: OverlayRequest; theme: ThemeVars | null }): boolean;
}

export const { sendMessage: sendOverlayMessage, onMessage: onOverlayMessage } =
  defineExtensionMessaging<OverlayProtocol>();
