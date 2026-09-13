import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
  IconBlockquoteOutline18,
  IconBulletListOutline18,
  IconCaretMinimizeOutline18,
  IconCheckListOutline18,
  IconCode2Outline18,
  IconGifOutline18,
  IconHeading1Outline18,
  IconHeading2Outline18,
  IconHeading3Outline18,
  IconHeading4Outline18,
  IconImageOutline18,
  IconMinusOutline18,
  IconOrderedListOutline18,
  IconPaperclipOutline18,
  IconSquareCodeOutline18,
  IconVideoOutline18,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { COMMAND_PRIORITY_NORMAL, type TextNode } from "lexical";
import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import {
  $applyNoteBlock,
  insertNoteFiles,
  type NoteBlock,
  promptYouTube,
} from "./commands";
import styles from "./styles.module.css";

type SlashKind = NoteBlock | "media" | "gif" | "files" | "youtube";

class SlashOption extends MenuOption {
  label: string;
  shortcut: string[] | undefined;
  glyph: ComponentType;
  kind: SlashKind;
  keywords: string;

  constructor(opts: {
    key: string;
    label: string;
    shortcut?: string[];
    glyph: ComponentType;
    kind: SlashKind;
    keywords?: string;
  }) {
    super(opts.key);
    this.label = opts.label;
    this.shortcut = opts.shortcut;
    this.glyph = opts.glyph;
    this.kind = opts.kind;
    this.keywords = opts.keywords ?? "";
  }
}

const GROUPS: SlashOption[][] = [
  [
    new SlashOption({
      key: "h1",
      label: "Heading 1",
      shortcut: ["⌘", "⌥", "1"],
      glyph: IconHeading1Outline18,
      kind: "h1",
      keywords: "#",
    }),
    new SlashOption({
      key: "h2",
      label: "Heading 2",
      shortcut: ["⌘", "⌥", "2"],
      glyph: IconHeading2Outline18,
      kind: "h2",
      keywords: "##",
    }),
    new SlashOption({
      key: "h3",
      label: "Heading 3",
      shortcut: ["⌘", "⌥", "3"],
      glyph: IconHeading3Outline18,
      kind: "h3",
      keywords: "###",
    }),
    new SlashOption({
      key: "h4",
      label: "Heading 4",
      shortcut: ["⌘", "⌥", "4"],
      glyph: IconHeading4Outline18,
      kind: "h4",
      keywords: "####",
    }),
  ],
  [
    new SlashOption({
      key: "bullet",
      label: "Bulleted List",
      shortcut: ["⌘", "⇧", "8"],
      glyph: IconBulletListOutline18,
      kind: "bullet",
      keywords: "-",
    }),
    new SlashOption({
      key: "number",
      label: "Numbered List",
      shortcut: ["⌘", "⇧", "9"],
      glyph: IconOrderedListOutline18,
      kind: "number",
      keywords: "1.",
    }),
    new SlashOption({
      key: "check",
      label: "Checklist",
      shortcut: ["⌘", "⇧", "7"],
      glyph: IconCheckListOutline18,
      kind: "check",
      keywords: "[] todo",
    }),
  ],
  [
    new SlashOption({
      key: "media",
      label: "Insert Media",
      glyph: IconImageOutline18,
      kind: "media",
      keywords: "image photo",
    }),
    new SlashOption({
      key: "gif",
      label: "Insert GIF",
      glyph: IconGifOutline18,
      kind: "gif",
    }),
    new SlashOption({
      key: "files",
      label: "Attach Files",
      shortcut: ["⌘", "⇧", "U"],
      glyph: IconPaperclipOutline18,
      kind: "files",
    }),
    new SlashOption({
      key: "youtube",
      label: "YouTube",
      glyph: IconVideoOutline18,
      kind: "youtube",
      keywords: "video embed",
    }),
  ],
  [
    new SlashOption({
      key: "code",
      label: "Code Block",
      shortcut: ["⌘", "⇧", "\\"],
      glyph: IconCode2Outline18,
      kind: "code",
      keywords: "```",
    }),
    new SlashOption({
      key: "diagram",
      label: "Diagram",
      glyph: IconSquareCodeOutline18,
      kind: "diagram",
      keywords: "mermaid",
    }),
    new SlashOption({
      key: "collapse",
      label: "Collapsible Section",
      shortcut: ["⌘", "⇧", "6"],
      glyph: IconCaretMinimizeOutline18,
      kind: "collapse",
    }),
    new SlashOption({
      key: "quote",
      label: "Blockquote",
      shortcut: ["⌥", "⇧", "."],
      glyph: IconBlockquoteOutline18,
      kind: "quote",
      keywords: ">",
    }),
    new SlashOption({
      key: "hr",
      label: "Divider",
      glyph: IconMinusOutline18,
      kind: "hr",
      keywords: "--- horizontal rule",
    }),
  ],
];

