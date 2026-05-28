import { Menu } from "@pond/ui";
import { ChevronRight, Eye } from "lucide-react";
import type { Density as DensityValue } from "@/lib/density";
import { useView } from "../context";
import sectionStyles from "./section.module.css";

const VALUES = new Set<DensityValue>(["compact", "comfortable", "spacious"]);
const OPTIONS: Array<{ value: DensityValue; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

export function Density() {
  const { state, actions } = useView();
  const current = OPTIONS.find((o) => o.value === state.density)?.label;
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <Eye width="14" height="14" />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Density</Menu.ItemLabel>
        <span className={sectionStyles.badge}>{current}</span>
        <span className={sectionStyles.chevron} aria-hidden>
          <ChevronRight width="12" height="12" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            <Menu.RadioGroup
              value={state.density}
              onValueChange={(v) => {
                if (typeof v === "string" && VALUES.has(v as DensityValue)) {
                  actions.setDensity(v as DensityValue);
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
