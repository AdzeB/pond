import { IconXmarkOutline18 } from "@pond/icons/outline/18";
import { Toast, useToast } from "@pond/ui";
import styles from "./toast-host.module.css";

export function ToastHost() {
  const { toasts } = useToast();
  return (
    <Toast.Portal>
      <Toast.Viewport>
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            data-type={toast.type ?? "info"}
          >
            <Toast.Content>
              <div className={styles.body}>
                {toast.title ? <Toast.Title /> : null}
                {toast.description ? <Toast.Description /> : null}
              </div>
              <Toast.Close aria-label="Close">
                <IconXmarkOutline18 width={12} height={12} aria-hidden />
              </Toast.Close>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
