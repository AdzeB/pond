import {
  IconClone2Outline18,
  IconDotsOutline18,
  IconDownloadOutline18,
  IconPencilOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { Dialog, Menu, Tooltip } from "@pond/ui";
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
    <Menu.Root>
      <Tooltip label="Chat Actions" side="bottom">
        <Menu.Trigger
          icon
          size="sm"
          variant="ghost"
          aria-label="Chat Actions"
          disabled={disabled || (!chatId && !messages.length)}
        >
          <IconDotsOutline18 />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end">
          <Menu.Popup>
            <Menu.Items
              items={[
                {
                  label: "Rename Chat",
                  icon: <IconPencilOutline18 />,
                  disabled: disabled || !chatId,
                  onClick: onRename,
                },
                {
                  label: "Copy Conversation",
                  icon: <IconClone2Outline18 />,
                  disabled: disabled || !messages.length,
                  onClick: () => void transfer("copy"),
                },
                {
                  label: "Export Markdown",
                  icon: <IconDownloadOutline18 />,
                  disabled: disabled || !messages.length,
                  onClick: () => void transfer("export"),
                },
                { type: "separator" },
                {
                  label: "Delete Chat",
                  icon: <IconTrash2Outline18 />,
                  variant: "destructive",
                  disabled: disabled || !chatId,
                  onClick: () => {
                    if (!chatId) return;
                    Dialog.confirm({
                      title: "Delete Chat",
                      description:
                        "This permanently deletes the conversation. Your Saves stay in your library.",
                      confirmLabel: "Delete Chat",
                      onConfirm: () => assistant.deleteChat(chatId),
                    });
                  },
                },
              ]}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
