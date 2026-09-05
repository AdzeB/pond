import { AlertDialog, Button } from "@pond/ui";
import {
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useRef,
} from "react";
import { useDialogSubmit } from "../use-dialog-submit";

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

const handle = AlertDialog.createHandle<
  ConfirmOptions & { requestId: number }
>();
let requestId = 0;

export function confirm(options: ConfirmOptions): void {
  handle.openWithPayload({ ...options, requestId: ++requestId });
}

export function ConfirmDialogHost() {
  const pending = useRef(false);

  return (
    <AlertDialog.Root
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
    </AlertDialog.Root>
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
    <AlertDialog.Portal>
      <AlertDialog.Backdrop />
      <AlertDialog.Popup initialFocus={cancelRef} aria-busy={busy}>
        <AlertDialog.Header>
          <AlertDialog.Title>{options.title}</AlertDialog.Title>
          {options.description ? (
            <AlertDialog.Description>
              {options.description}
            </AlertDialog.Description>
          ) : null}
        </AlertDialog.Header>
        {error ? (
          <AlertDialog.Content>
            <AlertDialog.Description role="alert" data-error>
              {error}
            </AlertDialog.Description>
          </AlertDialog.Content>
        ) : null}
        <AlertDialog.Footer>
          <AlertDialog.Close
            ref={cancelRef}
            render={<Button variant="secondary" disabled={busy} />}
          >
            {options.cancelLabel ?? "Cancel"}
          </AlertDialog.Close>
          <Button
            variant={options.confirmVariant ?? "destructive"}
            disabled={busy}
            onClick={() => void submit(options.onConfirm)}
          >
            {busy
              ? (options.busyLabel ?? options.confirmLabel)
              : options.confirmLabel}
          </Button>
        </AlertDialog.Footer>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  );
}
