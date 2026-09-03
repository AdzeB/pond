import { z } from "zod";

export const ASSISTANT_MODELS = [
  {
    id: "anthropic",
    name: "Claude Opus 5",
    provider: "Anthropic",
    model: "claude-opus-5",
    local: false,
    needsKey: true,
    quality: "maximum",
    capabilities: {
      tools: true,
      structuredOutput: true,
      vision: true,
      customModel: false,
    },
  },
  {
    id: "openai",
    name: "GPT-5.6 Sol",
    provider: "OpenAI",
    model: "gpt-5.6-sol",
    local: false,
    needsKey: true,
    quality: "maximum",
    capabilities: {
      tools: true,
      structuredOutput: true,
      vision: true,
      customModel: false,
    },
  },
  {
    id: "gemini",
    name: "Gemini 3.1 Pro",
    provider: "Google",
    model: "gemini-3.1-pro-preview",
    local: false,
    needsKey: true,
    quality: "maximum",
    capabilities: {
      tools: true,
      structuredOutput: true,
      vision: true,
      customModel: false,
    },
  },
  {
    id: "ollama",
    name: "Llama 3.2",
    provider: "Ollama",
    model: "llama3.2",
    local: true,
    needsKey: false,
    quality: "custom",
    capabilities: {
      tools: true,
      structuredOutput: false,
      vision: false,
      customModel: true,
    },
  },
  {
    id: "lmstudio",
    name: "Local Model",
    provider: "LM Studio",
    model: "local",
    local: true,
    needsKey: false,
    quality: "custom",
    capabilities: {
      tools: true,
      structuredOutput: false,
      vision: false,
      customModel: true,
    },
  },
  {
    id: "compatible",
    name: "Compatible Model",
    provider: "Custom Endpoint",
    model: "gpt-5.6-sol",
    local: false,
    needsKey: true,
    quality: "custom",
    capabilities: {
      tools: true,
      structuredOutput: false,
      vision: false,
      customModel: true,
    },
  },
] as const;

export type AssistantProvider = (typeof ASSISTANT_MODELS)[number]["id"];
export const ASSISTANT_PROVIDER_IDS = ASSISTANT_MODELS.map(
  (model) => model.id,
) as [AssistantProvider, ...AssistantProvider[]];
export const assistantProvider = z.enum(ASSISTANT_PROVIDER_IDS);
export const assistantScope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("library") }),
  z.object({ kind: z.literal("folder"), id: z.string().min(1) }),
  z.object({ kind: z.literal("attachments") }),
]);
export type AssistantScope = z.infer<typeof assistantScope>;

export const ASSISTANT_CHANGE_CAP = 100;
export const ASSISTANT_ATTACH_CAP = 200;

export const assistantLibraryAction = z.enum([
  "folderCreate",
  "folderRename",
  "folderDelete",
  "tagCreate",
  "tagRename",
  "tagMerge",
  "savedViewCreate",
  "savedViewRename",
  "savedViewUpdate",
  "quickAdd",
  "mergeDuplicates",
  "exportFiles",
  "exportCsv",
  "syncNow",
  "refresh",
  "archive",
  "copyUrl",
  "reveal",
  "batchRename",
  "purgeTrash",
]);
export type AssistantLibraryAction = z.infer<typeof assistantLibraryAction>;
export const assistantQuestion = z.object({
  question: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(160)).min(2).max(4),
});
export type AssistantQuestion = z.infer<typeof assistantQuestion>;

export const assistantChangeProposal = z.discriminatedUnion("field", [
  z.object({
    saveId: z.string(),
    field: z.literal("title"),
    after: z.string().trim().min(1).max(300),
    reason: z.string().max(500),
  }),
  z.object({
    saveId: z.string(),
    field: z.literal("note"),
    after: z.string().trim().max(4000),
    reason: z.string().max(500),
  }),
  z.object({
    saveId: z.string(),
    field: z.enum(["tags", "folders"]),
    after: z.array(z.string().trim().min(1).max(100)).max(24),
    reason: z.string().max(500),
  }),
  z.object({
    saveId: z.string(),
    field: z.literal("rating"),
    after: z.number().int().min(0).max(5),
    reason: z.string().max(500),
  }),
  z.object({
    saveId: z.string(),
    field: z.literal("comments"),
    after: z.array(z.string().trim().min(1).max(2000)).max(24),
    reason: z.string().max(500),
  }),
  z.object({
    saveId: z.string(),
    field: z.literal("trash"),
    after: z.enum(["trash", "restore"]),
    reason: z.string().max(500),
  }),
  z.object({
    saveId: z.string().default(""),
    field: z.literal("action"),
    action: assistantLibraryAction,
    after: z.string().trim().min(1).max(500),
    payload: z.record(z.string(), z.unknown()).optional(),
    reason: z.string().max(500),
  }),
]);
export const assistantProposalInput = z.object({
  changes: z.array(assistantChangeProposal).min(1).max(ASSISTANT_CHANGE_CAP),
});

