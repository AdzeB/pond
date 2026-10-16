import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import log from "electron-log/main.js";
import { z } from "zod";
import {
  ConversionApiRequestSchema,
  ConversionPresetSchema,
  type ConversionQueryResults,
  ImageCompressionRequestSchema,
} from "../../../shared/conversion-contracts";
import {
  type LibraryQueryPage,
  LibraryQueryRequestSchema,
} from "../../../shared/library-query";
import { getDb } from "../../db";
import { resolvePaths } from "../../paths";
import { conversionCapabilities } from "../conversion-capabilities";
import {
  conversionJobs,
  conversionPresets,
  saveConversionPreset,
} from "../conversion-jobs";
import { queryLibraryPage } from "../library-query";
import type { ToolResult } from "./complete";
import {
  MCP_ACCESS_OFF,
  type McpAccessGroup,
  mcpToolAllowed,
} from "./mcp-access";
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
    | ConversionQueryResults[keyof ConversionQueryResults]
    | undefined,
) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

function withAccess<Args extends unknown[]>(
  group: McpAccessGroup,
  run: (
    ...args: Args
  ) => ReturnType<typeof textResult> | Promise<ReturnType<typeof textResult>>,
) {
  return async (...args: Args) => {
    if (!(await mcpToolAllowed(group))) {
      return textResult({ error: MCP_ACCESS_OFF[group] });
    }
    return run(...args);
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
    withAccess("search", async (request) =>
      textResult(
        await queryLibraryPage(
          await getDb(),
          basename(resolvePaths().indexDb, ".db"),
          request,
        ),
      ),
    ),
  );
  server.registerTool(
    "search_library",
    {
      description:
        "Search saves in the local Pond library. Supports media probes via saveId or a media embedding vector.",
      inputSchema: searchLibraryInput,
    },
    withAccess("search", async (args) =>
      textResult(await searchLibrary(searchLibraryInput.parse(args))),
    ),
  );
  server.registerTool(
    "read_save",
    {
      description:
        "Read stored caption, OCR, transcript, notes, and metadata for one save.",
      inputSchema: readSaveInput,
    },
    withAccess("search", async (args) =>
      textResult(await readSave(readSaveInput.parse(args))),
    ),
  );
  server.registerTool(
    "grep_library",
    {
      description:
        "Search inside captions, OCR, transcripts, notes, and titles.",
      inputSchema: grepLibraryInput,
    },
    withAccess("search", async (args) =>
      textResult(await grepLibrary(grepLibraryInput.parse(args))),
    ),
  );
  server.registerTool(
    "list_folders",
    {
      description: "List folders in the Pond library.",
      inputSchema: listFoldersInput,
    },
    withAccess("search", async () => textResult(await listLibraryFolders())),
  );
  server.registerTool(
    "open_save",
    {
      description: "Focus Pond on a save.",
      inputSchema: openSaveInput,
    },
    withAccess("open", async (args) =>
      textResult(await openSave(openSaveInput.parse(args))),
    ),
  );
  server.registerTool(
    "apply_filter",
    {
      description: "Apply a structured filter to the Pond Library grid.",
      inputSchema: applyFilterInput,
    },
    withAccess("open", async (args) =>
      textResult(await applyFilter(applyFilterInput.parse(args))),
    ),
  );

  server.registerTool(
    "list_conversion_capabilities",
    {
      description:
        "List image, animation, and video conversion formats available in this Pond build.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    withAccess("export", async () =>
      textResult(await conversionCapabilities()),
    ),
  );
  server.registerTool(
    "list_conversion_presets",
    {
      description: "List portable image and video-to-GIF export presets.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    withAccess("export", async () => textResult(conversionPresets())),
  );
  server.registerTool(
    "save_conversion_preset",
    {
      description: "Save a reusable conversion preset in the current library.",
      inputSchema: z.object({ preset: ConversionPresetSchema }),
    },
    withAccess("export", async ({ preset }) =>
      textResult(saveConversionPreset(preset)),
    ),
  );
  server.registerTool(
    "start_conversion",
    {
      description:
        "Export converted copies of selected Save files to a chosen directory. Preserves originals and existing output files. Returns a job ID for progress and cancellation.",
      inputSchema: ConversionApiRequestSchema,
    },
    withAccess("export", async (request) =>
      textResult(conversionJobs.start(request)),
    ),
  );
  server.registerTool(
    "compress_images",
    {
      description:
        "Compress selected existing image files in one recoverable batch. Replaces originals, regenerates metadata and derived images, and records Undo.",
      inputSchema: ImageCompressionRequestSchema,
    },
    withAccess("export", async (request) =>
      textResult(conversionJobs.startCompression(request)),
    ),
  );
  server.registerTool(
    "conversion_status",
    {
      description: "Read conversion progress, completed files and failures.",
      inputSchema: z.object({ id: z.string().min(1) }),
      annotations: { readOnlyHint: true },
    },
    withAccess("export", async ({ id }) =>
      textResult(conversionJobs.status(id)),
    ),
  );
  server.registerTool(
    "cancel_conversion",
    {
      description:
        "Cancel a running conversion. Completed exports are retained.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    withAccess("export", async ({ id }) =>
      textResult(conversionJobs.cancel(id)),
    ),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
