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
                <CloseIcon />
              </Toast.Close>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
