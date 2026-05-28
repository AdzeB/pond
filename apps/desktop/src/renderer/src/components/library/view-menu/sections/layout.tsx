import { Menu } from "@pond/ui";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { isLayoutValue, type LayoutValue } from "@/lib/view-prefs";
import { useView } from "../context";
import sectionStyles from "./section.module.css";

const OPTIONS: Array<{ value: LayoutValue; label: string }> = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

export function Layout() {
  const { state, actions } = useView();
  const current = OPTIONS.find((o) => o.value === state.layout)?.label;
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <LayoutGrid width="14" height="14" />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Layout</Menu.ItemLabel>
        <span className={sectionStyles.badge}>{current}</span>
        <span className={sectionStyles.chevron} aria-hidden>
          <ChevronRight width="12" height="12" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            <Menu.RadioGroup
              value={state.layout}
              onValueChange={(v) => {
                if (typeof v === "string" && isLayoutValue(v)) {
                  actions.setLayout(v);
                }
              }}
            >
              {OPTIONS.map((opt) => (
                <Menu.RadioItem key={opt.value} value={opt.value}>
                  <Menu.ItemLabel>{opt.label}</Menu.ItemLabel>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
