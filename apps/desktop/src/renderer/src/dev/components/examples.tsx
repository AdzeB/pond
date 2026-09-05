import {
  IconCheckOutline12,
  IconChevronLeftOutline12,
  IconXmarkOutline12,
} from "@pond/icons/outline/12";
import {
  IconAlbum2Outline18,
  IconClone2Outline18,
  IconDotsOutline18,
  IconFolderOutline18,
  IconListFavsOutline18,
  IconWandSparkleOutline18,
} from "@pond/icons/outline/18";
import * as UI from "@pond/ui";
import { useState } from "react";
import { ButtonExample } from "./button-example";
import type { ComponentEntry } from "./catalog";
import styles from "./examples.module.css";

import sampleVideo from "./sample.webm";

const choices = ["Waterfall", "Grid", "List"].map((label) => ({
  value: label,
  label,
}));
const sampleRows = [
  { id: "1", name: "Reference library", count: 24 },
  { id: "2", name: "Interface details", count: 12 },
  { id: "3", name: "Motion studies", count: 8 },
];

function SelectDemo() {
  return (
    <UI.Select.Root items={choices} defaultValue="Waterfall">
      <UI.Select.Trigger size="sm" aria-label="Layout" style={{ width: 156 }}>
        <UI.Select.Value />
      </UI.Select.Trigger>
      <UI.Select.Portal>
        <UI.Select.Positioner align="start">
          <UI.Select.Popup>
            <UI.Select.Items items={choices} />
          </UI.Select.Popup>
        </UI.Select.Positioner>
      </UI.Select.Portal>
    </UI.Select.Root>
  );
}

function ComboDemo() {
  return (
    <UI.Combobox.Root items={choices} defaultValue={choices[0]}>
      <UI.Combobox.Trigger size="sm" aria-label="Search layouts">
        <UI.Combobox.Value />
      </UI.Combobox.Trigger>
      <UI.Combobox.Portal>
        <UI.Combobox.Positioner>
          <UI.Combobox.Popup>
            <UI.Combobox.Input
              aria-label="Find a layout"
              placeholder="Find a layout…"
            />
            <UI.Combobox.Empty>No layouts found</UI.Combobox.Empty>
            <UI.Combobox.List>
              {(item: (typeof choices)[number]) => (
                <UI.Combobox.Item key={item.value} value={item}>
                  <UI.Combobox.ItemLabel>{item.label}</UI.Combobox.ItemLabel>
                  <UI.Combobox.ItemIndicator />
                </UI.Combobox.Item>
              )}
            </UI.Combobox.List>
          </UI.Combobox.Popup>
        </UI.Combobox.Positioner>
      </UI.Combobox.Portal>
    </UI.Combobox.Root>
  );
}

function MenuDemo() {
  const [message, setMessage] = useState("Choose an action");
  return (
    <div className={styles.stack}>
      <UI.Menu.Surface style={{ width: 240 }}>
        <UI.Menu.SectionLabel>Library</UI.Menu.SectionLabel>
        <UI.Menu.Row onClick={() => setMessage("New folder selected")}>
          <UI.Menu.ItemLabel>New folder</UI.Menu.ItemLabel>
          <UI.Menu.ItemKeyboard>⌘N</UI.Menu.ItemKeyboard>
        </UI.Menu.Row>
        <UI.Menu.Row onClick={() => setMessage("Rename selected")}>
          <UI.Menu.ItemLabel>Rename</UI.Menu.ItemLabel>
        </UI.Menu.Row>
        <UI.Menu.Separator />
        <UI.Menu.Row disabled>Move to trash</UI.Menu.Row>
      </UI.Menu.Surface>
      <UI.Menu.Root>
        <UI.Menu.Trigger size="sm" variant="secondary">
          Open menu
        </UI.Menu.Trigger>
        <UI.Menu.Portal>
          <UI.Menu.Positioner>
            <UI.Menu.Popup>
              <UI.Menu.Item onClick={() => setMessage("New folder selected")}>
                New folder
              </UI.Menu.Item>
              <UI.Menu.Item onClick={() => setMessage("Rename selected")}>
                Rename
              </UI.Menu.Item>
              <UI.Menu.Separator />
              <UI.Menu.CheckboxItem defaultChecked>
                <UI.Menu.ItemLabel>Show counts</UI.Menu.ItemLabel>
                <UI.Menu.CheckboxItemIndicator />
              </UI.Menu.CheckboxItem>
            </UI.Menu.Popup>
          </UI.Menu.Positioner>
        </UI.Menu.Portal>
      </UI.Menu.Root>
      <span className={styles.caption} role="status">
        {message}
      </span>
    </div>
  );
}

