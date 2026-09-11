import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import log from "electron-log/main.js";
import { z } from "zod";
import {
  ActionDefinitionSchema,
  type ActionQueryResults,
  ActionRequestSchema,
  ActionRunSchema,
} from "../../../shared/action-contracts";
import {
  ConversionApiRequestSchema,
  ConversionPresetSchema,
  type ConversionQueryResults,
} from "../../../shared/conversion-contracts";
import {
  type LibraryQueryPage,
  LibraryQueryRequestSchema,
} from "../../../shared/library-query";
import { getDb } from "../../db";
import { resolvePaths } from "../../paths";
import {
  conversionJobs,
  conversionPresets,
  saveConversionPreset,
} from "../conversion-jobs";
import {
  deleteAction,
  prepareAction,
  readActions,
  runAction,
  saveAction,
} from "../library-actions";
import { queryLibraryPage } from "../library-query";
import type { ToolResult } from "./complete";
import {
  applyFilter,
  applyFilterInput,
  grepLibrary,
  grepLibraryInput,
  listFoldersInput,
  listLibraryFolders,
  openSave,
  openSaveInput,
  readSave,
  readSaveInput,
  searchLibrary,
  searchLibraryInput,
} from "./tools";

function textResult(
  value:
    | ToolResult
    | LibraryQueryPage
    | ActionQueryResults[keyof ActionQueryResults]
    | ConversionQueryResults[keyof ConversionQueryResults]
    | undefined,
) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

export async function startPondMcp(): Promise<void> {
  log.transports.console.level = false;
  const server = new McpServer({
    name: "pond",
    version: "0.0.1",
  });

  server.registerTool(
    "query_library",
    {
      description:
        "Query exact scoped results with nested filters and keyword grammar, stable sorting, total count and cursor pagination. Use read_save to hydrate returned IDs. Pass nextCursor as cursor for the next page.",
      inputSchema: LibraryQueryRequestSchema,
      annotations: { readOnlyHint: true },
    },
    async (request) =>
      textResult(
        await queryLibraryPage(
          await getDb(),
          basename(resolvePaths().indexDb, ".db"),
          request,
        ),
      ),
  );
  server.registerTool(
    "search_library",
    {
      description:
        "Search saves in the local Pond library. Supports visual probes via saveId or a CLIP vector.",
      inputSchema: searchLibraryInput,
    },
    async (args) =>
      textResult(await searchLibrary(searchLibraryInput.parse(args))),
  );
  server.registerTool(
    "read_save",
    {
      description:
        "Read stored caption, OCR, transcript, notes, comments, and metadata for one save.",
      inputSchema: readSaveInput,
    },
    async (args) => textResult(await readSave(readSaveInput.parse(args))),
  );
  server.registerTool(
    "grep_library",
    {
      description:
        "Search inside captions, OCR, transcripts, notes, and titles.",
      inputSchema: grepLibraryInput,
    },
    async (args) => textResult(await grepLibrary(grepLibraryInput.parse(args))),
  );
  server.registerTool(
    "list_folders",
    {
      description: "List folders in the Pond library.",
      inputSchema: listFoldersInput,
    },
    async () => textResult(await listLibraryFolders()),
  );
  server.registerTool(
    "open_save",
    {
      description: "Focus Pond on a save.",
      inputSchema: openSaveInput,
    },
    async (args) => textResult(await openSave(openSaveInput.parse(args))),
  );
  server.registerTool(
    "apply_filter",
    {
      description: "Apply a structured filter to the Pond Library grid.",
      inputSchema: applyFilterInput,
    },
    async (args) => textResult(await applyFilter(applyFilterInput.parse(args))),
  );

  server.registerTool(
    "list_actions",
    {
      description:
        "List reusable deterministic actions stored in this Pond library.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => textResult(readActions()),
  );
  server.registerTool(
    "save_action",
    {
      description:
        "Create or update a reusable action definition. Does not modify saves.",
      inputSchema: z.object({ definition: ActionDefinitionSchema }),
    },
    async ({ definition }) => textResult(saveAction(definition)),
  );
  server.registerTool(
    "delete_action",
    {
      description:
        "Delete a reusable action definition. Does not modify saves.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => {
      deleteAction(id);
      return textResult({ ok: true });
    },
  );
  server.registerTool(
    "preview_action",
    {
      description:
        "Preview ordered changes to selected saves. Return this preview for user review before run_action. No saves are modified.",
      inputSchema: ActionRequestSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ definition, ids }) =>
      textResult(await prepareAction(definition, ids)),
  );
  server.registerTool(
    "run_action",
    {
      description:
        "Apply a reviewed action using the exact token from preview_action. Rejects a stale preview. The entire operation can be undone in Pond.",
      inputSchema: ActionRunSchema,
    },
    async ({ definition, ids, expectedToken }) =>
      textResult({ changed: await runAction(definition, ids, expectedToken) }),
  );

  server.registerTool(
    "list_conversion_presets",
    {
      description: "List portable image and video-to-GIF export presets.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => textResult(conversionPresets()),
  );
  server.registerTool(
    "save_conversion_preset",
    {
      description: "Save a reusable conversion preset in the current library.",
      inputSchema: z.object({ preset: ConversionPresetSchema }),
    },
    async ({ preset }) => textResult(saveConversionPreset(preset)),
  );
  server.registerTool(
    "start_conversion",
    {
      description:
        "Export converted copies of selected Save files to a chosen directory. Preserves originals and existing output files. Returns a job ID for progress and cancellation.",
      inputSchema: ConversionApiRequestSchema,
    },
    async (request) => textResult(conversionJobs.start(request)),
  );
  server.registerTool(
    "conversion_status",
    {
      description: "Read conversion progress, completed files and failures.",
      inputSchema: z.object({ id: z.string().min(1) }),
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => textResult(conversionJobs.status(id)),
  );
  server.registerTool(
    "cancel_conversion",
    {
      description:
        "Cancel a running conversion. Completed exports are retained.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => textResult(conversionJobs.cancel(id)),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
