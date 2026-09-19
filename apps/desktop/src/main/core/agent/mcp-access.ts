import type { Prefs } from "@pond/schema";
import { getPrefs } from "../prefs";

export type McpAccessGroup = "search" | "open" | "actions" | "export";

export const MCP_ACCESS_OFF = {
  search: "Search Saves is off in Settings, Model Context Protocol.",
  open: "Open in Pond is off in Settings, Model Context Protocol.",
  actions: "Run Actions is off in Settings, Model Context Protocol.",
  export: "Export Files is off in Settings, Model Context Protocol.",
} satisfies Record<McpAccessGroup, string>;

export function mcpAccessAllowed(prefs: Prefs, group: McpAccessGroup): boolean {
  if (group === "search") return prefs.agent.mcpSearch;
  if (group === "open") return prefs.agent.mcpOpen;
  if (group === "actions") return prefs.agent.mcpActions;
  return prefs.agent.mcpExport;
}

export async function mcpToolAllowed(group: McpAccessGroup): Promise<boolean> {
  try {
    return mcpAccessAllowed(await getPrefs(), group);
  } catch {
    return true;
  }
}
