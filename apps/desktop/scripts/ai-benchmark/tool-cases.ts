import { MEDIA_TYPES, SOURCES } from "@pond/schema/db";
import type { JsonObject } from "@pond/schema/json";
import { z } from "zod";
import {
  assistantProposalInput,
  assistantQuestion,
} from "../../src/shared/assistant";

const benchmarkSearchLibraryInput = z.strictObject({
  query: z.string().optional(),
  source: z.enum(SOURCES).optional(),
  folderId: z.string().optional(),
  media: z.array(z.enum(MEDIA_TYPES)).max(MEDIA_TYPES.length).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  task: z.enum(["search", "code", "fact-check"]).optional(),
  visual: z
    .discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("saveId"), id: z.string().min(1) }),
      z.strictObject({
        kind: z.literal("vector"),
        model: z.string().min(1),
        values: z.array(z.number()).min(1),
      }),
    ])
    .optional(),
});

const benchmarkReadSaveInput = z.strictObject({
  id: z.string().min(1),
  field: z
    .enum(["caption", "ocr", "transcript", "notes", "description"])
    .optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(8000).optional(),
});

export const BENCHMARK_TOOL_SCHEMAS = {
  findDuplicates: z.strictObject({}),
  proposeChanges: assistantProposalInput,
  readSave: benchmarkReadSaveInput,
  requestQuestion: assistantQuestion,
  searchLibrary: benchmarkSearchLibraryInput,
} as const;

export type BenchmarkToolName = keyof typeof BENCHMARK_TOOL_SCHEMAS;

export const TOOL_CASE_CATEGORIES = [
  "search",
  "read",
  "organization",
  "duplicates",
  "export",
  "ambiguous",
] as const;

export type ToolCaseCategory = (typeof TOOL_CASE_CATEGORIES)[number];

type ToolExpectation = {
  kind: "tool";
  allowedTools: readonly BenchmarkToolName[];
  exampleArguments: JsonObject;
  requiredArguments: JsonObject;
};

type ClarificationExpectation = {
  kind: "clarification";
  allowedTools: readonly ["requestQuestion"];
};

export interface ToolRoutingCase {
  id: string;
  category: ToolCaseCategory;
  prompt: string;
  expectation: ToolExpectation | ClarificationExpectation;
  forbiddenTools: readonly string[];
  forbiddenActions: readonly string[];
}

const searchFixtures: Array<{ prompt: string; args: JsonObject }> = [
  { prompt: "Find my Saves about invoices.", args: { query: "invoice" } },
  {
    prompt: "Find image Saves about rain photography.",
    args: { query: "rain photography", media: ["image"] },
  },
  {
    prompt: "Search my YouTube Saves for ceramic lamps.",
    args: { query: "ceramic lamps", source: "youtube" },
  },
  {
    prompt: "Find code that implements a typography grid.",
    args: { query: "typography grid implementation", task: "code" },
  },
  {
    prompt:
      "Find evidence about whether solar panels reduce household emissions.",
    args: {
      query: "solar panels reduce household emissions",
      task: "fact-check",
    },
  },
  { prompt: "List my 12 most recent Saves.", args: { limit: 12 } },
  {
    prompt: "Find bread recipes in Folder demo-folder-recipes.",
    args: { query: "bread recipes", folderId: "demo-folder-recipes" },
  },
  {
    prompt: "Find video Saves about train interiors.",
    args: { query: "train interiors", media: ["video"] },
  },
  {
    prompt: "Find audio Saves about accessibility audits.",
    args: { query: "accessibility audits", media: ["audio"] },
  },
  {
    prompt: "Search my Twitter Saves for garden studios.",
    args: { query: "garden studios", source: "twitter" },
  },
  {
    prompt: "Find Saves about motion design.",
    args: { query: "motion design" },
  },
  {
    prompt: "Search the Library for wood joinery.",
    args: { query: "wood joinery" },
  },
  {
    prompt: "Find references about museum wayfinding.",
    args: { query: "museum wayfinding" },
  },
  {
    prompt: "Find Saves about coffee packaging.",
    args: { query: "coffee packaging" },
  },
  {
    prompt: "Search my Library for quiet workspaces.",
    args: { query: "quiet workspaces" },
  },
  {
    prompt: "Find Saves about data visualization.",
    args: { query: "data visualization" },
  },
  {
    prompt: "Search for street market references.",
    args: { query: "street markets" },
  },
  {
    prompt: "Find my Saves about editorial layouts.",
    args: { query: "editorial layouts" },
  },
  {
    prompt: "Search the Library for home libraries.",
    args: { query: "home libraries" },
  },
  {
    prompt: "Find references about recycled materials.",
    args: { query: "recycled materials" },
  },
];

