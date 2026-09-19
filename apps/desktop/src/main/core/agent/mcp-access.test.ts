import { DEFAULT_PREFS } from "@pond/schema";
import { describe, expect, it } from "vitest";
import { mcpAccessAllowed } from "./mcp-access";

describe("mcp access", () => {
  it("defaults to on", () => {
    expect(mcpAccessAllowed(DEFAULT_PREFS, "search")).toBe(true);
    expect(mcpAccessAllowed(DEFAULT_PREFS, "export")).toBe(true);
  });

  it("turns a group off from prefs", () => {
    const prefs = {
      ...DEFAULT_PREFS,
      agent: { ...DEFAULT_PREFS.agent, mcpSearch: false },
    };
    expect(mcpAccessAllowed(prefs, "search")).toBe(false);
    expect(mcpAccessAllowed(prefs, "open")).toBe(true);
  });
});
