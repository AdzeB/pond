import { z } from "zod";

export const HARVESTER_WINDOW_IPC = {
  open: "pond:harvester-window-open",
  location: "pond:harvester-window-location",
  ready: "pond:harvester-window-ready",
  ack: "pond:harvester-window-ack",
  close: "pond:harvester-window-close",
} as const;

export const HarvesterSectionSchema = z.enum(["sources", "downloads"]);
export type HarvesterSection = z.infer<typeof HarvesterSectionSchema>;

export const HarvesterIntentSchema = z.union([
  z.object({ type: z.literal("new-source") }),
  z.object({
    type: z.literal("connect"),
    source: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("watch"),
    source: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("inspect-account"),
    id: z.string().min(1).max(1024),
  }),
  z.object({
    type: z.literal("inspect-watch"),
    id: z.string().min(1).max(1024),
  }),
]);
export type HarvesterIntent = z.infer<typeof HarvesterIntentSchema>;

export const HarvesterWindowLocationSchema = z.object({
  section: HarvesterSectionSchema.optional(),
  intent: HarvesterIntentSchema.optional(),
  intentNonce: z.number().int().nonnegative().optional(),
});
export type HarvesterWindowLocation = z.infer<
  typeof HarvesterWindowLocationSchema
>;
