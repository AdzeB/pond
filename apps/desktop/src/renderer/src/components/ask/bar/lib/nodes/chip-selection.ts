import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type NodeKey,
} from "lexical";
import { useCallback, useEffect, useRef } from "react";

/** Shared chip behavior: click selects, then Backspace/Delete removes the selected chip. */
export function useChipSelection(nodeKey: NodeKey) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelected] =
    useLexicalNodeSelection(nodeKey);
  const ref = useRef<HTMLSpanElement>(null);

  const removeIfSelected = useCallback(
    (event: KeyboardEvent) => {
      if (!isSelected || !$isNodeSelection($getSelection())) return false;
      event.preventDefault();
      editor.update(() => $getNodeByKey(nodeKey)?.remove());
      return true;
    },
    [editor, isSelected, nodeKey],
  );

  useEffect(() => {
    const cleanups = [
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const el = ref.current;
          if (el && event.target instanceof Node && el.contains(event.target)) {
            if (!event.shiftKey) clearSelected();
            setSelected(!isSelected);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        removeIfSelected,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        removeIfSelected,
        COMMAND_PRIORITY_LOW,
      ),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [editor, isSelected, clearSelected, setSelected, removeIfSelected]);

  return { ref, isSelected };
}

export function createInlineChipDOM(): HTMLElement {
  const span = document.createElement("span");
  span.style.display = "inline-flex";
  span.style.verticalAlign = "middle";
  return span;
}
