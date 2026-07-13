import { BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import { type ContextMenuTemplateItem, IPC } from "../../../shared/constants";
import { safeHandle } from "../helpers";

export function registerMenuHandlers(): void {
  /** Builds a native context menu from a serializable template and resolves with the chosen item's `id`, or null when dismissed. */
  safeHandle(
    IPC.menuPopup,
    (event, template: ContextMenuTemplateItem[]): Promise<string | null> => {
      return new Promise((resolve) => {
        let settled = false;
        const finish = (id: string | null) => {
          if (settled) return;
          settled = true;
          resolve(id);
        };

        const build = (
          items: ContextMenuTemplateItem[],
        ): MenuItemConstructorOptions[] =>
          items.map((item) => {
            if (item.type === "separator") return { type: "separator" };
            const out: MenuItemConstructorOptions = {
              label: item.label,
              enabled: item.enabled !== false,
            };
            if (item.accelerator) {
              out.accelerator = item.accelerator;
              /** Display the shortcut without binding it to the popup. */
              out.registerAccelerator = false;
            }
            if (item.type === "checkbox") {
              out.type = "checkbox";
              out.checked = Boolean(item.checked);
            }
            if (item.submenu && item.submenu.length > 0) {
              out.submenu = build(item.submenu);
            } else if (item.id) {
              const id = item.id;
              out.click = () => finish(id);
            }
            return out;
          });

        let menu: Menu;
        try {
          menu = Menu.buildFromTemplate(build(template));
        } catch {
          finish(null);
          return;
        }

        const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;

        /** The click handlers fire synchronously before this callback returns; the deferred null only lands when the menu was dismissed. */
        menu.popup({
          window,
          callback: () => setTimeout(() => finish(null), 0),
        });
      });
    },
  );
}
