import { Button, Dialog, Input } from "@pond/ui";
import { type FormEvent, useState } from "react";
import styles from "./styles.module.css";

export function FolderUnlockDialog({
  folderId,
  folderName,
  hint,
  onClose,
  onUnlocked,
}: {
  folderId: string;
  folderName: string;
  hint: string | null;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await window.pond.query("folders.security.unlock", {
        folderId,
        password,
      });
      if (!result.ok) {
        setFailed(true);
        return;
      }
      onUnlocked();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <form onSubmit={submit}>
            <Dialog.Header>
              <Dialog.Title>Unlock Folder</Dialog.Title>
              <Dialog.Close disabled={busy} />
            </Dialog.Header>
            <Dialog.Content>
              <Dialog.Description>
                Enter the password to show Saves in {folderName}.
              </Dialog.Description>
              <label className={styles.field} htmlFor="folder-unlock-password">
                <span>Password</span>
                <Input.Root>
                  <Input.Field
                    id="folder-unlock-password"
                    autoFocus
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Input.Root>
              </label>
              {hint ? <p className={styles.hint}>Hint: {hint}</p> : null}
              {failed ? (
                <p className={styles.error} role="alert">
                  The password didn't match. Try again.
                </p>
              ) : null}
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Cancel type="button" disabled={busy} onClick={onClose} />
              <Button
                type="submit"
                variant="accent"
                loading={busy}
                disabled={!password}
              >
                Unlock
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
