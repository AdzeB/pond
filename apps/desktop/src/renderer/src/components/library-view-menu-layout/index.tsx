import {
  IconGridFill18 as GridIcon,
  IconGridLayoutRowsFill18 as JustifiedIcon,
  IconGridLayoutColsFill18 as WaterfallIcon,
} from "@pond/icons/fill/18";
import { Group } from "@/components/library-view-menu-group";
import {
  Segmented,
  type SegmentedOption,
} from "@/components/library-view-menu-segmented";
import { useView } from "@/hooks/use-view";
import type { LayoutValue } from "@/lib/ui/view-prefs";
import { VIEW_DEFAULTS } from "@/stores/view-store";

const options: ReadonlyArray<SegmentedOption<LayoutValue>> = [
  { value: "waterfall", label: "Waterfall", icon: <WaterfallIcon size={18} /> },
  { value: "grid", label: "Grid", icon: <GridIcon size={18} /> },
  { value: "justified", label: "Justified", icon: <JustifiedIcon size={18} /> },
];

export function LayoutSection() {
  const { state, actions } = useView();

  return (
    <Group title="Layout" changed={state.layout !== VIEW_DEFAULTS.layout}>
      <Segmented
        ariaLabel="Layout"
        options={options}
        value={state.layout}
        onChange={actions.setLayout}
      />
    </Group>
  );
}
