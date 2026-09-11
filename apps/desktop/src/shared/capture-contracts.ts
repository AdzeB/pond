import type {
  CaptureDraft,
  CaptureMetadata,
  CaptureReceipt,
} from "@pond/schema/capture";
export interface CaptureQueryInputs {
  "captures.accept": { draft: CaptureDraft };
  "captures.list": Record<string, never>;
  "captures.draft": { id: string };
  "captures.resume": { id: string; metadata?: CaptureMetadata };
  "captures.cancel": { id: string };
}
export interface CaptureQueryResults {
  "captures.accept": CaptureReceipt;
  "captures.list": CaptureReceipt[];
  "captures.draft": CaptureDraft;
  "captures.resume": CaptureReceipt;
  "captures.cancel": { ok: true };
}
