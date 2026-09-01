import { z } from "zod";
import type {
  AssistantActivity,
  AssistantChange,
  AssistantResultSet,
  AssistantSource,
  AssistantToolStep,
} from "../../../shared/assistant";
import {
  type AssistantQuestion,
  assistantProposalInput,
  assistantQuestion,
  assistantResultSet,
} from "../../../shared/assistant";
import { folderIdsForSave, listFolders } from "../folders";
import { normalizeTagList } from "../tags";
import type { ToolSpec } from "./complete";
import { boundedSource } from "./output";
import { trackTools } from "./tool-steps";
import {
  type LibraryScope,
  readSave,
  readSaveInput,
  searchLibrary,
  searchLibraryInput,
} from "./tools";

export function libraryContext(input: {
  scope: LibraryScope;
  signal: AbortSignal;
  onActivity: (activity: AssistantActivity) => void;
  onSources: (sources: AssistantSource[]) => void;
  onResults?: (results: AssistantResultSet[]) => void;
  onSteps?: (steps: AssistantToolStep[]) => void;
}) {
  const sources = new Map<string, AssistantSource>();
  const changes = new Map<string, AssistantChange>();
  let question: AssistantQuestion | undefined;
  let results: AssistantResultSet[] = [];
  const forModel = (save: AssistantSource) =>
    boundedSource(save, [...sources.keys()].indexOf(save.id) + 1);
  function collect(rows: AssistantSource[]) {
    input.signal.throwIfAborted();
    let changed = false;
    for (const row of rows) {
      if (sources.size >= 24 && !sources.has(row.id)) continue;
      const current = sources.get(row.id);
      if (current && JSON.stringify(current) === JSON.stringify(row)) continue;
      sources.set(row.id, row);
      changed = true;
    }
    if (changed) input.onSources([...sources.values()]);
  }
  function showResult(
    result: AssistantResultSet,
  ): "added" | "duplicate" | "limit" {
    const saveIds = [...new Set(result.saveIds)];
    if (
      results.some((current) => current.saveIds.join(",") === saveIds.join(","))
    )
      return "duplicate";
    if (results.length >= 4) return "limit";
    results = [...results, { ...result, saveIds }];
    input.onResults?.(results);
    return "added";
  }
  async function retrieve(args: z.infer<typeof searchLibraryInput>) {
    input.signal.throwIfAborted();
    input.onActivity("searching");
    const result = await searchLibrary(args, input.scope);
    collect(result.saves);
    return result.saves;
  }
  const tools: ToolSpec[] = [
    {
      name: "showSaves",
      description:
        "Display an inline collection of Saves already found with searchLibrary or readSave. Use this for lookup results; do not repeat the Save list in prose. Only known Save IDs are accepted.",
      schema: assistantResultSet,
      execute: async (args) => {
        input.signal.throwIfAborted();
        const parsed = assistantResultSet.parse(args);
        const saveIds = [...new Set(parsed.saveIds)];
        if (saveIds.some((id) => !sources.has(id)))
          throw new Error("Only Saves read in this conversation can be shown.");
        const outcome = showResult({ ...parsed, saveIds });
        if (outcome === "limit")
          throw new Error("Up to four result groups can be shown per reply.");
        return {
          shown: saveIds.length,
          message:
            "These Saves are shown inline. Do not repeat their titles in prose.",
        };
      },
    },
    {
      name: "requestQuestion",
      description:
        "Ask one necessary clarifying question with 2 to 4 distinct options. The user can also write their own answer. Do not repeat the question in prose.",
      schema: assistantQuestion,
      execute: async (args) => {
        input.signal.throwIfAborted();
        if (question) return { requested: true };
        question = assistantQuestion.parse(args);
        question.options = [...new Set(question.options)];
        question = assistantQuestion.parse(question);
        return {
          requested: true,
          message: "The question is shown to the user. Wait for their answer.",
        };
      },
    },
    {
      name: "searchLibrary",
      description:
        "Search saved titles, descriptions, authors, tags, captions, OCR, transcripts, notes, and URLs within the user's selected scope. Use media as a filter rather than adding words such as pictures or videos to query. Omit query to list recent Saves.",
      schema: searchLibraryInput,
      execute: async (args) => {
        const parsed = searchLibraryInput.parse(args);
        const saves = await retrieve(parsed);
        const saveIds = saves
          .filter((save) => sources.has(save.id))
          .map((save) => save.id);
        if (saveIds.length)
          showResult({
            title: parsed.query?.trim()
              ? `Results for “${parsed.query.trim()}”`.slice(0, 120)
              : "Recent Saves",
            saveIds,
          });
        return {
          saves: saves.filter((save) => sources.has(save.id)).map(forModel),
        };
      },
    },
    {
      name: "readSave",
      description:
        "Read a Save's stored description, notes, and tags. This is metadata, not the full original document.",
      schema: readSaveInput,
      execute: async (args) => {
        input.signal.throwIfAborted();
        input.onActivity("reading");
        const result = await readSave(readSaveInput.parse(args), input.scope);
        if (result.save) collect([result.save]);
        return result.save
          ? {
              save: {
                ...forModel(result.save),
                tags: result.save.tags,
                folderIds: await folderIdsForSave(result.save.id),
              },
            }
          : result;
      },
    },
    {
      name: "listFolders",
      description:
        "List existing folder IDs and names when preparing folder suggestions.",
      schema: z.object({}),
      execute: async () => {
        input.signal.throwIfAborted();
        return (await listFolders()).map(({ id, name }) => ({ id, name }));
      },
    },
    {
      name: "proposeChanges",
      description:
        "Prepare title, tag, or folder changes for explicit user review. Never applies changes. Only propose edits when the user asks to organize or edit. Use existing folder IDs; tags and folders replace the current list, so preserve entries the user has not asked to remove.",
      schema: assistantProposalInput,
      execute: async (args) => {
        input.signal.throwIfAborted();
        input.onActivity("preparing");
        const proposals = assistantProposalInput.parse(args).changes;
        const saveIds = [
          ...new Set(proposals.map((proposal) => proposal.saveId)),
        ];
        const [folderRows, loaded] = await Promise.all([
          listFolders(),
          Promise.all(
            saveIds.map(
              async (id) => [id, await readSave({ id }, input.scope)] as const,
            ),
          ),
        ]);
        const folders = new Set(folderRows.map((folder) => folder.id));
        const savesById = new Map(loaded);
        const folderSaveIds = [
          ...new Set(
            proposals
              .filter((proposal) => proposal.field === "folders")
              .map((proposal) => proposal.saveId),
          ),
        ];
        const currentFolders = new Map(
          await Promise.all(
            folderSaveIds.map(
              async (id) => [id, await folderIdsForSave(id)] as const,
            ),
          ),
        );
        const accepted: AssistantChange[] = [];
        for (const proposal of proposals) {
          input.signal.throwIfAborted();
          const result = savesById.get(proposal.saveId);
          if (!result?.save || !sources.has(proposal.saveId)) continue;
          const base = {
            id: `${proposal.saveId}:${proposal.field}`,
            saveId: proposal.saveId,
            title: result.save.title || "Untitled",
            reason: proposal.reason,
            status: "pending" as const,
          };
          let change: AssistantChange;
          if (proposal.field === "title") {
            change = {
              ...base,
              field: "title",
              before: result.save.title,
              after: proposal.after,
            };
          } else {
            const after =
              proposal.field === "tags"
                ? normalizeTagList(proposal.after)
                : [...new Set(proposal.after)];
            if (
              proposal.field === "folders" &&
              after.some((id) => !folders.has(id))
            )
              continue;
            change = {
              ...base,
              field: proposal.field,
              before:
                proposal.field === "tags"
                  ? result.save.tags
                  : (currentFolders.get(proposal.saveId) ?? []),
              after,
            };
          }
          if (JSON.stringify(change.before) === JSON.stringify(change.after))
            continue;
          if (changes.size >= 24 && !changes.has(change.id)) continue;
          changes.set(change.id, change);
          accepted.push(change);
        }
        return {
          proposed: accepted.length,
          message:
            "These changes are pending user review. Nothing has been applied.",
        };
      },
    },
  ];
  return {
    ...trackTools(tools, input.signal, input.onSteps),
    retrieve,
    results: () => results,
    sources: () => [...sources.values()],
    changes: () => [...changes.values()],
    question: () => question,
  };
}
