import { Toast } from "@pond/ui";

export const TOAST_TIMEOUT_MS = 2500;

export const toastManager = Toast.createToastManager();

interface NotifyOptions {
  id: string;
  title: string;
  description?: string;
  timeout?: number;
}

export function notify(options: NotifyOptions): void {
  const toast: NotifyOptions = { id: options.id, title: options.title };
  if (options.description != null) toast.description = options.description;
  if (options.timeout != null) toast.timeout = options.timeout;
  toastManager.add(toast);
}
