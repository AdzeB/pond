import {
  IconChevronDownOutline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import { Button, Combobox } from "@pond/ui";
import { type ReactNode, useState } from "react";
import styles from "./chat-header.module.css";

interface ChatOption {
  id: string;
  title: string;
  isNew?: boolean;
}

export function ChatHeader({
  chatId,
  chats,
  disabled,
  onNewChat,
  onOpenChat,
  children,
}: {
  chatId: string | null;
  chats: { id: string; title: string | null }[];
  disabled: boolean;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  children?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const options: ChatOption[] = [
    ...(chatId ? [{ id: "new", title: "New Chat", isNew: true }] : []),
    ...chats.map((chat) => ({ id: chat.id, title: chat.title || "New Chat" })),
  ];
  const current = options.find((chat) => chat.id === chatId) ?? null;
  return (
    <header className={styles.header}>
      <Combobox.Root<ChatOption>
        items={options}
        value={current}
        disabled={disabled}
        itemToStringLabel={(chat) => chat.title}
        isItemEqualToValue={(a, b) => a.id === b.id}
        inputValue={query}
        onInputValueChange={setQuery}
        onOpenChange={() => setQuery("")}
        onValueChange={(chat) => {
          if (chat?.isNew) onNewChat();
          else if (chat && chat.id !== chatId) onOpenChat(chat.id);
        }}
        autoHighlight
      >
        <Combobox.Trigger
          aria-label={`Switch chat, ${current?.title ?? "New Chat"}`}
          render={
            <Button size="sm" variant="ghost" className={styles.trigger} />
          }
        >
          <span>{current?.title ?? "New Chat"}</span>
          <IconChevronDownOutline18 aria-hidden="true" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner side="bottom" align="start" sideOffset={5}>
            <Combobox.Popup className={styles.popup}>
              <Combobox.Input
                className={styles.search}
                aria-label="Chat history"
                placeholder="Search chats…"
                autoFocus
              />
              <Combobox.List className={styles.list} aria-label="Chats">
                {(chat: ChatOption) => (
                  <Combobox.Item
                    key={chat.id}
                    value={chat}
                    className={styles.item}
                  >
                    {chat.isNew ? (
                      <IconPlusOutline18 aria-hidden="true" />
                    ) : null}
                    <Combobox.ItemLabel>{chat.title}</Combobox.ItemLabel>
                    {chat.id === chatId ? (
                      <span className={styles.current}>Current</span>
                    ) : null}
                  </Combobox.Item>
                )}
              </Combobox.List>
              <Combobox.Empty className={styles.empty}>
                {chats.length ? "No chats found." : "No conversations yet."}
              </Combobox.Empty>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <div className={styles.actions}>
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="New Chat"
          title="New Chat"
          disabled={disabled}
          onClick={onNewChat}
        >
          <IconPlusOutline18 />
        </Button>
        {children}
      </div>
    </header>
  );
}
