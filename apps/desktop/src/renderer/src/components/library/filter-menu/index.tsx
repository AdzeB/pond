import {
  IconBarsFilterOutline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import {
  type FieldId,
  isPredicate,
  type Predicate,
} from "@pond/schema/filters/types";
import { Button, Menu, Tooltip } from "@pond/ui";
import { Fragment, useState } from "react";
import { useNlFacets } from "@/hooks/use-nl-query";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import {
  accountChipLabel,
  accountRefsFromSync,
} from "@/lib/search/account-aliases";
import { FIELD_ICONS } from "@/lib/search/fields";
import { useFolders } from "@/stores/folders";
import { libraryHeader } from "@/stores/library-header";
import { usePrefs } from "@/stores/prefs";
import { useTags } from "@/stores/tags";
import {
  setSearchInput,
  useFilterQuery,
  useSearchText,
} from "@/stores/view-store";
import { FilterCategory } from "./category";
import {
  choiceOptions,
  FILTER_GROUPS,
  type FilterOption,
  fieldMatchesQuery,
  presetOptions,
} from "./options";
import styles from "./styles.module.css";
import { filterToolbar, useFilterToolbar } from "./toolbar-state";

export function FilterToggle() {
  const { open } = useFilterToolbar();
  const query = useFilterQuery();
  const count = new Set(
    query.rules.filter(isPredicate).map((rule) => rule.field),
  ).size;
  return (
    <Tooltip label={open ? "Hide Filters" : "Show Filters"} side="bottom">
      <Button
        icon
        size="sm"
        variant="ghost"
        className={styles.trigger}
        data-active={open || count > 0 || undefined}
        aria-label={count ? `Filter (${count} active)` : "Filter"}
        aria-expanded={open}
        aria-controls="library-filter-toolbar"
        onClick={() => {
          libraryHeader.closePopover();
          filterToolbar.setOpen(!open);
        }}
      >
        <IconBarsFilterOutline18 />
        {count > 0 ? <span className={styles.count}>{count}</span> : null}
      </Button>
    </Tooltip>
  );
}

export function FilterBar() {
  const { open, pinned } = useFilterToolbar();
  const query = useFilterQuery();
  const text = useSearchText();
  const tags = useTags();
  const folders = useFolders();
  const facets = useNlFacets();
  const [sync] = usePrefs("sync");
  const refs = accountRefsFromSync(sync);
  const rows = query.rules.filter(isPredicate);
  const activeFields = rows.map((row) => row.field);
  const fields = [...new Set([...pinned, ...activeFields])];
  const choices: Partial<Record<FieldId, FilterOption[]>> = {
    tags: choiceOptions(
      "tags",
      tags.map((tag) => ({ label: tag.name, value: tag.name.toLowerCase() })),
    ),
    folder: choiceOptions(
      "folder",
      folders.map((folder) => ({
        label: folder.name,
        value: folder.id.toLowerCase(),
      })),
    ),
    source: choiceOptions(
      "source",
      facets.sources.map((value) => ({ label: value, value })),
    ),
    creator: choiceOptions(
      "creator",
      facets.creators.map((value) => ({ label: value, value })),
    ),
    account: choiceOptions(
      "account",
      refs.map((ref) => ({
        label: accountChipLabel(ref.id, refs),
        value: ref.id.toLowerCase(),
      })),
    ),
  };

  const apply = (next: Predicate[]) => {
    setSearchInput(next, text, text);
  };

  return (
    <fieldset
      id="library-filter-toolbar"
      className={styles.bar}
      aria-label="Library Filters"
      hidden={!open}
    >
      {open ? (
        <>
          {fields.map((field) => (
            <FilterCategory
              key={field}
              field={field}
              options={choices[field] ?? presetOptions(field)}
              rows={rows}
              onChange={apply}
            />
          ))}
          <CustomizeFilters choices={choices} activeFields={activeFields} />
          {rows.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className={styles.reset}
              onClick={() => apply([])}
            >
              Clear Filters
            </Button>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}

function CustomizeFilters({
  choices,
  activeFields,
}: {
  choices: Partial<Record<FieldId, FilterOption[]>>;
  activeFields: FieldId[];
}) {
  const { pinned } = useFilterToolbar();
  const [search, setSearch] = useState("");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const groups = FILTER_GROUPS.map((group) =>
    group.filter((field) =>
      fieldMatchesQuery(field, search, choices[field] ?? presetOptions(field)),
    ),
  ).filter((group) => group.length > 0);

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) libraryHeader.closePopover();
        else setSearch("");
      }}
    >
      <Tooltip label="Customize Filters" side="bottom">
        <Menu.Trigger
          icon
          size="sm"
          variant="ghost"
          aria-label="Customize Filters"
        >
          <IconPlusOutline18 />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup className={styles.popup}>
            <Menu.Input
              aria-label="Find Filter"
              placeholder="Find Filter…"
              value={search}
              onValueChange={setSearch}
            />
            <div className={styles.body} {...scrollFade}>
              {groups.map((group, index) => (
                <Fragment key={group[0]}>
                  {index > 0 ? <Menu.Separator /> : null}
                  {group.map((field) => {
                    const Icon = FIELD_ICONS[field];
                    return (
                      <Menu.CheckboxItem
                        key={field}
                        checked={pinned.includes(field)}
                        closeOnClick={false}
                        onCheckedChange={(checked) =>
                          filterToolbar.setPinned(field, checked)
                        }
                      >
                        <Menu.CheckboxItemIndicator />
                        <Menu.ItemIcon>
                          <Icon />
                        </Menu.ItemIcon>
                        <Menu.ItemLabel>
                          {FIELD_META[field].label}
                        </Menu.ItemLabel>
                        {activeFields.includes(field) ? (
                          <Menu.SecondaryLabel>Active</Menu.SecondaryLabel>
                        ) : null}
                      </Menu.CheckboxItem>
                    );
                  })}
                </Fragment>
              ))}
              {groups.length === 0 ? (
                <Menu.Item disabled>
                  <Menu.ItemLabel>No matches</Menu.ItemLabel>
                </Menu.Item>
              ) : null}
            </div>
            <Menu.Separator />
            <Menu.Item onClick={() => filterToolbar.restoreDefaults()}>
              <Menu.ItemLabel>Restore Default Filters</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
