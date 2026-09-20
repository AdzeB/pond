import { Button, cssVars, Dialog, Field, Input, Switch } from "@pond/ui";
import { useEffect, useState } from "react";
import {
  FOLDER_ICONS,
  FOLDER_SWATCHES,
  type FolderIconId,
} from "@/features/library/components/folder-sidebar/folder-icons";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders } from "@/features/library/state/folders";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

interface FolderCustomizeDialogProps {
  folder: {
    id: string;
    name: string;
    color: string | null;
  };
  folderIcon?: FolderIconId;
  onClose: () => void;
}

export function FolderCustomizeDialog({
  folder,
  folderIcon,
  onClose,
}: FolderCustomizeDialogProps) {
  const initialIcon = folderIcon ?? "folder";
  const [icon, setIcon] = useState<FolderIconId>(initialIcon);
  const [color, setColor] = useState<string | null>(folder.color);
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [initialExternalLink, setInitialExternalLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protectedFolder, setProtectedFolder] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState("");
  const [lockChildren, setLockChildren] = useState(true);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const changed =
    icon !== initialIcon ||
    color !== folder.color ||
    description !== initialDescription ||
    externalLink !== initialExternalLink ||
    password.length > 0;

  useEffect(() => {
    void window.pond
      .query("folders.metadata.get", { folderId: folder.id })
      .then((metadata) => {
        const nextDescription = metadata.description ?? "";
        const nextExternalLink = metadata.externalLink ?? "";
        setDescription(nextDescription);
        setInitialDescription(nextDescription);
        setExternalLink(nextExternalLink);
        setInitialExternalLink(nextExternalLink);
      });
    void window.pond
      .query("folders.security.status", { folderId: folder.id })
      .then((status) => {
        setProtectedFolder(status.protected);
        setHint(status.hint ?? "");
        setLockChildren(status.lockChildren);
      });
  }, [folder.id]);

  async function submit(): Promise<void> {
    if (!changed) return;
    const nextExternalLink = externalLink.trim();
    if (nextExternalLink) {
      try {
        const parsed = new URL(nextExternalLink);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported protocol");
        }
      } catch {
        setError("Enter a valid HTTP or HTTPS link.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const metadataChanged =
        description !== initialDescription ||
        externalLink !== initialExternalLink;
      const [, , metadataResult, securityResult] = await Promise.all([
        icon !== initialIcon
          ? saveFolderPresentation(folder.id, { icon })
          : Promise.resolve(),
        color !== folder.color
          ? window.pond.query("folders.setColor", { id: folder.id, color })
          : Promise.resolve(),
        metadataChanged
          ? window.pond.query("folders.metadata.set", {
              folderId: folder.id,
              description: description.trim() || null,
              externalLink: nextExternalLink || null,
            })
          : Promise.resolve({ ok: true }),
        password
          ? window.pond.query("folders.security.set", {
              folderId: folder.id,
              password,
              currentPassword: currentPassword || undefined,
              hint: hint || null,
              lockChildren,
            })
          : Promise.resolve({ ok: true }),
      ]);
      if (!metadataResult.ok) throw new Error("Folder details were rejected.");
      if (!securityResult.ok) throw new Error("Folder password was rejected.");
      await folders.refresh();
      onClose();
    } catch {
      setError("Couldn't customize folder. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open, details) => {
        if (busy) details.cancel();
        else if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>Customize Folder</Dialog.Title>
              <Dialog.Close disabled={busy} />
            </Dialog.Header>
            <Dialog.Content {...scrollFade}>
              <Dialog.Description>
                Choose how this folder looks and add optional details.
              </Dialog.Description>
              <fieldset className={styles.section} disabled={busy}>
                <legend className={styles.legend}>Details</legend>
                <div className={styles.fields}>
                  <Field.Root>
                    <Field.Label>Description</Field.Label>
                    <Input.Root>
                      <Field.Control
                        render={<Input.Textarea rows={3} />}
                        value={description}
                        onValueChange={setDescription}
                        maxLength={4000}
                      />
                    </Input.Root>
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>External Link</Field.Label>
                    <Input.Root>
                      <Field.Control
                        render={<Input.Field type="url" />}
                        value={externalLink}
                        onValueChange={setExternalLink}
                        placeholder="https://"
                        maxLength={2048}
                      />
                    </Input.Root>
                  </Field.Root>
                </div>
              </fieldset>
              <fieldset className={styles.section} disabled={busy}>
                <legend className={styles.legend}>Icon</legend>
                <div className={styles.options}>
                  {FOLDER_ICONS.map(({ id, label, Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      size="lg"
                      width="full"
                      variant={icon === id ? "tertiary" : "ghost"}
                      className={styles.option}
                      aria-pressed={icon === id}
                      onClick={() => setIcon(id)}
                    >
                      <Icon />
                      {label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.section} disabled={busy}>
                <legend className={styles.legend}>Color</legend>
                <div className={styles.colors}>
                  {FOLDER_SWATCHES.map((swatch) => (
                    <Button
                      key={swatch.label}
                      type="button"
                      size="lg"
                      width="full"
                      variant={color === swatch.id ? "tertiary" : "ghost"}
                      className={styles.option}
                      aria-pressed={color === swatch.id}
                      onClick={() => setColor(swatch.id)}
                    >
                      <span
                        className={styles.swatch}
                        style={cssVars({ "--swatch": swatch.css })}
                        aria-hidden
                      />
                      {swatch.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.section} disabled={busy}>
                <legend className={styles.legend}>Password</legend>
                <p className={styles.description}>
                  Require a password before Pond shows this folder's Saves.
                </p>
                {protectedFolder ? (
                  <label className={styles.field} htmlFor="current-password">
                    <span>Current Password</span>
                    <Input.Root>
                      <Input.Field
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                      />
                    </Input.Root>
                  </label>
                ) : null}
                <label className={styles.field} htmlFor="folder-password">
                  <span>{protectedFolder ? "New Password" : "Password"}</span>
                  <Input.Root>
                    <Input.Field
                      id="folder-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Input.Root>
                </label>
                <label className={styles.field} htmlFor="password-hint">
                  <span>Password Hint</span>
                  <Input.Root>
                    <Input.Field
                      id="password-hint"
                      value={hint}
                      disabled={!password}
                      onChange={(event) => setHint(event.target.value)}
                    />
                  </Input.Root>
                </label>
                {!password ? (
                  <p className={styles.description}>
                    Enter {protectedFolder ? "a new password" : "a password"} to
                    set the hint or subfolder protection.
                  </p>
                ) : null}
                <div className={styles.toggle}>
                  <span>Protect Subfolders</span>
                  <Switch.Root
                    aria-label="Protect Subfolders"
                    checked={lockChildren}
                    disabled={!password}
                    onCheckedChange={setLockChildren}
                  />
                </div>
                {protectedFolder ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={!currentPassword}
                    onClick={() => {
                      setBusy(true);
                      setError(null);
                      void window.pond
                        .query("folders.security.remove", {
                          folderId: folder.id,
                          password: currentPassword,
                        })
                        .then((result) => {
                          if (!result.ok)
                            throw new Error("Password didn't match.");
                          setProtectedFolder(false);
                          setCurrentPassword("");
                          setPassword("");
                          setHint("");
                          setLockChildren(true);
                          void folders.refresh();
                        })
                        .catch(() =>
                          setError(
                            "Pond couldn't remove the password. Check the current password and try again.",
                          ),
                        )
                        .finally(() => setBusy(false));
                    }}
                  >
                    Remove Password
                  </Button>
                ) : null}
              </fieldset>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Cancel type="button" disabled={busy} onClick={onClose} />
              <Dialog.Confirm type="submit" loading={busy} disabled={!changed}>
                Save
              </Dialog.Confirm>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
