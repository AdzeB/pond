import { describe, expect, it, vi } from "vitest";
import { createFeedbackService, notificationSettingsUrl } from "./feedback";

function preferences() {
  return {
    locale: "en" as const,
    masterSound: true,
    sounds: {
      saveDeletion: true,
      folderDeletion: true,
    },
    notifications: {
      saveDeletion: false,
      folderDeletion: false,
      extensionCapture: true,
      autoImport: true,
    },
  };
}

describe("feedback service", () => {
  it("never sounds when something is added to the library", async () => {
    const beep = vi.fn();
    const service = createFeedbackService({
      beep,
      getPreferences: async () => preferences(),
      notificationsSupported: () => true,
      showNotification: vi.fn(),
    });

    await service.emit("extensionCapture");
    await service.emit("autoImport");

    expect(beep).not.toHaveBeenCalled();
  });

  it("applies independent sound and notification preferences", async () => {
    const beep = vi.fn();
    const showNotification = vi.fn();
    const service = createFeedbackService({
      beep,
      getPreferences: async () => preferences(),
      notificationsSupported: () => true,
      showNotification,
    });

    await service.emit("saveDeletion");
    await service.emit("extensionCapture");

    expect(beep).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledWith("Saved to Pond");
  });

  it("does not notify when the platform blocks notifications", async () => {
    const showNotification = vi.fn();
    const service = createFeedbackService({
      beep: vi.fn(),
      getPreferences: async () => preferences(),
      notificationsSupported: () => false,
      showNotification,
    });

    await service.emit("autoImport");

    expect(showNotification).not.toHaveBeenCalled();
  });

  it("lets the renderer own sound playback", async () => {
    const beep = vi.fn();
    const service = createFeedbackService({
      beep,
      getPreferences: async () => preferences(),
      notificationsSupported: () => true,
      showNotification: vi.fn(),
    });

    await service.emit("extensionCapture", { sound: false });

    expect(beep).not.toHaveBeenCalled();
  });
});

it("opens platform notification settings only where supported", () => {
  expect(notificationSettingsUrl("darwin")).toContain("Notifications-Settings");
  expect(notificationSettingsUrl("win32")).toBe("ms-settings:notifications");
  expect(notificationSettingsUrl("linux")).toBeNull();
});
