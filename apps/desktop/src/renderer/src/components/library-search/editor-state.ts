import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  createCommand,
  type LexicalCommand,
} from "lexical";
import { predicateIsActive } from "@/lib/filter-helpers";
import {
  buildPredicate,
  matchFieldToken,
  serializePredicate,
  tokenize,
} from "@/lib/search-syntax";
import { $createFilterChipNode } from "./filter-chip-node";

// Dispatched by discrete chip mutations (e.g. the chip remove button) so the
// search re-runs immediately, even though typing waits for Enter.
export const COMMIT_SEARCH_COMMAND: LexicalCommand<void> =
  createCommand("COMMIT_SEARCH");

// The structured-search string the rest of the app consumes. Text nodes
// contribute their text; chip nodes contribute their serialized token, so the
// editor reads back as a normal `key:value free text` query string.
export function $readSearchString(): string {
  return $getRoot().getTextContent().replace(/\n+/g, " ");
}

// Plain-text caret offset within `$readSearchString`, used to drive the
// caret-anchored suggestions. Best-effort: exact for the common case (caret in
// a text node), and clamps to the end otherwise.
export function $readCaret(): { text: string; caret: number } {
  const text = $readSearchString();
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return { text, caret: text.length };
  }
  const anchor = selection.anchor;
  const node = anchor.getNode();
  let offset = 0;

  if ($isTextNode(node)) {
    let prev = node.getPreviousSibling();
    while (prev) {
      offset += prev.getTextContent().length;
      prev = prev.getPreviousSibling();
    }
    offset += anchor.offset;
    return { text, caret: offset };
  }

  if ($isElementNode(node)) {
    const children = node.getChildren();
    for (let i = 0; i < anchor.offset && i < children.length; i += 1) {
      offset += children[i]?.getTextContent().length ?? 0;
    }
    return { text, caret: offset };
  }

  return { text, caret: text.length };
}

interface Segment {
  type: "text" | "chip";
  text?: string;
  predicate?: ReturnType<typeof buildPredicate>;
}

function segmentize(value: string): Segment[] {
  const segments: Segment[] = [];
  let pending = "";
  let index = 0;

  const flush = () => {
    if (pending.length > 0) {
      segments.push({ type: "text", text: pending });
      pending = "";
    }
  };

  for (const token of tokenize(value)) {
    pending += value.slice(index, token.start);
    const matched = matchFieldToken(token.text);
    const predicate = matched ? buildPredicate(matched) : null;
    if (predicate && predicateIsActive(predicate)) {
      flush();
      segments.push({ type: "chip", predicate });
    } else {
      pending += token.text;
    }
    index = token.end;
  }
  pending += value.slice(index);
  flush();
  return segments;
}

// Rebuild the editor from a search string: complete `key:value` tokens become
// chip nodes in place; everything else stays editable text. Optionally restore
// the caret to a plain-text offset within `value`.
export function $setSearchString(value: string, caret?: number): void {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  root.append(paragraph);

  const segments = segmentize(value);
  let built = 0;
  let resolved = false;
  let caretText: {
    node: ReturnType<typeof $createTextNode>;
    offset: number;
  } | null = null;
  let caretAfter: ReturnType<typeof $createFilterChipNode> | null = null;

  for (const segment of segments) {
    if (segment.type === "text" && segment.text !== undefined) {
      const node = $createTextNode(segment.text);
      paragraph.append(node);
      const len = segment.text.length;
      if (caret != null && !resolved && caret <= built + len) {
        caretText = { node, offset: Math.max(0, caret - built) };
        resolved = true;
      }
      built += len;
    } else if (segment.type === "chip" && segment.predicate) {
      const node = $createFilterChipNode(segment.predicate);
      paragraph.append(node);
      const len = (serializePredicate(segment.predicate) ?? "").length;
      if (caret != null && !resolved && caret < built + len) {
        caretAfter = node;
        resolved = true;
      }
      built += len;
    }
  }

  if (caretText) {
    caretText.node.select(caretText.offset, caretText.offset);
  } else if (caretAfter) {
    caretAfter.selectNext(0, 0);
  } else {
    paragraph.selectEnd();
  }
}
