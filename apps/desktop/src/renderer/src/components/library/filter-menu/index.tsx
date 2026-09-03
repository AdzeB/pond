import {
  IconBarsFilterOutline18,
  IconImageOutline18,
  IconPlusOutline18,
  IconWandSparkleOutline18,
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
import { useTagGroups } from "@/stores/tag-groups";
import { useTags } from "@/stores/tags";
import {
  setSearchInput,
  setSemanticQuery,
  setVisualProbe,
  useFilterQuery,
  useSearchText,
  useSemanticQuery,
  useVisualProbe,
} from "@/stores/view-store";
import { FilterCategory } from "./category";
import {
  choiceOptions,
  FILTER_GROUPS,
  type FilterOption,
  fieldMatchesQuery,
  presetOptions,
} from "./options";
import { SemanticChip, VisualChip } from "./overlay";
import styles from "./styles.module.css";
import { filterToolbar, useFilterToolbar } from "./toolbar-state";

export function FilterToggle() {
  const { open } = useFilterToolbar();
  const query = useFilterQuery();
  const semantic = useSemanticQuery();
  const visual = useVisualProbe();
  const overlayCount = Number(Boolean(semantic)) + Number(Boolean(visual));
  const count =
    new Set(query.rules.filter(isPredicate).map((rule) => rule.field)).size +
    overlayCount;
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
  const { open, pinned, overlays } = useFilterToolbar();
  const query = useFilterQuery();
  const text = useSearchText();
  const semantic = useSemanticQuery();
  const visual = useVisualProbe();
  const tags = useTags();
  const tagGroups = useTagGroups();
  const folders = useFolders();
  const facets = useNlFacets();
  const [sync] = usePrefs("sync");
  const refs = accountRefsFromSync(sync);
  const rows = query.rules.filter(isPredicate);
  const activeFields = rows.map((row) => row.field);
  const fields = [...new Set([...pinned, ...activeFields])];
  const shownOverlays = [
    ...(overlays.includes("semantic") || semantic
      ? (["semantic"] as const)
      : []),
    ...(overlays.includes("visual") || visual ? (["visual"] as const) : []),
  ];
  const overlayActive = Boolean(semantic || visual);
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
      className={styles.shell}
      aria-label="Library Filters"
      aria-hidden={!open}
      data-open={open || undefined}
      inert={!open}
    >
      <div className={styles.bar}>
        {shownOverlays.map((overlay) =>
          overlay === "semantic" ? (
            <SemanticChip key="semantic" />
          ) : (
            <VisualChip key="visual" />
          ),
        )}
        {fields.map((field) => (
          <FilterCategory
            key={field}
            field={field}
            options={choices[field] ?? presetOptions(field)}
            tagGroups={field === "tags" ? tagGroups : undefined}
            rows={rows}
            onChange={apply}
          />
        ))}
        <CustomizeFilters
          choices={choices}
          activeFields={activeFields}
          semanticActive={Boolean(semantic)}
          visualActive={Boolean(visual)}
        />
        {rows.length > 0 || overlayActive ? (
          <Button
            size="sm"
            variant="ghost"
            className={styles.reset}
            onClick={() => {
              apply([]);
              setSemanticQuery(null);
              setVisualProbe(null);
            }}
          >
            Clear Filters
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}

function CustomizeFilters({
  choices,
  activeFields,
  semanticActive,
  visualActive,
}: {
  choices: Partial<Record<FieldId, FilterOption[]>>;
  activeFields: FieldId[];
  semanticActive: boolean;
  visualActive: boolean;
}) {
  const { pinned, overlays } = useFilterToolbar();
  const [search, setSearch] = useState("");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const overlayQuery = search.trim().toLowerCase();
  const showSemantic = !overlayQuery || "semantic".includes(overlayQuery);
  const showVisual =
    !overlayQuery ||
    "visual match".includes(overlayQuery) ||
    "visual".includes(overlayQuery);
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
              {showSemantic || showVisual ? (
                <>
                  {showSemantic ? (
                    <Menu.CheckboxItem
                      checked={overlays.includes("semantic")}
                      closeOnClick={false}
                      onCheckedChange={(checked) =>
                        filterToolbar.setOverlayPinned("semantic", checked)
                      }
                    >
                      <Menu.CheckboxItemIndicator />
                      <Menu.ItemIcon>
                        <IconWandSparkleOutline18 />
                      </Menu.ItemIcon>
                      <Menu.ItemLabel>Semantic</Menu.ItemLabel>
                      {semanticActive ? (
                        <Menu.SecondaryLabel>Active</Menu.SecondaryLabel>
                      ) : null}
                    </Menu.CheckboxItem>
                  ) : null}
                  {showVisual ? (
                    <Menu.CheckboxItem
                      checked={overlays.includes("visual")}
                      closeOnClick={false}
                      onCheckedChange={(checked) =>
                        filterToolbar.setOverlayPinned("visual", checked)
                      }
                    >
                      <Menu.CheckboxItemIndicator />
                      <Menu.ItemIcon>
                        <IconImageOutline18 />
                      </Menu.ItemIcon>
                      <Menu.ItemLabel>Visual Match</Menu.ItemLabel>
                      {visualActive ? (
                        <Menu.SecondaryLabel>Active</Menu.SecondaryLabel>
                      ) : null}
                    </Menu.CheckboxItem>
                  ) : null}
                  {groups.length > 0 ? <Menu.Separator /> : null}
                </>
              ) : null}
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
              {groups.length === 0 && !showSemantic && !showVisual ? (
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
