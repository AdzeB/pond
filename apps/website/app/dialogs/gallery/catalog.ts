export interface PreviewField {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  hiddenLabel?: boolean;
  options?: string[];
}

export interface DialogExample {
  id: string;
  title: string;
  group: string;
  kind: "prompt" | "confirm" | "custom";
  source: string;
  width: number;
  description?: string;
  confirm?: string;
  cancel?: string;
  variant?: "primary" | "destructive";
  fields?: PreviewField[];
  checks?: string[];
  rows?: string[];
  notes?: string[];
  extra?: string[];
  visual?:
    | "folder"
    | "rules"
    | "duplicates"
    | "preview"
    | "connection"
    | "watch";
}

export const dialogExamples: DialogExample[] = [
  {
    id: "move-library",
    title: "Move Library",
    group: "Library",
    kind: "confirm",
    source: "app/effects/menu-bridge.tsx",
    width: 400,
    description:
      "Pond will verify the new copy before removing the library from its current location.",
    confirm: "Move",
  },
  {
    id: "import-page-assets",
    title: "Import Page Assets",
    group: "Library",
    kind: "prompt",
    source: "app/effects/menu-bridge.tsx",
    width: 400,
    description: "Pond saves the images and files from the page you enter.",
    confirm: "Import",
    fields: [
      {
        label: "Import Page Assets",
        placeholder: "https://",
        value: "",
        type: "text",
        hiddenLabel: true,
      },
    ],
  },
  {
    id: "delete-chat",
    title: "Delete Chat",
    group: "Assistant",
    kind: "confirm",
    source: "features/agent/components/pane/chat-actions.tsx",
    width: 400,
    description:
      "This permanently deletes the conversation. Your Saves stay in your library.",
    confirm: "Delete",
  },
  {
    id: "remove-folder",
    title: "Remove Folder",
    group: "Library",
    kind: "confirm",
    source:
      "features/library/components/folder-context-menu/folder-context-menu.tsx",
    width: 400,
    description:
      "Saves stay in the Library and move to Uncategorized unless you select the option below.",
    confirm: "Remove",
    variant: "destructive",
    checks: ["Move Saves in this folder and its subfolders to Trash"],
  },
  {
    id: "delete-forever",
    title: "Delete Forever",
    group: "Saves",
    kind: "confirm",
    source: "features/saves/effects/save-hotkeys.tsx",
    width: 400,
    confirm: "Delete",
    description: "3 saves and their files are deleted. This cannot be undone.",
  },
  {
    id: "empty-trash",
    title: "Empty Trash",
    group: "Saves",
    kind: "confirm",
    source: "features/saves/lib/empty-trash.ts",
    width: 400,
    description:
      "Every save in Trash is deleted forever. This cannot be undone.",
    confirm: "Empty",
  },
  {
    id: "rotate-local-api-token",
    title: "Rotate Local API Token",
    group: "Settings",
    kind: "confirm",
    source: "features/settings/components/sections/general/raycast.tsx",
    width: 400,
    description:
      "Existing local integrations stop working until you give them the new token.",
    confirm: "Rotate",
  },
  {
    id: "stop-watching",
    title: "Stop Watching",
    group: "Sources",
    kind: "confirm",
    source: "features/sources/lib/source-menu.tsx",
    width: 400,
    confirm: "Stop",
    description:
      "Pond stops checking @studio for new posts. The 128 already saved stay in your library.",
  },
  {
    id: "remove-tag-group",
    title: "Remove Tag Group",
    group: "Tags",
    kind: "confirm",
    source: "features/tags/components/manager/lib/row-context.tsx",
    width: 400,
    confirm: "Remove",
    description:
      '"Inspiration" is removed. The tags stay, and they no longer belong to this group.',
  },
  {
    id: "remove-tag",
    title: "Remove Tag",
    group: "Tags",
    kind: "confirm",
    source: "features/tags/components/manager/lib/row-context.tsx",
    width: 400,
    confirm: "Remove",
    description:
      "“design” will be removed from every save. This cannot be undone.",
  },
  {
    id: "disconnect-x",
    title: "Disconnect X",
    group: "Sources",
    kind: "confirm",
    source: "features/sources/lib/source-menu.tsx",
    width: 400,
    confirm: "Disconnect",
    description:
      "Pond signs @studio out and stops its syncing. The 128 already saved stay in your library.",
  },
  {
    id: "delete-3-tags",
    title: "Delete 3 Tags",
    group: "Tags",
    kind: "confirm",
    source: "features/tags/components/manager/bulk-actions.ts",
    width: 400,
    confirm: "Delete",
    description: "They will be removed from every save. This cannot be undone.",
  },
  {
    id: "import-from-links",
    title: "Import from Links",
    group: "Library",
    kind: "custom",
    source: "features/library/components/new-menu/save-dialog/index.tsx",
    width: 400,
    confirm: "Import",
    fields: [
      {
        label: "Links",
        value: "https://example.com\nhttps://are.na/studio",
        type: "textarea",
      },
    ],
    description: "Add website links, one per line.",
  },
  {
    id: "customize-folder",
    title: "Customize Folder",
    group: "Library",
    kind: "custom",
    source: "features/library/components/folder-customize-dialog/index.tsx",
    width: 440,
    confirm: "Save",
    fields: [
      {
        label: "Description",
        value: "",
        type: "textarea",
      },
      {
        label: "External Link",
        value: "",
        placeholder: "https://",
      },
    ],
    visual: "folder",
    description: "Choose how this folder looks and add optional details.",
  },
  {
    id: "assign-folders",
    title: "Assign Folders",
    group: "Library",
    kind: "custom",
    source: "features/library/components/folder-picker/index.tsx",
    width: 480,
    confirm: "Apply",
    fields: [
      {
        label: "Search folders",
        value: "",
      },
    ],
    checks: ["Inspiration", "Design", "Reading"],
    extra: ["Repeat"],
    description: "Choose folders for 3 saves.",
  },
  {
    id: "automatic-tags",
    title: "Automatic Tags",
    group: "Library",
    kind: "custom",
    source: "features/library/components/folder-tools/index.tsx",
    width: 520,
    confirm: "Save",
    fields: [
      {
        label: "Search or add tags",
        value: "",
      },
    ],
    checks: [
      "design",
      "inspiration",
      "Apply to Saves already in this folder and its subfolders",
    ],
    description:
      "Add these tags when Saves enter Inspiration or its subfolders. Removing a Save from a folder keeps its tags.",
  },
  {
    id: "create-folders",
    title: "Create Folders",
    group: "Library",
    kind: "custom",
    source: "features/library/components/folder-tools/index.tsx",
    width: 520,
    confirm: "Create",
    fields: [
      {
        label: "Destination",
        value: "Folders",
        options: ["Folders", "Inspiration"],
      },
      {
        label: "Folder names, one per line",
        value: "Design\nReading\nPhotography",
        type: "textarea",
      },
    ],
    description: "Enter one folder name per line.",
  },
  {
    id: "move-folders",
    title: "Move Folders",
    group: "Library",
    kind: "custom",
    source: "features/library/components/folder-tools/index.tsx",
    width: 520,
    confirm: "Move",
    fields: [
      {
        label: "Destination",
        value: "Folders",
        options: ["Folders", "Inspiration"],
      },
      {
        label: "Search folders to move",
        value: "",
      },
    ],
    checks: ["Design", "Reading", "Photography"],
    description:
      "Choose folders and their destination. Selected subfolders stay inside their selected parent.",
  },
  {
    id: "batch-rename-folders",
    title: "Batch Rename Folders",
    group: "Library",
    kind: "custom",
    source: "features/library/components/organization-rename-dialog/index.tsx",
    width: 480,
    confirm: "Rename",
    fields: [
      {
        label: "Template",
        value: "{n:2} {title}",
      },
    ],
    checks: ["Design", "Reading", "Photography"],
    extra: ["Select All", "Clear"],
    description:
      "Rename the selected items with one template, such as {n:2} {title}.",
  },
  {
    id: "batch-rename-smart-folders",
    title: "Batch Rename Smart Folders",
    group: "Library",
    kind: "custom",
    source: "features/library/components/organization-rename-dialog/index.tsx",
    width: 480,
    confirm: "Rename",
    fields: [
      {
        label: "Template",
        value: "{n:2} {title}",
      },
    ],
    checks: ["Design", "Reading", "Photography"],
    extra: ["Select All", "Clear"],
    description:
      "Rename the selected items with one template, such as {n:2} {title}.",
  },
  {
    id: "arrange-folder",
    title: "Arrange Folder",
    group: "Library",
    kind: "custom",
    source: "features/library/components/folder-order/index.tsx",
    width: 620,
    confirm: "Save",
    rows: [
      "1    Color study                      ↑ ↓",
      "2    Reference collection       ↑ ↓",
      "3    Weekend reading             ↑ ↓",
    ],
    description:
      "Drag saves into order, or use the move buttons. This order includes all saves in the folder.",
  },
  {
    id: "new-smart-folder",
    title: "New Smart Folder",
    group: "Library",
    kind: "custom",
    source: "features/library/components/smart-folders/rule-dialog/index.tsx",
    width: 640,
    confirm: "Create",
    fields: [
      {
        label: "Name",
        value: "Inspiration",
      },
    ],
    visual: "rules",
    notes: ["12 matching saves"],
    description:
      "This smart folder automatically collects saves that match these rules.",
  },
  {
    id: "edit-smart-folder",
    title: "Edit Smart Folder",
    group: "Library",
    kind: "custom",
    source: "features/library/components/smart-folders/rule-dialog/index.tsx",
    width: 640,
    confirm: "Save",
    fields: [
      {
        label: "Name",
        value: "Inspiration",
      },
    ],
    visual: "rules",
    notes: ["12 matching saves"],
    description:
      "This smart folder automatically collects saves that match these rules.",
  },
  {
    id: "new-smart-folder-group-rules",
    title: "New Smart Folder Group",
    group: "Library",
    kind: "custom",
    source: "features/library/components/smart-folders/rule-dialog/index.tsx",
    width: 640,
    confirm: "Create",
    fields: [
      {
        label: "Name",
        value: "Inspiration",
      },
    ],
    visual: "rules",
    notes: ["12 matching saves"],
    description:
      "These rules filter every smart folder and saved view in this group.",
  },
  {
    id: "edit-smart-folder-group",
    title: "Edit Smart Folder Group",
    group: "Library",
    kind: "custom",
    source: "features/library/components/smart-folders/rule-dialog/index.tsx",
    width: 640,
    confirm: "Save",
    fields: [
      {
        label: "Name",
        value: "Inspiration",
      },
    ],
    visual: "rules",
    notes: ["12 matching saves"],
    description:
      "These rules filter every smart folder and saved view in this group.",
  },
  {
    id: "rename-saves",
    title: "Rename Saves",
    group: "Library",
    kind: "custom",
    source: "features/library/components/rename-dialog/index.tsx",
    width: 520,
    confirm: "Rename",
    fields: [
      {
        label: "Name Pattern",
        value: "{title} {n}",
      },
    ],
    description: "Rename 3 saves with a pattern such as {title} {n}.",
  },
  {
    id: "export-converted-files",
    title: "Export",
    group: "Library",
    kind: "custom",
    source: "features/library/components/conversion-dialog/index.tsx",
    width: 600,
    confirm: "Export",
    fields: [
      {
        label: "Preset",
        value: "New Preset",
        options: ["New Preset"],
      },
      {
        label: "Name",
        value: "Web images",
      },
      {
        label: "Format",
        value: "WebP",
        options: ["WebP", "JPEG", "PNG", "GIF"],
      },
      {
        label: "Width",
        value: "",
        placeholder: "Original",
      },
      {
        label: "Height",
        value: "",
        placeholder: "Original",
      },
      {
        label: "Quality",
        value: "90",
        type: "range",
      },
    ],
    checks: ["Lossless"],
    extra: ["Save"],
    cancel: "Close",
    description: "Choose how to export 3 saves, then select a destination.",
  },
  {
    id: "repair-thumbnails",
    title: "Repair Thumbnails",
    group: "Library",
    kind: "custom",
    source: "features/library/components/repair-dialog/index.tsx",
    width: 640,
    confirm: "Repair",
    rows: [
      "2 Saves need repair.",
      "Color study · Missing thumbnail",
      "Reference collection · Missing thumbnail",
    ],
    notes: [
      "Pond snapshots every changed file before applying.",
      "You can Undo this repair.",
    ],
    description: "Pond rebuilds a thumbnail for each save listed below.",
  },
  {
    id: "repair-physical-file-names",
    title: "Repair Physical File Names",
    group: "Library",
    kind: "custom",
    source: "features/library/components/repair-dialog/index.tsx",
    width: 640,
    confirm: "Repair",
    rows: [
      "2 Saves need repair.",
      "Color study · File name does not match the save",
      "Reference collection · File name does not match the save",
    ],
    notes: [
      "Pond snapshots every changed file before applying.",
      "You can Undo this repair.",
    ],
    description: "Pond renames files on disk so they match the save.",
  },
  {
    id: "repair-invalid-content",
    title: "Repair Invalid Content",
    group: "Library",
    kind: "custom",
    source: "features/library/components/repair-dialog/index.tsx",
    width: 640,
    confirm: "Repair",
    rows: [
      "2 Saves need repair.",
      "Color study · Unreadable file",
      "Reference collection · Unreadable file",
    ],
    notes: [
      "Pond snapshots every changed file before applying.",
      "Invalid Saves move to Trash.",
    ],
    description: "Saves with unreadable files move to Trash.",
  },
  {
    id: "repair-save-metadata",
    title: "Repair Save Metadata",
    group: "Library",
    kind: "custom",
    source: "features/library/components/repair-dialog/index.tsx",
    width: 640,
    confirm: "Repair",
    rows: [
      "2 Saves need repair.",
      "Color study · Details do not match the file",
      "Reference collection · Details do not match the file",
    ],
    notes: ["This repair rebuilds metadata and cannot be undone."],
    description:
      "Pond rewrites save details that no longer match the files. This cannot be undone.",
  },
  {
    id: "review-duplicates",
    title: "Review Duplicates",
    group: "Library",
    kind: "custom",
    source: "features/library/components/duplicate-review/index.tsx",
    width: 780,
    description: "Compare matching saves, then keep one.",
    confirm: "Merge",
    visual: "duplicates",
    rows: [
      "Exact Duplicates     Similar Images",
      "Color study · Keep this save",
      "Color study copy · Include in merge",
    ],
  },
  {
    id: "search-pond",
    title: "Search Pond",
    group: "Library",
    kind: "custom",
    source: "features/library/components/command-menu/index.tsx",
    width: 680,
    description: "Find saves, folders, and commands.",
    confirm: "",
    fields: [
      {
        label: "Search Pond",
        value: "",
        placeholder: "Search saves, folders, and commands…",
      },
    ],
    rows: [
      "Recent",
      "Inspiration                                     Folder",
      "Import from Links                       Command",
      "Settings                                         Command",
    ],
    notes: ["↑ ↓ Navigate       ↵ Open       esc Close"],
  },
  {
    id: "preview",
    title: "Preview",
    group: "Saves",
    kind: "custom",
    source: "features/library/components/hover-preview/index.tsx",
    width: 720,
    description: "A closer look at the selected save.",
    confirm: "",
    visual: "preview",
  },
  {
    id: "compare-saves",
    title: "Compare Saves",
    group: "Saves",
    kind: "custom",
    source: "features/library/components/hover-preview/index.tsx",
    width: 1000,
    description: "Look at the selected saves side by side.",
    confirm: "",
    visual: "duplicates",
    notes: ["−     100%     +"],
  },
  {
    id: "combine-images",
    title: "Combine Images",
    group: "Saves",
    kind: "custom",
    source: "features/saves/components/combine-images-dialog/index.tsx",
    width: 560,
    confirm: "Combine",
    fields: [
      {
        label: "Direction",
        value: "Horizontal",
        options: ["Horizontal", "Vertical"],
      },
      {
        label: "Order",
        value: "Selection",
        options: ["Selection", "Name"],
      },
      {
        label: "Alignment",
        value: "Center",
        options: ["Center", "Start", "End"],
      },
      {
        label: "Width",
        value: "",
        placeholder: "Original",
      },
      {
        label: "Height",
        value: "",
        placeholder: "Original",
      },
      {
        label: "Spacing",
        value: "0",
        type: "number",
      },
      {
        label: "Margin",
        value: "0",
        type: "number",
      },
      {
        label: "Corner Radius",
        value: "0",
        type: "number",
      },
      {
        label: "Background",
        value: "#ffffff",
        type: "color",
      },
      {
        label: "Opacity",
        value: "1",
        type: "number",
      },
      {
        label: "Format",
        value: "PNG",
        options: ["PNG", "JPEG", "WebP"],
      },
      {
        label: "Output",
        value: "New Save",
        options: ["New Save", "Export"],
      },
    ],
    checks: ["Move Originals to Trash"],
    description: "Arrange and export 3 selected images.",
  },
  {
    id: "review-duplicate-import",
    title: "Review Duplicate Import",
    group: "Saves",
    kind: "custom",
    source: "features/saves/components/duplicate-import-review/index.tsx",
    width: 440,
    confirm: "Use Existing",
    rows: ["color-study.png", "Matches Color study", "1 of 3"],
    checks: ["Apply to All"],
    extra: ["Keep Both"],
    description: "This file already exists in your Library.",
  },
  {
    id: "requesting-connection",
    title: "Requesting Connection",
    group: "Sources",
    kind: "custom",
    source: "features/sources/components/flow/connect/wait/index.tsx",
    width: 400,
    confirm: "",
    visual: "connection",
    description:
      "The session stays on this device, and Pond only reads your saves.",
  },
  {
    id: "connected",
    title: "Connected",
    group: "Sources",
    kind: "custom",
    source: "features/sources/components/flow/connect/wait/index.tsx",
    width: 400,
    confirm: "",
    visual: "connection",
    description: "Saved posts appear in your library.",
  },
  {
    id: "connection-unavailable",
    title: "Connection Unavailable",
    group: "Sources",
    kind: "custom",
    source: "features/sources/components/flow/connect/wait/index.tsx",
    width: 400,
    confirm: "Try Again",
    visual: "connection",
    description: "Couldn't open X. Try the sign-in page again.",
  },
  {
    id: "new-watch",
    title: "New Watch",
    group: "Sources",
    kind: "custom",
    source: "features/sources/components/flow/watch/target/index.tsx",
    width: 400,
    confirm: "",
    fields: [
      {
        label: "Link or handle",
        value: "",
        placeholder: "Link or handle",
      },
    ],
    visual: "watch",
    description: "Paste a link or enter a handle to start watching on X.",
  },
];
