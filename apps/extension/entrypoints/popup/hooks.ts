import { useEffect, useState } from "react";
import type { Folder } from "@/utils/messaging";
import { sendMessage } from "@/utils/messaging";
import { type RecentCapture, readRecent, watchRecent } from "@/utils/recent";

export function useActiveTab(): chrome.tabs.Tab | null | undefined {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>();
  useEffect(() => {
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([active]) => setTab(active ?? null))
      .catch(() => setTab(null));
  }, []);
  return tab;
}

export function useFolders(enabled: boolean): Folder[] {
  const [folders, setFolders] = useState<Folder[]>([]);
  useEffect(() => {
    if (!enabled) return;
    void sendMessage("folders", undefined)
      .then(setFolders)
      .catch(() => {});
  }, [enabled]);
  return folders;
}

export function useRecent(): RecentCapture[] {
  const [recent, setRecent] = useState<RecentCapture[]>([]);
  useEffect(() => {
    void readRecent().then(setRecent);
    return watchRecent(setRecent);
  }, []);
  return recent;
}
