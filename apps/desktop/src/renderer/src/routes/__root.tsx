import { Shell } from "@pond/ui";
import {
  createRootRoute,
  Navigate,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardCheatsheet } from "@/components/keyboard-cheatsheet";
import { BulkActionBar } from "@/components/library/bulk-action-bar";
import { Categorize } from "@/components/library/categorize";
import { QuickCapture } from "@/components/library/quick-capture";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";
import { HistoryHotkey } from "@/effects/history-hotkey";
import { PreferencesHotkey } from "@/effects/preferences-hotkey";
import { wasOnboardedLocally } from "@/lib/onboarded";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const onboarded = window.__pondShell?.onboarded;
    if (
      onboarded === false &&
      !wasOnboardedLocally() &&
      location.pathname !== "/welcome"
    ) {
      throw redirect({ to: "/welcome" });
    }
  },
  component: () => (
    <Shell.Body>
      <DeepLinkBridge />
      <PreferencesHotkey />
      <HistoryHotkey />
      <BulkActionBar.Root />
      <QuickCapture.Root />
      <Categorize />
      <CommandPalette />
      <KeyboardCheatsheet />
      <Outlet />
    </Shell.Body>
  ),
  notFoundComponent: () => <Navigate to="/" replace />,
});
