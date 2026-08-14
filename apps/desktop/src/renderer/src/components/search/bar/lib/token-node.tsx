import {
  $applyNodeReplacement,
  type EditorConfig,
  type SerializedTextNode,
  TextNode,
} from "lexical";
import styles from "./token-node.module.css";

const TOKEN_CLASS = styles.token ?? "filter-token";

/** Highlighted but fully editable text, the same pattern Lexical uses for hashtags; the token-plugin transform reverts it to plain text the moment the syntax breaks. */
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

  /** Typing right before a token must not merge into it, matching hashtag behavior. */
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

export function $isFilterTokenNode(node: unknown): node is FilterTokenNode {
  return node instanceof FilterTokenNode;
}