function slashTrigger(text: string): MenuTextMatch | null {
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(text);
  if (!match) return null;
  const query = match[1] ?? "";
  return {
    leadOffset: match.index + match[0].length - query.length - 1,
    matchingString: query,
    replaceableString: `/${query}`,
  };
}

function matchesQuery(item: SlashOption, term: string): boolean {
  if (!term) return true;
  return (
    item.label.toLowerCase().includes(term) ||
    item.keywords.toLowerCase().includes(term) ||
    item.key.includes(term) ||
    (item.shortcut?.join("").toLowerCase().includes(term) ?? false)
  );
}

export function SlashMenu() {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const groups = useMemo(() => {
    if (query === null) return [];
    const term = query.toLowerCase();
    return GROUPS.map((group) =>
      group.filter((item) => matchesQuery(item, term)),
    ).filter((group) => group.length > 0);
  }, [query]);
  const options = useMemo(() => groups.flat(), [groups]);

  const onSelect = useCallback(
    (option: SlashOption, node: TextNode | null, close: () => void) => {
      editor.update(() => {
        node?.remove();
        switch (option.kind) {
          case "media":
          case "gif":
          case "files":
          case "youtube":
            return;
          default:
            $applyNoteBlock(option.kind);
        }
      });
      close();
      switch (option.kind) {
        case "media":
        case "gif":
        case "files":
          void insertNoteFiles(editor, option.kind);
          return;
        case "youtube":
          promptYouTube(editor);
      }
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      options={options}
      triggerFn={slashTrigger}
      onQueryChange={setQuery}
      commandPriority={COMMAND_PRIORITY_NORMAL}
      preselectFirstItem
      onSelectOption={(option, nodeToReplace, closeMenu) =>
        onSelect(option, nodeToReplace, closeMenu)
      }
      menuRenderFn={(anchor, itemProps) =>
        anchor.current && options.length > 0
          ? createPortal(
              <SlashSurface>
                {groups.map((group, groupIndex) => (
                  <Menu.Group key={group[0]?.key ?? groupIndex}>
                    {groupIndex > 0 ? <Menu.Separator /> : null}
                    {group.map((option) => {
                      const Icon = option.glyph;
                      const index = options.indexOf(option);
                      const active = itemProps.selectedIndex === index;
                      return (
                        <Menu.Row
                          key={option.key}
                          id={`note-slash-${option.key}`}
                          ref={option.setRefElement}
                          role="option"
                          aria-selected={active}
                          tabIndex={-1}
                          highlighted={active}
                          onMouseDown={(event: ReactMouseEvent) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onMouseEnter={() =>
                            itemProps.setHighlightedIndex(index)
                          }
                          onClick={() =>
                            itemProps.selectOptionAndCleanUp(option)
                          }
                        >
                          <Menu.ItemIcon>
                            <Icon />
                          </Menu.ItemIcon>
                          <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
                          {option.shortcut ? (
                            <Menu.ItemKeyboard>
                              {option.shortcut}
                            </Menu.ItemKeyboard>
                          ) : null}
                        </Menu.Row>
                      );
                    })}
                  </Menu.Group>
                ))}
              </SlashSurface>,
              anchor.current,
            )
          : null
      }
    />
  );
}

function SlashSurface({ children }: { children: ReactNode }) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <Menu.Surface className={styles.slash} aria-label="Commands">
      <div className={styles.commands} {...scrollFade}>
        {children}
      </div>
    </Menu.Surface>
  );
}
