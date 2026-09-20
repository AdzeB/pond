export type LibraryLockState =
  | "unconfigured"
  | "locked"
  | "unlocking"
  | "unlocked"
  | "migrating";

export interface LibrarySecurityStatus {
  configured: boolean;
  state: LibraryLockState;
  biometricSupported: boolean;
  biometricAvailable: boolean;
  recoveryAvailable: boolean;
}

export interface SecurityQueryInputs {
  "security.status": Record<string, never>;
  "security.unlock": { password: string };
  "security.unlockRecovery": { recoveryKey: string };
  "security.unlockBiometric": Record<string, never>;
  "security.lockNow": Record<string, never>;
  "security.setup": { password: string };
  "security.changePassword": {
    currentPassword: string;
    newPassword: string;
  };
  "security.rotateRecoveryKey": { password: string };
}

export interface SecurityQueryResults {
  "security.status": LibrarySecurityStatus;
  "security.unlock": { ok: boolean; error?: "invalid_secret" | "unavailable" };
  "security.unlockRecovery": {
    ok: boolean;
    error?: "invalid_secret" | "unavailable";
  };
  "security.unlockBiometric": {
    ok: boolean;
    error?: "invalid_secret" | "unavailable";
  };
  "security.lockNow": { ok: true };
  "security.setup": {
    ok: boolean;
    recoveryKey?: string;
    backupPath?: string;
    error?: "already_configured" | "migration_failed" | "unavailable";
  };
  "security.changePassword": {
    ok: boolean;
    error?: "invalid_secret" | "unavailable";
  };
  "security.rotateRecoveryKey": {
    ok: boolean;
    recoveryKey?: string;
    error?: "invalid_secret" | "unavailable";
  };
}
