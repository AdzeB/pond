import { defineExtensionMessaging } from "@webext-core/messaging";
import type {
  DetailsDraft,
  DragItem,
  Folder,
  LibraryTargets,
} from "./messaging";
import type { CaptureStatus } from "./outcome";
import type { Appearance } from "./paint-theme";

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
  | { view: "images"; library: LibraryTargets }
  | { view: "details"; draft: DetailsDraft; library: LibraryTargets }
  | { view: "dock"; item: DragItem; folders: Folder[] };

interface OverlayProtocol {
  show(input: { request: OverlayRequest; appearance: Appearance }): boolean;
}

export const { sendMessage: sendOverlayMessage, onMessage: onOverlayMessage } =
  defineExtensionMessaging<OverlayProtocol>();