function DialogDemo({ alert = false }: { alert?: boolean }) {
  const D = alert ? UI.AlertDialog : UI.Dialog;
  return (
    <D.Root>
      <D.Trigger render={<UI.Button size="sm" variant="secondary" />}>
        {alert ? "Show confirmation" : "Open dialog"}
      </D.Trigger>
      <D.Portal>
        <D.Backdrop />
        <D.Popup>
          <D.Header>
            <D.Title>
              {alert ? "Remove this reference?" : "Edit collection"}
            </D.Title>
            <D.Description>
              {alert
                ? "This is a local preview. No library data will change."
                : "Keep related references together."}
            </D.Description>
          </D.Header>
          <D.Content>
            <UI.Input.Root>
              <UI.Input.Field
                aria-label="Collection name"
                defaultValue="Interface details"
              />
            </UI.Input.Root>
          </D.Content>
          <D.Footer>
            <D.Close render={<UI.Button variant="secondary" size="md" />}>
              Cancel
            </D.Close>
            <D.Close
              render={
                <UI.Button
                  size="md"
                  variant={alert ? "destructive" : "primary"}
                />
              }
            >
              {alert ? "Remove reference" : "Save changes"}
            </D.Close>
          </D.Footer>
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}

function PageDialogDemo() {
  const [step, setStep] = useState(0);
  return (
    <UI.PageDialog.Root
      onOpenChange={(open) => {
        if (open) setStep(0);
      }}
    >
      <UI.Dialog.Trigger render={<UI.Button size="sm" variant="secondary" />}>
        Open page dialog
      </UI.Dialog.Trigger>
      <UI.PageDialog.Portal>
        <UI.PageDialog.Backdrop />
        <UI.PageDialog.Popup pageId={String(step)} depth={step}>
          <UI.PageDialog.Header>
            {step > 0 && <UI.PageDialog.Back onClick={() => setStep(0)} />}
            <UI.PageDialog.Title>
              {step ? "Review collection" : "New collection"}
            </UI.PageDialog.Title>
            <UI.PageDialog.Close />
          </UI.PageDialog.Header>
          <UI.PageDialog.Viewport>
            <UI.PageDialog.Description>
              {step
                ? "Your sample collection is ready. No library data will be changed."
                : "Give this collection a clear name."}
            </UI.PageDialog.Description>
            {step === 0 && (
              <UI.Input.Root>
                <UI.Input.Field
                  aria-label="New collection name"
                  defaultValue="Interface details"
                />
              </UI.Input.Root>
            )}
            <UI.PageDialog.Footer>
              {step ? (
                <UI.Dialog.Close render={<UI.Button width="full" />}>
                  Done
                </UI.Dialog.Close>
              ) : (
                <UI.PageDialog.Confirm onClick={() => setStep(1)}>
                  Continue
                </UI.PageDialog.Confirm>
              )}
            </UI.PageDialog.Footer>
          </UI.PageDialog.Viewport>
        </UI.PageDialog.Popup>
      </UI.PageDialog.Portal>
    </UI.PageDialog.Root>
  );
}

function ToastContent() {
  const { toasts, add } = UI.Toast.useToastManager();
  return (
    <>
      <UI.Button
        size="sm"
        variant="secondary"
        onClick={() =>
          add({
            title: "Reference saved",
            description: "Added to Interface details.",
            timeout: 8000,
          })
        }
      >
        Show notification
      </UI.Button>
      <UI.Toast.Portal>
        <UI.Toast.Viewport>
          {toasts.map((toast) => (
            <UI.Toast.Root key={toast.id} toast={toast}>
              <UI.Toast.Content>
                <UI.Toast.Header>
                  <UI.Toast.Title />
                  <UI.Toast.Close />
                </UI.Toast.Header>
                <UI.Toast.Description />
              </UI.Toast.Content>
            </UI.Toast.Root>
          ))}
        </UI.Toast.Viewport>
      </UI.Toast.Portal>
    </>
  );
}

function SidebarDemo() {
  const [active, setActive] = useState("Library");
  return (
    <UI.Sidebar.Root style={{ height: 300 }}>
      <UI.Sidebar.Header>
        <UI.Logo size={16} />
        <span>Pond</span>
        <UI.Button icon size="xs" variant="ghost" aria-label="Sidebar actions">
          <IconDotsOutline18 size={12} />
        </UI.Button>
      </UI.Sidebar.Header>
      <UI.Sidebar.Group>
        {["Library", "Folders", "Favorites"].map((label, index) => (
          <UI.Sidebar.Item
            key={label}
            data-status={active === label ? "active" : undefined}
            onClick={() => setActive(label)}
          >
            <UI.Sidebar.Icon>
              {index === 0 ? (
                <IconAlbum2Outline18 size={16} />
              ) : index === 1 ? (
                <IconFolderOutline18 size={16} />
              ) : (
                <IconListFavsOutline18 size={16} />
              )}
            </UI.Sidebar.Icon>
            {label}
            <UI.Sidebar.Count>
              {index === 0 ? 24 : index === 1 ? 128 : 8}
            </UI.Sidebar.Count>
          </UI.Sidebar.Item>
        ))}
      </UI.Sidebar.Group>
      <UI.Sidebar.CollapsibleGroup defaultOpen>
        <UI.Sidebar.CollapsibleGroupLabel>
          Collections
        </UI.Sidebar.CollapsibleGroupLabel>
        <UI.Sidebar.CollapsibleGroupContent>
          <UI.Sidebar.Item
            onClick={() => setActive("Interface details")}
            data-status={active === "Interface details" ? "active" : undefined}
          >
            Interface details
          </UI.Sidebar.Item>
          <UI.Sidebar.Item>Motion studies</UI.Sidebar.Item>
        </UI.Sidebar.CollapsibleGroupContent>
      </UI.Sidebar.CollapsibleGroup>
    </UI.Sidebar.Root>
  );
}

function TabsDemo() {
  const [active, setActive] = useState("Library");
  return (
    <UI.Tab.List role="tablist" aria-label="Views">
      {["Library", "Collections", "Archive"].map((label) => (
        <UI.Tab.Item
          key={label}
          role="tab"
          tabIndex={0}
          aria-selected={active === label}
          data-active={active === label || undefined}
          onClick={() => setActive(label)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActive(label);
            }
          }}
        >
          <UI.Tab.Label>{label}</UI.Tab.Label>
        </UI.Tab.Item>
      ))}
    </UI.Tab.List>
  );
}

