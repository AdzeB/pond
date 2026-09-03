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
import { keyFor, parseProvider } from "./keys";
import { appendMessage, recentMessages } from "./persist";
import { connectionFor } from "./provider-models";
import type { LibraryScope } from "./tools";
import { imagesForSaves, visionEnabled } from "./vision";

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
    const agentProvider = parseProvider(provider);
    if (!model || !agentProvider) throw new Error("Choose a supported model.");
    const apiKey = await keyFor(agentProvider);
    if (model.needsKey) {
      if (!apiKey || prefs.agent.enabledKeys[provider] === false)
        throw new Error("Add an enabled provider key in Settings.");
    } else if (prefs.agent.enabledKeys[provider] !== true) {
      throw new Error("Add an enabled provider key in Settings.");
    }
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
    const previous = await recentMessages(chatId, 23);
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
    const history = [
      ...previous,
      { role: "user", content, metadata: userMetadata },
    ];
    const overlay = [
      input.semanticQuery ? `Semantic: ${input.semanticQuery}.` : "",
      input.visualSaveId ? `Visual Match Save: ${input.visualSaveId}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const images = visionEnabled(provider, prefs.agent.visionModel)
      ? await imagesForSaves(attachmentIds)
      : [];
    const visionProvider = parseProvider(prefs.agent.visionModel || provider);
    const chatProvider =
      images.length > 0 &&
      visionProvider &&
      visionEnabled(visionProvider, visionProvider)
        ? visionProvider
        : agentProvider;
    const chatModel =
      ASSISTANT_MODELS.find((entry) => entry.id === chatProvider) ?? model;
    const chatKey =
      chatProvider === agentProvider ? apiKey : await keyFor(chatProvider);
    if (
      chatProvider !== agentProvider &&
      chatModel.needsKey &&
      (!chatKey || prefs.agent.enabledKeys[chatProvider] === false)
    )
      throw new Error("Add an enabled vision model key in Settings.");
    const connection = connectionFor(
      chatProvider,
      prefs.agent,
      chatModel.model,
    );
    emit({ type: "activity", activity: "thinking" });
    await completeWithTools({
      provider: chatProvider,
      model: connection.modelId,
      apiKey: chatKey,
      baseUrl: connection.baseUrl,
      messages: history.map((row) => {
        const question = assistantQuestion.safeParse(row.metadata?.question);
        return {
          role: row.role as "user" | "assistant",
          content: question.success
            ? `${row.content}\n${question.data.question}\n${question.data.options.join("; ")}`
            : row.content,
        };
      }),
      context:
        `Library scope: ${scopeLabel}. ${overlay} Pond Agent is Cursor for this Library.`.trim(),
      attachments,
      images,
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
