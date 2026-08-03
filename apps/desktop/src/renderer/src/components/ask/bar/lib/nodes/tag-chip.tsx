import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $applyNodeReplacement,
  $getNodeByKey,
  DecoratorNode,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { AskChip } from "@/components/ask/chip";
import { createInlineChipDOM, useChipSelection } from "./chip-selection";

type SerializedTagChipNode = Spread<{ tag: string }, SerializedLexicalNode>;

export class TagChipNode extends DecoratorNode<ReactNode> {
  __tag: string;

  static getType(): string {
    return "ask-tag-chip";
  }

  static clone(node: TagChipNode): TagChipNode {
    return new TagChipNode(node.__tag, node.__key);
  }

  constructor(tag: string, key?: NodeKey) {
    super(key);
    this.__tag = tag;
  }

  isInline(): true {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  getTag(): string {
    return this.__tag;
  }

  /** The deterministic compiler matches live tag names in free text, so the chip reads back as its bare name and resolves to a tags predicate. */
  getTextContent(): string {
    return this.__tag;
  }

  createDOM(): HTMLElement {
    return createInlineChipDOM();
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.textContent = this.__tag;
    return { element };
  }

  static importJSON(json: SerializedTagChipNode): TagChipNode {
    return $createTagChipNode(json.tag);
  }

  exportJSON(): SerializedTagChipNode {
    return {
      ...super.exportJSON(),
      type: "ask-tag-chip",
      version: 1,
      tag: this.__tag,
    };
  }

  decorate(): ReactNode {
    return <TagChipComponent nodeKey={this.getKey()} tag={this.__tag} />;
  }
}

function TagChipComponent({ nodeKey, tag }: { nodeKey: NodeKey; tag: string }) {
  const [editor] = useLexicalComposerContext();
  const { ref, isSelected } = useChipSelection(nodeKey);
  const remove = () => editor.update(() => $getNodeByKey(nodeKey)?.remove());
  return (
    <AskChip
      ref={ref}
      selected={isSelected}
      tone="tag"
      lead="#"
      label={tag}
      title={`#${tag}`}
      onRemove={remove}
    />
  );
}

export function $createTagChipNode(tag: string): TagChipNode {
  return $applyNodeReplacement(new TagChipNode(tag));
}

export function $isTagChipNode(
  node: LexicalNode | null | undefined,
): node is TagChipNode {
  return node instanceof TagChipNode;
}
