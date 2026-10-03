import { useCallback, useRef } from "react";

interface ScrollPosition {
  top: number;
  bottom: number;
}

function readPosition(node: HTMLDivElement): ScrollPosition {
  return {
    top: node.scrollTop,
    bottom: Math.max(0, node.scrollHeight - node.clientHeight - node.scrollTop),
  };
}

function restorePosition(node: HTMLDivElement, position: ScrollPosition) {
  const maximum = Math.max(0, node.scrollHeight - node.clientHeight);
  node.scrollTop =
    position.bottom <= 24
      ? Math.max(0, maximum - position.bottom)
      : Math.min(position.top, maximum);
}

export function useRememberedChatScroll(chatKey: string) {
  const positions = useRef(new Map<string, ScrollPosition>());
  const viewport = useRef<HTMLDivElement | null>(null);
  const activeChat = useRef(chatKey);
  return useCallback(
    (node: HTMLDivElement | null) => {
      if (viewport.current)
        positions.current.set(
          activeChat.current,
          readPosition(viewport.current),
        );
      viewport.current = node;
      activeChat.current = chatKey;
      if (!node) return;
      const position = positions.current.get(chatKey);
      if (position) restorePosition(node, position);
    },
    [chatKey],
  );
}
