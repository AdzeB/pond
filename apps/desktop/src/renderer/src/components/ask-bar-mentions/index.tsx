import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import { COMMAND_PRIORITY_NORMAL, TextNode } from "lexical";
import { motion } from "motion/react";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import {
  type CustomSkill,
  matchSkills,
  slugifySkillName,
} from "@/lib/save/skills";
import type { Save } from "@/lib/types";
import { bouncySpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

// How many skills the "/" menu shows before a "Show N more" expander appears.
const GROUP_CAP = 5;
const LOOKUP_CAP = 8;

type AskMenuItem =
  | { kind: "skill"; key: string; skill: CustomSkill }
  | { kind: "create"; key: string; name: string }
  | { kind: "more"; key: string; count: number }
  | { kind: "save"; key: string; save: Save }
  | { kind: "tag"; key: string; tag: string; count: number };

interface AskMenuGroup {
  id: string;
  label: string;
  items: AskMenuItem[];
}

interface AskMenu {
  groups: AskMenuGroup[];
  flat: AskMenuItem[];
}

function tagCountsOf(saves: ReadonlyArray<Save>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const save of saves) {
    if (save.deletedAt) continue;
    for (const tag of save.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

function matchSaves(saves: ReadonlyArray<Save>, query: string): Save[] {
  const q = query.trim().toLowerCase();
  const live = saves.filter((s) => !s.deletedAt);
  if (!q) return live.slice(0, LOOKUP_CAP);
  return live
    .filter((s) =>
      [s.title, s.author, s.url].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    )
    .slice(0, LOOKUP_CAP);
}

function matchTagList(
  counts: Map<string, number>,
  query: string,
): { tag: string; count: number }[] {
  const q = query.trim().toLowerCase();
  const all = Array.from(counts, ([tag, count]) => ({ tag, count }));
  const filtered = q ? all.filter((t) => t.tag.toLowerCase().includes(q)) : all;
  filtered.sort((a, b) => {
    if (q) {
      const ap = a.tag.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.tag.toLowerCase().startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
    }
    return b.count - a.count || a.tag.localeCompare(b.tag);
  });
  return filtered.slice(0, LOOKUP_CAP);
}

function buildSkillMenu(
  skills: ReadonlyArray<CustomSkill>,
  query: string,
  expanded: boolean,
): AskMenu {
  const matched = matchSkills(skills, query);
  const visible = expanded ? matched : matched.slice(0, GROUP_CAP);
  const items: AskMenuItem[] = visible.map((skill) => ({
    kind: "skill",
    key: `skill-${skill.id}`,
    skill,
  }));
  if (!expanded && matched.length > GROUP_CAP) {
    items.push({
      kind: "more",
      key: "more",
      count: matched.length - GROUP_CAP,
    });
  }
  items.push({ kind: "create", key: "create", name: slugifySkillName(query) });
  return { groups: [{ id: "skills", label: "Skills", items }], flat: items };
}

function buildSaveMenu(
  saves: ReadonlyArray<Save>,
  query: string,
): AskMenu | null {
  const items: AskMenuItem[] = matchSaves(saves, query).map((save) => ({
    kind: "save",
    key: `save-${save.id}`,
    save,
  }));
  if (items.length === 0) return null;
  return { groups: [{ id: "saves", label: "Saves", items }], flat: items };
}

function buildTagMenu(
  tagCounts: Map<string, number>,
  query: string,
): AskMenu | null {
  const items: AskMenuItem[] = matchTagList(tagCounts, query).map((t) => ({
    kind: "tag",
    key: `tag-${t.tag}`,
    tag: t.tag,
    count: t.count,
  }));
  if (items.length === 0) return null;
  return { groups: [{ id: "tags", label: "Tags", items }], flat: items };
}

class AskOption extends MenuOption {
  item: AskMenuItem;
  constructor(item: AskMenuItem) {
    super(item.key);
    this.item = item;
  }
}

// The grouped popup, portaled into the plugin's caret-anchored container so it
// always sits on the active trigger token. `.menu` positions it above the caret.
function AskMenuPanel({
  menu,
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  menu: AskMenu;
  options: AskOption[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: AskOption) => void;
  setHighlightedIndex: (index: number) => void;
}) {
  return (
    <motion.div
      className={styles.menu}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={bouncySpring}
    >
      {menu.groups.map((group) => (
        <div key={group.id} className={styles.menuGroup}>
          <div className={styles.menuGroupLabel}>{group.label}</div>
          {group.items.map((item) => {
            const index = menu.flat.indexOf(item);
            const option = options[index];
            return (
              <AskMenuRow
                key={item.key}
                item={item}
                active={selectedIndex === index}
                onHover={() => setHighlightedIndex(index)}
                onSelect={() => option && selectOptionAndCleanUp(option)}
              />
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}

function AskMenuRow({
  item,
  active,
  onHover,
  onSelect,
}: {
  item: AskMenuItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const common = {
    type: "button" as const,
    "data-active": active || undefined,
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onMouseEnter: onHover,
    onClick: onSelect,
  };

  if (item.kind === "more") {
    return (
      <button className={styles.menuMore} {...common}>
        Show {item.count} more
      </button>
    );
  }

  if (item.kind === "create") {
    return (
      <button className={styles.menuCreate} {...common}>
        <Plus width={14} height={14} />
        {item.name ? `Create skill “/${item.name}”` : "Create skill…"}
      </button>
    );
  }

  const name =
    item.kind === "skill"
      ? `/${item.skill.name}`
      : item.kind === "tag"
        ? `#${item.tag}`
        : (item.save.title ?? "Untitled");
  const description =
    item.kind === "skill"
      ? item.skill.description || item.skill.prompt
      : item.kind === "tag"
        ? `${item.count} ${item.count === 1 ? "item" : "items"}`
        : [item.save.source, item.save.author].filter(Boolean).join(" · ");

  return (
    <button className={styles.menuRow} {...common}>
      <span className={styles.menuName}>{name}</span>
      <span className={styles.menuDesc}>{description}</span>
    </button>
  );
}

// Generic typeahead for one trigger char. The plugin owns caret anchoring and
// keyboard nav; we supply the options, the popup, and the on-select behavior.
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
  // minLength 0 so the bare trigger (e.g. just "@") opens the menu.
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
      // NORMAL beats the composer's LOW enter/escape handlers while open, so
      // they only fire (send / collapse) when no menu is showing.
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
          // Expand the list in place; keep the menu open.
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

// Token chars after a trigger, mirroring $readTrigger: anything but whitespace
// and the trigger glyphs.
const TAG_TOKEN = /(^|\s)#([^\s#@/]+)(?=\s)/;

// Auto-convert a completed `#knownTag ` token (one followed by whitespace) into
// a tag chip as the user types, so you don't have to go through the `#` menu.
// Only exact matches against existing tags convert; unknown `#foo` stays text.
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

// A non-interactive render of the trigger menu used by the component lab, so the
// menu's rows can be styled in isolation without driving a live Lexical caret.
// Combines one group per trigger (skills / saves / tags) into a single popup.
export function AskMenuShowcase({
  skills,
  saves,
}: {
  skills: ReadonlyArray<CustomSkill>;
  saves: ReadonlyArray<Save>;
}) {
  const [active, setActive] = useState(0);
  const tagCounts = useMemo(() => tagCountsOf(saves), [saves]);
  const menu = useMemo<AskMenu>(() => {
    const groups = [
      buildSkillMenu(skills, "", false).groups[0],
      buildSaveMenu(saves, "")?.groups[0],
      buildTagMenu(tagCounts, "")?.groups[0],
    ].filter((g): g is AskMenuGroup => g != null);
    return { groups, flat: groups.flatMap((g) => g.items) };
  }, [skills, saves, tagCounts]);

  return (
    <div className={styles.menuStatic}>
      {menu.groups.map((group) => (
        <div key={group.id} className={styles.menuGroup}>
          <div className={styles.menuGroupLabel}>{group.label}</div>
          {group.items.map((item) => {
            const index = menu.flat.indexOf(item);
            return (
              <AskMenuRow
                key={item.key}
                item={item}
                active={index === active}
                onHover={() => setActive(index)}
                onSelect={() => setActive(index)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// All three trigger menus (`/` skills, `@` saves, `#` tags), each a Lexical
// typeahead anchored to the caret. Only one resolves at a time.
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
