import {
  IconGridFill18 as GridIcon,
  IconGridLayoutRowsFill18 as JustifiedIcon,
  IconGridLayoutColsFill18 as WaterfallIcon,
} from "@pond/icons/fill/18";
import { useRef } from "react";
import { Dock } from "@/components/library-view-menu-group";
import {
  Segmented,
  type SegmentedOption,
} from "@/components/library-view-menu-segmented";
import { useView } from "@/hooks/use-view";
import type { LayoutValue } from "@/lib/ui/view-prefs";

const options: ReadonlyArray<SegmentedOption<LayoutValue>> = [
  { value: "waterfall", label: "Waterfall", icon: <WaterfallIcon size={18} /> },
  { value: "grid", label: "Grid", icon: <GridIcon size={18} /> },
  { value: "justified", label: "Justified", icon: <JustifiedIcon size={18} /> },
];

export function LayoutSection() {
  const { state, actions } = useView();
  /** Layout applies live while the card is open; Cancel restores this snapshot. */
  const initialLayout = useRef(state.layout);

  return (
    <Dock.Root>
      <Dock.Close />
      <Dock.Header>
        <Dock.Title>Library Layout</Dock.Title>
        <Dock.Separator />
        <Dock.Description>
          Choose how items are arranged in your library. Waterfall keeps natural
          heights, Grid keeps everything uniform, and Justified fills each row
          edge to edge.
        </Dock.Description>
      </Dock.Header>
      <Segmented
        ariaLabel="Layout"
        options={options}
        value={state.layout}
        onChange={actions.setLayout}
      />
      <Dock.Footer>
        <Dock.Cancel onClick={() => actions.setLayout(initialLayout.current)} />
        <Dock.Confirm />
      </Dock.Footer>
    </Dock.Root>
  );
}
