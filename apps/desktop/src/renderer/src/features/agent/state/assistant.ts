import type {
  AssistantActivity,
  AssistantFileAttachment,
  AssistantMessage,
  AssistantProvider,
  AssistantResultSet,
  AssistantSend,
  AssistantSource,
  AssistantToolStep,
} from "@shared/assistant";
import { assistantMessages, assistantSources } from "@shared/assistant";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { z } from "zod";
import { folders, getOverlays } from "@/features/library";
import { stopAssistant } from "./assistant-runtime";
import { hydratePondChat, pondChatSession } from "./pond-chat";

const ChatsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string().nullable(),
    updatedAt: z.coerce.date().optional(),
  }),
);
const ChatSchema = z.object({ id: z.string() });

interface DraftSnapshot {
  content: string;
  attachments: AssistantSource[];
  files: AssistantFileAttachment[];
  provider: AssistantProvider;
  modelId?: AssistantSend["modelId"];
  controls?: AssistantSend["controls"];
  context: Pick<
    AssistantSend,
    "scope" | "attachmentIds" | "semanticQuery" | "visualSaveId"
  >;
  replyToQuestion?: string;
  keepDraft?: boolean;
}
export interface AssistantState {
  chatId: string | null;
  chats: z.infer<typeof ChatsSchema>;
  referenceMessageId: string | null;
  messages: AssistantMessage[];
  draft: string;
  attachments: AssistantSource[];
  files: AssistantFileAttachment[];
  busy: boolean;
  loading: boolean;
  requestId: string | null;
  sources: AssistantSource[];
  activity: AssistantActivity;
  results: AssistantResultSet[];
  steps: AssistantToolStep[];
  error: string | null;
  failed: DraftSnapshot | null;
}
type AssistantWorkspace = Omit<AssistantState, "busy"> & {
  sending: boolean;
};
const store = new Store<AssistantWorkspace>({
  chatId: null,
  chats: [],
  referenceMessageId: null,
  messages: [],
  draft: "",
  attachments: [],
  files: [],
  sending: false,
  loading: false,
  requestId: null,
  sources: [],
  activity: "thinking",
  results: [],
  steps: [],
  error: null,
  failed: null,
});
const patch = (value: Partial<AssistantWorkspace>) =>
  store.setState((state) => ({ ...state, ...value }));
let subscribers = 0;
let historyVersion = 0;
let cancelledRequest: string | null = null;
const isBusy = () => store.state.sending;
const currentMessages = () => store.state.messages;

function setMessages(messages: AssistantMessage[]) {
  patch({ messages });
}

async function refreshChats() {
  patch({
    chats: ChatsSchema.parse(await window.pond.query("agent.chats", {})),
  });
}
async function loadMessages(chatId: string) {
  return assistantMessages.parse(
    await window.pond.query("agent.messages", { chatId }),
  );
}
async function refreshMessages(chatId: string, version = historyVersion) {
  const messages = await loadMessages(chatId);
  if (store.state.chatId === chatId && version === historyVersion) {
    setMessages(messages);
    if (!store.state.sending) hydratePondChat(chatId, messages);
  }
}

type ComposerSnapshot = Pick<
  AssistantWorkspace,
  "draft" | "attachments" | "files" | "failed" | "error"
>;
const composers = new Map<string | null, ComposerSnapshot>();

function saveComposer() {
  const { chatId, draft, attachments, files, failed, error } = store.state;
  composers.set(chatId, { draft, attachments, files, failed, error });
}

function composerFor(chatId: string | null): ComposerSnapshot {
  return (
    composers.get(chatId) ?? {
      draft: "",
      attachments: [],
      files: [],
      failed: null,
      error: null,
    }
  );
}

function snapshotContext(
  attachments: AssistantSource[],
): DraftSnapshot["context"] {
  return {
    scope: { kind: "library" },
    attachmentIds: attachments.map((save) => save.id),
    ...getOverlays(),
  };
}

function restoreDraft(sent: DraftSnapshot) {
  if (
    !sent.keepDraft &&
    !store.state.draft &&
    !store.state.attachments.length &&
    !store.state.files.length
  )
    patch({
      draft: sent.content,
      attachments: sent.attachments,
      files: sent.files,
    });
}

