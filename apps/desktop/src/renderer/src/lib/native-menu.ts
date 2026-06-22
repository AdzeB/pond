// Thin wrapper over the native context menu IPC. Callers describe the menu with
// click handlers attached; we serialize a template (handlers stripped), pop up
// the OS menu via the main process, then run the handler for the chosen item.
// Styling is intentionally native for now — a custom skin can come later.

export interface NativeMenuItem {
  type?: "normal" | "separator" | "submenu" | "checkbox";
  label?: string;
  enabled?: boolean;
  checked?: boolean;
  /** Symbol tokens (e.g. ["⌘", "C"]) shown right-aligned; display only. */
  shortcut?: string[];
  submenu?: NativeMenuItem[];
  onSelect?: () => void | Promise<void>;
}

interface TemplateItem {
  id?: string;
  type?: "normal" | "separator" | "submenu" | "checkbox";
  label?: string;
  enabled?: boolean;
  checked?: boolean;
  accelerator?: string;
  submenu?: TemplateItem[];
}

const SHORTCUT_TOKENS: Record<string, string> = {
  "⌘": "Cmd",
  "⇧": "Shift",
  "⌥": "Alt",
  "⌃": "Ctrl",
  "⌫": "Backspace",
  "⌦": "Delete",
  "⏎": "Return",
  "↵": "Return",
  "⎋": "Esc",
  "␣": "Space",
  "⇥": "Tab",
  "↑": "Up",
  "↓": "Down",
  "←": "Left",
  "→": "Right",
};

// Convert symbol tokens to an Electron accelerator string. Returns undefined if
// any token is unrecognized so we never feed an invalid accelerator to the menu.
function toAccelerator(shortcut: string[] | undefined): string | undefined {
  if (!shortcut || shortcut.length === 0) return undefined;
  const parts: string[] = [];
  for (const raw of shortcut) {
    const token = raw.trim();
    if (!token) continue;
    const mapped = SHORTCUT_TOKENS[token];
    if (mapped) {
      parts.push(mapped);
    } else if (/^F\d{1,2}$/.test(token)) {
      parts.push(token);
    } else if (/^[A-Za-z0-9]$/.test(token)) {
      parts.push(token.toUpperCase());
    } else {
      return undefined;
    }
  }
  return parts.length > 0 ? parts.join("+") : undefined;
}

export async function showContextMenu(items: NativeMenuItem[]): Promise<void> {
  const handlers = new Map<string, () => void | Promise<void>>();
  let counter = 0;

  const serialize = (list: NativeMenuItem[]): TemplateItem[] =>
    list.map((item) => {
      if (item.type === "separator") return { type: "separator" };
      const out: TemplateItem = {
        label: item.label,
        enabled: item.enabled,
      };
      const accelerator = toAccelerator(item.shortcut);
      if (accelerator) out.accelerator = accelerator;
      if (item.type === "checkbox") {
        out.type = "checkbox";
        out.checked = item.checked;
      }
      if (item.submenu && item.submenu.length > 0) {
        out.submenu = serialize(item.submenu);
      } else if (item.onSelect) {
        const id = `mi-${counter++}`;
        out.id = id;
        handlers.set(id, item.onSelect);
      }
      return out;
    });

  const template = serialize(items);
  const chosen = await window.pond.popupMenu(template);
  if (!chosen) return;
  const handler = handlers.get(chosen);
  if (handler) await handler();
}
