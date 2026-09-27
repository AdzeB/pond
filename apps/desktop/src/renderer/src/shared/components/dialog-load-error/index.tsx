import { Button, Dialog } from "@pond/ui";

export function DialogLoadError({
  open,
  title,
  onClose,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Content>
            <p role="alert">
              This window couldn’t load. Reload Pond to try again.
            </p>
          </Dialog.Content>
          <Dialog.Footer>
            <Button onClick={onClose}>Close</Button>
            <Button onClick={() => window.location.reload()}>
              Reload Pond
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
