import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
} from "lexical";
import { $isMentionChipNode } from "./nodes";

export type AskTrigger = "/" | "@" | "#";

// The prompt the agent receives: every node's text content concatenated, with
// chips contributing their expansion (skill -> saved prompt, tag -> name,
// mention -> nothing) and whitespace collapsed.
export function $readPrompt(): string {
  return $getRoot().getTextContent().replace(/\s+/g, " ").trim();
}

export function $isEditorEmpty(): boolean {
  return $getRoot().getTextContent().trim().length === 0;
}

// Walk the tree for mention chips so their saves can be threaded to the agent
// as anchor ids.
export function $collectMentionIds(): string[] {
  const ids: string[] = [];
  const walk = (node: LexicalNode) => {
    if ($isMentionChipNode(node)) {
      ids.push(node.getSaveId());
      return;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) walk(child);
    }
  };
  walk($getRoot());
  return ids;
}

// The trigger token immediately before a collapsed caret, if any. Only fires
// when the trigger char starts a token (preceded by start-of-line or space).
export function $readTrigger(): { trigger: AskTrigger; query: string } | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const node = selection.anchor.getNode();
  if (!$isTextNode(node)) return null;
  const text = node.getTextContent().slice(0, selection.anchor.offset);
  const match = text.match(/(?:^|\s)([/@#])([^\s/@#]*)$/);
  if (!match) return null;
  return { trigger: match[1] as AskTrigger, query: match[2] ?? "" };
}

// Replace the active trigger token (e.g. "/foo") with a freshly built chip
// node, followed by a space, landing the caret after it.
export function $replaceTriggerWithChip(
  trigger: AskTrigger,
  makeChip: () => LexicalNode,
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
  const node = selection.anchor.getNode();
  if (!$isTextNode(node)) return;

  const caret = selection.anchor.offset;
  const full = node.getTextContent();
  const trigIdx = full.slice(0, caret).lastIndexOf(trigger);
  if (trigIdx < 0) return;

  const head = full.slice(0, trigIdx);
  const tail = full.slice(caret);
  const chip = makeChip();
  const tailNode = $createTextNode(` ${tail}`);

  if (head.length > 0) {
    node.setTextContent(head);
    node.insertAfter(chip);
  } else {
    node.replace(chip);
  }
  chip.insertAfter(tailNode);
  tailNode.select(1, 1);
}

// Strip the active trigger token without inserting anything (used when the
// trigger opens a dialog instead, e.g. "Create skill").
export function $clearTrigger(trigger: AskTrigger): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
  const node = selection.anchor.getNode();
  if (!$isTextNode(node)) return;

  const caret = selection.anchor.offset;
  const full = node.getTextContent();
  const trigIdx = full.slice(0, caret).lastIndexOf(trigger);
  if (trigIdx < 0) return;

  const next = full.slice(0, trigIdx) + full.slice(caret);
  node.setTextContent(next);
  node.select(trigIdx, trigIdx);
}

// Reset the editor to plain text (used to clear it and to replay history).
export function $setPlainText(value: string): void {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  if (value) paragraph.append($createTextNode(value));
  root.append(paragraph);
  paragraph.selectEnd();
}
