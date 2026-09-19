import { describe, expect, it } from "vitest";
import { hostSetupCommands, pondLaunchLine } from "../../../shared/mcp-hosts";
import { mcpInstallUrl, pondMcpSnippet } from "./mcp-hosts";

describe("mcp hosts", () => {
  it("builds Claude Code setup commands from the Pond launch", () => {
    const commands = hostSetupCommands(
      "claude-code",
      "/Applications/Pond.app/Contents/MacOS/Pond",
      ["--mcp"],
    );
    expect(commands[0]?.value).toBe(
      "claude mcp add --scope user pond -- /Applications/Pond.app/Contents/MacOS/Pond --mcp",
    );
    expect(commands[1]?.value).toBe("claude mcp get pond");
  });

  it("quotes launch paths that contain spaces", () => {
    expect(
      pondLaunchLine("/Users/Raphael Salaja/Pond.app/Contents/MacOS/Pond", [
        "--mcp",
      ]),
    ).toBe('"/Users/Raphael Salaja/Pond.app/Contents/MacOS/Pond" --mcp');
  });

  it("builds a Cursor install URL from the Pond command", () => {
    const url = mcpInstallUrl("cursor", "/bin/pond", ["--mcp"]);
    expect(url).toContain("name=pond");
    expect(mcpInstallUrl("claude-code", "/bin/pond", ["--mcp"])).toBeNull();
  });

  it("serializes the Pond stdio snippet", () => {
    expect(pondMcpSnippet("/bin/pond", ["--mcp"]).json).toContain("--mcp");
  });
});
