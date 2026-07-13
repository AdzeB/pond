import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { COMMAND_PRIORITY_NORMAL, TextNode } from "lexical";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  $replaceNodeWithChip,
  type AskTrigger,
} from "@/components/ask-bar/lib/editor-state";
import {
  $createMentionChipNode,
  $createSkillChipNode,
  $createTagChipNode,
} from "@/components/ask-bar/lib/nodes";
import type { CustomSkill } from "@/lib/save/skills";
import type { Save } from "@/lib/types";
import {
  type AskMenu,
  type AskMenuItem,
  buildSaveMenu,
  buildSkillMenu,
  buildTagMenu,
  tagCountsOf,
} from "./lib/menu-model";
import { AskMenuPanel, AskOption } from "./lib/menu-panel";

/** Typeahead for one trigger char; the Lexical plugin owns caret anchoring and keyboard nav. */
function TriggerMenu({
  triggerChar,
  build,
  onSelect,
  onClose,
}: {
  triggerChar: AskTrigger;
  build: (query: string) => AskMenu | null;
  onSelect: (
    item: AskMenuItem,
    node: TextNode | null,
    close: () => void,
  ) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  /** minLength 0 so the bare trigger opens the menu. */
  const triggerFn = useBasicTypeaheadTriggerMatch(triggerChar, {
    minLength: 0,
  });
  const menu = useMemo(
    () => (query === null ? null : build(query)),
    [query, build],
  );
  const options = useMemo(
    () => (menu ? menu.flat.map((item) => new AskOption(item)) : []),
    [menu],
  );

  return (
    <LexicalTypeaheadMenuPlugin<AskOption>
      options={options}
      triggerFn={triggerFn}
      onQueryChange={setQuery}
      onClose={onClose}
      /** NORMAL beats the composer's LOW enter/escape handlers, so those only fire when no menu is showing. */
      commandPriority={COMMAND_PRIORITY_NORMAL}
      onSelectOption={(option, nodeToReplace, closeMenu) =>
        onSelect(option.item, nodeToReplace, closeMenu)
      }
      menuRenderFn={(anchorRef, itemProps) =>
        menu && anchorRef.current
          ? createPortal(
              <AskMenuPanel menu={menu} {...itemProps} />,
              anchorRef.current,
            )
          : null
      }
    />
  );
}

function SkillMenu({
  skills,
  onCreateSkill,
}: {
  skills: ReadonlyArray<CustomSkill>;
  onCreateSkill: (name: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [expanded, setExpanded] = useState(false);
  const build = useCallback(
    (query: string) => buildSkillMenu(skills, query, expanded),
    [skills, expanded],
  );
  const onSelect = useCallback(
    (item: AskMenuItem, node: TextNode | null, close: () => void) => {
      switch (item.kind) {
        case "skill":
          editor.update(() => {
            if (node) {
              $replaceNodeWithChip(node, () =>
                $createSkillChipNode(
                  item.skill.id,
                  item.skill.name,
                  item.skill.prompt,
                ),
              );
            }
          });
          close();
          break;
        case "more":
          setExpanded(true);
          break;
        case "create":
          editor.update(() => node?.remove());
          onCreateSkill(item.name);
          close();
          break;
      }
    },
    [editor, onCreateSkill],
  );

  return (
    <TriggerMenu
      triggerChar="/"
      build={build}
      onSelect={onSelect}
      onClose={() => setExpanded(false)}
    />
  );
}

function SaveMenu({ saves }: { saves: ReadonlyArray<Save> }) {
  const [editor] = useLexicalComposerContext();
  const build = useCallback(
    (query: string) => buildSaveMenu(saves, query),
    [saves],
  );
  const onSelect = useCallback(
    (item: AskMenuItem, node: TextNode | null, close: () => void) => {
      if (item.kind !== "save") return;
      editor.update(() => {
        if (node) {
          $replaceNodeWithChip(node, () =>
            $createMentionChipNode(item.save.id, item.save.title ?? "Untitled"),
          );
        }
      });
      close();
    },
    [editor],
  );

  return <TriggerMenu triggerChar="@" build={build} onSelect={onSelect} />;
}

function TagMenu({ tagCounts }: { tagCounts: Map<string, number> }) {
  const [editor] = useLexicalComposerContext();
  const build = useCallback(
    (query: string) => buildTagMenu(tagCounts, query),
    [tagCounts],
  );
  const onSelect = useCallback(
    (item: AskMenuItem, node: TextNode | null, close: () => void) => {
      if (item.kind !== "tag") return;
      editor.update(() => {
        if (node) {
          $replaceNodeWithChip(node, () => $createTagChipNode(item.tag));
        }
      });
      close();
    },
    [editor],
  );

  return <TriggerMenu triggerChar="#" build={build} onSelect={onSelect} />;
}

/** Mirrors $readTrigger: token chars are anything but whitespace and the trigger glyphs. */
const TAG_TOKEN = /(^|\s)#([^\s#@/]+)(?=\s)/;

/** Converts a completed `#knownTag ` token into a chip as the user types; only exact matches against existing tags convert. */
function AutoTagChips({ tagCounts }: { tagCounts: Map<string, number> }) {
  const [editor] = useLexicalComposerContext();
  const canonical = useMemo(() => {
    const byLower = new Map<string, string>();
    for (const tag of tagCounts.keys()) byLower.set(tag.toLowerCase(), tag);
    return byLower;
  }, [tagCounts]);

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      if (!node.isSimpleText()) return;
      const match = TAG_TOKEN.exec(node.getTextContent());
      const name = match?.[2];
      if (!match || !name) return;
      const tag = canonical.get(name.toLowerCase());
      if (!tag) return;
      const start = match.index + (match[1]?.length ?? 0);
      const end = start + 1 + name.length;
      const parts = node.splitText(start, end);
      const target = start === 0 ? parts[0] : parts[1];
      target?.replace($createTagChipNode(tag));
    });
  }, [editor, canonical]);

  return null;
}

/** The `/`, `@`, and `#` trigger menus; only one resolves at a time. */
export function AskMentions({
  skills,
  saves,
  onCreateSkill,
}: {
  skills: ReadonlyArray<CustomSkill>;
  saves: ReadonlyArray<Save>;
  onCreateSkill: (name: string) => void;
}) {
  const tagCounts = useMemo(() => tagCountsOf(saves), [saves]);
  return (
    <>
      <SkillMenu skills={skills} onCreateSkill={onCreateSkill} />
      <SaveMenu saves={saves} />
      <TagMenu tagCounts={tagCounts} />
      <AutoTagChips tagCounts={tagCounts} />
    </>
  );
}