export const assistant = {
  showReferences(messageId: string) {
    const message = currentMessages().find(
      (message) => message.id === messageId && message.role === "assistant",
    );
    if (message?.metadata?.sources?.length)
      patch({ referenceMessageId: messageId });
  },
  closeReferences() {
    patch({ referenceMessageId: null });
  },
  setDraft(draft: string) {
    patch({ draft });
  },
  appendDraft(content: string) {
    const draft = [store.state.draft, content].filter(Boolean).join("\n\n");
    if (draft.length > 32000) {
      patch({
        error: "This text is too long to add. Shorten the message first.",
      });
      return false;
    }
    patch({ draft });
    return true;
  },
  quote(content: string) {
    const quote = content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const draft = `${[store.state.draft, quote].filter(Boolean).join("\n\n")}\n\n`;
    if (draft.length > 32000) {
      patch({
        error:
          "This quote is too long for the message. Copy a shorter passage instead.",
      });
      return false;
    }
    patch({ draft });
    return true;
  },
  clearError() {
    patch({ error: null });
  },
  attach(saves: AssistantSource[]) {
    const merged = [
      ...new Map(
        [...store.state.attachments, ...saves].map((save) => [save.id, save]),
      ).values(),
    ];
    patch({
      attachments: merged.slice(0, 200),
      error:
        merged.length > 200
          ? "You can attach up to 200 Saves per message."
          : null,
    });
  },
  removeAttachment(id: string) {
    patch({
      attachments: store.state.attachments.filter((save) => save.id !== id),
    });
  },
  attachFiles(files: AssistantFileAttachment[]) {
    const merged = [
      ...new Map(
        [...store.state.files, ...files].map((file) => [file.id, file]),
      ).values(),
    ];
    patch({
      files: merged.slice(0, 10),
      error:
        merged.length > 10
          ? "You can attach up to 10 files per message."
          : null,
    });
  },
  removeFile(id: string) {
    patch({ files: store.state.files.filter((file) => file.id !== id) });
  },
  async attachIds(ids: string[]) {
    try {
      assistant.attach(
        assistantSources.parse(
          await window.pond.query("agent.attachments", {
            ids: ids.slice(0, 200),
          }),
        ),
      );
    } catch {
      patch({ error: "Could not load these Saves. Try again." });
    }
  },
  newChat() {
    if (isBusy()) return;
    saveComposer();
    historyVersion++;
    patch({
      chatId: null,
      messages: [],
      referenceMessageId: null,
      ...composerFor(null),
      sources: [],
      results: [],
      steps: [],
      loading: false,
    });
  },
  async renameChat(chatId: string, title: string) {
    if (isBusy()) throw new Error("Wait for the reply to finish.");
    const result = await window.pond.query("agent.renameChat", {
      chatId,
      title,
    });
    if (!result.ok)
      throw new Error(result.error || "Could not rename this chat.");
    await refreshChats();
  },
  async deleteChat(chatId: string) {
    if (isBusy()) throw new Error("Wait for the reply to finish.");
    const result = await window.pond.query("agent.deleteChat", { chatId });
    if (!result.ok)
      throw new Error(result.error || "Could not delete this chat.");
    if (store.state.chatId === chatId) assistant.newChat();
    composers.delete(chatId);
    await refreshChats();
  },
  async openChat(chatId: string) {
    if (isBusy()) return;
    saveComposer();
    const version = ++historyVersion;
    patch({ loading: true });
    try {
      const messages = await loadMessages(chatId);
      if (version !== historyVersion) return;
      hydratePondChat(chatId, messages);
      patch({
        chatId,
        messages,
        ...composerFor(chatId),
        referenceMessageId: null,
        sources: [],
        results: [],
        steps: [],
        loading: false,
      });
    } catch {
      if (version === historyVersion)
        patch({
          error: "Could not load this conversation. Try again.",
          loading: false,
        });
    }
  },
  async send(
    provider: AssistantProvider,
    run?: Pick<AssistantSend, "modelId" | "controls">,
    snapshot?: DraftSnapshot,
  ) {
    if (isBusy() || store.state.loading) return;
    const sent = snapshot ?? {
      content: store.state.draft.trim(),
      attachments: store.state.attachments,
      files: store.state.files,
      context: snapshotContext(store.state.attachments),
      provider,
      modelId: run?.modelId,
      controls: run?.controls,
    };
    if (!sent.content) return;
    const requestId = crypto.randomUUID();
    patch({
      sending: true,
      error: null,
      failed: null,
      sources: [],
      activity: "thinking",
      results: [],
      steps: [],
      requestId,
    });
    if (
      !snapshot ||
      (!snapshot.keepDraft &&
        store.state.draft === sent.content &&
        store.state.attachments === sent.attachments &&
        store.state.files === sent.files)
    )
      patch({
        draft: "",
        attachments: [],
        files: [],
      });
    let chatId = store.state.chatId;
    try {
      if (!chatId) {
        const chat = ChatSchema.parse(
          await window.pond.query("agent.newChat", {}),
        );
        chatId = chat.id;
        composers.delete(null);
        patch({ chatId });
      }
      if (!chatId || cancelledRequest === requestId) {
        if (cancelledRequest === requestId) restoreDraft(sent);
        return;
      }
      const threadId = chatId;
      const message: AssistantMessage = {
        id: requestId,
        chatId: threadId,
        role: "user",
        content: sent.content,
        metadata: {
          attachments: sent.attachments,
          files: sent.files,
          replyToQuestion: sent.replyToQuestion,
        },
      };
      const session = pondChatSession(threadId);
      await session.sendMessage(
        {
          text: message.content,
          metadata: message.metadata,
        },
        {
          body: {
            requestId,
            provider: sent.provider,
            modelId: sent.modelId,
            controls: sent.controls,
            attachmentIds: sent.context.attachmentIds,
            fileAttachmentIds: sent.files.map((file) => file.id),
            scope: sent.context.scope,
            semanticQuery: sent.context.semanticQuery,
            visualSaveId: sent.context.visualSaveId,
            replyToQuestion: sent.replyToQuestion,
          },
        },
      );
      if (session.error) throw session.error;
      patch({ error: null });
    } catch (error) {
      if (cancelledRequest !== requestId) {
        restoreDraft(sent);
        patch({
          error:
            error instanceof Error
              ? error.message
              : "Could not finish the request. Check the conversation before trying again.",
          failed: sent,
        });
      }
    } finally {
      if (cancelledRequest === requestId) cancelledRequest = null;
      patch({ sending: false, requestId: null, sources: [] });
      await Promise.all([
        chatId
          ? refreshMessages(chatId).catch(() => undefined)
          : Promise.resolve(),
        refreshChats().catch(() => undefined),
      ]);
    }
  },
  async answerQuestion(
    messageId: string,
    content: string,
    provider: AssistantProvider,
    run?: Pick<AssistantSend, "modelId" | "controls">,
  ) {
    if (currentMessages().at(-1)?.id !== messageId) return;
    await assistant.send(provider, run, {
      content,
      attachments: [],
      files: [],
      context: snapshotContext([]),
      provider,
      modelId: run?.modelId,
      controls: run?.controls,
      replyToQuestion: messageId,
      keepDraft: true,
    });
  },
  stop() {
    cancelledRequest = store.state.requestId;
    stopAssistant(store.state.chatId, store.state.requestId);
  },
  async retry() {
    const sent = store.state.failed;
    if (sent)
      await assistant.send(
        sent.provider,
        { modelId: sent.modelId, controls: sent.controls },
        sent,
      );
  },
  async review(
    messageId: string,
    changeIds: string[],
    action: "apply" | "undo" | "dismiss",
  ) {
    const result = await window.pond.query("agent.review", {
      messageId,
      changeIds,
      action,
    });
    const messages = currentMessages().map((m) =>
      m.id === messageId
        ? { ...m, metadata: { ...m.metadata, changes: result.changes } }
        : m,
    );
    setMessages(messages);
    if (store.state.chatId) hydratePondChat(store.state.chatId, messages);
    await folders.refresh();
  },
  async refresh() {
    const chatId = store.state.chatId;
    if (chatId) await refreshMessages(chatId);
    await refreshChats();
  },
};

export function useAssistant() {
  useEffect(() => {
    if (subscribers++ === 0) {
      void refreshChats().catch(() =>
        patch({ error: "Could not load recent chats." }),
      );
    }
    const unsubscribe = window.pond.onAgentChunk((chunk) => {
      if (chunk.type === "activity") patch({ activity: chunk.activity });
      if (chunk.type === "sources") patch({ sources: chunk.sources });
      if (chunk.type === "results") patch({ results: chunk.results });
      if (chunk.type === "steps") patch({ steps: chunk.steps });
    });
    return () => {
      unsubscribe();
      --subscribers;
    };
  }, []);
  const state = useSelector(store, (state) => state);
  return {
    ...state,
    busy: state.sending,
  };
}
