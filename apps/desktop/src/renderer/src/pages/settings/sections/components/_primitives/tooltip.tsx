import { Button, Tooltip } from "@pond/ui";
import { Italic } from "lucide-react";
import { Cell } from "./cell";

export default function TooltipCell() {
  return (
    <Cell label="Tooltip">
      <Tooltip.Provider>
        <Tooltip.Root open>
          <Tooltip.Trigger
            render={
              <Button icon size="sm">
                <Italic />
              </Button>
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>
                Some information
                <Tooltip.Arrow />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </Cell>
  );
}
