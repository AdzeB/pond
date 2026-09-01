import type {
  AssistantActivity,
  AssistantChange,
  AssistantMessage,
  AssistantProvider,
  AssistantResultSet,
  AssistantSource,
  AssistantToolStep,
} from "@shared/assistant";
import {
  assistantMessages,
  assistantSendResult,
  assistantSources,
} from "@shared/assistant";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { z } from "zod";
import { folders } from "./folders";

const ChatsSchema = z.array(
  z.object({ id: z.string(), title: z.string().nullable() }),
);
const ChatSchema = z.object({ id: z.string() });

interface DraftSnapshot {
  content: string;
  attachments: AssistantSource[];
  provider: AssistantProvider;
  replyToQuestion?: string;
  keepDraft?: boolean;
}
export interface AssistantState {
  chatId: string | null;
  chats: { id: string; title: string | null }[];
  referenceMessageId: string | null;
  messages: AssistantMessage[];
  draft: string;
  attachments: AssistantSource[];
  busy: boolean;
  loading: boolean;
  requestId: string | null;
  stream: string;
  sources: AssistantSource[];
  activity: AssistantActivity;
  results: AssistantResultSet[];
  steps: AssistantToolStep[];
  error: string | null;
  consent: DraftSnapshot | null;
  failed: DraftSnapshot | null;
}
const store = new Store<AssistantState>({
  chatId: null,
  chats: [],
  referenceMessageId: null,
  messages: [],
  draft: "",
  attachments: [],
  busy: false,
  loading: false,
  requestId: null,
  stream: "",
  sources: [],
  activity: "thinking",
  results: [],
  steps: [],
  error: null,
  consent: null,
  failed: null,
});
const patch = (value: Partial<AssistantState>) =>
  store.setState((state) => ({ ...state, ...value }));
let subscribers = 0;
let unsubscribe: (() => void) | undefined;
let historyVersion = 0;

async function refreshChats() {
  patch({
    chats: ChatsSchema.parse(await window.pond.query("agent.chats", {})),
  });
}
async function refreshMessages(chatId: string, version = historyVersion) {
  const messages = assistantMessages.parse(
    await window.pond.query("agent.messages", { chatId }),
  );
  if (store.state.chatId === chatId && version === historyVersion)
    patch({ messages });
}

function restoreDraft(sent: DraftSnapshot) {
  if (!store.state.draft)
    patch({
      draft: sent.content,
      attachments: sent.attachments,
    });
}

