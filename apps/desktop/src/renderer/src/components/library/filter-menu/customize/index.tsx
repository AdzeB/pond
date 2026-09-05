import {
  IconImageOutline18,
  IconPlusOutline18,
  IconWandSparkleOutline18,
} from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import { Menu, Tooltip } from "@pond/ui";
import { Fragment, useState } from "react";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { FIELD_ICONS } from "@/lib/search/fields";
import { libraryHeader } from "@/stores/library-header";
import { FilterPopup } from "../chip";
import {
  FILTER_GROUPS,
  type FilterOption,
  fieldMatchesQuery,
  presetOptions,
} from "../options";
import { filterToolbar, useFilterToolbar } from "../toolbar-state";
import styles from "./styles.module.css";

export function CustomizeFilters({
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
          <FilterPopup>
            <Menu.Input
              aria-label="Find Filter"
              placeholder="Find Filter…"
              value={search}
              onValueChange={setSearch}
            />
            <div className={styles.body} {...scrollFade}>
              {showSemantic || showVisual ? (
                <>
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
          </FilterPopup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
