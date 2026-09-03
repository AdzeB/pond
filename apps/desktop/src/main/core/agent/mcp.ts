import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import log from "electron-log/main.js";
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

function textResult(value: unknown) {
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
