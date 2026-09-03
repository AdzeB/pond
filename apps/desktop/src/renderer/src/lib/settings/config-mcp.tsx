import { defineCustomSection, group } from "@/lib/settings/engine-types";

export const mcpSection = defineCustomSection({
  title: "MCP",
  description: "Copy a stdio snippet so Cursor can search this library.",
  keywords: ["mcp", "cursor", "stdio", "claude", "client"],
  groups: [
    group.plain({
      items: [
        {
          control: "custom",
          key: "cursor",
          title: "Cursor",
          keywords: ["cursor", "mcp.json", "stdio"],
          render: () => null,
        },
      ],
    }),
  ],
});