function ColorDemo({ picker }: { picker?: boolean }) {
  const [color, setColor] = useState("#7c85e8");
  return picker ? (
    <UI.ColorPicker
      value={color}
      onChange={setColor}
      ariaLabel="Reference color"
    />
  ) : (
    <UI.ColorField
      value={color}
      onChange={setColor}
      aria-label="Reference color"
    />
  );
}

function StepperDemo() {
  const [value, setValue] = useState(4);
  return (
    <UI.Stepper
      value={value}
      min={1}
      max={12}
      fallback={4}
      onValueChange={setValue}
      decrementIcon={<IconChevronLeftOutline12 />}
      incrementIcon={<IconChevronLeftOutline12 style={{ rotate: "180deg" }} />}
      aria-label="Columns"
    />
  );
}

function AttachmentsDemo() {
  const [visible, setVisible] = useState(true);
  return visible ? (
    <UI.Attachments.Root>
      <UI.Attachments.Item>
        <UI.Attachments.Thumb>
          <UI.Logo size={16} />
        </UI.Attachments.Thumb>
        <UI.Attachments.Label>Interface details.pdf</UI.Attachments.Label>
        <UI.Attachments.Remove
          aria-label="Remove attachment"
          onClick={() => setVisible(false)}
        >
          <IconXmarkOutline12 />
        </UI.Attachments.Remove>
      </UI.Attachments.Item>
    </UI.Attachments.Root>
  ) : (
    <UI.Button size="sm" variant="secondary" onClick={() => setVisible(true)}>
      Restore attachment
    </UI.Button>
  );
}

