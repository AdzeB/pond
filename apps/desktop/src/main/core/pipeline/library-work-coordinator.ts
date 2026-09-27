export interface LibraryWorkOperations {
  stopAutoImport: () => Promise<void>;
  stopScreenshotIntake: () => Promise<void>;
  stopLibraryTransfers: () => Promise<void>;
  pauseAndDrainReconciler: () => Promise<boolean>;
  suspendMutations: () => Promise<void>;
  resumeMutations: () => void;
  resumeLibraryTransfers: () => void;
  setReconcilerPaused: (paused: boolean) => Promise<boolean>;
  startAutoImport: () => Promise<void>;
  startScreenshotIntake: () => Promise<void>;
  warn: (message: string, error: Error) => void;
}

export function createLibraryWorkCoordinator(ops: LibraryWorkOperations) {
  let reconcilerWasPaused: boolean | null = null;

  return {
    async suspend(): Promise<void> {
      await ops.stopAutoImport();
      await ops.stopScreenshotIntake();
      await ops.stopLibraryTransfers();
      if (reconcilerWasPaused === null) {
        reconcilerWasPaused = await ops.pauseAndDrainReconciler();
      }
      await ops.suspendMutations();
    },

    async resume(): Promise<void> {
      ops.resumeMutations();
      ops.resumeLibraryTransfers();
      const wasPaused = reconcilerWasPaused;
      reconcilerWasPaused = null;
      if (wasPaused === false) await ops.setReconcilerPaused(false);
      await ops
        .startAutoImport()
        .catch((error) =>
          ops.warn(
            "Could not start auto-import",
            error instanceof Error ? error : new Error(String(error)),
          ),
        );
      await ops
        .startScreenshotIntake()
        .catch((error) =>
          ops.warn(
            "Could not start screenshot intake",
            error instanceof Error ? error : new Error(String(error)),
          ),
        );
    },
  };
}
