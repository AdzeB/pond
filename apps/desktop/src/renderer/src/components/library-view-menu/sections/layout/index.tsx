import {
  IconGridFill18 as GridIcon,
  IconGridLayoutRowsFill18 as JustifiedIcon,
  IconGridLayoutColsFill18 as WaterfallIcon,
} from "@pond/icons/fill/18";
import { useView } from "@/hooks/use-view";
import type { LayoutValue } from "@/lib/view-prefs";
import { Group } from "../../group";
import { Segmented, type SegmentedOption } from "../../segmented";

const options: ReadonlyArray<SegmentedOption<LayoutValue>> = [
  { value: "waterfall", label: "Waterfall", icon: <WaterfallIcon size={18} /> },
  { value: "grid", label: "Grid", icon: <GridIcon size={18} /> },
  { value: "justified", label: "Justified", icon: <JustifiedIcon size={18} /> },
];

export function LayoutSection() {
  const { state, actions } = useView();

  return (
    <Group title="Layout">
      <Segmented
        ariaLabel="Layout"
        options={options}
        value={state.layout}
        onChange={actions.setLayout}
      />
    </Group>
  );
}
