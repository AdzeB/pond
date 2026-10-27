import type { EmptyInput, OkResult } from "./query-contracts-shared";

/**
 * Whether the Safari appex that ships inside Pond.app is switched on.
 *
 * Safari has no store page and nothing to download, so the extension cannot be installed
 * from the dialog the way the Chrome and Firefox ones are. It is already in the bundle;
 * the only unknown is whether the user has enabled it.
 */
export type SafariExtensionState =
  | "enabled"
  | "disabled"
  | "not_registered"
  | "not_bundled";

export interface SafariExtensionStatus {
  state: SafariExtensionState;
  bundleId: string | null;
}

export interface SafariExtensionQueryInputs {
  "extension.safariStatus": EmptyInput;
  "extension.openSafari": EmptyInput;
}

export interface SafariExtensionQueryResults {
  "extension.safariStatus": SafariExtensionStatus;
  "extension.openSafari": OkResult;
}
