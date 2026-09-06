import {
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useRef,
} from "react";
import { Button } from "../button";
import { DialogParts as Dialog } from "./dialog";
import { useDialogSubmit } from "./use-dialog-submit";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  confirmVariant?: ButtonVariant;
  busyLabel?: ReactNode;
  onConfirm: () => void | Promise<void>;
}

const handle = Dialog.createAlertHandle<
  ConfirmOptions & { requestId: number }
>();
let requestId = 0;

export function confirm(options: ConfirmOptions): void {
  handle.openWithPayload({ ...options, requestId: ++requestId });
}

export function ConfirmDialogHost() {
  const pending = useRef(false);

  return (
    <Dialog.Root
      variant="alert"
      handle={handle}
      onOpenChange={(_, details) => {
        if (pending.current) details.cancel();
      }}
    >
      {({ payload }) =>
        payload ? (
          <ConfirmContent
            key={payload.requestId}
            options={payload}
            pending={pending}
          />
        ) : null
      }
    </Dialog.Root>
  );
}

function ConfirmContent({
  options,
  pending,
}: {
  options: ConfirmOptions;
  pending: RefObject<boolean>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { busy, error, submit } = useDialogSubmit(pending, () =>
    handle.close(),
  );
  return (
    <Dialog.Portal>
      <Dialog.Backdrop />
      <Dialog.Popup initialFocus={cancelRef} aria-busy={busy}>
        <Dialog.Header>
          <Dialog.Title>{options.title}</Dialog.Title>
        </Dialog.Header>
        <Dialog.Content>
          {options.description ? (
            <Dialog.Description>{options.description}</Dialog.Description>
          ) : null}
          {error ? (
            <Dialog.Description role="alert" data-error>
              {error}
            </Dialog.Description>
          ) : null}
        </Dialog.Content>
        <Dialog.Footer>
          <Dialog.Close
            ref={cancelRef}
            render={<Button variant="secondary" disabled={busy} />}
          >
            {options.cancelLabel ?? "Cancel"}
          </Dialog.Close>
          <Button
            variant={options.confirmVariant ?? "destructive"}
            disabled={busy}
            onClick={() => void submit(options.onConfirm)}
          >
            {busy
              ? (options.busyLabel ?? options.confirmLabel ?? "Confirm")
              : (options.confirmLabel ?? "Confirm")}
          </Button>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
