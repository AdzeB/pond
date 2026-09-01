import { agentChats } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import {
  ASSISTANT_MODELS,
  type AssistantChunk,
  type AssistantMetadata,
  type AssistantSend,
  type AssistantSendResult,
  assistantQuestion,
} from "../../../shared/assistant";
import { IPC } from "../../../shared/constants";
import { getDb } from "../../db";
import { broadcast } from "../../lib/broadcast";
import { listFolders } from "../folders";
import { getPrefs } from "../prefs";
import { completeWithTools } from "./complete";
import { libraryContext } from "./context";
import { keyFor } from "./keys";
import { appendMessage, recentMessages } from "./persist";
import type { LibraryScope } from "./tools";

const active = new Map<
  string,
  { requestId: string; controller: AbortController }
>();

export function stopMessage(
  chatId: string,
  requestId: string,
): { ok: boolean } {
  const run = active.get(chatId);
  if (!run || run.requestId !== requestId) return { ok: false };
  run.controller.abort();
  return { ok: true };
}

export async function sendMessage(
  input: AssistantSend,
): Promise<AssistantSendResult> {
  const { chatId, requestId, content, provider } = input;
  if (active.has(chatId))
    return { chatId, error: "Wait for the current reply or stop it first." };
  if (provider === "minnow" && [...active.values()].length)
    return { chatId, error: "Wait for the current reply before using Minnow." };
  const controller = new AbortController();
  active.set(chatId, { requestId, controller });
  let lastActivity: AssistantChunk["activity"];
  const emit = (chunk: Omit<AssistantChunk, "chatId" | "requestId">) => {
    if (chunk.type === "activity") {
      if (chunk.activity === lastActivity) return;
      lastActivity = chunk.activity;
    }
    if (!controller.signal.aborted)
      broadcast(IPC.agentChunk, { chatId, requestId, ...chunk });
  };
  let accepted = false;
  let assembled = "";
  let context: ReturnType<typeof libraryContext> | undefined;
  try {
    const db = await getDb();
    if (
      !(await db
        .select()
        .from(agentChats)
        .where(eq(agentChats.id, chatId))
        .get())
    )
      throw new Error("This conversation no longer exists. Start a new chat.");
    const prefs = await getPrefs();
    const model = ASSISTANT_MODELS.find((entry) => entry.id === provider);
    if (!model) throw new Error("Choose a supported model.");
    const apiKey = provider === "minnow" ? null : await keyFor(provider);
    if (
      !model.local &&
      (!apiKey || prefs.agent.enabledKeys[provider] === false)
    )
      throw new Error(
        "Add an enabled provider key in Settings, or choose Minnow.",
      );
    if (!model.local && !prefs.agent.cloudAllowed && !input.allowCloudOnce)
      return { chatId, needsCloud: true };
    const scope: LibraryScope =
      input.scope.kind === "attachments"
        ? { saveIds: input.attachmentIds }
        : input.scope.kind === "folder"
          ? { folderId: input.scope.id }
          : {};
    if (input.scope.kind === "attachments" && !input.attachmentIds.length)
      throw new Error("Attach a Save or change the scope to Library.");
    const folders = input.scope.kind === "folder" ? await listFolders() : [];
    const folder =
      input.scope.kind === "folder"
        ? folders.find((f) => f.id === scope.folderId)
        : undefined;
    if (input.scope.kind === "folder" && !folder)
      throw new Error("This folder no longer exists. Choose another scope.");
    const scopeLabel =
      folder?.name ??
      (input.scope.kind === "attachments" ? "Attached Saves" : "Library");
    context = libraryContext({
      scope,
      signal: controller.signal,
      onActivity: (activity) => emit({ type: "activity", activity }),
      onSources: (sources) => emit({ type: "sources", sources }),
      onResults: (results) => emit({ type: "results", results }),
      onSteps: (steps) => emit({ type: "steps", steps }),
    });
    const previous = await recentMessages(chatId, 11);
    const pendingQuestion = previous.at(-1);
    if (
      input.replyToQuestion &&
      (pendingQuestion?.id !== input.replyToQuestion ||
        !pendingQuestion.metadata?.question)
    )
      throw new Error(
        "This question is no longer awaiting a reply. Send a new message instead.",
      );
    const reader = context.tools.find((tool) => tool.name === "readSave");
    const inherited = assistantQuestion.safeParse(
      pendingQuestion?.metadata?.question,
    ).success
      ? ((pendingQuestion?.metadata?.sources as { id: string }[] | undefined) ??
        [])
      : [];
    const attachmentIds = [
      ...new Set([...input.attachmentIds, ...inherited.map((save) => save.id)]),
    ];
    const attachmentResults = await Promise.all(
      attachmentIds.map(
        async (id) => (await reader?.execute({ id })) as { error?: string },
      ),
    );
    for (const result of attachmentResults) {
      if (result?.error)
        throw new Error(
          "An attachment is unavailable in this scope. Remove it or change the scope.",
        );
    }
    controller.signal.throwIfAborted();
    const attachments = context.sources();
    const userMetadata: AssistantMetadata = {
      attachments: attachments.filter((save) =>
        input.attachmentIds.includes(save.id),
      ),
      scope: input.scope,
      scopeLabel,
      replyToQuestion:
        input.replyToQuestion ??
        (pendingQuestion?.metadata?.question ? pendingQuestion.id : undefined),
    };
    await appendMessage({
      chatId,
      role: "user",
      content,
      metadata: userMetadata,
    });
    accepted = true;
    const custom =
      provider === "ollama"
        ? {
            baseUrl: prefs.agent.ollamaBaseUrl,
            modelId: prefs.agent.ollamaModelId,
          }
        : provider === "lmstudio"
          ? {
              baseUrl: prefs.agent.lmstudioBaseUrl,
              modelId: prefs.agent.lmstudioModelId,
            }
          : provider === "compatible"
            ? {
                baseUrl: prefs.agent.compatibleBaseUrl,
                modelId: prefs.agent.compatibleModelId,
              }
            : undefined;
    const history = [
      ...previous,
      { role: "user", content, metadata: userMetadata },
    ];
    emit({ type: "activity", activity: "thinking" });
    await completeWithTools({
      provider,
      model: custom?.modelId.trim() || model.model,
      apiKey,
      baseUrl: custom?.baseUrl || undefined,
      messages: history.map((row) => {
        const question = assistantQuestion.safeParse(row.metadata?.question);
        return {
          role: row.role as "user" | "assistant",
          content: question.success
            ? `${row.content}\n${question.data.question}\n${question.data.options.join("; ")}`
            : row.content,
        };
      }),
      context: `Library scope: ${scopeLabel}.`,
      attachments,
      retrieveLibrary: context.retrieve,
      onActivity: (activity) => emit({ type: "activity", activity }),
      tools: context.tools,
      abortController: controller,
      onText: (text) => {
        controller.signal.throwIfAborted();
        assembled += text;
        emit({ type: "text", text });
      },
    });
    controller.signal.throwIfAborted();
    if (
      !assembled.trim() &&
      !context.changes().length &&
      !context.question() &&
      !context.results().length
    )
      throw new Error(
        "The model returned no reply. Try again or choose another model.",
      );
    await appendMessage({
      chatId,
      role: "assistant",
      content: assembled,
      metadata: {
        sources: context.sources(),
        changes: context.changes(),
        question: context.question(),
        results: context.results(),
        steps: context.steps(),
      },
    });
    emit({ type: "done" });
    return { chatId, accepted };
  } catch (err) {
    const stopped = controller.signal.aborted;
    const error = stopped
      ? undefined
      : err instanceof Error
        ? err.message
        : "Could not reply. Try again.";
    if (accepted)
      await appendMessage({
        chatId,
        role: "assistant",
        content: assembled,
        metadata: {
          sources: context?.sources(),
          changes: context?.changes(),
          results: context?.results(),
          steps: context?.steps(),
          stopped,
          error,
        },
      });
    broadcast(IPC.agentChunk, {
      chatId,
      requestId,
      type: stopped ? "stopped" : "error",
      error,
    });
    return { chatId, accepted, stopped, error };
  } finally {
    active.delete(chatId);
  }
}
