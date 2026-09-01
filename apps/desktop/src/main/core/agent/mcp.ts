import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import log from "electron-log/main.js";
import {
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
      description: "Search saves in the local Pond library.",
      inputSchema: searchLibraryInput,
    },
    async (args) =>
      textResult(await searchLibrary(searchLibraryInput.parse(args))),
  );
  server.registerTool(
    "read_save",
    {
      description: "Read one save by id.",
      inputSchema: readSaveInput,
    },
    async (args) => textResult(await readSave(readSaveInput.parse(args))),
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
