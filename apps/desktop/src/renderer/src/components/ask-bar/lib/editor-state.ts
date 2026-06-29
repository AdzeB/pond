import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
  type TextNode,
} from "lexical";
import type { AskSegment } from "@/stores/ask-store";
import { $isMentionChipNode, $isSkillChipNode, $isTagChipNode } from "./nodes";

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

// The composed message as ordered display segments — free text interleaved
// with chips, mirroring exactly what the user typed. Adjacent text is merged
// and the whole thing is trimmed; an empty/whitespace-only message yields [].
export function $readSegments(): AskSegment[] {
  type Mutable =
    | { kind: "text"; text: string }
    | Exclude<AskSegment, { kind: "text" }>;
  const segments: Mutable[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last?.kind === "text") last.text += text;
    else segments.push({ kind: "text", text });
  };
  const walk = (node: LexicalNode) => {
    if ($isMentionChipNode(node)) {
      segments.push({
        kind: "mention",
        id: node.getSaveId(),
        title: node.getTitle(),
      });
      return;
    }
    if ($isTagChipNode(node)) {
      segments.push({ kind: "tag", tag: node.getTag() });
      return;
    }
    if ($isSkillChipNode(node)) {
      segments.push({ kind: "skill", name: node.getName() });
      return;
    }
    if ($isTextNode(node)) {
      pushText(node.getTextContent());
      return;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) walk(child);
    }
  };
  walk($getRoot());

  const first = segments[0];
  if (first?.kind === "text") first.text = first.text.replace(/^\s+/, "");
  const last = segments[segments.length - 1];
  if (last?.kind === "text") last.text = last.text.replace(/\s+$/, "");
  return segments.filter((s) => s.kind !== "text" || s.text.length > 0);
}

// Replace the matched trigger token node (the `@query` text node the typeahead
// plugin isolates) with a freshly built chip, followed by a space, landing the
// caret after it. Any text the plugin split off after the query is preserved as
// a sibling.
export function $replaceNodeWithChip(
  node: TextNode,
  makeChip: () => LexicalNode,
): void {
  const chip = makeChip();
  node.replace(chip);
  const space = $createTextNode(" ");
  chip.insertAfter(space);
  space.select(1, 1);
}

// Insert a trigger char (`/ @ #`) at the caret so its menu opens, used by the
// composer toolbar's quick-add buttons. Drops a leading space when the caret
// isn't already at a token boundary so `$readTrigger` recognizes it.
export function $insertTrigger(trigger: AskTrigger): void {
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
  selection.insertText(needsSpace ? ` ${trigger}` : trigger);
}
