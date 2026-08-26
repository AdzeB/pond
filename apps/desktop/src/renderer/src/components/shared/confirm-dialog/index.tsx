import { AlertDialog, Button } from "@pond/ui";
import { type ComponentProps, type ReactNode, useState } from "react";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  confirmVariant?: ButtonVariant;
  busyLabel?: ReactNode;
  onConfirm: () => void | Promise<void>;
}

const handle = AlertDialog.createHandle<ConfirmOptions>();

export function confirm(options: ConfirmOptions): void {
  handle.openWithPayload(options);
}

export function ConfirmDialogHost() {
  const [busy, setBusy] = useState(false);

  const run = async (options: ConfirmOptions) => {
    setBusy(true);
    try {
      await options.onConfirm();
    } finally {
      setBusy(false);
    }
    handle.close();
  };

  return (
    <AlertDialog.Root
      handle={handle}
      onOpenChange={(open) => {
        if (!open) setBusy(false);
      }}
    >
      {({ payload }) =>
        payload ? (
          <AlertDialog.Portal>
            <AlertDialog.Backdrop />
            <AlertDialog.Popup>
              <AlertDialog.Header>
                <AlertDialog.Title>{payload.title}</AlertDialog.Title>
              </AlertDialog.Header>
              {payload.description ? (
                <AlertDialog.Content>
                  <AlertDialog.Description>
                    {payload.description}
                  </AlertDialog.Description>
                </AlertDialog.Content>
              ) : null}
              <AlertDialog.Footer>
                <AlertDialog.Close
                  render={
                    <Button variant="ghost" disabled={busy}>
                      {payload.cancelLabel ?? "Cancel"}
                    </Button>
                  }
                />
                <Button
                  variant={payload.confirmVariant ?? "destructive"}
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    void run(payload);
                  }}
                >
                  {busy
                    ? (payload.busyLabel ?? payload.confirmLabel)
                    : payload.confirmLabel}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        ) : null
      }
    </AlertDialog.Root>
  );
}
