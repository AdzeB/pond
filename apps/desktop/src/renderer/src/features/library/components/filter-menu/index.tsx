import { IconBookmark, IconFilterOff } from "@pond/icons";
import { isPredicate, type Predicate } from "@pond/schema/filters/types";
import { Button, Tooltip } from "@pond/ui";
import { useFolders } from "@/features/library/state/folders";
import { libraryHeader } from "@/features/library/state/library-header";
import { savedViews } from "@/features/library/state/saved-views";
import {
  setSemanticQuery,
  setVisualProbe,
  updateLocalFilters,
  useFilterQuery,
  useSemanticQuery,
  useViewStore,
  useVisualProbe,
} from "@/features/library/state/view-store";
import { useNlFacets } from "@/features/search";
import { accountChipLabel, accountRefsFromSync } from "@/features/search/query";
import { useTagGroups, useTags } from "@/features/tags";
import { FilterToolbar } from "@/shared/components/filter-toolbar";
import { errorCopy } from "@/shared/lib/error-copy";
import { notify } from "@/shared/lib/toast";
import { usePrefs } from "@/shared/state/prefs";
import { FilterCategory } from "./category";
import { CustomizeFilters } from "./customize";
import { choiceOptions, type FilterOption, presetOptions } from "./options";
import { SemanticChip, VisualChip } from "./overlay";
import { sourceOptions } from "./source-options";
import {
  filterToolbar,
  type OverlayId,
  useFilterToolbar,
} from "./toolbar-state";

interface FilterChoices {
  tags: FilterOption[];
  folder: FilterOption[];
  source: FilterOption[];
  creator: FilterOption[];
  account: FilterOption[];
}

export function FilterToggle() {
  const { open } = useFilterToolbar();
  const query = useFilterQuery();
  const semantic = useSemanticQuery();
  const visual = useVisualProbe();
  const active =
    query.rules.some(isPredicate) || Boolean(semantic) || Boolean(visual);
  return (
    <FilterToolbar.Toggle
      variant="ghost"
      open={open}
      active={active}
      controlsId="library-filter-toolbar"
      onToggle={() => {
        libraryHeader.closePopover();
        filterToolbar.setOpen(!open);
      }}
    />
  );
}

interface FilterBarData {
  tags: readonly { name: string }[];
  tagGroups: ReturnType<typeof useTagGroups>;
  folders: readonly { id: string; name: string }[];
  facets: ReturnType<typeof useNlFacets>;
  refs: ReturnType<typeof accountRefsFromSync>;
}

export function FilterBar() {
  const tags = useTags();
  const tagGroups = useTagGroups();
  const folders = useFolders();
  const facets = useNlFacets();
  const [sync] = usePrefs("sync");
  return (
    <FilterBarView
      tags={tags}
      tagGroups={tagGroups}
      folders={folders}
      facets={facets}
      refs={accountRefsFromSync(sync)}
    />
  );
}

export function FilterBarView({
  tags,
  tagGroups,
  folders,
  facets,
  refs,
}: FilterBarData) {
  const { open, pinned, overlays } = useFilterToolbar();
  const query = useFilterQuery();
  const semantic = useSemanticQuery();
  const visual = useVisualProbe();
  const activeViewId = useViewStore().activeViewId;
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
  const chips = [
    ...fields.filter((field) => field === "color"),
    ...shownOverlays,
    ...fields.filter((field) => field !== "color"),
  ];
  const selectedSources = rows
    .filter((row) => row.field === "source")
    .flatMap((row) =>
      (Array.isArray(row.value) ? row.value : [row.value]).map(String),
    );
  const choices: FilterChoices = {
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
    source: sourceOptions([
      ...new Set([...facets.sources, ...selectedSources]),
    ]),
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
    updateLocalFilters(next);
  };
  const hasActiveFilters =
    rows.length > 0 || Boolean(semantic) || Boolean(visual);

  return (
    <FilterToolbar.Bar
      open={open}
      id="library-filter-toolbar"
      label="Library Filters"
      actions={
        <>
          <CustomizeFilters
            choices={choices}
            activeFields={activeFields}
            semanticActive={Boolean(semantic)}
            visualActive={Boolean(visual)}
          />
          {activeViewId ? (
            <Tooltip label="Update View" side="bottom">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Update View"
                onClick={() =>
                  void savedViews.updateCurrent(activeViewId).catch((error) =>
                    notify({
                      id: "save-filter-view",
                      title: "Couldn't Update Saved View",
                      description: errorCopy(error, "Try again."),
                    }),
                  )
                }
              >
                <IconBookmark />
              </Button>
            </Tooltip>
          ) : (
            <Tooltip label="Save" side="bottom">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Save"
                onClick={() =>
                  void savedViews
                    .create({ kind: "saved_view", name: "Untitled" })
                    .then((view) => savedViews.startEditing(view.id))
                    .catch((error) =>
                      notify({
                        id: "save-filter-view",
                        title: "Couldn't Save View",
                        description: errorCopy(error, "Try again."),
                      }),
                    )
                }
              >
                <IconBookmark />
              </Button>
            </Tooltip>
          )}
          <Tooltip label="Clear Filters" side="bottom">
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label="Clear Filters"
              disabled={!hasActiveFilters}
              onClick={() => {
                updateLocalFilters([]);
                setSemanticQuery(null);
                setVisualProbe(null);
              }}
            >
              <IconFilterOff />
            </Button>
          </Tooltip>
        </>
      }
    >
      {chips.map((chip) =>
        chip === "semantic" ? (
          <SemanticChip key="semantic" />
        ) : chip === "visual" ? (
          <VisualChip key="visual" />
        ) : (
          <FilterCategory
            key={chip}
            field={chip}
            options={
              Object.entries(choices).find(([field]) => field === chip)?.[1] ??
              presetOptions(chip)
            }
            tagGroups={chip === "tags" ? tagGroups : undefined}
            rows={rows}
            onChange={apply}
          />
        ),
      )}
    </FilterToolbar.Bar>
  );
}
