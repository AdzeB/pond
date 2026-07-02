import type { ReactNode } from "react";
import {
  AccordionDemo,
  AlertDialogDemo,
  ButtonDemo,
  CheckboxDemo,
  ColorFieldDemo,
  ColorsDemo,
  ContextMenuDemo,
  DialogDemo,
  DrawerDemo,
  FieldDemo,
  InputDemo,
  KeyboardDemo,
  MenuDemo,
  PopoverDemo,
  SelectDemo,
  SettingsDemo,
  ShellDemo,
  SidebarDemo,
  SliderDemo,
  StepperDemo,
  SwitchDemo,
  TitleBarDemo,
  ToolbarDemo,
  TooltipDemo,
  VideoDemo,
} from "./demos";
import { ThemePlayground } from "./theme-playground";

export interface ComponentDemo {
  id: string;
  label: string;
  caption: string;
  render: () => ReactNode;
}

export interface DemoGroup {
  label: string;
  items: ComponentDemo[];
}

export const DEMO_GROUPS: DemoGroup[] = [
  {
    label: "Foundations",
    items: [
      {
        id: "colors",
        label: "Colors",
        caption:
          "Every design-system scale: theme grays and accent, their alpha forms, the static hue ramps, and neutral overlays.",
        render: () => <ColorsDemo />,
      },
      {
        id: "playground",
        label: "Playground",
        caption:
          "Live theming: pick a primary and neutral hue and a radius to retint a scoped preview via data-accent / data-neutral.",
        render: () => <ThemePlayground />,
      },
    ],
  },
  {
    label: "Actions",
    items: [
      {
        id: "button",
        label: "Button",
        caption: "Every variant across interaction states, plus all sizes.",
        render: () => <ButtonDemo />,
      },
      {
        id: "toolbar",
        label: "Toolbar",
        caption: "Grouped actions with separators in a single bar.",
        render: () => <ToolbarDemo />,
      },
      {
        id: "stepper",
        label: "Stepper",
        caption: "Numeric input with increment, decrement and reset.",
        render: () => <StepperDemo />,
      },
      {
        id: "keyboard",
        label: "Keyboard",
        caption: "Key clusters and standalone keycaps.",
        render: () => <KeyboardDemo />,
      },
    ],
  },
  {
    label: "Inputs",
    items: [
      {
        id: "input",
        label: "Input",
        caption:
          "Text field, with and without an icon, across interaction states.",
        render: () => <InputDemo />,
      },
      {
        id: "field",
        label: "Field",
        caption: "Labelled control with description across interaction states.",
        render: () => <FieldDemo />,
      },
      {
        id: "checkbox",
        label: "Checkbox",
        caption: "Checked and unchecked across interaction states.",
        render: () => <CheckboxDemo />,
      },
      {
        id: "switch",
        label: "Switch",
        caption: "On and off across interaction states.",
        render: () => <SwitchDemo />,
      },
      {
        id: "slider",
        label: "Slider",
        caption: "Single-thumb range control with a live value readout.",
        render: () => <SliderDemo />,
      },
      {
        id: "color-field",
        label: "ColorField",
        caption: "Hex input with a popover color picker.",
        render: () => <ColorFieldDemo />,
      },
      {
        id: "select",
        label: "Select",
        caption: "Trigger across interaction states, plus the open dropdown.",
        render: () => <SelectDemo />,
      },
    ],
  },
  {
    label: "Overlays",
    items: [
      {
        id: "menu",
        label: "Menu",
        caption: "Dropdown items with keyboard hints and separators.",
        render: () => <MenuDemo />,
      },
      {
        id: "context-menu",
        label: "ContextMenu",
        caption: "Right-click menu anchored to the pointer.",
        render: () => <ContextMenuDemo />,
      },
      {
        id: "popover",
        label: "Popover",
        caption: "Freeform floating surface with title and body.",
        render: () => <PopoverDemo />,
      },
      {
        id: "tooltip",
        label: "Tooltip",
        caption: "Hover label attached to a trigger.",
        render: () => <TooltipDemo />,
      },
      {
        id: "dialog",
        label: "Dialog",
        caption: "Modal with header, content and footer actions.",
        render: () => <DialogDemo />,
      },
      {
        id: "alert-dialog",
        label: "AlertDialog",
        caption: "Confirmation modal for destructive actions.",
        render: () => <AlertDialogDemo />,
      },
      {
        id: "drawer",
        label: "Drawer",
        caption: "Edge-anchored panel with a swipe-to-dismiss area.",
        render: () => <DrawerDemo />,
      },
      {
        id: "accordion",
        label: "Accordion",
        caption: "Expandable sections in a stacked list.",
        render: () => <AccordionDemo />,
      },
    ],
  },
  {
    label: "Layout",
    items: [
      {
        id: "shell",
        label: "Shell",
        caption: "App frame with aside, header and main region.",
        render: () => <ShellDemo />,
      },
      {
        id: "sidebar",
        label: "Sidebar",
        caption: "Navigation with static and collapsible groups.",
        render: () => <SidebarDemo />,
      },
      {
        id: "title-bar",
        label: "TitleBar",
        caption: "Window title bar with start, title and end slots.",
        render: () => <TitleBarDemo />,
      },
      {
        id: "settings",
        label: "Settings",
        caption: "Settings page primitives: sections, lists and items.",
        render: () => <SettingsDemo />,
      },
      {
        id: "video",
        label: "Video",
        caption: "Player chrome: controls, scrubber and time display.",
        render: () => <VideoDemo />,
      },
    ],
  },
];

export const DEMOS: ComponentDemo[] = DEMO_GROUPS.flatMap(
  (group) => group.items,
);
