import { type RefObject, useState } from "react";

export function useDialogSubmit(
  pending: RefObject<boolean>,
  close: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: () => void | Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      pending.current = false;
      close();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't complete this action. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { busy, error, submit };
}
