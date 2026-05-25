import { Button, Dialog } from "@pond/ui";
import { Cell } from "./cell";

export default function DialogCell() {
  return (
    <Cell label="Dialog">
      <Dialog.Root>
        <Dialog.Trigger render={<Button size="sm">Click me!</Button>} />
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup>
            <Dialog.Title>Sample dialog</Dialog.Title>
            <Dialog.Description>
              Dialogs trap focus and dim the rest of the app while open.
            </Dialog.Description>
            <Dialog.Actions>
              <Dialog.Close render={<Button size="sm">Close</Button>} />
            </Dialog.Actions>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </Cell>
  );
}
