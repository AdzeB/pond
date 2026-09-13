import { Toast } from "@pond/ui";
import { TOAST_TIMEOUT_MS, toastManager } from "@/shared/lib/toast";

function ToastList() {
  const { toasts } = Toast.useToastManager();

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
              </Toast.Header>
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
    <Toast.Provider toastManager={toastManager} timeout={TOAST_TIMEOUT_MS}>
      <ToastList />
    </Toast.Provider>
  );
}
