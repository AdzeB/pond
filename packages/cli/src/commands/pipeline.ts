import type { Command } from "commander";
import { operationCommand } from "./shared";

export function registerPipelineCommands(program: Command): void {
  const folders = program.command("folders");
  operationCommand(program, folders, "list", "folders.list", "List folders");
  operationCommand(
    program,
    folders,
    "create",
    "folders.create",
    "Create a folder",
  );
  operationCommand(
    program,
    folders,
    "rename",
    "folders.rename",
    "Rename a folder",
  );
  operationCommand(program, folders, "move", "folders.move", "Move a folder");
  operationCommand(
    program,
    folders,
    "delete",
    "folders.delete",
    "Delete a folder",
  );

  const tags = program.command("tags");
  operationCommand(program, tags, "list", "tags.list", "List tags");
  operationCommand(program, tags, "create", "tags.create", "Create a tag");
  operationCommand(program, tags, "rename", "tags.rename", "Rename a tag");
  operationCommand(program, tags, "merge", "tags.merge", "Merge tags");
  operationCommand(program, tags, "delete", "tags.delete", "Delete a tag");

  const sources = program.command("sources");
  operationCommand(
    program,
    sources,
    "list",
    "watches.list",
    "List watched sources",
  );
  operationCommand(
    program,
    sources,
    "accounts",
    "accounts.list",
    "List source accounts",
  );
  operationCommand(
    program,
    sources,
    "connect",
    "sources.connect",
    "Connect a source",
    "source",
  );
  operationCommand(
    program,
    sources,
    "disconnect",
    "accounts.disconnect",
    "Disconnect a source account",
    "accountId",
  );

  const sync = program.command("sync");
  operationCommand(
    program,
    sync,
    "start",
    "sync.runNow",
    "Start source sync",
    "accountId",
  );
  operationCommand(
    program,
    sync,
    "status",
    "sync.status",
    "Read source sync status",
    "accountId",
  );
  operationCommand(
    program,
    sync,
    "cancel",
    "sync.cancel",
    "Cancel source sync",
    "accountId",
  );
  operationCommand(
    program,
    sync,
    "history",
    "sync.history",
    "Read sync history",
  );

  const downloads = program.command("downloads");
  operationCommand(
    program,
    downloads,
    "list",
    "downloads.history",
    "List downloads",
  );
  operationCommand(
    program,
    downloads,
    "status",
    "pipeline.status",
    "Read download status",
  );
  operationCommand(
    program,
    downloads,
    "cancel",
    "pipeline.cancelSave",
    "Cancel a download",
  );

  const conversions = program.command("conversions");
  operationCommand(
    program,
    conversions,
    "start",
    "conversion.start",
    "Start a conversion",
  );
  operationCommand(
    program,
    conversions,
    "status",
    "conversion.status",
    "Read conversion status",
  );
  operationCommand(
    program,
    conversions,
    "cancel",
    "conversion.cancel",
    "Cancel a conversion",
  );
}