function ChipDemo() {
  const [visible, setVisible] = useState(true);
  return (
    <div className={styles.stack}>
      <UI.Chip.Root>
        <UI.Chip.Item>
          <UI.Chip.Icon>
            <IconWandSparkleOutline18 />
          </UI.Chip.Icon>
          <UI.Chip.Label>Semantic</UI.Chip.Label>
        </UI.Chip.Item>
        <UI.Chip.Operator tabIndex={-1}>is</UI.Chip.Operator>
        <UI.Chip.Item kind="value">
          <UI.Chip.Trigger aria-label="Semantic Filter">
            <UI.Chip.Label>green boy</UI.Chip.Label>
          </UI.Chip.Trigger>
          {visible ? (
            <UI.Chip.Clear
              aria-label="Clear Semantic Filter"
              onClick={() => setVisible(false)}
            />
          ) : null}
        </UI.Chip.Item>
      </UI.Chip.Root>
      <UI.Chip.Root>
        <UI.Chip.Item>
          <UI.Chip.Icon>
            <IconClone2Outline18 />
          </UI.Chip.Icon>
          <UI.Chip.Label>Files</UI.Chip.Label>
        </UI.Chip.Item>
        <UI.Chip.Operator tabIndex={-1}>at least</UI.Chip.Operator>
        <UI.Chip.Item kind="value">
          <UI.Chip.Trigger aria-label="Files Filter">
            <UI.Chip.Label>Multiple Files</UI.Chip.Label>
          </UI.Chip.Trigger>
          <UI.Chip.Clear aria-label="Clear Files Filter" />
        </UI.Chip.Item>
      </UI.Chip.Root>
      <div className={styles.row}>
        <UI.Chip.Item tone="tag">
          <UI.Chip.Icon>
            <IconCheckOutline12 />
          </UI.Chip.Icon>
          <UI.Chip.Label>Interface</UI.Chip.Label>
        </UI.Chip.Item>
        {visible ? (
          <UI.Chip.Item tone="mention">
            <UI.Chip.Icon>
              <UI.Logo size={12} />
            </UI.Chip.Icon>
            <UI.Chip.Label>Collection</UI.Chip.Label>
            <UI.Chip.Clear
              aria-label="Remove Collection"
              onClick={() => setVisible(false)}
            />
          </UI.Chip.Item>
        ) : (
          <UI.Button size="xs" variant="ghost" onClick={() => setVisible(true)}>
            Restore chip
          </UI.Button>
        )}
      </div>
    </div>
  );
}

function MessageDemo() {
  return (
    <div className={styles.stack}>
      <UI.Message.Root from="user">
        <UI.Message.Content>
          Find references for a compact sidebar.
        </UI.Message.Content>
      </UI.Message.Root>
      <UI.Message.Root from="assistant">
        <UI.Message.Content>
          <UI.Message.Response>
            Here are three references from your library.
          </UI.Message.Response>
        </UI.Message.Content>
        <UI.Message.Actions>
          <UI.Message.Action>Copy response</UI.Message.Action>
        </UI.Message.Actions>
      </UI.Message.Root>
    </div>
  );
}

function PromptDemo() {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className={styles.stack}>
      <UI.PromptInput.Root>
        <UI.PromptInput.Body>
          <UI.Input.Textarea
            aria-label="Prompt"
            placeholder="Ask about your library…"
            value={value}
            onValueChange={setValue}
            rows={2}
          />
        </UI.PromptInput.Body>
        <UI.PromptInput.Toolbar>
          <UI.PromptInput.ToolbarGroup>
            <UI.Button
              size="xs"
              variant="ghost"
              onClick={() => setValue("Summarize this collection")}
            >
              Use sample prompt
            </UI.Button>
          </UI.PromptInput.ToolbarGroup>
          <UI.PromptInput.Submit
            aria-label="Submit sample prompt"
            disabled={!value.trim()}
            onClick={() => {
              setSent(true);
              setValue("");
            }}
          >
            <IconCheckOutline12 />
          </UI.PromptInput.Submit>
        </UI.PromptInput.Toolbar>
      </UI.PromptInput.Root>
      {sent && (
        <span className={styles.caption} role="status">
          Sample submitted locally. No AI request was sent.
        </span>
      )}
    </div>
  );
}

