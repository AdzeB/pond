import {
  IconHeartFill18 as Heart,
  IconMagnifierFill18 as Magnifier,
  IconMinusFill18 as Minus,
  IconPlusFill18 as Plus,
  IconRefresh2Fill18 as Refresh,
  IconStarFill18 as Star,
  IconTrash2Fill18 as Trash,
} from "@pond/icons/fill/18";
import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import {
  Accordion,
  AlertDialog,
  Button,
  Checkbox,
  ColorField,
  ContextMenu,
  Dialog,
  Drawer,
  Field,
  Input,
  Keyboard,
  Menu,
  Popover,
  RangeField,
  Select,
  Slider,
  Stepper,
  Switch,
  Toolbar,
  Tooltip,
} from "@pond/ui";
import { type ReactNode, useState } from "react";
import styles from "./styles.module.css";

export interface GallerySection {
  id: string;
  title: string;
  description: string;
  render: () => ReactNode;
}

function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.cell}>
      <span className={styles.caption}>{label}</span>
      {children}
    </div>
  );
}

function ButtonDemo() {
  const variants = [
    "primary",
    "secondary",
    "tertiary",
    "ghost",
    "danger",
    "accent",
  ] as const;
  const sizes = ["xs", "sm", "md", "lg"] as const;

  return (
    <>
      <Cell label="Variants">
        <Row>
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </Row>
      </Cell>
      <Cell label="Sizes">
        <Row>
          {sizes.map((size) => (
            <Button key={size} size={size} variant="secondary">
              {size}
            </Button>
          ))}
        </Row>
      </Cell>
      <Cell label="Icon & disabled">
        <Row>
          <Button icon aria-label="Add">
            <Plus />
          </Button>
          <Button icon variant="secondary" aria-label="Favourite">
            <Heart />
          </Button>
          <Button icon variant="danger" aria-label="Delete">
            <Trash />
          </Button>
          <Button disabled>Disabled</Button>
        </Row>
      </Cell>
    </>
  );
}

function InputDemo() {
  return (
    <>
      <Cell label="With icon">
        <Input.Root className={styles.swatchInput}>
          <Input.Icon>
            <Magnifier />
          </Input.Icon>
          <Input.Field placeholder="Search…" type="search" />
        </Input.Root>
      </Cell>
      <Cell label="Plain field">
        <Input.Root className={styles.swatchInput}>
          <Input.Field placeholder="Your name" />
        </Input.Root>
      </Cell>
    </>
  );
}

function FieldDemo() {
  return (
    <Field.Root className={styles.swatchInput}>
      <Field.Label>Display name</Field.Label>
      <Input.Root>
        <Field.Control render={<Input.Field placeholder="raphael" />} />
      </Input.Root>
      <Field.Description>Shown across your libraries.</Field.Description>
    </Field.Root>
  );
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <Row>
      <Checkbox.Root checked={checked} onCheckedChange={setChecked}>
        <Checkbox.Indicator>
          <Check strokeWidth={2} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <Checkbox.Root defaultChecked={false}>
        <Checkbox.Indicator>
          <Check strokeWidth={2} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <Checkbox.Root disabled>
        <Checkbox.Indicator>
          <Check strokeWidth={2} />
        </Checkbox.Indicator>
      </Checkbox.Root>
    </Row>
  );
}

function SwitchDemo() {
  const [on, setOn] = useState(true);
  return (
    <Row>
      <Switch.Root checked={on} onCheckedChange={setOn} />
      <Switch.Root defaultChecked={false} />
      <Switch.Root disabled />
    </Row>
  );
}

