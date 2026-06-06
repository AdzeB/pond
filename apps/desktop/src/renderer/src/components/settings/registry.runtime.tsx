import {
  IconClockOutline18 as Clock,
  IconDownloadOutline18 as Download,
  IconFinderOutline18 as FolderOpen,
  IconStorageOutline18 as HardDrive,
  IconColorPaletteOutline18 as Palette,
  IconSliderOutline18 as SlidersHorizontal,
  IconTerminalOutline18 as Terminal,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import { type ComponentType, lazy } from "react";
import type { Binding } from "./engine";
import {
  ContrastRow,
  CustomColorRow,
  ResetThemeRow,
  SystemPresetRow,
  ThemeRow,
} from "./sections/appearance";
import {
  useImageDownloadBinding,
  useVideoDownloadBinding,
} from "./sections/downloads";
import {
  CheckNowRow,
  InstallInstructionsRow,
  PairingLinkRow,
} from "./sections/general";
import {
  ActionRow,
  DiskUsage,
  NoHardCapRow,
  VerifyRow,
} from "./sections/storage";

// The escape hatch for the generated settings configs. The manifest holds
// only names; this module resolves them to the runtime values that can't be
// serialized: icons, components, predicates, bindings, and side effects.

function SystemLightRow({ binding }: { binding: Binding }) {
  return <SystemPresetRow binding={binding} kind="light" />;
}

function SystemDarkRow({ binding }: { binding: Binding }) {
  return <SystemPresetRow binding={binding} kind="dark" />;
}

function AccentRow({ binding }: { binding: Binding }) {
  return <CustomColorRow binding={binding} field="accent" />;
}

function BackgroundRow({ binding }: { binding: Binding }) {
  return <CustomColorRow binding={binding} field="base" />;
}

export const icons: Record<string, IconComponent> = {
  SlidersHorizontal,
  Palette,
  HardDrive,
  FolderOpen,
  Download,
  Clock,
  Terminal,
};

// Widen each control to the common `{ binding }` signature. Components that
// ignore the binding (e.g. CheckNowRow) still satisfy it. Concrete keys keep
// lookups in the generated configs non-optional.
const control = (c: ComponentType<{ binding: Binding }>) => c;

// Custom controls and group bodies. Each receives the group binding.
export const components = {
  CheckNowRow: control(CheckNowRow),
  PairingLinkRow: control(PairingLinkRow),
  InstallInstructionsRow: control(InstallInstructionsRow),
  ThemeRow: control(ThemeRow),
  SystemLightRow: control(SystemLightRow),
  SystemDarkRow: control(SystemDarkRow),
  AccentRow: control(AccentRow),
  BackgroundRow: control(BackgroundRow),
  ContrastRow: control(ContrastRow),
  ResetThemeRow: control(ResetThemeRow),
  DiskUsage: control(DiskUsage),
  NoHardCapRow: control(NoHardCapRow),
  ActionRow: control(ActionRow),
  VerifyRow: control(VerifyRow),
};

// Fully bespoke sections, lazy so each stays in its own chunk.
export const sections: Record<string, ComponentType> = {
  LocationSection: lazy(() =>
    import("./sections/location").then((m) => ({ default: m.LocationSection })),
  ),
  ScheduleSection: lazy(() =>
    import("./sections/schedule").then((m) => ({ default: m.ScheduleSection })),
  ),
  DeveloperSection: lazy(() =>
    import("./sections/developer").then((m) => ({
      default: m.DeveloperSection,
    })),
  ),
};

type Values = Record<string, unknown>;

export const predicates: Record<string, (values: Values) => boolean> = {
  isSystemMode: (v) => (v.themeMode ?? "system") === "system",
  isCustomMode: (v) => (v.themeMode ?? "system") === "custom",
  guardsEnabled: (v) => Boolean(v.guardsEnabled),
  hasCap: (v) => Boolean(v.guardsEnabled) && v.maxLibraryGb !== null,
  videoDisabled: (v) => !v.enabled,
};

export const bindings: Record<string, () => Binding> = {
  "downloads.video": useVideoDownloadBinding,
  "downloads.image": useImageDownloadBinding,
};

// Post-patch side effect: tell main to apply the freshly saved prefs. Handlers
// may be missing in older main processes, so fail open.
export function runApply(channel: string): void {
  void window.pond.query(channel, {}).catch(() => {});
}

// Warm the lazy section chunks so switching pages resolves from cache.
export function preloadSections(): void {
  void import("./sections/location");
  void import("./sections/schedule");
  void import("./sections/developer");
}