function TrayCardDemo() {
  const [open, setOpen] = useState(true);
  return open ? (
    <UI.TrayCard.Provider onDismiss={() => setOpen(false)}>
      <UI.TrayCard.Root>
        <UI.TrayCard.Header>
          <UI.TrayCard.Title>Save reference</UI.TrayCard.Title>
          <UI.TrayCard.Close />
        </UI.TrayCard.Header>
        <UI.TrayCard.Description>
          Add this reference to your library.
        </UI.TrayCard.Description>
        <UI.TrayCard.Separator />
        <UI.TrayCard.Footer>
          <UI.TrayCard.Cancel />
          <UI.TrayCard.Confirm>Save</UI.TrayCard.Confirm>
        </UI.TrayCard.Footer>
      </UI.TrayCard.Root>
    </UI.TrayCard.Provider>
  ) : (
    <UI.Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
      Show tray card
    </UI.Button>
  );
}

export function ComponentExample({ entry }: { entry: ComponentEntry }) {
  switch (entry.id) {
    case "Button":
      return <ButtonExample />;
    case "Input":
      return (
        <div className={styles.stack}>
          <UI.Input.Root size="sm">
            <UI.Input.Field
              aria-label="Search references"
              placeholder="Search references…"
            />
          </UI.Input.Root>
          <UI.Input.Root size="sm">
            <UI.Input.Textarea
              aria-label="Reference notes"
              placeholder="Add a note…"
              rows={3}
            />
          </UI.Input.Root>
        </div>
      );
    case "Field":
      return (
        <UI.Field.Root>
          <UI.Field.Label>Collection name</UI.Field.Label>
          <UI.Input.Root>
            <UI.Field.Control
              render={<UI.Input.Field />}
              defaultValue="Interface details"
            />
          </UI.Input.Root>
          <UI.Field.Description>
            Keep the name short and specific.
          </UI.Field.Description>
        </UI.Field.Root>
      );
    case "Select":
      return <SelectDemo />;
    case "Combobox":
      return <ComboDemo />;
    case "Checkbox":
      return (
        <div className={styles.stack}>
          {(["sm", "md"] as const).map((size) => (
            <div className={styles.stack} key={size}>
              <span className={styles.caption}>
                {size === "sm" ? "Small · 14px · Default" : "Medium · 16px"}
              </span>
              {[false, true].map((checked) => (
                <label
                  className={styles.row}
                  htmlFor={`sample-checkbox-${size}-${checked}`}
                  key={String(checked)}
                >
                  <UI.Checkbox.Root
                    id={`sample-checkbox-${size}-${checked}`}
                    size={size}
                    defaultChecked={checked}
                  >
                    <UI.Checkbox.Indicator />
                  </UI.Checkbox.Root>
                  {checked ? "Selected reference" : "Select reference"}
                </label>
              ))}
              <UI.Checkbox.Root
                size={size}
                disabled
                aria-label={`Disabled ${size} checkbox`}
              >
                <UI.Checkbox.Indicator />
              </UI.Checkbox.Root>
            </div>
          ))}
        </div>
      );
    case "Switch":
      return (
        <label className={styles.row} htmlFor="sample-switch">
          <UI.Switch.Root id="sample-switch" defaultChecked />
          Show item counts
        </label>
      );
    case "Toggle":
      return (
        <UI.Toggle size="sm" defaultPressed>
          Favorite
        </UI.Toggle>
      );
    case "ToggleGroup":
      return (
        <UI.ToggleGroup defaultValue={["grid"]}>
          <UI.Toggle value="grid" size="sm">
            Grid
          </UI.Toggle>
          <UI.Toggle value="list" size="sm">
            List
          </UI.Toggle>
          <UI.Toggle value="waterfall" size="sm">
            Waterfall
          </UI.Toggle>
        </UI.ToggleGroup>
      );
    case "Slider":
      return (
        <UI.Slider.Root min={0} max={100} defaultValue={40}>
          <UI.Slider.Label>Size</UI.Slider.Label>
          <UI.Slider.Control>
            <UI.Slider.Track>
              <UI.Slider.Indicator />
              <UI.Slider.Thumb aria-label="Thumbnail size" />
            </UI.Slider.Track>
          </UI.Slider.Control>
          <UI.Slider.Value />
        </UI.Slider.Root>
      );
    case "Stepper":
      return <StepperDemo />;
    case "ColorField":
      return <ColorDemo />;
    case "ColorPicker":
      return <ColorDemo picker />;
    case "Sidebar":
      return <SidebarDemo />;
    case "Tab":
      return <TabsDemo />;
    case "Toolbar":
      return (
        <UI.Toolbar.Root aria-label="Library toolbar">
          <UI.Toolbar.Row>
            <UI.Toolbar.Group fill>
              <UI.Toolbar.Button
                render={<UI.Button size="sm" variant="ghost" />}
              >
                All saves
              </UI.Toolbar.Button>
            </UI.Toolbar.Group>
            <UI.Toolbar.Group>
              <UI.Toolbar.Button
                render={<UI.Button size="sm" variant="secondary" />}
              >
                Filter
              </UI.Toolbar.Button>
              <UI.Toolbar.Separator />
              <UI.Toolbar.Button
                render={<UI.Button size="sm" variant="ghost" />}
              >
                View
              </UI.Toolbar.Button>
            </UI.Toolbar.Group>
          </UI.Toolbar.Row>
        </UI.Toolbar.Root>
      );
    case "TitleBar":
      return (
        <UI.TitleBar.Root>
          <UI.TitleBar.Start>
            <UI.Button icon variant="ghost" size="sm" aria-label="Back">
              <IconChevronLeftOutline12 />
            </UI.Button>
          </UI.TitleBar.Start>
          <UI.TitleBar.Title>
            <UI.TitleBar.Label>Interface details</UI.TitleBar.Label>
          </UI.TitleBar.Title>
          <UI.TitleBar.End>
            <UI.Button size="xs" variant="ghost">
              Edit
            </UI.Button>
          </UI.TitleBar.End>
        </UI.TitleBar.Root>
      );
    case "Accordion":
      return (
        <UI.Accordion.Root defaultValue={["details"]}>
          <UI.Accordion.Item value="details">
            <UI.Accordion.Header>
              <UI.Accordion.Trigger>Reference details</UI.Accordion.Trigger>
            </UI.Accordion.Header>
            <UI.Accordion.Panel>
              Saved to Interface details. Includes 24 references.
            </UI.Accordion.Panel>
          </UI.Accordion.Item>
          <UI.Accordion.Item value="notes">
            <UI.Accordion.Header>
              <UI.Accordion.Trigger>Notes</UI.Accordion.Trigger>
            </UI.Accordion.Header>
            <UI.Accordion.Panel>
              Compact controls, clear hierarchy, and consistent alignment.
            </UI.Accordion.Panel>
          </UI.Accordion.Item>
        </UI.Accordion.Root>
      );
    case "Tray":
      return (
        <UI.Tray.Pill>
          <UI.Tray.Item aria-label="Confirm">
            <IconCheckOutline12 />
          </UI.Tray.Item>
          <UI.Tray.Separator />
          <UI.Tray.Item aria-label="Close">
            <IconXmarkOutline12 />
          </UI.Tray.Item>
        </UI.Tray.Pill>
      );
    case "Menu":
      return <MenuDemo />;
    case "ContextMenu":
      return (
        <UI.ContextMenu.Root>
          <UI.ContextMenu.Trigger
            render={<button type="button" className={styles.contextTarget} />}
          >
            Right-click this reference
          </UI.ContextMenu.Trigger>
          <UI.ContextMenu.Portal>
            <UI.ContextMenu.Positioner>
              <UI.ContextMenu.Popup>
                <UI.ContextMenu.Item>Open reference</UI.ContextMenu.Item>
                <UI.ContextMenu.Item>Copy link</UI.ContextMenu.Item>
                <UI.ContextMenu.Separator />
                <UI.ContextMenu.Item disabled>
                  Move to trash
                </UI.ContextMenu.Item>
              </UI.ContextMenu.Popup>
            </UI.ContextMenu.Positioner>
          </UI.ContextMenu.Portal>
        </UI.ContextMenu.Root>
      );
    case "Popover":
      return (
        <UI.Popover.Root>
          <UI.Popover.Trigger
            render={<UI.Button size="sm" variant="secondary" />}
          >
            Open popover
          </UI.Popover.Trigger>
          <UI.Popover.Portal>
            <UI.Popover.Positioner>
              <UI.Popover.Popup>
                <UI.Popover.Title>Reference details</UI.Popover.Title>
                <UI.Popover.Description>
                  Saved just now to your library.
                </UI.Popover.Description>
                <UI.Popover.Close
                  render={<UI.Button size="sm" variant="ghost" />}
                >
                  Done
                </UI.Popover.Close>
              </UI.Popover.Popup>
            </UI.Popover.Positioner>
          </UI.Popover.Portal>
        </UI.Popover.Root>
      );
    case "Tooltip":
      return (
        <UI.Tooltip
          label="Search library"
          shortcut={
            <UI.Keyboard.Shortcut density="flat">⌘K</UI.Keyboard.Shortcut>
          }
        >
          <UI.Button size="sm" variant="secondary">
            Hover or focus me
          </UI.Button>
        </UI.Tooltip>
      );
    case "Dialog":
      return <DialogDemo />;
    case "AlertDialog":
      return <DialogDemo alert />;
    case "PageDialog":
      return <PageDialogDemo />;
    case "Drawer":
      return (
        <UI.Drawer.Root>
          <UI.Drawer.Trigger
            render={<UI.Button size="sm" variant="secondary" />}
          >
            Open drawer
          </UI.Drawer.Trigger>
          <UI.Drawer.Portal>
            <UI.Drawer.Backdrop />
            <UI.Drawer.Viewport>
              <UI.Drawer.Popup>
                <UI.Drawer.Content>
                  <UI.Drawer.Title>Reference details</UI.Drawer.Title>
                  <UI.Drawer.Description>
                    A bottom sheet for secondary content.
                  </UI.Drawer.Description>
                  <UI.Drawer.Close render={<UI.Button size="sm" />}>
                    Done
                  </UI.Drawer.Close>
                </UI.Drawer.Content>
              </UI.Drawer.Popup>
            </UI.Drawer.Viewport>
          </UI.Drawer.Portal>
        </UI.Drawer.Root>
      );
    case "Toast":
      return (
        <UI.Toast.Provider>
          <ToastContent />
        </UI.Toast.Provider>
      );
    case "Table":
      return (
        <UI.Table.Root>
          <UI.Table.Header>
            <UI.Table.Row>
              <UI.Table.Head>Collection</UI.Table.Head>
              <UI.Table.Head>Items</UI.Table.Head>
            </UI.Table.Row>
          </UI.Table.Header>
          <UI.Table.Body>
            {sampleRows.map((row) => (
              <UI.Table.Row key={row.id}>
                <UI.Table.Cell>{row.name}</UI.Table.Cell>
                <UI.Table.Cell>{row.count}</UI.Table.Cell>
              </UI.Table.Row>
            ))}
          </UI.Table.Body>
        </UI.Table.Root>
      );
    case "DataTable":
      return (
        <UI.DataTable.Provider
          data={sampleRows}
          columns={[
            {
              id: "name",
              header: "Collection",
              sortLabel: "Collection",
              cell: (row) => row.name,
              accessor: (row) => row.name,
            },
            {
              id: "count",
              header: "Items",
              sortLabel: "Items",
              cell: (row) => row.count,
              accessor: (row) => row.count,
              width: "72px",
            },
          ]}
          getRowId={(row) => row.id}
          onSelectionChange={() => {}}
        >
          <UI.DataTable.Root />
          <UI.DataTable.ActionBar>
            {({ count, clear }) => (
              <UI.Button size="sm" variant="ghost" onClick={clear}>
                {count} selected · Clear
              </UI.Button>
            )}
          </UI.DataTable.ActionBar>
        </UI.DataTable.Provider>
      );
    case "Settings":
      return (
        <UI.Settings.Section>
          <UI.Settings.SectionTitle>Library</UI.Settings.SectionTitle>
          <UI.Settings.List>
            <UI.Settings.Item>
              <UI.Settings.ItemDetails>
                <UI.Settings.ItemTitle>Show counts</UI.Settings.ItemTitle>
                <UI.Settings.ItemDescription>
                  Display the number of saved items.
                </UI.Settings.ItemDescription>
              </UI.Settings.ItemDetails>
              <UI.Settings.ItemControl>
                <UI.Switch.Root aria-label="Show counts" defaultChecked />
              </UI.Settings.ItemControl>
            </UI.Settings.Item>
            <UI.Settings.Item>
              <UI.Settings.ItemDetails>
                <UI.Settings.ItemTitle>Layout</UI.Settings.ItemTitle>
              </UI.Settings.ItemDetails>
              <UI.Settings.ItemControl>
                <SelectDemo />
              </UI.Settings.ItemControl>
            </UI.Settings.Item>
          </UI.Settings.List>
        </UI.Settings.Section>
      );
    case "Empty":
      return (
        <UI.Empty.Root>
          <UI.Empty.Media>
            <UI.Logo size={24} />
          </UI.Empty.Media>
          <UI.Empty.Title>No references yet</UI.Empty.Title>
          <UI.Empty.Description>
            Save your first reference to start a collection.
          </UI.Empty.Description>
          <UI.Empty.Action>
            <UI.Button size="sm">Add reference</UI.Button>
          </UI.Empty.Action>
        </UI.Empty.Root>
      );
    case "Shell":
      return (
        <div
          style={{
            height: 180,
            width: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <UI.Shell.Body>
            <UI.Shell.Main>
              <UI.Shell.Header>
                <UI.TitleBar.Root>
                  <UI.TitleBar.Title>
                    <UI.TitleBar.Label>Library</UI.TitleBar.Label>
                  </UI.TitleBar.Title>
                </UI.TitleBar.Root>
              </UI.Shell.Header>
              <UI.Shell.Empty>Shell content area</UI.Shell.Empty>
            </UI.Shell.Main>
          </UI.Shell.Body>
        </div>
      );
    case "Window":
      return (
        <div
          style={{
            height: 240,
            width: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <UI.Window.Root style={{ height: "100%", minHeight: 0 }}>
            <UI.Window.Left minWidth={120} maxWidth={220} defaultWidth={160}>
              <div style={{ padding: 12 }}>Library</div>
            </UI.Window.Left>
            <UI.Window.Center>
              <div style={{ padding: 16 }}>Drag the divider to resize.</div>
            </UI.Window.Center>
          </UI.Window.Root>
        </div>
      );
    case "TrayCard":
      return <TrayCardDemo />;
    case "Keyboard":
      return (
        <div className={styles.stack}>
          <UI.Keyboard.Cluster keys={["⌘", "K"]} />
          <UI.Keyboard.Cluster keys={["⌘", "K"]} density="inline" />
          <UI.Keyboard.Cluster keys={["⌘", "K"]} density="flat" />
        </div>
      );
    case "Logo":
      return (
        <div className={styles.row}>
          <UI.Logo size={16} />
          <UI.Logo size={24} />
          <UI.Logo size={40} />
        </div>
      );
    case "Video":
      return (
        <UI.Video.Root style={{ width: "100%", height: 200 }}>
          <UI.Video.Media src={sampleVideo} muted preload="metadata" />
          <UI.Video.Controls>
            <UI.Video.Scrubber />
            <UI.Video.Row>
              <UI.Video.PlayButton />
              <UI.Video.TimeDisplay />
              <UI.Video.Spacer />
              <UI.Video.SpeedSelect />
              <UI.Video.MuteButton />
              <UI.Video.FullscreenButton />
            </UI.Video.Row>
          </UI.Video.Controls>
        </UI.Video.Root>
      );
    case "Attachments":
      return <AttachmentsDemo />;
    case "Chip":
      return <ChipDemo />;
    case "Conversation":
      return (
        <UI.Conversation.Root style={{ height: 220 }}>
          <UI.Conversation.Content>
            <MessageDemo />
          </UI.Conversation.Content>
        </UI.Conversation.Root>
      );
    case "Message":
      return <MessageDemo />;
    case "PromptInput":
      return <PromptDemo />;
    case "Suggestion":
      return (
        <UI.Suggestion.Root>
          Find related references<UI.Suggestion.Count>12</UI.Suggestion.Count>
        </UI.Suggestion.Root>
      );
    case "Loader":
      return (
        <UI.Loader.Root aria-label="Loading references">
          <UI.Loader.Dots />
        </UI.Loader.Root>
      );
    case "Shimmer":
      return <UI.Shimmer.Root>Finding related references…</UI.Shimmer.Root>;
    default:
      return null;
  }
}
