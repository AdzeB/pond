import { Button, Input, Select, Settings, Switch } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usePrefs } from "@/features/settings/state/prefs";
import styles from "./styles.module.css";

const IDLE_OPTIONS = [
  { value: "0", label: "Never" },
  { value: "5", label: "After 5 Minutes" },
  { value: "15", label: "After 15 Minutes" },
  { value: "30", label: "After 30 Minutes" },
  { value: "60", label: "After 1 Hour" },
];

export function SecuritySettings() {
  const client = useQueryClient();
  const { data: status } = useQuery({
    queryKey: ["library-security"],
    queryFn: () => window.pond.query("security.status", {}),
  });
  const [prefs, patchPrefs] = usePrefs("security");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [migrationBackupPath, setMigrationBackupPath] = useState<string | null>(
    null,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setup() {
    if (password.length < 8 || password !== confirmation) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.pond.query("security.setup", { password });
      if (!result.ok || !result.recoveryKey) {
        throw new Error("Pond couldn't encrypt this Library.");
      }
      setRecoveryKey(result.recoveryKey);
      setMigrationBackupPath(result.backupPath ?? null);
      setPassword("");
      setConfirmation("");
      await client.invalidateQueries({ queryKey: ["library-security"] });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pond couldn't encrypt this Library.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || newPassword.length < 8) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.pond.query("security.changePassword", {
        currentPassword,
        newPassword,
      });
      if (!result.ok) throw new Error("The current password didn't match.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pond couldn't change the password.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function rotateRecoveryKey() {
    if (!currentPassword) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.pond.query("security.rotateRecoveryKey", {
        password: currentPassword,
      });
      if (!result.ok || !result.recoveryKey) {
        throw new Error("The current password didn't match.");
      }
      setRecoveryKey(result.recoveryKey);
      setCurrentPassword("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pond couldn't replace the recovery key.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  return (
    <Settings.List>
      {!status.configured ? (
        <Settings.Item id="setting-security-encryption">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Library Encryption</Settings.ItemTitle>
            <Settings.ItemDescription>
              Encrypt Library files, thumbnails, metadata, and search data on
              this Mac.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl className={styles.setup}>
            <Input.Root>
              <Input.Field
                type="password"
                autoComplete="new-password"
                aria-label="Library Password"
                placeholder="Library password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Input.Root>
            <Input.Root>
              <Input.Field
                type="password"
                autoComplete="new-password"
                aria-label="Confirm Library Password"
                placeholder="Confirm password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </Input.Root>
            <Button
              variant="accent"
              loading={busy}
              disabled={password.length < 8 || password !== confirmation}
              onClick={() => void setup()}
            >
              Encrypt Library
            </Button>
            {error ? (
              <span className={styles.error} role="alert">
                {error}
              </span>
            ) : null}
          </Settings.ItemControl>
        </Settings.Item>
      ) : (
        <Settings.Item id="setting-security-encryption">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Library Encryption</Settings.ItemTitle>
            <Settings.ItemDescription>
              This Library is encrypted and requires authorization before
              access.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void window.pond.query("security.lockNow", {})}
            >
              Lock Now
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
      )}

      {recoveryKey ? (
        <Settings.Item id="setting-security-recovery">
          <Settings.ItemDetails>
            <Settings.ItemTitle>Recovery Key</Settings.ItemTitle>
            <Settings.ItemDescription>
              Store this key outside Pond. It won't appear again.
            </Settings.ItemDescription>
            <code className={styles.recovery}>{recoveryKey}</code>
            {migrationBackupPath ? (
              <p className={styles.warning}>
                Pond kept the original plaintext Library backup at{" "}
                <code>{migrationBackupPath}</code>. Move it to encrypted storage
                or delete it after you verify this Library.
              </p>
            ) : null}
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void window.pond.query("clipboard.writeText", {
                  text: recoveryKey,
                })
              }
            >
              Copy Recovery Key
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
      ) : null}

      {status.configured ? (
        <>
          <Settings.Item id="setting-security-password">
            <Settings.ItemDetails>
              <Settings.ItemTitle>Change Password</Settings.ItemTitle>
              <Settings.ItemDescription>
                Replace the password used to unlock this Library.
                {error ? (
                  <span className={styles.error} role="alert">
                    {error}
                  </span>
                ) : null}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl className={styles.setup}>
              <Input.Root>
                <Input.Field
                  type="password"
                  autoComplete="current-password"
                  aria-label="Current Library Password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </Input.Root>
              <Input.Root>
                <Input.Field
                  type="password"
                  autoComplete="new-password"
                  aria-label="New Library Password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Input.Root>
              <div className={styles.actions}>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy}
                  disabled={!currentPassword || newPassword.length < 8}
                  onClick={() => void changePassword()}
                >
                  Change Password
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy}
                  disabled={!currentPassword}
                  onClick={() => void rotateRecoveryKey()}
                >
                  New Recovery Key
                </Button>
              </div>
            </Settings.ItemControl>
          </Settings.Item>
          <Settings.Item id="setting-security-idle">
            <Settings.ItemDetails>
              <Settings.ItemTitle>Automatic Lock</Settings.ItemTitle>
              <Settings.ItemDescription>
                Lock Pond after this Mac stays idle for the selected time.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={String(prefs.idleMinutes)}
                onValueChange={(value) =>
                  patchPrefs({ idleMinutes: Number(value) })
                }
              >
                <Select.Trigger aria-label="Automatic Lock">
                  <Select.Value>
                    {(value: string) =>
                      IDLE_OPTIONS.find((option) => option.value === value)
                        ?.label ?? "After 15 Minutes"
                    }
                  </Select.Value>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Items items={IDLE_OPTIONS} />
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
          <Settings.Item id="setting-security-launch">
            <Settings.ItemDetails>
              <Settings.ItemTitle>Lock on Launch</Settings.ItemTitle>
              <Settings.ItemDescription>
                Require authorization each time Pond starts.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                aria-label="Lock on Launch"
                checked={prefs.lockOnLaunch}
                onCheckedChange={(lockOnLaunch) => patchPrefs({ lockOnLaunch })}
              />
            </Settings.ItemControl>
          </Settings.Item>
          <Settings.Item id="setting-security-sleep">
            <Settings.ItemDetails>
              <Settings.ItemTitle>Lock on Sleep</Settings.ItemTitle>
              <Settings.ItemDescription>
                Lock Pond when this Mac sleeps or the screen locks.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                aria-label="Lock on Sleep"
                checked={prefs.lockOnSleep}
                onCheckedChange={(lockOnSleep) => patchPrefs({ lockOnSleep })}
              />
            </Settings.ItemControl>
          </Settings.Item>
          {status.biometricSupported ? (
            <Settings.Item id="setting-security-biometric">
              <Settings.ItemDetails>
                <Settings.ItemTitle>Touch ID</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Allow Touch ID to unlock this Library on this Mac.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label="Touch ID"
                  checked={prefs.biometricUnlock}
                  onCheckedChange={(biometricUnlock) => {
                    patchPrefs({ biometricUnlock });
                    void client.invalidateQueries({
                      queryKey: ["library-security"],
                    });
                  }}
                />
              </Settings.ItemControl>
            </Settings.Item>
          ) : null}
        </>
      ) : null}
    </Settings.List>
  );
}
