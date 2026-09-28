import {
  IconClone2Outline18,
  IconDownloadOutline18,
  IconPencilOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { Button, Dialog, Tooltip } from "@pond/ui";
import type { AssistantMessage } from "@shared/assistant";
import { conversationMarkdown } from "@shared/conversation-markdown";
import { notify } from "@/shared/lib/toast";
import { assistant } from "../../state/assistant";

export function ChatActions({
  chatId,
  title,
  messages,
  disabled,
  onRename,
}: {
  chatId: string | null;
  title: string | null;
  messages: AssistantMessage[];
  disabled: boolean;
  onRename: () => void;
}) {
  async function transfer(kind: "copy" | "export") {
    if (!chatId) return;
    try {
      const result =
        kind === "copy"
          ? await window.pond.query("clipboard.writeText", {
              text: conversationMarkdown(title, messages),
            })
          : await window.pond.query("agent.exportChat", { chatId });
      if (!result.ok) {
        if (result.reason === "canceled") return;
        throw new Error(result.error || "Try again.");
      }
      notify({
        id: "chat-transfer",
        title:
          kind === "copy" ? "Conversation copied" : "Conversation exported",
      });
    } catch (error) {
      notify({
        id: "chat-transfer",
        title:
          kind === "copy"
            ? "Could not copy conversation"
            : "Could not export conversation",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }
  return (
    <>
      <Tooltip label="Rename Chat" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Rename Chat"
          disabled={disabled || !chatId}
          onClick={onRename}
        >
          <IconPencilOutline18 />
        </Button>
      </Tooltip>
      <Tooltip label="Copy Conversation" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Copy Conversation"
          disabled={disabled || !messages.length}
          onClick={() => void transfer("copy")}
        >
          <IconClone2Outline18 />
        </Button>
      </Tooltip>
      <Tooltip label="Export Markdown" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Export Markdown"
          disabled={disabled || !messages.length}
          onClick={() => void transfer("export")}
        >
          <IconDownloadOutline18 />
        </Button>
      </Tooltip>
      <Tooltip label="Delete Chat" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Delete Chat"
          disabled={disabled || !chatId}
          onClick={() => {
            if (!chatId) return;
            Dialog.confirm({
              title: "Delete Chat",
              description:
                "This permanently deletes the conversation. Your Saves stay in your library.",
              confirmLabel: "Delete Chat",
              onConfirm: () => assistant.deleteChat(chatId),
            });
          }}
        >
          <IconTrash2Outline18 />
        </Button>
      </Tooltip>
    </>
  );
}
