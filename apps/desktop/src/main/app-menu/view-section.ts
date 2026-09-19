import type { AppMenuContext, AppMenuItem } from "./types";

export function buildViewSection(context: AppMenuContext): AppMenuItem {
  const { accelerator, sendMenuAction } = context;

  return {
    label: "View",
    submenu: [
      {
        label: "Cycle Layout",
        accelerator: accelerator("view.layout-cycle"),
        registerAccelerator: false,
        click: sendMenuAction("view.layout.cycle"),
      },
      {
        label: "Waterfall",
        accelerator: accelerator("view.layout-waterfall"),
        registerAccelerator: false,
        click: sendMenuAction("view.layout.waterfall"),
      },
      {
        label: "Grid",
        accelerator: accelerator("view.layout-grid"),
        registerAccelerator: false,
        click: sendMenuAction("view.layout.grid"),
      },
      {
        label: "Justified",
        accelerator: accelerator("view.layout-justified"),
        registerAccelerator: false,
        click: sendMenuAction("view.layout.justified"),
      },
      {
        label: "List",
        accelerator: accelerator("view.layout-list"),
        registerAccelerator: false,
        click: sendMenuAction("view.layout.list"),
      },
      { type: "separator" },
      {
        label: "Toggle Sidebar",
        accelerator: accelerator("view.sidebar"),
        registerAccelerator: false,
        click: sendMenuAction("view.sidebar.toggle"),
      },
      {
        label: "Toggle Agent",
        accelerator: accelerator("view.agent"),
        registerAccelerator: false,
        click: sendMenuAction("view.agent.toggle"),
      },
      {
        label: "Toggle Details",
        accelerator: accelerator("view.inspector"),
        registerAccelerator: false,
        click: sendMenuAction("view.inspector.toggle"),
      },
      {
        label: "Grayscale Overlay",
        accelerator: accelerator("view.grayscale"),
        registerAccelerator: false,
        click: sendMenuAction("view.grayscale"),
      },
      {
        label: "Show Navigator",
        click: sendMenuAction("view.navigator"),
      },
      {
        label: "Appearance",
        submenu: [
          {
            label: "Light",
            click: sendMenuAction("theme.light"),
          },
          {
            label: "Dark",
            click: sendMenuAction("theme.dark"),
          },
          {
            label: "Match System",
            click: sendMenuAction("theme.system"),
          },
        ],
      },
      { type: "separator" },
      {
        label: "Zoom In",
        accelerator: accelerator("view.zoom-in"),
        registerAccelerator: false,
        click: sendMenuAction("view.zoom-in"),
      },
      {
        label: "Zoom Out",
        accelerator: accelerator("view.zoom-out"),
        registerAccelerator: false,
        click: sendMenuAction("view.zoom-out"),
      },
      {
        label: "Reset Zoom",
        accelerator: accelerator("view.zoom-reset"),
        registerAccelerator: false,
        click: sendMenuAction("view.zoom-reset"),
      },
    ],
  };
}
