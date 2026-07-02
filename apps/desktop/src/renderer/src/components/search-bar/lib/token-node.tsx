import {
  $applyNodeReplacement,
  type EditorConfig,
  type LexicalNode,
  type SerializedTextNode,
  TextNode,
} from "lexical";
import styles from "../styles.module.css";

const TOKEN_CLASS = styles.token ?? "filter-token";

// A structured-filter token (e.g. `source:twitter`) rendered as highlighted but
// still fully editable text — the same pattern Lexical uses for hashtags. The
// `registerLexicalTextEntity` transform (see token-plugin) wraps matching text
// into this node and reverts it to plain text the moment the syntax breaks, so
// the caret can move into a token and edit its value inline.
export class FilterTokenNode extends TextNode {
  static getType(): string {
    return "filter-token";
  }

  static clone(node: FilterTokenNode): FilterTokenNode {
    return new FilterTokenNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.classList.add(TOKEN_CLASS);
    return element;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const updated = super.updateDOM(prevNode, dom, config);
    dom.classList.add(TOKEN_CLASS);
    return updated;
  }

  static importJSON(json: SerializedTextNode): FilterTokenNode {
    return $createFilterTokenNode().updateFromJSON(json);
  }

  exportJSON(): SerializedTextNode {
    return { ...super.exportJSON(), type: "filter-token", version: 1 };
  }

  // Typing right before a token shouldn't merge into it (matches hashtag).
  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
  }
}

export function $createFilterTokenNode(text = ""): FilterTokenNode {
  return $applyNodeReplacement(new FilterTokenNode(text));
}

export function $isFilterTokenNode(
  node: LexicalNode | null | undefined,
): node is FilterTokenNode {
  return node instanceof FilterTokenNode;
}
