import { IconBarsFilterOutline18 } from "@pond/icons/outline/18";
import {
  type FieldId,
  isPredicate,
  type Predicate,
} from "@pond/schema/filters/types";
import { Button, Tooltip } from "@pond/ui";
import { useNlFacets } from "@/hooks/use-nl-query";
import {
  accountChipLabel,
  accountRefsFromSync,
} from "@/lib/search/account-aliases";
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
import { CustomizeFilters } from "./customize";
import { choiceOptions, type FilterOption, presetOptions } from "./options";
import { SemanticChip, VisualChip } from "./overlay";
import styles from "./styles.module.css";
import {
  filterToolbar,
  type OverlayId,
  useFilterToolbar,
} from "./toolbar-state";

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
  const activeFields = rows.map((row) =>
    row.field === "height" ? "width" : row.field,
  );
  const fields = [
    ...new Set(
      [...pinned, ...activeFields].map((field) =>
        field === "height" ? "width" : field,
      ),
    ),
  ];
  const shownOverlays: OverlayId[] = [
    ...(overlays.includes("visual") || visual ? (["visual"] as const) : []),
    ...(overlays.includes("semantic") || semantic
      ? (["semantic"] as const)
      : []),
  ];
  const overlayActive = Boolean(semantic || visual);
  const chips = [
    ...fields.filter((field) => field === "color"),
    ...shownOverlays,
    ...fields.filter((field) => field !== "color"),
  ];
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
        {chips.map((chip) =>
          chip === "semantic" ? (
            <SemanticChip key="semantic" />
          ) : chip === "visual" ? (
            <VisualChip key="visual" />
          ) : (
            <FilterCategory
              key={chip}
              field={chip}
              options={choices[chip] ?? presetOptions(chip)}
              tagGroups={chip === "tags" ? tagGroups : undefined}
              rows={rows}
              onChange={apply}
            />
          ),
        )}
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
