import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardCheatsheet } from "@/components/keyboard-cheatsheet";
import { BulkActionBar } from "@/components/library/bulk-action-bar";
import { Categorize } from "@/components/library/categorize";
import { QuickCapture } from "@/components/library/quick-capture";
import { DeepLinkBridge } from "@/effects/deep-link-bridge";
import { HistoryHotkey } from "@/effects/history-hotkey";
import { PreferencesHotkey } from "@/effects/preferences-hotkey";
import styles from "./app-root.module.css";

interface AppRootProps {
  children: ReactNode;
}

export function AppRoot({ children }: AppRootProps) {
  return (
    <div className={styles.root}>
      <DeepLinkBridge />
      <PreferencesHotkey />
      <HistoryHotkey />
      {children}
      <BulkActionBar.Root />
      <QuickCapture.Root />
      <Categorize />
      <CommandPalette />
      <KeyboardCheatsheet />
    </div>
  );
}
