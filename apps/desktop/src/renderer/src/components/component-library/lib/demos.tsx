import {
  IconChevronLeftOutline18 as Back,
  IconXmarkOutline18 as Close,
} from "@pond/icons/outline/18";
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
  Select,
  Settings,
  Shell,
  Sidebar,
  Slider,
  Stepper,
  Switch,
  TitleBar,
  Toolbar,
  Tooltip,
  Video,
} from "@pond/ui";
import { type CSSProperties, Fragment, type ReactNode, useState } from "react";
import demo from "../styles.module.css";

// --- Foundations -------------------------------------------------------------

const COLOR_STEPS = Array.from({ length: 12 }, (_, i) => i + 1);

interface ColorScale {
  label: string;
  // Token prefix; the swatch reads `var(--ds-${prefix}-${step})`.
  prefix: string;
  // When set, the swatch fades the solid token toward transparent at this
  // per-step alpha (for ramps that have no generated `-a` token, e.g. hues).
  mix?: boolean;
}

// Alpha curve mirroring the accent-a ramp, so synthesized hue alphas read the
// same as the design-system's real alpha tokens.
const ALPHA_CURVE = [4, 8, 14, 22, 30, 40, 52, 66, 82, 88, 92, 96];

function swatchValue(scale: ColorScale, step: number): string {
  const token = `var(--ds-${scale.prefix}-${step})`;
  if (!scale.mix) return token;
  return `color-mix(in oklab, ${token} ${ALPHA_CURVE[step - 1]}%, transparent)`;
}

// Theme-derived scales (recomputed at runtime from the active theme inputs).
const THEME_SCALES: ColorScale[] = [
  { label: "Gray", prefix: "gray" },
  { label: "Accent", prefix: "accent" },
];

const THEME_ALPHA_SCALES: ColorScale[] = [
  { label: "Gray A", prefix: "gray-a" },
  { label: "Accent A", prefix: "accent-a" },
];

// Static hue ramps from palette.css (fixed across themes).
const HUE_SCALES: ColorScale[] = [
  "ruby",
  "red",
  "orange",
  "gold",
  "yellow",
  "lime",
  "green",
  "jade",
  "teal",
  "cyan",
  "blue",
  "navy",
  "indigo",
  "violet",
  "purple",
  "magenta",
  "pink",
].map((name) => ({
  label: name.charAt(0).toUpperCase() + name.slice(1),
  prefix: name,
}));

// Hue ramps faded toward transparent (no generated `-a` tokens exist).
const HUE_ALPHA_SCALES: ColorScale[] = HUE_SCALES.map((scale) => ({
  ...scale,
  mix: true,
}));

// Neutral overlay ramps for arbitrary backgrounds.
const OVERLAY_SCALES: ColorScale[] = [
  { label: "Black A", prefix: "black-a" },
  { label: "White A", prefix: "white-a" },
];

