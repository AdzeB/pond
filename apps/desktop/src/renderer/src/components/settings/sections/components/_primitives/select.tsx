import { Select } from "@pond/ui";
import { Check, ChevronsUpDown } from "lucide-react";
import { Cell } from "./cell";

export default function SelectCell() {
  return (
    <Cell label="Select">
      <Select.Root>
        <Select.Label>Theme</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder="Select..." />
          <Select.Icon>
            <ChevronsUpDown />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Backdrop />
          <Select.Positioner sideOffset={6}>
            <Select.Popup>
              <Select.List>
                <Select.Item value="Dawn">
                  <Select.ItemText>Dawn</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="Paper">
                  <Select.ItemText>Paper</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="Dusk">
                  <Select.ItemText>Dusk</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="Ink">
                  <Select.ItemText>Ink</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
              </Select.List>
              <Select.Arrow />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Cell>
  );
}