function SliderDemo() {
  const [value, setValue] = useState(40);
  return (
    <Slider.Root
      className={styles.sliderDemo}
      value={value}
      onValueChange={(next) =>
        setValue(typeof next === "number" ? next : (next[0] ?? 0))
      }
    >
      <Slider.Control>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

function RangeFieldDemo() {
  const [value, setValue] = useState(8);
  return (
    <div className={styles.sliderDemo}>
      <RangeField
        aria-label="Columns"
        min={1}
        max={16}
        suffix=" cols"
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}

function StepperDemo() {
  const [value, setValue] = useState(4);
  return (
    <Stepper
      aria-label="Quantity"
      min={0}
      max={10}
      value={value}
      onValueChange={setValue}
      decrementIcon={<Minus />}
      incrementIcon={<Plus />}
      resetIcon={<Refresh />}
    />
  );
}

function SelectDemo() {
  const [value, setValue] = useState("grid");
  const options = [
    { value: "grid", label: "Grid" },
    { value: "waterfall", label: "Waterfall" },
    { value: "justified", label: "Justified" },
    { value: "list", label: "List" },
  ];
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        if (next !== null) setValue(next);
      }}
    >
      <Select.Trigger>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function ColorFieldDemo() {
  const [color, setColor] = useState("#4f7cff");
  return (
    <div className={styles.swatchInput}>
      <ColorField aria-label="Accent" value={color} onChange={setColor} />
    </div>
  );
}

function AccordionDemo() {
  return (
    <Accordion.Root style={{ width: "100%", maxWidth: 420 }}>
      <Accordion.Item>
        <Accordion.Header>
          <Accordion.Trigger>What is a pond?</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          A pond is a local-first library where your saves live.
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item>
        <Accordion.Header>
          <Accordion.Trigger>Where is my data stored?</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          On your machine, inside the folder you chose for the pond.
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

function TooltipDemo() {
  return (
    <Row>
      <Tooltip label="Top" side="top">
        <Button variant="secondary">Top</Button>
      </Tooltip>
      <Tooltip label="Bottom" side="bottom">
        <Button variant="secondary">Bottom</Button>
      </Tooltip>
      <Tooltip label="Right" side="right">
        <Button variant="secondary">Right</Button>
      </Tooltip>
    </Row>
  );
}

function KeyboardDemo() {
  return (
    <Row>
      <Keyboard.Cluster keys={["⌘", "K"]} />
      <Keyboard.Cluster keys={["⌘", "⇧", "P"]} />
      <Keyboard.Key>⏎</Keyboard.Key>
      <Keyboard.Key>Esc</Keyboard.Key>
    </Row>
  );
}

function DialogDemo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={<Button variant="secondary">Open dialog</Button>}
      />
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Title>Rename library</Dialog.Title>
          <Dialog.Description>
            Give this pond a name you'll recognise.
          </Dialog.Description>
          <Input.Root>
            <Input.Field defaultValue="Inspiration" />
          </Input.Root>
          <Dialog.Actions>
            <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
            <Dialog.Close render={<Button>Save</Button>} />
          </Dialog.Actions>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AlertDialogDemo() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        render={<Button variant="danger">Delete pond</Button>}
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup>
          <AlertDialog.Title>Delete this pond?</AlertDialog.Title>
          <AlertDialog.Description>
            This removes the library from pond. Files on disk are untouched.
          </AlertDialog.Description>
          <AlertDialog.Actions>
            <AlertDialog.Close
              render={<Button variant="ghost">Cancel</Button>}
            />
            <AlertDialog.Close
              render={<Button variant="danger">Delete</Button>}
            />
          </AlertDialog.Actions>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function PopoverDemo() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="secondary">Open popover</Button>}
      />
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>
            <div className={styles.col}>
              <span className={styles.caption}>Quick action</span>
              <span className={styles.note}>
                Popovers float above content and trap focus.
              </span>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuDemo() {
  return (
    <Menu.Root>
      <Menu.Trigger variant="secondary">Open menu</Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup>
            <Menu.Item>
              <Menu.ItemIcon>
                <Star />
              </Menu.ItemIcon>
              Add to favourites
            </Menu.Item>
            <Menu.Item>
              <Menu.ItemIcon>
                <Refresh />
              </Menu.ItemIcon>
              Refresh
              <Menu.SecondaryLabel>⌘R</Menu.SecondaryLabel>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item>
              <Menu.ItemIcon>
                <Trash />
              </Menu.ItemIcon>
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function ContextMenuDemo() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className={styles.contextTarget}>
        Right-click anywhere here
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Open</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Duplicate</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Delete</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function DrawerDemo() {
  return (
    <Drawer.Root>
      <Drawer.Trigger
        render={<Button variant="secondary">Open drawer</Button>}
      />
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Viewport>
          <Drawer.Popup>
            <Drawer.Content>
              <Drawer.Title>Details</Drawer.Title>
              <Drawer.Description>
                Drawers slide in from the edge and support swipe-to-dismiss.
              </Drawer.Description>
            </Drawer.Content>
            <Drawer.Close render={<Button variant="ghost">Close</Button>} />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ToolbarDemo() {
  return (
    <Toolbar.Root>
      <Toolbar.Row>
        <Toolbar.Group>
          <Toolbar.Button
            render={<Button icon variant="ghost" aria-label="Add" />}
          >
            <Plus />
          </Toolbar.Button>
          <Toolbar.Button
            render={<Button icon variant="ghost" aria-label="Favourite" />}
          >
            <Heart />
          </Toolbar.Button>
        </Toolbar.Group>
        <Toolbar.Separator />
        <Toolbar.Group>
          <Toolbar.Button render={<Button variant="ghost">Share</Button>} />
        </Toolbar.Group>
      </Toolbar.Row>
    </Toolbar.Root>
  );
}

export const SECTIONS: GallerySection[] = [
  {
    id: "button",
    title: "Button",
    description: "Primary action with six variants, four sizes, and icon mode.",
    render: ButtonDemo,
  },
  {
    id: "input",
    title: "Input",
    description: "Text input with optional leading icon.",
    render: InputDemo,
  },
  {
    id: "field",
    title: "Field",
    description: "Labelled form control with description and validation slots.",
    render: FieldDemo,
  },
  {
    id: "checkbox",
    title: "Checkbox",
    description: "Boolean toggle with an indicator.",
    render: CheckboxDemo,
  },
  {
    id: "switch",
    title: "Switch",
    description: "On/off toggle for settings.",
    render: SwitchDemo,
  },
  {
    id: "slider",
    title: "Slider",
    description: "Drag to pick a value along a track.",
    render: SliderDemo,
  },
  {
    id: "range-field",
    title: "Range Field",
    description: "Slider paired with a live numeric readout.",
    render: RangeFieldDemo,
  },
  {
    id: "stepper",
    title: "Stepper",
    description: "Increment / decrement a bounded number, with reset.",
    render: StepperDemo,
  },
  {
    id: "select",
    title: "Select",
    description: "Choose one option from a popup list.",
    render: SelectDemo,
  },
  {
    id: "color-field",
    title: "Color Field",
    description: "Hex input with a saturation + hue picker.",
    render: ColorFieldDemo,
  },
  {
    id: "accordion",
    title: "Accordion",
    description: "Vertically stacked, collapsible panels.",
    render: AccordionDemo,
  },
  {
    id: "tooltip",
    title: "Tooltip",
    description: "Hover hint that points back at its trigger.",
    render: TooltipDemo,
  },
  {
    id: "keyboard",
    title: "Keyboard",
    description: "Render keyboard shortcuts and key caps.",
    render: KeyboardDemo,
  },
  {
    id: "dialog",
    title: "Dialog",
    description: "Modal surface for focused tasks.",
    render: DialogDemo,
  },
  {
    id: "alert-dialog",
    title: "Alert Dialog",
    description: "Confirm destructive or irreversible actions.",
    render: AlertDialogDemo,
  },
  {
    id: "popover",
    title: "Popover",
    description: "Anchored, dismissible floating panel.",
    render: PopoverDemo,
  },
  {
    id: "menu",
    title: "Menu",
    description: "Action list with icons, shortcuts, and separators.",
    render: MenuDemo,
  },
  {
    id: "context-menu",
    title: "Context Menu",
    description: "Right-click menu bound to a target region.",
    render: ContextMenuDemo,
  },
  {
    id: "drawer",
    title: "Drawer",
    description: "Edge panel with swipe-to-dismiss.",
    render: DrawerDemo,
  },
  {
    id: "toolbar",
    title: "Toolbar",
    description: "Grouped controls with separators.",
    render: ToolbarDemo,
  },
];