const readFields = [
  "transcript",
  "ocr",
  "caption",
  "notes",
  "description",
] as const;

function caseId(category: ToolCaseCategory, index: number): string {
  return `${category}-${String(index + 1).padStart(3, "0")}`;
}

function defineCase(input: ToolRoutingCase): ToolRoutingCase {
  return input;
}

function searchCases(): ToolRoutingCase[] {
  return searchFixtures.map(({ args, prompt }, index) => ({
    id: caseId("search", index),
    category: "search",
    prompt,
    expectation: {
      kind: "tool",
      allowedTools: ["searchLibrary"],
      exampleArguments: args,
      requiredArguments: args,
    },
    forbiddenTools: ["proposeChanges", "runPondOperation"],
    forbiddenActions: ["purgeTrash", "mergeDuplicates"],
  }));
}

function readCases(): ToolRoutingCase[] {
  return Array.from({ length: 20 }, (_, index) => {
    const id = `demo-save-${String(index + 1).padStart(3, "0")}`;
    const field = readFields[index % readFields.length] ?? "description";
    return {
      id: caseId("read", index),
      category: "read",
      prompt: `Read the ${field} for Save ${id}.`,
      expectation: {
        kind: "tool",
        allowedTools: ["readSave"],
        exampleArguments: { id, field },
        requiredArguments: { id, field },
      },
      forbiddenTools: ["proposeChanges", "runPondOperation"],
      forbiddenActions: ["purgeTrash", "mergeDuplicates"],
    };
  });
}

function organizationChange(index: number): JsonObject {
  const saveId = `demo-save-${String(index + 1).padStart(3, "0")}`;
  const variant = index % 4;
  if (variant === 0)
    return {
      saveId,
      field: "tags",
      after: index === 0 ? ["reference"] : [`topic-${index + 1}`],
    };
  if (variant === 1)
    return {
      saveId,
      field: "folders",
      after: [`demo-folder-${String(index + 1).padStart(3, "0")}`],
    };
  if (variant === 2)
    return {
      saveId,
      field: "title",
      after: `Reference ${String(index + 1).padStart(2, "0")}`,
    };
  return { saveId, field: "rating", after: (index % 5) + 1 };
}

function organizationCases(): ToolRoutingCase[] {
  return Array.from({ length: 20 }, (_, index) => {
    const change = organizationChange(index);
    const exampleChange = {
      ...change,
      reason: "Requested by the benchmark.",
    };
    const saveId = String(change.saveId);
    const field = String(change.field);
    return {
      id: caseId("organization", index),
      category: "organization",
      prompt: `Prepare a review that updates ${field} on Save ${saveId} to ${JSON.stringify(change.after)}.`,
      expectation: {
        kind: "tool",
        allowedTools: ["proposeChanges"],
        exampleArguments: { changes: [exampleChange] },
        requiredArguments: { changes: [change] },
      },
      forbiddenTools: ["runPondOperation", "openSave"],
      forbiddenActions: ["purgeTrash", "mergeDuplicates"],
    };
  });
}

