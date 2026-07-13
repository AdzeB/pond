import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalNode,
  type TextNode,
} from "lexical";
import type { AskSegment } from "@/stores/ask-store";
import { $isMentionChipNode, $isSkillChipNode, $isTagChipNode } from "./nodes";

export type AskTrigger = "/" | "@" | "#";

/** The prompt the agent receives; chips contribute their expansion (skill prompt, tag name, mention nothing) with whitespace collapsed. */
export function $readPrompt(): string {
  return $getRoot().getTextContent().replace(/\s+/g, " ").trim();
}

export function $isEditorEmpty(): boolean {
  return $getRoot().getTextContent().trim().length === 0;
}

/** Mention chips' save ids are threaded to the agent as anchor ids. */
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

/** The composed message as ordered display segments mirroring what the user typed; adjacent text merges and a whitespace-only message yields []. */
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

/** Replaces the trigger token node the typeahead plugin isolates with a chip plus trailing space, landing the caret after it. */
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
