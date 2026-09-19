import type { Command } from "commander";
import { registerAgentLibraryCommands } from "./commands/agent-library";
import { registerAutomationCommands } from "./commands/automation";
import { registerCoreCommands } from "./commands/core";
import { registerIntegrationCommands } from "./commands/integrations";
import { registerPipelineCommands } from "./commands/pipeline";
import { registerSaveCommands } from "./commands/saves";

export function registerCommands(program: Command, version: string): void {
  registerCoreCommands(program, version);
  registerSaveCommands(program);
  registerPipelineCommands(program);
  registerAutomationCommands(program);
  registerAgentLibraryCommands(program);
  registerIntegrationCommands(
    program,
    new URL("../skill/SKILL.md", import.meta.url),
  );
}
