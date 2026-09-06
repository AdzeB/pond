import type { SourceFlowPage } from "@/features/sources/state/source-flow";

export const steps = {
  "source-new": {
    title: "Add Source",
    group: "Connect",
    description:
      "Choose between linking saved posts and following a public account.",
  },
  "connect-source": {
    title: "Choose Source",
    group: "Connect",
    description: "Pick the platform you want to connect.",
  },
  "connect-help": {
    title: "Connecting a Source",
    group: "Connect",
    description: "Connection instructions and privacy information.",
  },
  "connect-wait": {
    title: "Add Connection",
    group: "Connect",
    description:
      "Waiting for browser sign-in. Use the state controls to inspect success and failure.",
  },
  "watch-target": {
    title: "Watch Account",
    group: "Watch",
    description:
      "Try a handle for sample results, “empty” for no matches, or “error” for a failed lookup.",
  },
  "watch-help": {
    title: "Watching an Account",
    group: "Watch",
    description: "How public-account watching works.",
  },
  "account-detail": {
    title: "Connection Details",
    group: "Manage",
    description: "Account details, maintenance, and saved items.",
  },
  "account-profile": {
    title: "Profile",
    group: "Manage",
    description: "Edit the nickname and view the account handle.",
  },
  "account-options": {
    title: "Options",
    group: "Manage",
    description: "Disconnect the account.",
  },
  "account-maintenance": {
    title: "Maintenance",
    group: "Manage",
    description: "Resync and enrichment actions.",
  },
  "watch-profile": {
    title: "Watch Profile",
    group: "Manage",
    description: "Edit the watch nickname.",
  },
  "watch-options": {
    title: "Watch Options",
    group: "Manage",
    description: "Stop watching the account.",
  },
  "watch-detail": {
    title: "Watching",
    group: "Manage",
    description: "Watch details, activity, and removal.",
  },
} satisfies Record<
  SourceFlowPage,
  { title: string; group: string; description: string }
>;

export function previewStep(value: string | null): SourceFlowPage {
  return (
    Object.keys(steps).find((key): key is SourceFlowPage => key === value) ??
    "source-new"
  );
}
