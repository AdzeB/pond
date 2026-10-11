import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_HIGH, DRAGOVER_COMMAND, DROP_COMMAND } from "lexical";
import { useEffect, useRef } from "react";
import { isLibrarySaveDrag, saveDropIds } from "@/features/saves";

export function ComposerDrop({
  onDropIds,
}: {
  onDropIds: (ids: string[]) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const drop = useRef(onDropIds);
  drop.current = onDropIds;
  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          DRAGOVER_COMMAND,
          (event) => {
            if (!isLibrarySaveDrag(event.dataTransfer)) return false;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerCommand(
          DROP_COMMAND,
          (event) => {
            const ids = saveDropIds(event.dataTransfer);
            if (!ids.length) return false;
            event.preventDefault();
            drop.current(ids);
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
    [editor],
  );
  return null;
}
