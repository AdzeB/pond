export type Entry = {
  id: string;
  group: string;
  folder: string;
  description: string;
  measure?: string;
  app?: string;
  appOverlay?: string;
  appRelation?: string;
  coverageNote?: string;
};

const groups: [string, [string, string, string][]][] = [
  [
    "Controls",
    [
      [
        "Button",
        "button",
        "Seven captured Linear button contexts, paired with Pond controls of the same height and content. Pond’s full size and variant inventory is below.",
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
        "A real Sidebar composition. Metrics target the first navigation row, not its container.",
      ],
      [
        "Tab",
        "tab",
        "Three tabs with active state and an optional close action.",
      ],
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
      [
        "Logo",
        "logo",
        "Pond’s real brand mark at three common sizes. Brand identity is not a styling defect.",
      ],
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
        "Chip",
        "chip",
        "Filter formulas as field, operator, and value pills. Mention and tag chips use a filled tone.",
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

const comparisons = new Map<string, Partial<Entry>>(Object.entries({
  Input: {
    measure: "input",
    app: "app-priority-search",
    appRelation:
      "Related input: Linear’s borderless, focused dropdown search field versus Pond’s standalone text input. Context and focus state differ.",
  },
  Field: { measure: "input" },
  Switch: {
    measure: "[role=switch]",
    app: "app-switch",
    appRelation:
      "Same visual role: a binary switch. Both tracks are 22 × 14 px with a 10 px thumb. Neither saved preference was changed.",
  },
  Tab: { measure: "[role=tab]" },
  Table: { measure: "tbody tr" },
  Window: { measure: "[data-slot=window]" },
  Conversation: { measure: ":scope > *" },
  Keyboard: {
    measure: "kbd",
    app: "app-keyboard",
    appRelation:
      "Related shortcut treatment: Linear’s unboxed dropdown shortcut versus Pond’s default keycap. Pond also offers inline and flat variants.",
  },
  Logo: { measure: "svg" },
  Button: {
    app: "app-primary-button",
    appRelation:
      "Linear’s captured actions use pill corners at 24 and 28 px heights. Pond now uses the same pill shape across all five button sizes. Source icons are shared here to isolate control styling; colors reflect each product’s theme. These are seven observed contexts, not a complete variant API.",
    measure: "[data-primary]",
  },
  Sidebar: {
    app: "app-sidebar-label-row",
    appRelation:
      "Same role: the visible, unselected Inbox row. Production Linear and Pond both use 28 px height, 13 px text, weight 500, and 8 px corners. Linear’s row wrapper inherits 16 px text; the measured inner surface carries the visible 13 px label.",
    measure: "[data-primary]",
  },
  Toolbar: {},
  TitleBar: {},
  Chip: {
    measure: "[data-tone=tag]",
  },
  Message: {
    measure: "[data-primary]",
  },
  TrayCard: {},
  Select: {
    app: "app-priority-trigger",
    appOverlay: "app-priority-popup",
    appRelation:
      "Related single-choice picker: Linear’s priority control includes search; Pond Select does not. Each inspector follows its own trigger or popup; compare equivalent states.",
  },
  Combobox: {
    app: "app-priority-trigger",
    appOverlay: "app-priority-popup",
    appRelation:
      "Same searchable single-choice pattern. The reconstructed picker supports filtering, an empty state, keyboard selection, and Escape dismissal.",
  },
  Menu: {
    app: "app-workspace-menu",
    appRelation:
      "Same action-menu surface role. Linear exposes its workspace menu as a dialog/listbox composition; Pond uses menu semantics. Menu content is neutral; the native surface, row, divider, shortcut, and label styles are retained.",
  },
  Popover: {
    app: "app-priority-popup",
    appRelation:
      "Related anchored surface only: a searchable priority picker versus Pond’s general content popover. Open the Pond example before comparing surface geometry.",
  },
  Dialog: {
    app: "app-dialog-surface",
    appRelation:
      "Related modal surfaces: Linear’s blank issue composer and Pond’s edit dialog. Open the Pond dialog to compare. Linear’s 750 px width and content-driven height are context, not target tokens.",
  },
  Settings: {
    coverageNote:
      "Auto-review blocked opening private account/workspace settings. This family remains uninspected; cropped-reference approval has already been received.",
  },
  Checkbox: {
    measure: "[role=checkbox]",
    coverageNote:
      "The inspected native checkbox is visually a switch and is compared under Switch. No square checkbox reference was captured.",
  },
  Tooltip: {
    coverageNote:
      "Hover was attempted on the generic create action, but no tooltip surface was captured. Timing, padding, and shortcuts remain unverified.",
  },
}));

const nativeComparisons = new Map<string, Partial<Entry>>(Object.entries({
  Sidebar: {
    app: "app-sidebar-unselected-label",
    appRelation:
      "Native navigation labels: default and selected text treatments were extracted. Both products use 28 px rows with 13 px, weight-500 text.",
  },
  Switch: {
    app: "app-checkbox-unchecked",
    appRelation:
      "Native display switches, including both track colors and thumb positions. Pond now matches the 22 × 14 px track, 10 px thumb and 8 px travel while keeping its own colors and transitions. No saved preference was toggled.",
  },
  Keyboard: {
    app: "app-menu-shortcut",
    appRelation:
      "Native menu shortcut versus Pond keycap variants. Linear uses an unboxed 11 px label in this menu.",
  },
  Checkbox: {
    app: "app-square-checkbox",
    appRelation:
      "Native issue-list selection checkbox: 14 × 14 px, 3 px radius, 1 px border. The unchecked appearance was extracted; checked feedback is a local reconstruction.",
  },
  Tab: {
    app: "app-view-tab-active",
    appRelation:
      "Native Active / Backlog / All issues navigation tabs. Both active and inactive styles were extracted; local tabs preserve keyboard navigation.",
  },
  Toggle: {
    app: "app-favorite-toggle",
    appRelation:
      "Native favorite action versus Pond toggle. The unselected control was measured; pressed feedback is local and does not change Linear favorites.",
  },
  Tooltip: {
    app: "app-tooltip",
    appRelation:
      "Native tooltip surface and nested content: 8 px corners, a half-pixel border, 11 px text, and 5 / 8 px content padding. Hover or focus either trigger.",
  },
  ContextMenu: {
    app: "app-context-menu",
    appRelation:
      "Native issue context menu. The preview uses a short neutral action list; the source menu was taller because it contained more actions.",
  },
  Toolbar: {
    app: "app-toolbar",
    appRelation:
      "Native Inbox heading/actions row versus Pond toolbar primitives. Fixed source dimensions reflect the inspected window; preview widths adapt to each column.",
  },
  TitleBar: {
    app: "app-toolbar",
    appRelation:
      "Related composition: native Inbox view header versus Pond’s centered title bar. The native heading and action styles were extracted separately.",
  },
  Settings: {
    app: "app-display-popup",
    appRelation:
      "Related preference controls from the native Display options panel. The preview shows its three toggle rows. Private account Settings remain outside this extraction.",
  },
  Table: {
    app: "app-issue-row",
    appRelation:
      "Native issue list versus Pond’s semantic table. Linear uses 44 px grid rows, 13 px weight-500 titles and 12 px dates. Neutral preview columns are simplified to fit the comparison.",
  },
  DataTable: {
    app: "app-issue-row",
    appRelation:
      "Native issue-list row versus Pond’s sortable data grid. The reference reproduces row and text styles, with local selection and neutral sample data.",
  },
  Empty: {
    app: "app-empty-label",
    appRelation:
      "Native Inbox empty-state label. Its illustration and surrounding layout were not extracted; only the measured label is rendered.",
  },
  PromptInput: {
    app: "app-chat-surface",
    appRelation:
      "Native Linear AI prompt box, editor, skills button, attachment action, and submit control. Local interactions never send a message to Linear.",
  },
  Chip: {
    app: "app-label-trigger",
    appRelation:
      "Related compact label-picker trigger from the native composer versus Pond assistant chips. This is a picker trigger, not a selected issue-label badge.",
  },
}));

export const catalog: Entry[] = groups.flatMap(([group, entries]) =>
  entries.map(([id, folder, description]) => ({
    id,
    group,
    folder,
    description,
    coverageNote:
      "Not inspected in the component-scoped production pass. This is a coverage gap, not evidence that Linear has no equivalent.",
    ...comparisons.get(id),
    ...nativeComparisons.get(id),
  })),
);
export const categories = groups.map(([group]) => group);