export const assistantResultSet = z.object({
  title: z.string().trim().min(1).max(120),
  saveIds: z.array(z.string().min(1)).min(1).max(80),
});
export type AssistantResultSet = z.infer<typeof assistantResultSet>;

export const assistantToolStep = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string().optional(),
  status: z.enum(["running", "complete", "error", "stopped"]),
  elapsedMs: z.number().optional(),
});
export type AssistantToolStep = z.infer<typeof assistantToolStep>;

export const assistantSend = z.object({
  chatId: z.string().min(1),
  requestId: z.string().min(1).max(100),
  content: z.string().trim().min(1).max(32000),
  attachmentIds: z
    .array(z.string().min(1))
    .max(ASSISTANT_ATTACH_CAP)
    .default([]),
  scope: assistantScope.default({ kind: "library" }),
  provider: assistantProvider,
  replyToQuestion: z.string().min(1).optional(),
  semanticQuery: z.string().nullable().optional(),
  visualSaveId: z.string().nullable().optional(),
});
export type AssistantSend = z.infer<typeof assistantSend>;

export const assistantSource = z.object({
  id: z.string(),
  title: z.string().nullable(),
  url: z.string(),
  source: z.string(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type AssistantSource = z.infer<typeof assistantSource>;

export const assistantChange = z.intersection(
  z.object({
    id: z.string(),
    saveId: z.string(),
    title: z.string(),
    reason: z.string(),
    status: z.enum(["pending", "applied", "dismissed", "undone"]),
    error: z.string().optional(),
  }),
  z.discriminatedUnion("field", [
    z.object({
      field: z.literal("title"),
      before: z.string().nullable(),
      after: z.string(),
    }),
    z.object({
      field: z.literal("note"),
      before: z.string().nullable(),
      after: z.string(),
    }),
    z.object({
      field: z.enum(["tags", "folders"]),
      before: z.array(z.string()),
      after: z.array(z.string()),
    }),
    z.object({
      field: z.literal("rating"),
      before: z.number().nullable(),
      after: z.number(),
    }),
    z.object({
      field: z.literal("comments"),
      before: z.array(z.string()),
      after: z.array(z.string()),
    }),
    z.object({
      field: z.literal("trash"),
      before: z.enum(["active", "trashed"]),
      after: z.enum(["active", "trashed"]),
    }),
    z.object({
      field: z.literal("action"),
      action: assistantLibraryAction,
      before: z.string().nullable(),
      after: z.string(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
);
export type AssistantChange = z.infer<typeof assistantChange>;

export const assistantMetadata = z.object({
  attachments: z.array(assistantSource).optional(),
  scope: assistantScope.optional(),
  scopeLabel: z.string().optional(),
  sources: z.array(assistantSource).optional(),
  changes: z.array(assistantChange).optional(),
  question: assistantQuestion.optional(),
  replyToQuestion: z.string().optional(),
  results: z.array(assistantResultSet).optional(),
  steps: z.array(assistantToolStep).optional(),
  stopped: z.boolean().optional(),
  error: z.string().optional(),
});
export type AssistantMetadata = z.infer<typeof assistantMetadata>;

export const assistantMessage = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.string(),
  content: z.string(),
  metadata: assistantMetadata.nullable(),
});
export type AssistantMessage = z.infer<typeof assistantMessage>;
export const assistantMessages = z.array(assistantMessage);
export const assistantSources = z.array(assistantSource);

export type AssistantActivity =
  | "thinking"
  | "searching"
  | "reading"
  | "writing"
  | "preparing";
export interface AssistantChunk {
  chatId: string;
  requestId: string;
  type:
    | "text"
    | "done"
    | "error"
    | "activity"
    | "sources"
    | "stopped"
    | "results"
    | "steps";
  text?: string;
  error?: string;
  activity?: AssistantActivity;
  sources?: AssistantSource[];
  results?: AssistantResultSet[];
  steps?: AssistantToolStep[];
}
export const assistantSendResult = z.object({
  chatId: z.string(),
  accepted: z.boolean().optional(),
  error: z.string().optional(),
  stopped: z.boolean().optional(),
});
export type AssistantSendResult = z.infer<typeof assistantSendResult>;
