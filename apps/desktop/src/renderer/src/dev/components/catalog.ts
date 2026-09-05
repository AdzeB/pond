export interface ComponentEntry {
  id: string;
  group: string;
  folder: string;
  description: string;
}

export const componentGroups: [string, [string, string, string][]][] = [
  [
    "Controls",
    [
      [
        "Button",
        "button",
        "Five sizes, seven treatments, and two corner styles. Change props in the playground to compare them.",
      ],
      [
        "Input",
        "input",
        "Text field and multiline input. Edit either field to inspect its focus treatment.",
      ],
      ["Field", "field", "Label, control, and description as one form field."],
      [
        "Select",
        "select",
        "A single-choice menu using Pond’s shared popup and trigger.",
      ],
      ["Combobox", "combobox", "Searchable selection with an empty state."],
      [
        "Chip",
        "chip",
        "Filter formulas as field, operator, and value pills. Mention and tag chips use a filled tone.",
      ],
      ["Checkbox", "checkbox", "Checked, unchecked, and disabled controls."],
      [
        "Switch",
        "switch",
        "A binary preference with its normal label spacing.",
      ],
      ["Toggle", "toggle", "A pressed button with independent state."],
      [
        "ToggleGroup",
        "toggle-group",
        "A mutually exclusive set of layout controls.",
      ],
      ["Slider", "slider", "Continuous value control with a visible value."],
      [
        "Stepper",
        "stepper",
        "Numeric input, increment, and decrement controls.",
      ],
      ["ColorField", "color-field", "Editable hex value and color swatch."],
      [
        "ColorPicker",
        "color-field",
        "Saturation, brightness, hue, and hex input.",
      ],
    ],
  ],
  [
    "Navigation",
    [
      [
        "Sidebar",
        "sidebar",
        "Navigation rows, counts, active states, and collapsible groups.",
      ],
      ["Tab", "tab", "Three tabs with interactive active states."],
      [
        "Toolbar",
        "toolbar",
        "Shared toolbar row with action groups. Application wrappers may add padding.",
      ],
      [
        "TitleBar",
        "title-bar",
        "Centered title with leading and trailing controls.",
      ],
      [
        "Accordion",
        "accordion",
        "Expandable sections with their production transition and spacing.",
      ],
      ["Tray", "tray", "Compact floating actions and a divider."],
    ],
  ],
  [
    "Overlays",
    [
      [
        "Menu",
        "menu",
        "A static shared menu surface, plus a button that opens its keyboard-accessible popup.",
      ],
      [
        "ContextMenu",
        "context-menu",
        "Right-click the target to inspect the contextual popup.",
      ],
      [
        "Popover",
        "popover",
        "Anchored content, title, description, and close action.",
      ],
      [
        "Tooltip",
        "tooltip",
        "Hover or focus the trigger to inspect the tooltip and shortcut.",
      ],
      [
        "Dialog",
        "dialog",
        "Open the dialog to inspect its surface, backdrop, and focus handling.",
      ],
      [
        "AlertDialog",
        "alert-dialog",
        "A confirmation dialog using harmless local sample data.",
      ],
      [
        "PageDialog",
        "page-dialog",
        "A two-step dialog with animated page transitions.",
      ],
      ["Drawer", "drawer", "A bottom sheet using the shared Drawer component."],
      [
        "Toast",
        "toast",
        "Trigger a local notification to inspect its layout and dismissal.",
      ],
    ],
  ],
  [
    "Content & layout",
    [
      [
        "Table",
        "table",
        "A semantic table with headers and three sample rows.",
      ],
      [
        "DataTable",
        "data-table",
        "Sortable and selectable data grid using the actual provider.",
      ],
      [
        "Settings",
        "settings",
        "Preference rows, section headings, and trailing controls.",
      ],
      [
        "Empty",
        "empty",
        "An empty state with icon, title, description, and action.",
      ],
      ["Shell", "shell", "The shared shell primitives in a bounded preview."],
      [
        "Window",
        "window",
        "Application frame with a resizable sidebar. Preview width is constrained.",
      ],
      [
        "TrayCard",
        "tray-card",
        "A floating card with header, divider, and footer actions.",
      ],
      [
        "Keyboard",
        "keyboard",
        "Shortcut keycaps in default, inline, and flat densities.",
      ],
      ["Logo", "logo", "Pond’s brand mark at three common sizes."],
      [
        "Video",
        "video",
        "Player controls with a local generated test clip; no external media or playback on load.",
      ],
    ],
  ],
  [
    "Assistant",
    [
      [
        "Attachments",
        "ai/attachments",
        "Attachment label, thumbnail slot, and remove action.",
      ],
      [
        "Conversation",
        "ai/conversation",
        "A bounded conversation area with user and assistant messages.",
      ],
      [
        "Message",
        "ai/message",
        "User and assistant message treatments and response actions.",
      ],
      [
        "PromptInput",
        "ai/prompt-input",
        "Prompt surface and action toolbar with an editable body.",
      ],
      ["Suggestion", "ai/suggestion", "A suggested prompt with a count."],
      ["Loader", "ai/loader", "The three-dot busy indicator."],
      [
        "Shimmer",
        "ai/shimmer",
        "Animated working text, respecting reduced motion.",
      ],
    ],
  ],
];

export const components: ComponentEntry[] = componentGroups.flatMap(
  ([group, entries]) =>
    entries.map(([id, folder, description]) => ({
      id,
      group,
      folder,
      description,
    })),
);
