import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Predicate } from "@pond/schema/filters/types";
import {
  $applyNodeReplacement,
  $createTextNode,
  $getNodeByKey,
  DecoratorNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { serializePredicate } from "@/lib/search-syntax";
import { Chip } from "./chip";

export type SerializedFilterChipNode = Spread<
  { predicate: Predicate },
  SerializedLexicalNode
>;

// Inline, atomic node that renders a committed filter as a chip. Its text
// content is the serialized token, so reading the editor in order reproduces
// the full structured-search string.
export class FilterChipNode extends DecoratorNode<ReactNode> {
  __predicate: Predicate;

  static getType(): string {
    return "filter-chip";
  }

  static clone(node: FilterChipNode): FilterChipNode {
    return new FilterChipNode(node.__predicate, node.__key);
  }

  constructor(predicate: Predicate, key?: NodeKey) {
    super(key);
    this.__predicate = predicate;
  }

  isInline(): true {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  getPredicate(): Predicate {
    return this.__predicate;
  }

  getTextContent(): string {
    return serializePredicate(this.__predicate) ?? "";
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-flex";
    span.style.verticalAlign = "middle";
    span.setAttribute("data-filter-chip", "");
    return span;
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.textContent = this.getTextContent();
    return { element };
  }

  static importJSON(json: SerializedFilterChipNode): FilterChipNode {
    return $createFilterChipNode(json.predicate);
  }

  exportJSON(): SerializedFilterChipNode {
    return {
      ...super.exportJSON(),
      type: "filter-chip",
      version: 1,
      predicate: this.__predicate,
    };
  }

  decorate(_editor: unknown, _config: EditorConfig): ReactNode {
    return (
      <FilterChipComponent
        nodeKey={this.getKey()}
        predicate={this.__predicate}
      />
    );
  }
}

interface FilterChipComponentProps {
  nodeKey: NodeKey;
  predicate: Predicate;
}

function FilterChipComponent({ nodeKey, predicate }: FilterChipComponentProps) {
  const [editor] = useLexicalComposerContext();

  const remove = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      node?.remove();
    });
  };

  // Re-expand the chip into its raw token so the value can be tweaked, landing
  // the caret at the end of the token (consistent with the typed-syntax flow).
  const edit = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isFilterChipNode(node)) return;
      const token = serializePredicate(predicate) ?? "";
      const textNode = $createTextNode(token);
      node.replace(textNode);
      textNode.select(token.length, token.length);
    });
  };

  return <Chip predicate={predicate} onEdit={edit} onRemove={remove} />;
}

export function $createFilterChipNode(predicate: Predicate): FilterChipNode {
  return $applyNodeReplacement(new FilterChipNode(predicate));
}

export function $isFilterChipNode(
  node: LexicalNode | null | undefined,
): node is FilterChipNode {
  return node instanceof FilterChipNode;
}
