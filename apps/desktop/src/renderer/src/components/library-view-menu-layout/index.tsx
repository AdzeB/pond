import {
  IconGridFill18 as GridIcon,
  IconGridLayoutRowsFill18 as JustifiedIcon,
  IconGridLayoutColsFill18 as WaterfallIcon,
} from "@pond/icons/fill/18";
import { TrayCard } from "@pond/ui";
import { useRef } from "react";
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
    <>
      <TrayCard.Header>
        <TrayCard.Title>Library Layout</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Choose how items are arranged in your library.
        </TrayCard.Description>
      </TrayCard.Header>
      <Segmented
        ariaLabel="Layout"
        options={options}
        value={state.layout}
        onChange={actions.setLayout}
      />
      <TrayCard.Footer>
        <TrayCard.Cancel
          onClick={() => actions.setLayout(initialLayout.current)}
        />
        <TrayCard.Confirm />
      </TrayCard.Footer>
    </>
  );
}
