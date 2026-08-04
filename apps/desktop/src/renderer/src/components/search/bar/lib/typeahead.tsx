import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import {
  $createTextNode,
  COMMAND_PRIORITY_NORMAL,
  type TextNode,
} from "lexical";
import { motion } from "motion/react";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  canonicalKey,
  DATE_PRESETS,
  fieldForKey,
  TOKEN_FIELDS,
} from "@/lib/search/syntax";
import { bouncySpring } from "@/lib/ui/motion";
import styles from "./typeahead.module.css";

const LOOKUP_CAP = 8;

interface ValueSuggestion {
  value: string;
  label: string;
}

interface TypeaheadFacets {
  tags: ReadonlyArray<string>;
  sources: ReadonlyArray<string>;
}

/** Free-form fields return null so the caret keeps plain text. */
function valueSuggestionsFor(
  field: FieldId,
  facets: TypeaheadFacets,
): ValueSuggestion[] | null {
  if (field === "tags") {
    return facets.tags.map((tag) => ({ value: tag, label: tag }));
  }
  if (field === "source") {
    const values = facets.sources.includes("local")
      ? facets.sources
      : [...facets.sources, "local"];
    return values.map((value) => ({
      value,
      label: value === "local" ? "Local" : value,
    }));
  }
  const meta = FIELD_META[field];
  if (meta.presets) {
    return meta.presets.map((p) => ({
      value: String(p.value),
      label: p.label,
    }));
  }
  if (meta.type === "date") {
    return DATE_PRESETS.map((d) => ({ value: d.slug, label: d.label }));
  }
  return null;
}

type MenuItem =
  | { kind: "field"; key: string; field: FieldId; label: string; token: string }
  | {
      kind: "value";
      key: string;
      label: string;
      description: string;
      token: string;
    };

/** Suggests field keys while typing the key, concrete values once a `key:` prefix is present. */
function buildMenu(
  raw: string,
  facets: TypeaheadFacets,
): { title: string; items: MenuItem[] } | null {
  const negate = raw.startsWith("-");
  const body = negate ? raw.slice(1) : raw;
  const prefix = negate ? "-" : "";

  const opMatch = /^([A-Za-z][\w]*)(:|>=|<=|>|<)(.*)$/.exec(body);
  if (opMatch) {
    const field = fieldForKey(opMatch[1] as string);
    if (!field) return null;
    const suggestions = valueSuggestionsFor(field, facets);
    if (!suggestions) return null;
    const q = (opMatch[3] as string).toLowerCase();
    const key = canonicalKey(field);
    const items: MenuItem[] = suggestions
      .filter(
        (s) =>
          !q ||
          s.value.toLowerCase().includes(q) ||
          s.label.toLowerCase().includes(q),
      )
      .slice(0, LOOKUP_CAP)
      .map((s) => ({
        kind: "value" as const,
        key: `value-${s.value}`,
        label: s.label,
        description: `${prefix}${key}:${s.value}`,
        token: `${prefix}${key}:${quoteIfNeeded(s.value)}`,
      }));
    if (items.length === 0) return null;
    return { title: FIELD_META[field].label, items };
  }

  const q = body.toLowerCase();
  const items: MenuItem[] = TOKEN_FIELDS.filter(
    (spec) =>
      spec.keys.some((k) => k.includes(q)) ||
      FIELD_META[spec.field].label.toLowerCase().includes(q),
  )
    .slice(0, LOOKUP_CAP)
    .map((spec) => {
      const key = spec.keys[0] as string;
      return {
        kind: "field" as const,
        key: `field-${spec.field}`,
        field: spec.field,
        label: FIELD_META[spec.field].label,
        token: `${prefix}${key}:`,
      };
    });
  if (items.length === 0) return null;
  return { title: "Filters", items };
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

class FilterOption extends MenuOption {
  item: MenuItem;
  constructor(item: MenuItem) {
    super(item.key);
    this.item = item;
  }
}

/** Only fires on a run that starts with a letter or its negation, so ordinary words don't pop the menu. */
function triggerFn(text: string): MenuTextMatch | null {
  const match = /(?:^|\s)(-?[A-Za-z][^\s]*)$/.exec(text);
  if (!match) return null;
  const token = match[1] as string;
  const leadOffset = match.index + (match[0].length - token.length);
  return { leadOffset, matchingString: token, replaceableString: token };
}

export function FilterTypeahead({
  tags,
  sources,
}: {
  tags: ReadonlyArray<string>;
  sources: ReadonlyArray<string>;
}) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const facets = useMemo(() => ({ tags, sources }), [tags, sources]);

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
      if (item.kind === "field") {
        /** Drop the `key:` and reopen for value suggestions rather than closing. */
        editor.update(() => {
          if (node) {
            node.setTextContent(item.token);
            node.selectEnd();
          }
        });
        return;
      }
      /** Inserted as plain text; the token entity plugin wraps it into an editable highlighted token on the next transform. */
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
      onSelectOption={(option, nodeToReplace, closeMenu) =>
        onSelect(option, nodeToReplace, closeMenu)
      }
      menuRenderFn={(anchorRef, itemProps) =>
        menu && anchorRef.current
          ? createPortal(
              <MenuPanel menu={menu} {...itemProps} />,
              anchorRef.current,
            )
          : null
      }
    />
  );
}

function MenuPanel({
  menu,
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  menu: { title: string; items: MenuItem[] };
  options: FilterOption[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: FilterOption) => void;
  setHighlightedIndex: (index: number) => void;
}) {
  return (
    <motion.div
      className={styles.menu}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={bouncySpring}
    >
      <div className={styles["group-label"]}>{menu.title}</div>
      {menu.items.map((item, index) => {
        const option = options[index];
        return (
          <MenuRow
            key={item.key}
            item={item}
            active={selectedIndex === index}
            onHover={() => setHighlightedIndex(index)}
            onSelect={() => option && selectOptionAndCleanUp(option)}
          />
        );
      })}
    </motion.div>
  );
}

function MenuRow({
  item,
  active,
  onHover,
  onSelect,
}: {
  item: MenuItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.row}
      data-active={active || undefined}
      onMouseDown={(e: ReactMouseEvent) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <span className={styles.name}>{item.label}</span>
      <span className={styles.description}>
        {item.kind === "field" ? item.token : item.description}
      </span>
    </button>
  );
}
