import { Toast } from "@pond/ui";

export const TOAST_TIMEOUT_MS = 2500;

export const toastManager = Toast.createToastManager();

export function notify(options: {
  id: string;
  title: string;
  timeout?: number;
}): void {
  toastManager.add({
    id: options.id,
    title: options.title,
    ...(options.timeout != null ? { timeout: options.timeout } : {}),
  });
}
