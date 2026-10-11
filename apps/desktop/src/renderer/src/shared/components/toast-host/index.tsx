import { Toast } from "@pond/ui";
import {
  TOAST_TIMEOUT_MS,
  type ToastData,
  toastManager,
} from "@/shared/lib/toast";

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastData>();

  return (
    <Toast.Portal>
      <Toast.Viewport>
        {toasts.map((toast) => (
          <Toast.Root key={toast.id} toast={toast}>
            <Toast.Content>
              <Toast.Header>
                {toast.title ? <Toast.Title>{toast.title}</Toast.Title> : null}
                {toast.description ? (
                  <Toast.Description>{toast.description}</Toast.Description>
                ) : null}
                {toast.data?.progress ? (
                  <Toast.Progress
                    aria-label={toast.data.progress.label}
                    max={toast.data.progress.max}
                    value={toast.data.progress.value}
                  />
                ) : null}
                {toast.data?.progress?.detail ? (
                  <Toast.Meta>{toast.data.progress.detail}</Toast.Meta>
                ) : null}
              </Toast.Header>
              {toast.data?.action ? (
                <Toast.Action onClick={toast.data.action.onClick}>
                  {toast.data.action.label}
                </Toast.Action>
              ) : null}
              <Toast.Close />
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export function ToastHost() {
  return (
    <Toast.Provider
      limit={Number.POSITIVE_INFINITY}
      toastManager={toastManager}
      timeout={TOAST_TIMEOUT_MS}
    >
      <ToastList />
    </Toast.Provider>
  );
}
