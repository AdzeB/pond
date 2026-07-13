import { AlertDialog, Button } from "@pond/ui";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  confirmVariant?: ButtonVariant;
  busy?: boolean;
  onConfirm: () => void;
  /** Extra content rendered between the description and the action row. */
  children?: ReactNode;
  /** Buttons rendered between Cancel and the primary confirm button. */
  extraActions?: ReactNode;
}

/** `onConfirm` leaves closing to the caller so async work can keep the dialog open via `busy`. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  busy = false,
  onConfirm,
  children,
  extraActions,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description>{description}</AlertDialog.Description>
          ) : null}
          {children}
          <AlertDialog.Footer>
            <AlertDialog.Close
              render={
                <Button variant="ghost" disabled={busy}>
                  {cancelLabel}
                </Button>
              }
            />
            {extraActions}
            <Button
              variant={confirmVariant}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
