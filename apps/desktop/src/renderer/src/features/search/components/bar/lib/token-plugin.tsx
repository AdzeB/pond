import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from "lexical";
import { useEffect } from "react";
import { TOKEN_FIELDS } from "@/features/search/lib/syntax";
import {
  $createFilterTokenNode,
  $isFilterTokenNode,
  FilterTokenNode,
} from "./token-node";

const KEYS = TOKEN_FIELDS.flatMap((spec) => spec.keys);

const TOKEN_RE = new RegExp(
  `(^|\\s)(-?(?:${KEYS.join("|")})(?::|>=|<=|>|<)(?:"[^"]*"|[^\\s"])+)`,
  "i",
);

function getFilterMatch(text: string): { start: number; end: number } | null {
  const match = TOKEN_RE.exec(text);
  if (!match) return null;
  const lead = match[1] ?? "";
  const token = match[2] ?? "";
  const start = match.index + lead.length;
  return { start, end: start + token.length };
}

function $isCaretInside(node: TextNode, start: number, end: number): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  if (selection.anchor.getNode() !== node) return false;
  const offset = selection.anchor.offset;
  return offset >= start && offset <= end;
}

function $replaceWithSimpleText(node: TextNode): void {
  const selection = $getSelection();
  const offset =
    $isRangeSelection(selection) && selection.anchor.getNode() === node
      ? selection.anchor.offset
      : null;
  const textNode = $createTextNode(node.getTextContent());
  textNode.setFormat(node.getFormat());
  node.replace(textNode);
  if (offset !== null) textNode.select(offset, offset);
}

function $tryWrap(node: TextNode): void {
  if (!node.isAttached()) return;
  if (node.getType() !== "text" || !node.isSimpleText()) return;
  const text = node.getTextContent();
  const match = getFilterMatch(text);
  if (!match) return;
  if ($isCaretInside(node, match.start, match.end)) return;

  let nodeToReplace: TextNode | undefined;
  if (match.start === 0) {
    [nodeToReplace] = node.splitText(match.end);
  } else {
    [, nodeToReplace] = node.splitText(match.start, match.end);
  }
  if (!nodeToReplace) return;
  const replacement = $createFilterTokenNode(nodeToReplace.getTextContent());
  replacement.setFormat(nodeToReplace.getFormat());
  nodeToReplace.replace(replacement);
}

function $tryUnwrap(node: FilterTokenNode): void {
  if (!node.isAttached()) return;
  const text = node.getTextContent();
  const match = getFilterMatch(text);
  if (match === null || match.start !== 0) {
    $replaceWithSimpleText(node);
    return;
  }
  if (text.length > match.end) {
    node.splitText(match.end);
    return;
  }
  if ($isCaretInside(node, 0, text.length)) $replaceWithSimpleText(node);
}

export function FilterTokenPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([FilterTokenNode])) return;
    const unregisterText = editor.registerNodeTransform(TextNode, $tryWrap);
    const unregisterToken = editor.registerNodeTransform(
      FilterTokenNode,
      $tryUnwrap,
    );
    const unregisterSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const needs = editor.getEditorState().read(() => {
          for (const node of $getRoot().getAllTextNodes()) {
            if (
              $isFilterTokenNode(node) &&
              $isCaretInside(node, 0, node.getTextContent().length)
            ) {
              return true;
            }
            if (node.getType() !== "text" || !node.isSimpleText()) continue;
            const match = getFilterMatch(node.getTextContent());
            if (match && !$isCaretInside(node, match.start, match.end)) {
              return true;
            }
          }
          return false;
        });
        if (!needs) return false;
        editor.update(() => {
          for (const node of $getRoot().getAllTextNodes()) {
            if ($isFilterTokenNode(node)) $tryUnwrap(node);
            else $tryWrap(node);
          }
        });
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterText();
      unregisterToken();
      unregisterSelection();
    };
  }, [editor]);

  return null;
}
