import { z } from "zod";
import { type AssistantActivity, assistantProvider } from "./assistant";

export const DEFAULT_FISH_ID = "default";
export const DEFAULT_FISH_NAME = "Koi";

export const FISH_COLORS = [
  "orange",
  "gold",
  "red",
  "pink",
  "purple",
  "blue",
  "teal",
  "green",
] as const;
export const FishColorSchema = z.enum(FISH_COLORS);
export type FishColor = z.infer<typeof FishColorSchema>;

export const FISH_SPECIES = [
  "koi",
  "goldfish",
  "puffer",
  "clownfish",
  "angelfish",
  "shark",
  "anglerfish",
  "sunfish",
] as const;
export const FishSpeciesSchema = z.enum(FISH_SPECIES);
export type FishSpecies = z.infer<typeof FishSpeciesSchema>;

export const FishIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,64}$/, "Invalid fish id");

export const FISH_INTERVALS = ["hour", "day", "week"] as const;
export type FishInterval = (typeof FISH_INTERVALS)[number];

const FishTaskSchema = z.string().trim().min(1).max(4000);

export const FishRoutineSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("off") }),
  z.object({ kind: z.literal("newSaves"), task: FishTaskSchema }),
  z.object({
    kind: z.literal("schedule"),
    every: z.enum(FISH_INTERVALS),
    task: FishTaskSchema,
  }),
]);
export type FishRoutine = z.infer<typeof FishRoutineSchema>;

export const FishScopeSchema = z.object({
  folderIds: z.array(z.string().min(1).max(200)).max(200),
  tags: z.array(z.string().min(1).max(200)).max(200),
});
export type FishScope = z.infer<typeof FishScopeSchema>;

export const FishModelSchema = z.object({
  provider: assistantProvider,
  modelId: z.string().trim().min(1).max(300),
});
export type FishModel = z.infer<typeof FishModelSchema>;

export const FishRunSchema = z.object({
  chatId: z.string().min(1).nullable(),
  at: z.number(),
  status: z.enum(["done", "failed"]),
  error: z.string().max(2000).optional(),
  changes: z.number().int().min(0),
  seen: z.boolean(),
});
export type FishRun = z.infer<typeof FishRunSchema>;

const FishFieldsSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: FishColorSchema,
  species: FishSpeciesSchema,
  instructions: z.string().max(8000),
  scope: FishScopeSchema,
  model: FishModelSchema.nullable(),
  routine: FishRoutineSchema,
});
export const FishSchema = FishFieldsSchema.extend({
  species: FishSpeciesSchema.default("koi"),
  id: FishIdSchema,
  lastRun: FishRunSchema.nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Fish = z.infer<typeof FishSchema>;

export const FishPatchSchema = FishFieldsSchema.partial();
export type FishPatch = z.infer<typeof FishPatchSchema>;

/** What a fish is doing right now; `null` when it is idle. */
export type FishPresence = AssistantActivity | null;

export type FishEvent =
  | { kind: "changed" }
  | { kind: "presence"; fishId: string; activity: FishPresence };

export interface FishLatest {
  from: "you" | "fish" | "routine";
  text: string;
  at: number;
}

export interface FishSummary extends Fish {
  activity: FishPresence;
  latest: FishLatest | null;
}

export interface FishQueryInputs {
  "fish.list": Record<string, never>;
  "fish.create": FishPatch;
  "fish.update": { id: string; patch: FishPatch };
  "fish.delete": { id: string };
  "fish.markSeen": { id: string };
  "fish.run": { id: string };
}

export interface FishQueryResults {
  "fish.list": FishSummary[];
  "fish.create": Fish;
  "fish.update": Fish;
  "fish.delete": { ok: true } | { ok: false; error: string };
  "fish.markSeen": { ok: true };
  "fish.run": { ok: true } | { ok: false; error: string };
}
