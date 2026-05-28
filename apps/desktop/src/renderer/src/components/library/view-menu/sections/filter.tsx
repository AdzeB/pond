import { Menu } from "@pond/ui";
import { ChevronRight, ListFilter } from "lucide-react";
import { useView } from "../context";
import { Filter as FilterEditor } from "../filter";
import sectionStyles from "./section.module.css";

export function Filter() {
  const { state } = useView();
  const total = state.query.clauses.length + state.pendingPredicates.length;
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <ListFilter width="14" height="14" />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Filter by</Menu.ItemLabel>
        {total > 0 ? (
          <span className={sectionStyles.badge}>{total} applied</span>
        ) : null}
        <span className={sectionStyles.chevron} aria-hidden>
          <ChevronRight width="12" height="12" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            <FilterEditor.Root />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
