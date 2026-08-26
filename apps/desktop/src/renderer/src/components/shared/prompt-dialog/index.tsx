import { Button, Dialog, Input } from "@pond/ui";
import { type ComponentProps, type ReactNode, useRef } from "react";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

export interface PromptOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  confirmVariant?: ButtonVariant;
  placeholder?: string;
  initialValue?: string;
  onConfirm: (value: string) => void | Promise<void>;
}

const handle = Dialog.createHandle<PromptOptions>();

export function prompt(options: PromptOptions): void {
  handle.openWithPayload(options);
}

export function PromptDialogHost() {
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (options: PromptOptions) => {
    const value = inputRef.current?.value ?? "";
    handle.close();
    void options.onConfirm(value);
  };

  return (
    <Dialog.Root handle={handle}>
      {({ payload }) =>
        payload ? (
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Header>
                <Dialog.Title>{payload.title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Content>
                {payload.description ? (
                  <Dialog.Description>{payload.description}</Dialog.Description>
                ) : null}
                <Input.Field
                  ref={inputRef}
                  data-size="sm"
                  defaultValue={payload.initialValue ?? ""}
                  placeholder={payload.placeholder}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit(payload);
                  }}
                />
              </Dialog.Content>
              <Dialog.Footer>
                <Dialog.Close render={<Button variant="ghost" />}>
                  {payload.cancelLabel ?? "Cancel"}
                </Dialog.Close>
                <Button
                  variant={payload.confirmVariant ?? "primary"}
                  onClick={() => submit(payload)}
                >
                  {payload.confirmLabel}
                </Button>
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Portal>
        ) : null
      }
    </Dialog.Root>
  );
}
