import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { IconSparkle3Fill18 as Sparkle } from "@pond/icons/fill/18";
import {
  $applyNodeReplacement,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  type DOMExportOutput,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { AskChip } from "@/components/ask-bar-chip";

// Shared keyboard/selection behavior for the inline chip decorators: click to
// select (highlight), then Backspace/Delete removes the selected chip.
function useChipSelection(nodeKey: NodeKey) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelected] =
    useLexicalNodeSelection(nodeKey);
  const ref = useRef<HTMLSpanElement>(null);

  const removeIfSelected = useCallback(
    (event: KeyboardEvent) => {
      if (!isSelected || !$isNodeSelection($getSelection())) return false;
      event.preventDefault();
      editor.update(() => $getNodeByKey(nodeKey)?.remove());
      return true;
    },
    [editor, isSelected, nodeKey],
  );

  useEffect(() => {
    const cleanups = [
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const el = ref.current;
          if (el && event.target instanceof Node && el.contains(event.target)) {
            if (!event.shiftKey) clearSelected();
            setSelected(!isSelected);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        removeIfSelected,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        removeIfSelected,
        COMMAND_PRIORITY_LOW,
      ),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [editor, isSelected, clearSelected, setSelected, removeIfSelected]);

  return { ref, isSelected };
}

// ---- Skill chip: expands to its saved prompt when the editor is read ----

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

  // Reading the editor expands the chip to the skill's saved prompt, so a skill
  // composed with trailing text sends as `<prompt> trailing`.
  getTextContent(): string {
    return this.__prompt;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-flex";
    span.style.verticalAlign = "middle";
    return span;
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

// ---- Mention chip: a referenced save, threaded to the agent by id ----

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

  // The mention contributes no text to the prompt; the save is passed to the
  // agent as a structured anchor id instead.
  getTextContent(): string {
    return "";
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-flex";
    span.style.verticalAlign = "middle";
    return span;
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

// ---- Tag chip: expands to the bare tag name, which Stage A resolves ----

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

  // The deterministic compiler matches live tag names in free text, so the chip
  // reads back as its bare name and resolves to a tags predicate.
  getTextContent(): string {
    return this.__tag;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-flex";
    span.style.verticalAlign = "middle";
    return span;
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