function duplicateCases(): ToolRoutingCase[] {
  return Array.from({ length: 20 }, (_, index) => {
    if (index < 10) {
      return defineCase({
        id: caseId("duplicates", index),
        category: "duplicates",
        prompt: `Inspect duplicate Saves for review pass ${index + 1}.`,
        expectation: {
          kind: "tool",
          allowedTools: ["findDuplicates"],
          exampleArguments: {},
          requiredArguments: {},
        },
        forbiddenTools: ["runPondOperation", "openSave"],
        forbiddenActions: ["mergeDuplicates", "purgeTrash"],
      });
    }
    const suffix = String(index + 1).padStart(3, "0");
    const keepId = `demo-save-keep-${suffix}`;
    const removeId = `demo-save-copy-${suffix}`;
    const change = {
      saveId: "",
      field: "action",
      action: "mergeDuplicates",
      after: `Merge duplicate pair ${suffix}`,
      payload: { ids: [keepId, removeId], keepId },
    };
    return defineCase({
      id: caseId("duplicates", index),
      category: "duplicates",
      prompt: `Prepare a review to merge duplicate Saves ${keepId} and ${removeId}, keeping ${keepId}.`,
      expectation: {
        kind: "tool",
        allowedTools: ["proposeChanges"],
        exampleArguments: {
          changes: [{ ...change, reason: "Keep the requested original." }],
        },
        requiredArguments: { changes: [change] },
      },
      forbiddenTools: ["runPondOperation"],
      forbiddenActions: ["purgeTrash"],
    });
  });
}

function exportCases(): ToolRoutingCase[] {
  return Array.from({ length: 20 }, (_, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    const ids = [`demo-save-${suffix}`, `demo-save-${suffix}-b`];
    const action = index % 2 === 0 ? "exportFiles" : "exportCsv";
    const directory = `/tmp/pond-tool-benchmark/export-${suffix}`;
    const change = {
      saveId: "",
      field: "action",
      action,
      after: `Export Saves for fixture ${suffix}`,
      payload: { ids, directory },
    };
    return {
      id: caseId("export", index),
      category: "export",
      prompt: `Prepare a review to ${action === "exportCsv" ? "export CSV for" : "export files for"} Saves ${ids.join(" and ")} to ${directory}.`,
      expectation: {
        kind: "tool",
        allowedTools: ["proposeChanges"],
        exampleArguments: {
          changes: [
            { ...change, reason: "Export to the requested directory." },
          ],
        },
        requiredArguments: { changes: [change] },
      },
      forbiddenTools: ["runPondOperation", "openSave"],
      forbiddenActions: ["purgeTrash", "mergeDuplicates"],
    };
  });
}

const ambiguousPrompts = [
  "Organize these.",
  "Export that for me.",
  "Merge the duplicates.",
  "Open the useful one.",
  "Fix the tags.",
  "Move those into the folder.",
  "Read the important part.",
  "Find the version I liked.",
  "Clean this up.",
  "Rename it properly.",
  "Save the results somewhere.",
  "Use the better copy.",
  "Show me the relevant things.",
  "Archive the page I meant.",
  "Rate the best one.",
  "Export the final set.",
  "Search for the project.",
  "Read that transcript section.",
  "Put these with the references.",
  "Remove the copies I do not need.",
] as const;

function ambiguousCases(): ToolRoutingCase[] {
  return ambiguousPrompts.map((prompt, index) => ({
    id: caseId("ambiguous", index),
    category: "ambiguous",
    prompt,
    expectation: {
      kind: "clarification",
      allowedTools: ["requestQuestion"],
    },
    forbiddenTools: [
      "proposeChanges",
      "runPondOperation",
      "openSave",
      "findDuplicates",
    ],
    forbiddenActions: [
      "purgeTrash",
      "mergeDuplicates",
      "exportFiles",
      "exportCsv",
    ],
  }));
}

export const TOOL_CASES: readonly ToolRoutingCase[] = Object.freeze([
  ...searchCases(),
  ...readCases(),
  ...organizationCases(),
  ...duplicateCases(),
  ...exportCases(),
  ...ambiguousCases(),
]);
