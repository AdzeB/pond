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

type SerializedMentionChipNode = Spread<
  { saveId: string; title: string },
  SerializedLexicalNode
>;

export class MentionChipNode extends DecoratorNode<ReactNode> {
  __saveId: string;
  __title: string;

  static getType(): string {
    return "ask-mention-chip";
  }

  static clone(node: MentionChipNode): MentionChipNode {
    return new MentionChipNode(node.__saveId, node.__title, node.__key);
  }

  constructor(saveId: string, title: string, key?: NodeKey) {
    super(key);
    this.__saveId = saveId;
    this.__title = title;
  }

  isInline(): true {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  getSaveId(): string {
    return this.__saveId;
  }

  getTitle(): string {
    return this.__title;
  }

  /** Contributes no prompt text; the save reaches the agent as a structured anchor id instead. */
  getTextContent(): string {
    return "";
  }

  createDOM(): HTMLElement {
    return createInlineChipDOM();
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.textContent = `@${this.__title}`;
    return { element };
  }

  static importJSON(json: SerializedMentionChipNode): MentionChipNode {
    return $createMentionChipNode(json.saveId, json.title);
  }

  exportJSON(): SerializedMentionChipNode {
    return {
      ...super.exportJSON(),
      type: "ask-mention-chip",
      version: 1,
      saveId: this.__saveId,
      title: this.__title,
    };
  }

  decorate(): ReactNode {
    return (
      <MentionChipComponent nodeKey={this.getKey()} title={this.__title} />
    );
  }
}

function MentionChipComponent({
  nodeKey,
  title,
}: {
  nodeKey: NodeKey;
  title: string;
}) {
  const [editor] = useLexicalComposerContext();
  const { ref, isSelected } = useChipSelection(nodeKey);
  const remove = () => editor.update(() => $getNodeByKey(nodeKey)?.remove());
  return (
    <AskChip
      ref={ref}
      selected={isSelected}
      tone="mention"
      lead="@"
      label={title}
      title={`@${title}`}
      onRemove={remove}
    />
  );
}

export function $createMentionChipNode(
  saveId: string,
  title: string,
): MentionChipNode {
  return $applyNodeReplacement(new MentionChipNode(saveId, title));
}

export function $isMentionChipNode(
  node: LexicalNode | null | undefined,
): node is MentionChipNode {
  return node instanceof MentionChipNode;
}
