import { AlertDialog, Button, Input } from "@pond/ui";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  confirmVariant?: ButtonVariant;
  placeholder?: string;
}

// Shared single-text-field prompt; submits on Enter, leaves closing to the caller's `onConfirm`.
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  value,
  onValueChange,
  onConfirm,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  placeholder,
}: PromptDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description>{description}</AlertDialog.Description>
          ) : null}
          <Input.Field
            data-size="sm"
            value={value}
            placeholder={placeholder}
            autoFocus
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm();
            }}
          />
          <AlertDialog.Footer>
            <AlertDialog.Close render={<Button variant="ghost" />}>
              {cancelLabel}
            </AlertDialog.Close>
            <Button
              variant={confirmVariant}
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
