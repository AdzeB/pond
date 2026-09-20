import { z } from "zod";
import { RenameReplacementSchema } from "./rename-template";

const Name = z.string().trim().min(1).max(500);
export const ActionStepSchema = z.intersection(
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("add-folders"),
      folderIds: z.array(z.string().min(1)).min(1),
    }),
    z.object({
      kind: z.literal("remove-folders"),
      folderIds: z.array(z.string().min(1)).min(1),
    }),
    z.object({ kind: z.literal("add-tags"), tags: z.array(Name).min(1) }),
    z.object({ kind: z.literal("remove-tags"), tags: z.array(Name).min(1) }),
    z.object({
      kind: z.literal("rating"),
      rating: z.number().int().min(0).max(5),
    }),
    z.object({
      kind: z.literal("rename"),
      pattern: Name,
      start: z.number().int().min(0).default(1),
      padding: z.number().int().min(1).max(12).default(1),
      replacement: RenameReplacementSchema.nullable().optional(),
    }),
    z.object({
      kind: z.literal("notes"),
      text: z.string().max(100_000),
      mode: z.enum(["append", "replace"]),
    }),
  ]),
  z.object({ id: z.string().optional() }),
);
export const ActionDefinitionSchema = z.object({
  id: z.string().min(1).max(100),
  name: Name,
  shortcut: z.string().trim().min(1).max(100).nullable().optional(),
  steps: z.array(ActionStepSchema).min(1).max(50),
});
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;
export type ActionStep = z.infer<typeof ActionStepSchema>;
export const ActionRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100_000),
  definition: ActionDefinitionSchema,
});
export const ActionRunSchema = ActionRequestSchema.extend({
  expectedToken: z.string().min(1),
});
export interface ActionSaveState {
  folderIds: string[];
  title: string | null;
  tags: string[];
  rating: number | null;
  notes: string | null;
}
export interface ActionChange {
  id: string;
  before: ActionSaveState;
  after: ActionSaveState;
}
export interface ActionPreview {
  token: string;
  changes: ActionChange[];
  unchanged: number;
}
export interface ActionQueryInputs {
  "actions.list": Record<string, never>;
  "actions.save": { definition: ActionDefinition };
  "actions.duplicate": { id: string };
  "actions.delete": { id: string };
  "actions.preview": z.infer<typeof ActionRequestSchema>;
  "actions.run": z.infer<typeof ActionRunSchema>;
}
export interface ActionQueryResults {
  "actions.list": ActionDefinition[];
  "actions.save": ActionDefinition;
  "actions.duplicate": ActionDefinition;
  "actions.delete": { ok: true };
  "actions.preview": ActionPreview;
  "actions.run": { changed: number };
}
