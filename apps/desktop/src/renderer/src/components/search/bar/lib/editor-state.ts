import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";

/** Token nodes contribute their literal `key:value` text, so `parseSearchInput` sees exactly the tokens the user assembled. */
export function $readSearchString(): string {
  return $getRoot().getTextContent().replace(/\s+/g, " ").trim();
}

/** Replaces the field with `text` plus a trailing space so the caret sits ready for the next token. */
export function $writeSearchString(text: string): void {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  if (text.trim()) paragraph.append($createTextNode(`${text.trim()} `));
  root.append(paragraph);
  paragraph.selectEnd();
}
