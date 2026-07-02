import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from "lexical";

// The search string the parser receives: every node's text content concatenated
// (token nodes contribute their literal `key:value` text) with whitespace
// collapsed, so `parseSearchInput` sees exactly the tokens the user assembled.
export function $readSearchString(): string {
  return $getRoot().getTextContent().replace(/\s+/g, " ").trim();
}

export function $isEditorEmpty(): boolean {
  return $getRoot().getTextContent().trim().length === 0;
}

// Drop a `key:` prefix at the caret so the value typeahead opens on it, adding a
// leading space when the caret isn't already at a token boundary.
export function $insertFieldKey(key: string): void {
  let selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    $getRoot().selectEnd();
    selection = $getSelection();
  }
  if (!$isRangeSelection(selection)) return;
  const node = selection.anchor.getNode();
  const before = $isTextNode(node)
    ? node.getTextContent().slice(0, selection.anchor.offset)
    : "";
  const needsSpace = before.length > 0 && !/\s$/.test(before);
  selection.insertText(needsSpace ? ` ${key}:` : `${key}:`);
}
