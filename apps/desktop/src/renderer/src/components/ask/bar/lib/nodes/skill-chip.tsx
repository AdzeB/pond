import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { IconSparkle3Fill18 as Sparkle } from "@pond/icons/fill/18";
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

type SerializedSkillChipNode = Spread<
  { skillId: string; name: string; prompt: string },
  SerializedLexicalNode
>;

export class SkillChipNode extends DecoratorNode<ReactNode> {
  __skillId: string;
  __name: string;
  __prompt: string;

  static getType(): string {
    return "ask-skill-chip";
  }

  static clone(node: SkillChipNode): SkillChipNode {
    return new SkillChipNode(
      node.__skillId,
      node.__name,
      node.__prompt,
      node.__key,
    );
  }

  constructor(skillId: string, name: string, prompt: string, key?: NodeKey) {
    super(key);
    this.__skillId = skillId;
    this.__name = name;
    this.__prompt = prompt;
  }

  isInline(): true {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  getName(): string {
    return this.__name;
  }

  /** Expands to the skill's saved prompt, so a skill composed with trailing text sends as `<prompt> trailing`. */
  getTextContent(): string {
    return this.__prompt;
  }

  createDOM(): HTMLElement {
    return createInlineChipDOM();
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.textContent = this.__prompt;
    return { element };
  }

  static importJSON(json: SerializedSkillChipNode): SkillChipNode {
    return $createSkillChipNode(json.skillId, json.name, json.prompt);
  }

  exportJSON(): SerializedSkillChipNode {
    return {
      ...super.exportJSON(),
      type: "ask-skill-chip",
      version: 1,
      skillId: this.__skillId,
      name: this.__name,
      prompt: this.__prompt,
    };
  }

  decorate(): ReactNode {
    return <SkillChipComponent nodeKey={this.getKey()} name={this.__name} />;
  }
}

function SkillChipComponent({
  nodeKey,
  name,
}: {
  nodeKey: NodeKey;
  name: string;
}) {
  const [editor] = useLexicalComposerContext();
  const { ref, isSelected } = useChipSelection(nodeKey);
  const remove = () => editor.update(() => $getNodeByKey(nodeKey)?.remove());
  return (
    <AskChip
      ref={ref}
      selected={isSelected}
      tone="skill"
      lead={<Sparkle width={13} height={13} />}
      label={`/${name}`}
      onRemove={remove}
    />
  );
}

export function $createSkillChipNode(
  skillId: string,
  name: string,
  prompt: string,
): SkillChipNode {
  return $applyNodeReplacement(new SkillChipNode(skillId, name, prompt));
}

export function $isSkillChipNode(
  node: LexicalNode | null | undefined,
): node is SkillChipNode {
  return node instanceof SkillChipNode;
}
