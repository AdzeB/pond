import type {
  AssistantActivity,
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
import { folders } from "../../library/state/folders";
import { libraryChrome } from "../../library/state/library-chrome";
import { getOverlays } from "../../library/state/view-store";
import {
  assistantClient,
  fromChatMessage,
  observeAssistantActivity,
  runAssistant,
  toChatMessage,
  useAssistantRuntime,
} from "./assistant-runtime";

const ChatsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string().nullable(),
    updatedAt: z.coerce.date().optional(),
  }),
);
const ChatSchema = z.object({ id: z.string() });

export type AssistantComposerScope = { kind: "auto" } | AssistantSend["scope"];

interface DraftSnapshot {
  content: string;
  attachments: AssistantSource[];
  provider: AssistantProvider;
  scope: AssistantComposerScope;
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
  scope: AssistantComposerScope;
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
type AssistantWorkspace = Omit<AssistantState, "messages" | "busy"> & {
  sending: boolean;
};
const store = new Store<AssistantWorkspace>({
  chatId: null,
  chats: [],
  referenceMessageId: null,
  draft: "",
  attachments: [],
  scope: { kind: "auto" },
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
const isBusy = () => store.state.sending || assistantClient.getIsLoading();
const currentMessages = () =>
  assistantClient
    .getMessages()
    .filter((message) => message.id !== `${store.state.requestId}:assistant`)
    .map((message) =>
      fromChatMessage(message, store.state.chatId ?? "pending"),
    );
observeAssistantActivity((chunk) => {
  if (chunk.type === "activity") patch({ activity: chunk.activity });
  if (chunk.type === "sources") patch({ sources: chunk.sources });
  if (chunk.type === "results") patch({ results: chunk.results });
  if (chunk.type === "steps") patch({ steps: chunk.steps });
});

async function refreshChats() {
  patch({
    chats: ChatsSchema.parse(await window.pond.query("agent.chats", {})),
  });
}
async function refreshMessages(chatId: string, version = historyVersion) {
  const messages = assistantMessages.parse(
    await window.pond.query("agent.messages", { chatId }),
  );
  if (store.state.chatId === chatId && version === historyVersion) {
    const presentationId = `${store.state.requestId}:assistant`;
    const pending =
      store.state.requestId &&
      assistantClient
        .getMessages()
        .some((message) => message.id === presentationId);
    assistantClient.setMessagesManually(
      messages.map((message, index) =>
        toChatMessage(
          message,
          pending &&
            index === messages.length - 1 &&
            message.role === "assistant"
            ? presentationId
            : undefined,
        ),
      ),
    );
  }
}

type ComposerSnapshot = Pick<
  AssistantWorkspace,
  "draft" | "attachments" | "scope" | "failed" | "error"
>;
const composers = new Map<string | null, ComposerSnapshot>();

function saveComposer() {
  const { chatId, draft, attachments, scope, failed, error } = store.state;
  composers.set(chatId, { draft, attachments, scope, failed, error });
}

function composerFor(chatId: string | null): ComposerSnapshot {
  return (
    composers.get(chatId) ?? {
      draft: "",
      attachments: [],
      scope: { kind: "auto" },
      failed: null,
      error: null,
    }
  );
}

function snapshotContext(
  attachments: AssistantSource[],
): DraftSnapshot["context"] {
  const attachmentIds = attachments.map((save) => save.id);
  const nav = libraryChrome.getState().nav;
  const scope: AssistantSend["scope"] =
    store.state.scope.kind !== "auto"
      ? store.state.scope
      : attachmentIds.length
        ? { kind: "attachments" }
        : nav.kind === "folder"
          ? { kind: "folder", id: nav.id }
          : { kind: "library" };
  return { scope, attachmentIds, ...getOverlays() };
}

function restoreDraft(
  sent: DraftSnapshot,
  scopeAfterSend: AssistantComposerScope,
) {
  if (
    !sent.keepDraft &&
    !store.state.draft &&
    !store.state.attachments.length &&
    store.state.scope === scopeAfterSend
  )
    patch({
      draft: sent.content,
      attachments: sent.attachments,
      scope: sent.scope,
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
  setScope(scope: AssistantComposerScope) {
    patch({ scope });
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
    const attachments = store.state.attachments.filter(
      (save) => save.id !== id,
    );
    patch({
      attachments,
      scope:
        !attachments.length && store.state.scope.kind === "attachments"
          ? { kind: "auto" }
          : store.state.scope,
    });
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
    assistantClient.clear();
    patch({
      chatId: null,
      referenceMessageId: null,
      ...composerFor(null),
      sources: [],
      results: [],
      steps: [],
      loading: false,
    });
  },
  async openChat(chatId: string) {
    if (isBusy()) return;
    saveComposer();
    const version = ++historyVersion;
    assistantClient.clear();
    patch({
      chatId,
      ...composerFor(chatId),
      referenceMessageId: null,
      sources: [],
      results: [],
      steps: [],
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
  async send(provider: AssistantProvider, snapshot?: DraftSnapshot) {
    if (isBusy() || store.state.loading) return;
    const sent = snapshot ?? {
      content: store.state.draft.trim(),
      attachments: store.state.attachments,
      scope: store.state.scope,
      context: snapshotContext(store.state.attachments),
      provider,
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
        store.state.attachments === sent.attachments)
    )
      patch({
        draft: "",
        attachments: [],
        scope:
          store.state.scope.kind === "attachments"
            ? { kind: "auto" }
            : store.state.scope,
      });
    const scopeAfterSend = store.state.scope;
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
      if (cancelledRequest === requestId) {
        restoreDraft(sent, scopeAfterSend);
        return;
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
      const result = await runAssistant(
        {
          chatId,
          requestId,
          content: sent.content,
          ...sent.context,
          provider: sent.provider,
          replyToQuestion: sent.replyToQuestion,
        },
        message.metadata ?? {},
      );
      if (!result.accepted) {
        assistantClient.setMessagesManually(
          assistantClient
            .getMessages()
            .filter(
              (m) => m.id !== requestId && m.id !== `${requestId}:assistant`,
            ),
        );
        restoreDraft(sent, scopeAfterSend);
        patch({
          error:
            result.error ??
            (result.stopped ? null : "Could not send this message."),
          failed: sent,
        });
      } else {
        await refreshMessages(chatId);
        patch({ error: null });
      }
      await refreshChats();
    } catch {
      restoreDraft(sent, scopeAfterSend);
      patch({
        error:
          "Could not finish the request. Check the conversation before trying again.",
        failed: sent,
      });
      if (chatId) await refreshMessages(chatId).catch(() => undefined);
    } finally {
      if (cancelledRequest === requestId) cancelledRequest = null;
      patch({ sending: false, requestId: null, sources: [] });
    }
  },
  async answerQuestion(
    messageId: string,
    content: string,
    provider: AssistantProvider,
  ) {
    if (currentMessages().at(-1)?.id !== messageId) return;
    await assistant.send(provider, {
      content,
      attachments: [],
      scope: store.state.scope,
      context: snapshotContext([]),
      provider,
      replyToQuestion: messageId,
      keepDraft: true,
    });
  },
  stop() {
    cancelledRequest = store.state.requestId;
    assistantClient.stop();
  },
  async retry() {
    const sent = store.state.failed;
    if (sent) await assistant.send(sent.provider, sent);
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
    assistantClient.setMessagesManually(
      currentMessages().map((m) =>
        toChatMessage(
          m.id === messageId
            ? { ...m, metadata: { ...m.metadata, changes: result.changes } }
            : m,
        ),
      ),
    );
    await folders.refresh();
  },
};

export function useAssistant() {
  useEffect(() => {
    if (subscribers++ === 0) {
      void refreshChats().catch(() =>
        patch({ error: "Could not load recent chats." }),
      );
    }
    return () => {
      --subscribers;
    };
  }, []);
  const state = useSelector(store, (state) => state);
  const runtime = useAssistantRuntime();
  return {
    ...state,
    messages: currentMessages(),
    busy: state.sending || runtime.isLoading,
  };
}
