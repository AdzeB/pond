import type { ShortcutDef } from "../../shared/shortcuts";

export function menuAccelerator(shortcut: ShortcutDef): string | undefined {
  if (shortcut.sequence) return shortcut.sequence.join(" ");
  return shortcut.keys
    ?.split("+")
    .map((part) => {
      switch (part) {
        case "Mod":
          return "CommandOrControl";
        case "Meta":
          return process.platform === "darwin" ? "Command" : "Super";
        case "ArrowLeft":
          return "Left";
        case "ArrowRight":
          return "Right";
        case "ArrowUp":
          return "Up";
        case "ArrowDown":
          return "Down";
        default:
          return part;
      }
    })
    .join("+");
}
