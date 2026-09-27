import {
  IconClockRotateClockwiseOutline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import { Button, Combobox, Tooltip } from "@pond/ui";
import { AgentHeader } from "@pond/ui/agent-header";
import { type ReactNode, useState } from "react";
import {
  type ChatHistoryGroup,
  chatHistoryGroups,
  chatTimeLabel,
} from "../chat-history";
import styles from "./styles.module.css";

interface ChatOption {
  id: string;
  title: string;
  updatedAt?: Date;
}

export function ChatHeader({
  chatId,
  chats,
  disabled,
  onNewChat,
  onOpenChat,
  children,
  actions,
}: {
  chatId: string | null;
  chats: { id: string; title: string | null; updatedAt?: Date }[];
  disabled: boolean;
  onNewChat?: () => void;
  onOpenChat: (id: string) => void;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const options: ChatOption[] = chats.map((chat) => ({
    id: chat.id,
    title: chat.title || "New Chat",
    updatedAt: chat.updatedAt,
  }));
  const current = options.find((chat) => chat.id === chatId) ?? null;
  const now = new Date();
  const groups = chatHistoryGroups(options, now);
  return (
    <AgentHeader title={current?.title ?? "New Chat"}>
      {actions}
      <Combobox.Root<ChatOption>
        items={groups}
        value={current}
        disabled={disabled}
        itemToStringLabel={(chat) => chat.title}
        isItemEqualToValue={(a, b) => a.id === b.id}
        inputValue={query}
        onInputValueChange={setQuery}
        onOpenChange={() => setQuery("")}
        onValueChange={(chat) => {
          if (chat && chat.id !== chatId) onOpenChat(chat.id);
        }}
        autoHighlight
      >
        <Tooltip label="Chat History" side="bottom">
          <Combobox.Trigger
            aria-label="Chat History"
            render={<Button icon size="sm" variant="ghost" />}
          >
            <IconClockRotateClockwiseOutline18 aria-hidden="true" />
          </Combobox.Trigger>
        </Tooltip>
        <Combobox.Portal>
          <Combobox.Positioner side="bottom" align="end" sideOffset={5}>
            <Combobox.Popup className={styles.popup}>
              <Combobox.Input
                aria-label="Chat history"
                placeholder="Chat history"
                className={styles.search}
                autoFocus
              />
              <Combobox.List aria-label="Chats" className={styles.list}>
                {(group: ChatHistoryGroup<ChatOption>) => (
                  <Combobox.Group
                    key={group.label}
                    items={group.items}
                    className={styles.group}
                  >
                    <Combobox.GroupLabel className={styles["group-label"]}>
                      {group.label}
                    </Combobox.GroupLabel>
                    <Combobox.Collection>
                      {(chat: ChatOption) => (
                        <Combobox.Item
                          key={chat.id}
                          value={chat}
                          className={styles.item}
                        >
                          <span
                            className={styles.status}
                            data-current={chat.id === chatId || undefined}
                            aria-hidden="true"
                          />
                          <Combobox.ItemLabel
                            className={styles.title}
                            title={chat.title}
                          >
                            {chat.title}
                          </Combobox.ItemLabel>
                          {chat.updatedAt ? (
                            <time
                              className={styles.time}
                              dateTime={chat.updatedAt.toISOString()}
                              title={chat.updatedAt.toLocaleString()}
                            >
                              {chatTimeLabel(chat.updatedAt, now)}
                            </time>
                          ) : null}
                        </Combobox.Item>
                      )}
                    </Combobox.Collection>
                  </Combobox.Group>
                )}
              </Combobox.List>
              <Combobox.Empty>
                {chats.length ? "No chats found." : "No conversations yet."}
              </Combobox.Empty>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {onNewChat ? (
        <Tooltip label="New Chat" side="bottom">
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="New Chat"
            disabled={disabled}
            onClick={onNewChat}
          >
            <IconPlusOutline18 />
          </Button>
        </Tooltip>
      ) : null}
      {children}
    </AgentHeader>
  );
}
