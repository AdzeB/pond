import type { Command } from "commander";
import { parseArguments, runOperation } from "../operations";
import {
  action,
  commandContext,
  OperationOptionsSchema,
  operationCommand,
  StringSchema,
} from "./shared";

export function registerAgentLibraryCommands(program: Command): void {
  const agent = program.command("agent");
  operationCommand(program, agent, "ask", "agent.send", "Ask the Assistant");
  const chats = agent.command("chats");
  operationCommand(
    program,
    chats,
    "list",
    "agent.chats",
    "List Assistant chats",
  );
  operationCommand(
    program,
    chats,
    "export",
    "agent.exportChat",
    "Export an Assistant chat",
  );

  const library = program.command("library");
  operationCommand(
    program,
    library,
    "verify",
    "library.verifyIntegrity",
    "Verify the Library",
  );
  operationCommand(
    program,
    library,
    "reindex",
    "library.rescan",
    "Reindex the Library",
  );
  operationCommand(
    program,
    library,
    "backup",
    "library.backupTo",
    "Back up the Library",
  );
  operationCommand(
    program,
    library,
    "restore",
    "library.restoreBackup",
    "Restore a Library backup",
  );
  operationCommand(
    program,
    library,
    "migrate",
    "library.mergeFrom",
    "Migrate Library data",
  );

  const trash = program.command("trash");
  operationCommand(program, trash, "empty", "saves.emptyTrash", "Empty Trash");

  action(program, program.command("schema"), async () => {
    const { api } = await commandContext(program);
    return { version: "1", operations: await api.operations() };
  });

  const operations = program.command("operations");
  action(program, operations.command("list"), async () => {
    const { api } = await commandContext(program);
    return api.operations();
  });
  action(
    program,
    operations.command("get").argument("<name>"),
    async (name) => {
      const { api } = await commandContext(program);
      const operationName = StringSchema.parse(name);
      return (
        (await api.operations()).find(
          (entry) => entry.name === operationName,
        ) ?? null
      );
    },
  );
  action(
    program,
    operations
      .command("run")
      .argument("<name>")
      .option("--args <json>")
      .option("--dry-run")
      .option("--yes"),
    async (name, options) => {
      const { api } = await commandContext(program);
      const operationName = StringSchema.parse(name);
      const flags = OperationOptionsSchema.parse(options);
      return runOperation(
        api,
        operationName,
        parseArguments(flags.args),
        flags,
      );
    },
  );
}