function ColorGrid({
  scales,
  alpha,
}: {
  scales: ColorScale[];
  alpha?: boolean;
}) {
  return (
    <div className={demo.colorGrid}>
      <div />
      {COLOR_STEPS.map((step) => (
        <div key={step} className={demo.colorStepHead}>
          {step}
        </div>
      ))}
      {scales.map((scale) => (
        <Fragment key={scale.prefix}>
          <div className={demo.colorRowLabel}>{scale.label}</div>
          {COLOR_STEPS.map((step) => (
            <div
              key={step}
              className={demo.colorSwatch}
              data-alpha={alpha || undefined}
              title={`--ds-${scale.prefix}-${step}`}
              style={{ "--swatch": swatchValue(scale, step) } as CSSProperties}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function ColorSection({
  title,
  scales,
  alpha,
}: {
  title: string;
  scales: ColorScale[];
  alpha?: boolean;
}) {
  return (
    <section className={demo.colorSection}>
      <h2 className={demo.colorSectionTitle}>{title}</h2>
      <ColorGrid scales={scales} alpha={alpha} />
    </section>
  );
}

interface ScopedRow {
  label: string;
  value: string;
}

const SCOPED_ACCENT_ROWS: ScopedRow[] = HUE_SCALES.map((scale) => ({
  label: scale.label,
  value: scale.prefix,
}));

const SCOPED_NEUTRAL_ROWS: ScopedRow[] = [
  { label: "Pure", value: "pure" },
  ...["gold", "green", "teal", "blue", "violet", "magenta"].map((name) => ({
    label: name.charAt(0).toUpperCase() + name.slice(1),
    value: name,
  })),
];

// `display: contents` lets the row wrapper carry `data-accent`/`data-neutral`
// (recomputing the scoped ramp) without breaking swatch alignment to the grid.
function ScopedGrid({
  attr,
  prefix,
  rows,
}: {
  attr: "data-accent" | "data-neutral";
  prefix: string;
  rows: ScopedRow[];
}) {
  return (
    <div className={demo.colorGrid}>
      <div />
      {COLOR_STEPS.map((step) => (
        <div key={step} className={demo.colorStepHead}>
          {step}
        </div>
      ))}
      {rows.map((row) => (
        <div
          key={row.value}
          style={{ display: "contents" }}
          {...{ [attr]: row.value }}
        >
          <div className={demo.colorRowLabel}>{row.label}</div>
          {COLOR_STEPS.map((step) => (
            <div
              key={step}
              className={demo.colorSwatch}
              title={`${attr}="${row.value}" → --ds-${prefix}-${step}`}
              style={
                { "--swatch": `var(--ds-${prefix}-${step})` } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ColorsDemo() {
  return (
    <div className={demo.colorStack}>
      <ColorSection title="Theme" scales={THEME_SCALES} />
      <ColorSection title="Theme · alpha" scales={THEME_ALPHA_SCALES} alpha />
      <ColorSection title="Hues" scales={HUE_SCALES} />
      <ColorSection title="Hues · alpha" scales={HUE_ALPHA_SCALES} alpha />
      <ColorSection title="Overlays · alpha" scales={OVERLAY_SCALES} alpha />
      <section className={demo.colorSection}>
        <h2 className={demo.colorSectionTitle}>
          Scoped accent · [data-accent]
        </h2>
        <ScopedGrid
          attr="data-accent"
          prefix="accent"
          rows={SCOPED_ACCENT_ROWS}
        />
      </section>
      <section className={demo.colorSection}>
        <h2 className={demo.colorSectionTitle}>
          Scoped neutral · [data-neutral]
        </h2>
        <ScopedGrid
          attr="data-neutral"
          prefix="gray"
          rows={SCOPED_NEUTRAL_ROWS}
        />
      </section>
    </div>
  );
}

function Matrix({
  columns,
  rows,
  renderCell,
}: {
  columns: readonly string[];
  rows: readonly string[];
  renderCell: (row: string, column: string) => ReactNode;
}) {
  return (
    <div
      className={demo.matrix}
      style={{ "--matrix-cols": columns.length } as CSSProperties}
    >
      <div className={demo.matrixCorner} />
      {columns.map((column) => (
        <div key={column} className={demo.matrixColHead}>
          {column}
        </div>
      ))}
      {rows.map((row) => (
        <Fragment key={row}>
          <div className={demo.matrixRowHead}>{row}</div>
          {columns.map((column) => (
            <div key={column} className={demo.matrixCell}>
              {renderCell(row, column)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

const CONTROL_STATES = ["Default", "Hover", "Focus", "Disabled"] as const;
type ControlState = (typeof CONTROL_STATES)[number];

function controlStateProps(state: ControlState): {
  "data-demo-state"?: "hover" | "focus";
  disabled?: boolean;
} {
  switch (state) {
    case "Hover":
      return { "data-demo-state": "hover" };
    case "Focus":
      return { "data-demo-state": "focus" };
    case "Disabled":
      return { disabled: true };
    default:
      return {};
  }
}

// --- Actions -----------------------------------------------------------------

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "tertiary",
  "ghost",
  "accent",
  "destructive",
  "link",
] as const;

const BUTTON_STATES = [
  "Default",
  "Hover",
  "Focus",
  "Disabled",
  "Loading",
] as const;

type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
type ButtonState = (typeof BUTTON_STATES)[number];

function StateButton({
  variant,
  state,
}: {
  variant: ButtonVariant;
  state: ButtonState;
}) {
  const label = "Button";
  switch (state) {
    case "Hover":
      return (
        <Button variant={variant} size="sm" data-demo-state="hover">
          {label}
        </Button>
      );
    case "Focus":
      return (
        <Button variant={variant} size="sm" data-demo-state="focus">
          {label}
        </Button>
      );
    case "Disabled":
      return (
        <Button variant={variant} size="sm" disabled>
          {label}
        </Button>
      );
    case "Loading":
      return (
        <Button variant={variant} size="sm" data-loading="">
          <span className={demo.spinner} aria-hidden="true" />
          {label}
        </Button>
      );
    default:
      return (
        <Button variant={variant} size="sm">
          {label}
        </Button>
      );
  }
}

function ButtonDemo() {
  return (
    <div className={demo.stack}>
      <Matrix
        columns={BUTTON_STATES}
        rows={BUTTON_VARIANTS}
        renderCell={(row, column) => (
          <StateButton
            variant={row as ButtonVariant}
            state={column as ButtonState}
          />
        )}
      />
      <div className={demo.row}>
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="xl">Extra large</Button>
      </div>
    </div>
  );
}

function ToolbarDemo() {
  return (
    <Toolbar.Root>
      <Toolbar.Group>
        <Toolbar.Button
          render={
            <Button size="sm" variant="secondary">
              Undo
            </Button>
          }
        />
        <Toolbar.Button
          render={
            <Button size="sm" variant="secondary">
              Redo
            </Button>
          }
        />
      </Toolbar.Group>
      <Toolbar.Separator />
      <Toolbar.Group>
        <Toolbar.Button
          render={
            <Button size="sm" variant="ghost">
              Bold
            </Button>
          }
        />
        <Toolbar.Button
          render={
            <Button size="sm" variant="ghost">
              Italic
            </Button>
          }
        />
        <Toolbar.Button
          render={
            <Button size="sm" variant="ghost">
              Underline
            </Button>
          }
        />
      </Toolbar.Group>
    </Toolbar.Root>
  );
}

function StepperDemo() {
  const [value, setValue] = useState(3);
  return (
    <Stepper
      value={value}
      min={0}
      max={10}
      onValueChange={setValue}
      aria-label="Quantity"
      decrementIcon={<span>−</span>}
      incrementIcon={<span>+</span>}
      resetIcon={<span>↺</span>}
    />
  );
}

function KeyboardDemo() {
  return (
    <div className={demo.row}>
      <Keyboard.Cluster keys={["⌘", "K"]} />
      <Keyboard.Cluster keys={["⌘", "⇧", "P"]} />
      <Keyboard.Cluster keys={["⌃", "C"]} separator="+" />
      <Keyboard.Key>Esc</Keyboard.Key>
      <Keyboard.Key density="inline">Enter</Keyboard.Key>
    </div>
  );
}

// --- Inputs ------------------------------------------------------------------

const INPUT_ROWS = ["Text", "With icon"] as const;

function InputDemo() {
  return (
    <Matrix
      columns={CONTROL_STATES}
      rows={INPUT_ROWS}
      renderCell={(row, column) => (
        <Input.Root className={demo.matrixFill}>
          {row === "With icon" && <Input.Icon>⌘</Input.Icon>}
          <Input.Field
            placeholder="Text"
            {...controlStateProps(column as ControlState)}
          />
        </Input.Root>
      )}
    />
  );
}

const FIELD_STATES = ["Default", "Focus", "Disabled"] as const;

function FieldDemo() {
  return (
    <Matrix
      columns={FIELD_STATES}
      rows={["Email"]}
      renderCell={(_row, column) => (
        <Field.Root className={demo.matrixFill}>
          <Field.Label>Email address</Field.Label>
          <Input.Root>
            <Input.Field
              placeholder="you@example.com"
              {...controlStateProps(column as ControlState)}
            />
          </Input.Root>
          <Field.Description>We will never share your email.</Field.Description>
        </Field.Root>
      )}
    />
  );
}

const CHECKBOX_ROWS = ["Unchecked", "Checked"] as const;

function CheckboxDemo() {
  return (
    <Matrix
      columns={CONTROL_STATES}
      rows={CHECKBOX_ROWS}
      renderCell={(row, column) => (
        <Checkbox.Root
          defaultChecked={row === "Checked"}
          {...controlStateProps(column as ControlState)}
        >
          <Checkbox.Indicator>✓</Checkbox.Indicator>
        </Checkbox.Root>
      )}
    />
  );
}

const SWITCH_ROWS = ["Off", "On"] as const;

function SwitchDemo() {
  return (
    <Matrix
      columns={CONTROL_STATES}
      rows={SWITCH_ROWS}
      renderCell={(row, column) => (
        <Switch.Root
          defaultChecked={row === "On"}
          {...controlStateProps(column as ControlState)}
        />
      )}
    />
  );
}

function SliderDemo() {
  const [value, setValue] = useState(40);
  return (
    <div className={demo.slider}>
      <Slider.Root
        value={value}
        min={0}
        max={100}
        onValueChange={(next) =>
          setValue(typeof next === "number" ? next : (next[0] ?? 0))
        }
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label="Value" />
          </Slider.Track>
        </Slider.Control>
        <Slider.Value>{(_, values) => `${values[0]}%`}</Slider.Value>
      </Slider.Root>
    </div>
  );
}

function ColorFieldDemo() {
  const [color, setColor] = useState("#4f46e5");
  return <ColorField value={color} onChange={setColor} aria-label="Accent" />;
}

function SelectDemo() {
  return (
    <div className={demo.stack}>
      <Matrix
        columns={CONTROL_STATES}
        rows={["Select"]}
        renderCell={(_row, column) => {
          const state = column as ControlState;
          const demoState =
            state === "Hover"
              ? "hover"
              : state === "Focus"
                ? "focus"
                : undefined;
          return (
            <Select.Root<string>
              defaultValue="medium"
              disabled={state === "Disabled"}
            >
              <Select.Trigger
                className={demo.selectTrigger}
                data-demo-state={demoState}
              >
                <Select.Value>Medium</Select.Value>
              </Select.Trigger>
            </Select.Root>
          );
        }}
      />
      <div className={demo.subsection}>
        <span className={demo.subsectionLabel}>Open</span>
        <div className={demo.selectOpen}>
          <SelectOpenPreview />
        </div>
      </div>
    </div>
  );
}

const SELECT_OPTIONS: readonly (readonly [value: string, label: string])[] = [
  ["small", "Small"],
  ["medium", "Medium"],
  ["large", "Large"],
];

const SELECT_LABELS: Record<string, string> = Object.fromEntries(
  SELECT_OPTIONS.map(([value, label]) => [value, label]),
);

function SelectOpenPreview() {
  return (
    <Select.Root<string> defaultValue="medium" defaultOpen modal={false}>
      <Select.Trigger className={demo.selectTrigger}>
        <Select.Value>
          {(value: string) => SELECT_LABELS[value] ?? value}
        </Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.List>
              {SELECT_OPTIONS.map(([value, label]) => (
                <Select.Item key={value} value={value}>
                  <Select.ItemText>{label}</Select.ItemText>
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

// --- Overlays ----------------------------------------------------------------

function MenuDemo() {
  return (
    <Menu.Root>
      <Menu.Trigger variant="secondary" size="sm">
        Open menu
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>
              <Menu.ItemLabel>New save</Menu.ItemLabel>
              <Menu.ItemKeyboard>N</Menu.ItemKeyboard>
            </Menu.Item>
            <Menu.Item>
              <Menu.ItemLabel>Open…</Menu.ItemLabel>
              <Menu.ItemKeyboard>O</Menu.ItemKeyboard>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item>
              <Menu.ItemLabel>Preferences</Menu.ItemLabel>
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
      <ContextMenu.Trigger className={demo.contextTarget}>
        Right-click anywhere here
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Cut</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Copy</ContextMenu.ItemLabel>
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

function PopoverDemo() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="secondary" size="sm">
            Show popover
          </Button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>
            <div className={demo.popoverBody}>
              <Popover.Title
                render={<p className={demo.popoverTitle}>Quick tip</p>}
              />
              <Popover.Description
                render={
                  <p className={demo.popoverDesc}>
                    Popovers float above the page and dismiss on outside click.
                  </p>
                }
              />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TooltipDemo() {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button variant="secondary" size="sm">
              Hover me
            </Button>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>Copy to clipboard</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function DialogDemo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={
          <Button variant="secondary" size="sm">
            Open dialog
          </Button>
        }
      />

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Header
            leading={
              <Button variant="ghost" icon size="xs" aria-label="Back">
                <Close strokeWidth={2} />
              </Button>
            }
            trailing={
              <Button variant="ghost" icon size="xs" aria-label="Close">
                <Back strokeWidth={2} />
              </Button>
            }
          >
            <Dialog.Title>Edit Details</Dialog.Title>
          </Dialog.Header>
          <Dialog.Content>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                height: "300px",
                borderRadius: "var(--ds-radius-md)",
                backgroundColor: "var(--ds-gray-3)",
              }}
            ></div>
          </Dialog.Content>
          <Dialog.Footer>
            <Button style={{ width: "100%" }} size="xl" variant="accent">
              Continue
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AlertDialogDemo() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        render={
          <Button variant="destructive" size="sm">
            Delete library
          </Button>
        }
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete library?</AlertDialog.Title>
          </AlertDialog.Header>
          <AlertDialog.Content>
            <AlertDialog.Description>
              This permanently removes every save inside it. This cannot be
              undone.
            </AlertDialog.Description>
          </AlertDialog.Content>
          <AlertDialog.Footer>
            <AlertDialog.Close
              render={
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              }
            />
            <AlertDialog.Close
              render={
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              }
            />
          </AlertDialog.Footer>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DrawerDemo() {
  return (
    <Drawer.Root>
      <Drawer.Trigger
        render={
          <Button variant="secondary" size="sm">
            Open drawer
          </Button>
        }
      />
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Viewport>
          <Drawer.Popup>
            <Drawer.Content>
              <Drawer.Title>Filters</Drawer.Title>
              <Drawer.Description>
                Refine which saves appear in the grid.
              </Drawer.Description>
              <Drawer.Close
                render={
                  <Button variant="ghost" size="sm">
                    Close
                  </Button>
                }
              />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function AccordionDemo() {
  return (
    <Accordion.Root className={demo.accordion}>
      <Accordion.Item>
        <Accordion.Header>
          <Accordion.Trigger>What is Pond?</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          Pond is a calm place to save and rediscover the things you love.
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item>
        <Accordion.Header>
          <Accordion.Trigger>How does sync work?</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          Your library syncs securely across every device you sign in on.
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

// --- Layout ------------------------------------------------------------------

function ShellDemo() {
  return (
    <div className={demo.frame}>
      <Shell.Body>
        <Shell.Aside>
          <p className={demo.frameLabel}>Aside</p>
        </Shell.Aside>
        <Shell.Main>
          <Shell.Header>
            <p className={demo.frameLabel}>Header</p>
          </Shell.Header>
          <div className={demo.framePad}>
            <p className={demo.frameLabel}>Main content area</p>
          </div>
        </Shell.Main>
      </Shell.Body>
    </div>
  );
}

function SidebarDemo() {
  return (
    <div className={demo.frameNarrow}>
      <Sidebar.Root>
        <Sidebar.Header>Library</Sidebar.Header>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Views</Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Item>All saves</Sidebar.Item>
            <Sidebar.Item>Favorites</Sidebar.Item>
            <Sidebar.Item>Archive</Sidebar.Item>
          </Sidebar.GroupContent>
        </Sidebar.Group>
        <Sidebar.CollapsibleGroup>
          <Sidebar.CollapsibleGroupLabel>Tags</Sidebar.CollapsibleGroupLabel>
          <Sidebar.CollapsibleGroupContent>
            <Sidebar.Item>Design</Sidebar.Item>
            <Sidebar.Item>Reading</Sidebar.Item>
          </Sidebar.CollapsibleGroupContent>
        </Sidebar.CollapsibleGroup>
      </Sidebar.Root>
    </div>
  );
}

function TitleBarDemo() {
  return (
    <div className={demo.frameBar}>
      <TitleBar.Root>
        <TitleBar.Start>
          <TitleBar.Label>Pond</TitleBar.Label>
        </TitleBar.Start>
        <TitleBar.Title>
          <TitleBar.Label>Library</TitleBar.Label>
          <TitleBar.Meta>128 saves</TitleBar.Meta>
        </TitleBar.Title>
        <TitleBar.End>
          <Button size="xs" variant="ghost">
            ⋯
          </Button>
        </TitleBar.End>
      </TitleBar.Root>
    </div>
  );
}

function SettingsDemo() {
  return (
    <div className={demo.frame}>
      <Settings.Page>
        <Settings.Header>
          <Settings.Title>Appearance</Settings.Title>
          <Settings.Description>
            Customize how Pond looks on this device.
          </Settings.Description>
        </Settings.Header>
        <Settings.Section>
          <Settings.SectionTitle>Theme</Settings.SectionTitle>
          <Settings.List>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Dark mode</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Use a darker color scheme.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root defaultChecked />
              </Settings.ItemControl>
            </Settings.Item>
          </Settings.List>
        </Settings.Section>
      </Settings.Page>
    </div>
  );
}

function VideoDemo() {
  return (
    <div className={demo.frameVideo}>
      <Video.Root>
        <Video.Media poster="" />
        <Video.Controls>
          <Video.Row>
            <Video.PlayButton />
            <Video.MuteButton />
            <Video.Scrubber />
            <Video.TimeDisplay />
            <Video.SpeedSelect />
          </Video.Row>
        </Video.Controls>
      </Video.Root>
    </div>
  );
}

export {
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
};
