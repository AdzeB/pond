import {
  type DesktopCapturerSource,
  type Display,
  Menu,
  screen,
} from "electron";

export async function chooseDisplay(): Promise<Display | null> {
  const displays = screen.getAllDisplays();
  if (displays.length === 1) return displays[0] ?? null;
  return new Promise((resolve) => {
    let selected: Display | null = null;
    const menu = Menu.buildFromTemplate(
      displays.map((display, index) => ({
        label:
          display.label ||
          `Display ${index + 1} (${display.size.width} × ${display.size.height})`,
        click: () => {
          selected = display;
        },
      })),
    );
    menu.popup({ callback: () => resolve(selected) });
  });
}

export async function chooseWindow(
  sources: DesktopCapturerSource[],
): Promise<DesktopCapturerSource | null> {
  const windows = sources.filter((source) => !source.thumbnail.isEmpty());
  if (!windows.length) return null;
  return new Promise((resolve) => {
    let selected: DesktopCapturerSource | null = null;
    Menu.buildFromTemplate(
      windows.map((source) => ({
        label: source.name || "Untitled window",
        icon: source.thumbnail.resize({ width: 80 }),
        click: () => {
          selected = source;
        },
      })),
    ).popup({ callback: () => resolve(selected) });
  });
}
