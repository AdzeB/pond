import { Toast } from "@pond/ui";

export const TOAST_TIMEOUT_MS = 2500;

export interface ToastProgress {
  label: string;
  detail?: string;
  value?: number;
  max?: number;
}

export interface ToastData {
  progress?: ToastProgress;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toastManager = Toast.createToastManager<ToastData>();

let toastSequence = 0;

export interface NotifyOptions {
  id: string;
  title: string;
  description?: string;
  progress?: ToastProgress;
  action?: ToastData["action"];
  timeout?: number;
}

function toastOptions(
  options: NotifyOptions,
): Parameters<typeof toastManager.add>[0] {
  const toast: Parameters<typeof toastManager.add>[0] = {
    data: {
      progress: options.progress,
      action: options.action,
    },
    id: options.id,
    title: options.title,
  };
  if (options.description != null) toast.description = options.description;
  if (options.timeout != null) toast.timeout = options.timeout;
  return toast;
}

export function notify(options: NotifyOptions): string {
  toastSequence += 1;
  const id = `${options.id}:${toastSequence}`;
  toastManager.add(toastOptions({ ...options, id }));
  window.dispatchEvent(
    new CustomEvent("pond:notification", {
      detail: {
        title: options.title,
        description: options.description,
      },
    }),
  );
  return id;
}

export function updateNotification(options: NotifyOptions): void {
  toastManager.update(options.id, toastOptions(options));
}
