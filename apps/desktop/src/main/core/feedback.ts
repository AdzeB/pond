import { Notification, shell } from "electron";
import type { FeedbackEvent } from "../../shared/feedback";
import { createTranslator } from "../../shared/localization";
import { getPrefs } from "./prefs";

interface FeedbackMessage {
  title:
    | "feedback.autoImport.title"
    | "feedback.extensionCapture.title"
    | "feedback.folderDeletion.title"
    | "feedback.saveDeletion.title"
    | "feedback.screenshot.title";
}

const MESSAGES = {
  saveDeletion: { title: "feedback.saveDeletion.title" },
  folderDeletion: { title: "feedback.folderDeletion.title" },
  screenshot: { title: "feedback.screenshot.title" },
  extensionCapture: { title: "feedback.extensionCapture.title" },
  autoImport: { title: "feedback.autoImport.title" },
} as const satisfies Record<FeedbackEvent, FeedbackMessage>;

interface FeedbackServicePorts {
  beep(): void;
  getPreferences(): Promise<{
    locale: Awaited<ReturnType<typeof getPrefs>>["localization"]["locale"];
    masterSound: boolean;
    sounds: Record<FeedbackEvent, boolean>;
    notifications: Record<FeedbackEvent, boolean>;
  }>;
  notificationsSupported(): boolean;
  showNotification(title: string): void;
}

export function createFeedbackService(ports: FeedbackServicePorts) {
  return {
    async emit(
      event: FeedbackEvent,
      options: { sound?: boolean } = {},
    ): Promise<void> {
      const preferences = await ports.getPreferences();
      if (
        options.sound !== false &&
        preferences.masterSound &&
        preferences.sounds[event]
      ) {
        ports.beep();
      }
      if (
        !preferences.notifications[event] ||
        !ports.notificationsSupported()
      ) {
        return;
      }
      const translate = createTranslator(preferences.locale);
      ports.showNotification(translate(MESSAGES[event].title));
    },
  };
}

const service = createFeedbackService({
  beep: () => shell.beep(),
  async getPreferences() {
    const prefs = await getPrefs();
    return {
      locale: prefs.localization.locale,
      masterSound: prefs.preferences.soundsEnabled,
      sounds: prefs.feedback.sounds,
      notifications: prefs.feedback.notifications,
    };
  },
  notificationsSupported: () => Notification.isSupported(),
  showNotification: (title) => new Notification({ title }).show(),
});

export function emitFeedback(event: FeedbackEvent): Promise<void> {
  return service.emit(event);
}

export function emitRendererFeedback(event: FeedbackEvent): Promise<void> {
  return service.emit(event, { sound: false });
}

export async function openNotificationSettings(): Promise<boolean> {
  const url = notificationSettingsUrl(process.platform);
  if (!url) return false;
  await shell.openExternal(url);
  return true;
}

export function notificationSettingsUrl(
  platform: NodeJS.Platform,
): string | null {
  if (platform === "darwin")
    return "x-apple.systempreferences:com.apple.Notifications-Settings.extension";
  if (platform === "win32") return "ms-settings:notifications";
  return null;
}
