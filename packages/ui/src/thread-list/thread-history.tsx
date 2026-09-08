import { IconPlusOutline18 } from "@pond/icons/outline/18";
import type { ComponentProps } from "react";
import { HistoryItem } from "../thread-list-item/history-item";
import { ThreadList } from "./thread-list";

export function ThreadHistory(props: ComponentProps<typeof ThreadList.Root>) {
  return (
    <ThreadList.Root {...props}>
      <ThreadList.New>
        <IconPlusOutline18 />
        New Chat
      </ThreadList.New>
      <ThreadList.Items components={{ ThreadListItem: HistoryItem }} />
    </ThreadList.Root>
  );
}
