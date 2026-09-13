import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_NORMAL,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect } from "react";
import {
  applyNoteBlock,
  insertNoteFiles,
  type NoteBlock,
  OPEN_NOTE_LINK_COMMAND,
} from "./commands";

function isMod(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function NoteShortcuts() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (event.altKey && event.shiftKey && event.code === "Period") {
          event.preventDefault();
          applyNoteBlock(editor, "quote");
          return true;
        }
        if (!isMod(event)) return false;
        const key = event.key.toLowerCase();
        if (event.altKey) {
          const heading: Record<string, NoteBlock> = {
            Digit0: "paragraph",
            Digit1: "h1",
            Digit2: "h2",
            Digit3: "h3",
            Digit4: "h4",
          };
          const block = heading[event.code];
          if (block) {
            event.preventDefault();
            applyNoteBlock(editor, block);
            return true;
          }
        }
        if (event.shiftKey) {
          if (event.code === "Digit8") {
            event.preventDefault();
            applyNoteBlock(editor, "bullet");
            return true;
          }
          if (event.code === "Digit9") {
            event.preventDefault();
            applyNoteBlock(editor, "number");
            return true;
          }
          if (event.code === "Digit7") {
            event.preventDefault();
            applyNoteBlock(editor, "check");
            return true;
          }
          if (event.code === "Digit6") {
            event.preventDefault();
            applyNoteBlock(editor, "collapse");
            return true;
          }
          if (event.code === "Backslash") {
            event.preventDefault();
            applyNoteBlock(editor, "code");
            return true;
          }
          if (key === "u") {
            event.preventDefault();
            void insertNoteFiles(editor);
            return true;
          }
          if (key === "s") {
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
            return true;
          }
        }
        if (key === "u" && !event.shiftKey) {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
          return true;
        }
        if (key === "e") {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
          return true;
        }
        if (key === "k") {
          event.preventDefault();
          editor.dispatchCommand(OPEN_NOTE_LINK_COMMAND, undefined);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [editor]);

  return null;
}
