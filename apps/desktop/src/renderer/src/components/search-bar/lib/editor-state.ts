import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from "lexical";

/** Token nodes contribute their literal `key:value` text, so `parseSearchInput` sees exactly the tokens the user assembled. */
export function $readSearchString(): string {
  return $getRoot().getTextContent().replace(/\s+/g, " ").trim();
}

export function $isEditorEmpty(): boolean {
  return $getRoot().getTextContent().trim().length === 0;
}

/** Drops a `key:` prefix at the caret so the value typeahead opens on it. */
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
