import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { Menu } from "@pond/ui";
import {
  $createTextNode,
  COMMAND_PRIORITY_NORMAL,
  type TextNode,
} from "lexical";
import {
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useFolders } from "@/features/library";
import {
  accountChipLabel,
  accountRefsFromSync,
  displayAccountToken,
} from "@/features/search/lib/account-aliases";
import { fieldIcon } from "@/features/search/lib/fields";
import { usePrefs } from "@/shared/state/prefs";
import styles from "./styles.module.css";
import { buildMenu, type MenuItem, triggerFn } from "./suggestions";

class FilterOption extends MenuOption {
  item: MenuItem;
  constructor(item: MenuItem) {
    super(item.key);
    this.item = item;
  }
}

export function FilterTypeahead({
  hostRef,
  onOpenChange,
  tags,
  sources,
  creators,
}: {
  hostRef: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  tags: ReadonlyArray<string>;
  sources: ReadonlyArray<string>;
  creators: ReadonlyArray<string>;
}) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const [sync] = usePrefs("sync");
  const folders = useFolders();
  const accounts = useMemo(() => {
    const refs = accountRefsFromSync(sync);
    return refs.map((ref) => ({
      value: displayAccountToken(ref.id, refs),
      label: accountChipLabel(ref.id, refs),
    }));
  }, [sync]);
  const facets = useMemo(
    () => ({
      tags,
      sources,
      creators,
      accounts,
      folders: folders.map((folder) => ({
        value: folder.id,
        label: folder.name,
      })),
    }),
    [tags, sources, creators, accounts, folders],
  );

  const menu = useMemo(
    () => (query === null ? null : buildMenu(query, facets)),
    [query, facets],
  );
  const options = useMemo(
    () => (menu ? menu.items.map((item) => new FilterOption(item)) : []),
    [menu],
  );

  const onSelect = useCallback(
    (option: FilterOption, node: TextNode | null, close: () => void) => {
      const item = option.item;
      editor.update(() => {
        if (!node) return;
        const replacement = $createTextNode(`${item.token} `);
        node.replace(replacement);
        replacement.selectEnd();
      });
      close();
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<FilterOption>
      options={options}
      triggerFn={triggerFn}
      onQueryChange={setQuery}
      commandPriority={COMMAND_PRIORITY_NORMAL}
      preselectFirstItem={false}
      ignoreEntityBoundary
      /** Hide Lexical's caret-sized anchor; placement comes from the search host. */
      anchorClassName={styles["lexical-anchor"]}
      onSelectOption={(option, nodeToReplace, closeMenu) =>
        onSelect(option, nodeToReplace, closeMenu)
      }
      menuRenderFn={(lexicalAnchor, itemProps) =>
        menu && lexicalAnchor.current && hostRef.current
          ? createPortal(
              <MenuPanel
                menu={menu}
                onOpenChange={onOpenChange}
                {...itemProps}
              />,
              hostRef.current,
            )
          : null
      }
    />
  );
}

function MenuPanel({
  menu,
  onOpenChange,
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  menu: { title: string; items: MenuItem[] };
  onOpenChange: (open: boolean) => void;
  options: FilterOption[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: FilterOption) => void;
  setHighlightedIndex: (index: number) => void;
}) {
  useEffect(() => {
    onOpenChange(true);
    return () => onOpenChange(false);
  }, [onOpenChange]);
  return (
    <div
      className={styles.anchor}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Menu.Surface className={styles.menu}>
        <Menu.SectionLabel>{menu.title}</Menu.SectionLabel>
        <Menu.List
          className={styles.list}
          role="listbox"
          aria-label={menu.title}
        >
          {menu.items.map((item, index) => {
            const option = options[index];
            return (
              <MenuRow
                key={item.key}
                item={item}
                index={index}
                option={option}
                active={selectedIndex === index}
                onHover={() => setHighlightedIndex(index)}
                onSelect={() => option && selectOptionAndCleanUp(option)}
              />
            );
          })}
        </Menu.List>
      </Menu.Surface>
    </div>
  );
}

function MenuRow({
  item,
  index,
  option,
  active,
  onHover,
  onSelect,
}: {
  item: MenuItem;
  index: number;
  option: FilterOption | undefined;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = fieldIcon(item.field);
  return (
    <Menu.Row
      id={`typeahead-item-${index}`}
      ref={option?.setRefElement}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      highlighted={active}
      onMouseDown={(e: ReactMouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <Menu.ItemIcon>
        <Icon />
      </Menu.ItemIcon>
      <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
      <Menu.SecondaryLabel>{item.description}</Menu.SecondaryLabel>
    </Menu.Row>
  );
}