export const assistant = {
  showReferences(messageId: string) {
    const message = store.state.messages.find(
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
      attachments: merged.slice(0, 24),
      error:
        merged.length > 24
          ? "You can attach up to 24 Saves per message."
          : null,
    });
  },
  removeAttachment(id: string) {
    patch({ attachments: store.state.attachments.filter((s) => s.id !== id) });
  },
  async attachIds(ids: string[]) {
    try {
      assistant.attach(
        assistantSources.parse(
          await window.pond.query("agent.attachments", {
            ids: ids.slice(0, 24),
          }),
        ),
      );
    } catch {
      patch({ error: "Could not load these Saves. Try again." });
    }
  },
  newChat() {
    if (store.state.busy) return;
    historyVersion++;
    patch({
      chatId: null,
      referenceMessageId: null,
      draft: "",
      attachments: [],
      messages: [],
      stream: "",
      sources: [],
      results: [],
      steps: [],
      error: null,
      consent: null,
      failed: null,
      loading: false,
    });
  },
  async openChat(chatId: string) {
    if (store.state.busy) return;
    const version = ++historyVersion;
    patch({
      chatId,
      referenceMessageId: null,
      messages: [],
      stream: "",
      sources: [],
      results: [],
      steps: [],
      error: null,
      consent: null,
      failed: null,
      loading: true,
    });
    try {
      await refreshMessages(chatId);
    } catch {
      if (version === historyVersion)
        patch({ error: "Could not load this conversation. Try again." });
    } finally {
      if (version === historyVersion) patch({ loading: false });
    }
  },
  async send(
    provider: AssistantProvider,
    allowCloudOnce = false,
    snapshot?: DraftSnapshot,
  ) {
    if (store.state.busy || store.state.loading) return;
    const sent = snapshot ?? {
      content: store.state.draft.trim(),
      attachments: store.state.attachments,
      provider,
    };
    if (!sent.content) return;
    const requestId = crypto.randomUUID();
    patch({
      busy: true,
      error: null,
      consent: null,
      failed: null,
      stream: "",
      sources: [],
      activity: "thinking",
      results: [],
      steps: [],
      requestId,
    });
    if (
      !snapshot ||
      (!snapshot.keepDraft && store.state.draft === sent.content)
    )
      patch({ draft: "", attachments: [] });
    let chatId = store.state.chatId;
    try {
      if (!chatId) {
        const chat = ChatSchema.parse(
          await window.pond.query("agent.newChat", {}),
        );
        chatId = chat.id;
        patch({ chatId });
      }
      const message: AssistantMessage = {
        id: requestId,
        chatId,
        role: "user",
        content: sent.content,
        metadata: {
          attachments: sent.attachments,
          replyToQuestion: sent.replyToQuestion,
        },
      };
      patch({ messages: [...store.state.messages, message] });
      const result = assistantSendResult.parse(
        await window.pond.query("agent.send", {
          chatId,
          requestId,
          content: sent.content,
          attachmentIds: sent.attachments.map((s) => s.id),
          provider: sent.provider,
          allowCloudOnce,
          replyToQuestion: sent.replyToQuestion,
        }),
      );
      if (!result.accepted) {
        patch({
          messages: store.state.messages.filter((m) => m.id !== requestId),
        });
        if (result.needsCloud) patch({ consent: sent });
        else {
          restoreDraft(sent);
          patch({
            error:
              result.error ??
              (result.stopped ? null : "Could not send this message."),
            failed: sent,
          });
        }
      } else {
        await refreshMessages(chatId);
        patch({ error: null });
      }
      await refreshChats();
    } catch {
      restoreDraft(sent);
      patch({
        error:
          "Could not finish the request. Check the conversation before trying again.",
        failed: sent,
      });
      if (chatId) await refreshMessages(chatId).catch(() => undefined);
    } finally {
      patch({ busy: false, requestId: null, stream: "", sources: [] });
    }
  },
  async answerQuestion(
    messageId: string,
    content: string,
    provider: AssistantProvider,
  ) {
    if (store.state.messages.at(-1)?.id !== messageId) return;
    await assistant.send(provider, false, {
      content,
      attachments: [],
      provider,
      replyToQuestion: messageId,
      keepDraft: true,
    });
  },
  async stop() {
    const { chatId, requestId } = store.state;
    if (!chatId || !requestId) return;
    try {
      await window.pond.query("agent.stop", { chatId, requestId });
    } catch {
      patch({ error: "Could not stop the reply. Try again." });
    }
  },
  cancelConsent() {
    const sent = store.state.consent;
    patch({ consent: null });
    if (sent) {
      if (store.state.draft)
        patch({
          failed: sent,
          error:
            "The previous message was not sent. Your current draft was kept.",
        });
      else restoreDraft(sent);
    }
  },
  async allowOnce() {
    const sent = store.state.consent;
    if (sent) await assistant.send(sent.provider, true, sent);
  },
  async retry() {
    const sent = store.state.failed;
    if (sent) await assistant.send(sent.provider, false, sent);
  },
  async review(
    messageId: string,
    changeIds: string[],
    action: "apply" | "undo" | "dismiss",
  ) {
    const result = (await window.pond.query("agent.review", {
      messageId,
      changeIds,
      action,
    })) as { changes: AssistantChange[] };
    patch({
      messages: store.state.messages.map((m) =>
        m.id === messageId
          ? { ...m, metadata: { ...m.metadata, changes: result.changes } }
          : m,
      ),
    });
    await folders.refresh();
  },
};

export function useAssistant() {
  useEffect(() => {
    if (subscribers++ === 0) {
      void refreshChats().catch(() =>
        patch({ error: "Could not load recent chats." }),
      );
      unsubscribe = window.pond.onAgentChunk((chunk) => {
        if (
          chunk.chatId !== store.state.chatId ||
          chunk.requestId !== store.state.requestId
        )
          return;
        if (chunk.type === "text")
          patch({
            stream: store.state.stream + (chunk.text ?? ""),
            activity: "writing",
          });
        if (chunk.activity) patch({ activity: chunk.activity });
        if (chunk.sources) patch({ sources: chunk.sources });
        if (chunk.results) patch({ results: chunk.results });
        if (chunk.steps) patch({ steps: chunk.steps });
      });
    }
    return () => {
      if (--subscribers === 0) {
        unsubscribe?.();
        unsubscribe = undefined;
      }
    };
  }, []);
  return useSelector(store, (state) => state);
}
