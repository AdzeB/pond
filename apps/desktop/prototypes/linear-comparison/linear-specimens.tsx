import { Checkbox } from "@base-ui/react/checkbox";
import { Combobox } from "@base-ui/react/combobox";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import { IconCheckOutline12, IconXmarkOutline12 } from "@pond/icons/outline/12";
import {
  IconAlbum2Outline18,
  IconFolderOutline18,
  IconListFavsOutline18,
} from "@pond/icons/outline/18";
import { useState } from "react";
import { buttonCases } from "./button-cases";
import type { Entry } from "./catalog";
import { linearStyle, nativeSamples } from "./linear-source";
import "./linear-specimens.css";

export { linearSamples } from "./linear-source";

export function SourceIcon({ id }: { id: string }) {
  const sample = nativeSamples.find((item) => item.id === id);
  const icon = sample && "icon" in sample ? sample.icon : null;
  if (!icon) return null;
  return (
    <svg
      aria-hidden="true"
      width={icon.width ?? 16}
      height={icon.height ?? 16}
      viewBox={icon.viewBox ?? "0 0 16 16"}
      fill={icon.fill}
    >
      {icon.paths.map((path) => (
        <path
          key={path.d}
          d={path.d ?? undefined}
          fill={path.fill ?? undefined}
          fillRule={path.fillRule === "evenodd" ? "evenodd" : undefined}
          clipRule={path.clipRule === "evenodd" ? "evenodd" : undefined}
        />
      ))}
    </svg>
  );
}

const priorities = ["No priority", "Urgent", "High", "Medium", "Low"];

function Shortcut({ children }: { children: React.ReactNode }) {
  return <kbd style={linearStyle("app-menu-shortcut")}>{children}</kbd>;
}

function Picker({ inline = false }: { inline?: boolean }) {
  const [value, setValue] = useState<string | null>("No priority");
  const contents = (
    <>
      <div className="linear-search-wrap">
        <Combobox.Input
          className="linear-search"
          style={linearStyle("app-priority-search")}
          aria-label="Find a priority"
          placeholder="Set priority…"
        />
      </div>
      <Combobox.Empty className="linear-empty">No results</Combobox.Empty>
      <Combobox.List className="linear-options">
        {(item: string) => (
          <Combobox.Item
            key={item}
            value={item}
            className="linear-option"
            style={linearStyle("app-priority-option")}
          >
            <span className="linear-option-label">{item}</span>
            <Combobox.ItemIndicator>
              <IconCheckOutline12 />
            </Combobox.ItemIndicator>
            <Shortcut>{priorities.indexOf(item)}</Shortcut>
          </Combobox.Item>
        )}
      </Combobox.List>
    </>
  );
  return (
    <Combobox.Root
      items={priorities}
      value={value}
      onValueChange={setValue}
      inline={inline}
    >
      {inline ? (
        <div
          className="linear-popup linear-inline"
          style={{
            ...linearStyle("app-priority-popup", "both"),
            height: "auto",
          }}
          data-linear-primary="app-priority-popup"
        >
          {contents}
        </div>
      ) : (
        <>
          <Combobox.Trigger
            className="linear-control linear-picker-trigger"
            style={linearStyle("app-priority-trigger")}
            data-linear-primary="app-priority-trigger"
            aria-label="Priority"
          >
            <SourceIcon id="app-priority-trigger" />
            <Combobox.Value />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner
              sideOffset={6}
              className="linear-positioner"
              data-linear-root
            >
              <Combobox.Popup
                className="linear-popup"
                style={{
                  ...linearStyle("app-priority-popup", "both"),
                  height: "auto",
                }}
                data-linear-overlay="app-priority-popup"
              >
                {contents}
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </>
      )}
    </Combobox.Root>
  );
}

function MenuExample() {
  const [message, setMessage] = useState("Choose an action");
  const actions = ["New folder", "Rename", "Show counts", "Archive"];
  return (
    <div className="linear-stack">
      <div
        className="linear-popup"
        style={{ ...linearStyle("app-workspace-menu", "both"), height: "auto" }}
        data-linear-primary="app-workspace-menu"
      >
        <div className="linear-menu-items">
          {actions.map((label, index) => (
            <div key={label}>
              {index === 2 && <div className="linear-divider" />}
              <button
                key={label}
                type="button"
                className="linear-option"
                style={linearStyle("app-priority-option")}
                onClick={() => setMessage(`${label} selected`)}
              >
                <span className="linear-option-label">{label}</span>
                {label === "New folder" && <Shortcut>⌘N</Shortcut>}
              </button>
            </div>
          ))}
        </div>
      </div>
      <Menu.Root>
        <Menu.Trigger
          className="linear-control linear-picker-trigger"
          style={linearStyle("app-priority-trigger")}
        >
          Open menu
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            sideOffset={6}
            className="linear-positioner"
            data-linear-root
          >
            <Menu.Popup
              className="linear-popup"
              style={{
                ...linearStyle("app-workspace-menu", "both"),
                height: "auto",
              }}
              data-linear-overlay="app-workspace-menu"
            >
              <div className="linear-menu-items">
                {actions.map((label, index) => (
                  <div key={label}>
                    {index === 2 && (
                      <Menu.Separator className="linear-divider" />
                    )}
                    <Menu.Item
                      key={label}
                      className="linear-option"
                      style={linearStyle("app-priority-option")}
                      onClick={() => setMessage(`${label} selected`)}
                    >
                      <span className="linear-option-label">{label}</span>
                    </Menu.Item>
                  </div>
                ))}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <span className="linear-feedback" role="status">
        {message}
      </span>
    </div>
  );
}

function SidebarExample() {
  const [selected, setSelected] = useState("Inbox");
  const links = [
    { label: "Inbox", Icon: IconAlbum2Outline18 },
    { label: "My issues", Icon: IconListFavsOutline18 },
    { label: "Projects", Icon: IconFolderOutline18 },
  ];
  return (
    <nav aria-label="Linear sample navigation" className="linear-sidebar">
      {links.map(({ label }, index) => (
        <button
          type="button"
          key={label}
          className="linear-sidebar-row"
          style={linearStyle(
            selected === label
              ? "app-sidebar-selected-label"
              : "app-sidebar-unselected-label",
            "both",
          )}
          data-linear-primary={
            index === 0
              ? selected === label
                ? "app-sidebar-selected-label"
                : "app-sidebar-unselected-label"
              : undefined
          }
          aria-current={selected === label ? "page" : undefined}
          onClick={() => setSelected(label)}
        >
          <SourceIcon
            id={
              index === 0
                ? "app-sidebar-selected-label"
                : "app-sidebar-unselected-label"
            }
          />
          <span>{label}</span>
        </button>
      ))}
      <span className="linear-feedback" role="status">
        {selected}
      </span>
    </nav>
  );
}

function SwitchExample({
  label = "Create another",
  initial = false,
}: {
  label?: string;
  initial?: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <label className="linear-switch-label">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
        className="linear-switch"
        style={linearStyle(
          checked ? "app-checkbox-checked" : "app-checkbox-unchecked",
          "both",
        )}
        data-linear-primary={
          checked ? "app-checkbox-checked" : "app-checkbox-unchecked"
        }
      />
      <span style={linearStyle("app-preference-label")}>{label}</span>
    </label>
  );
}

function ComposerExample() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        className="linear-control linear-picker-trigger"
        style={linearStyle("app-priority-trigger")}
      >
        Open composer
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="linear-backdrop" />
        <Dialog.Popup
          className="linear-composer"
          style={linearStyle("app-dialog-surface", "fluid")}
          data-linear-root
          data-linear-overlay="app-dialog-surface"
        >
          <div className="linear-composer-inner">
            <div className="linear-composer-heading">
              <Dialog.Title>New issue</Dialog.Title>
              <Dialog.Close
                className="linear-control"
                style={linearStyle("app-create-button", "both")}
                aria-label="Close composer"
              >
                <IconXmarkOutline12 />
              </Dialog.Close>
            </div>
            <Dialog.Description className="linear-feedback">
              Local example. Nothing is sent to Linear.
            </Dialog.Description>
            <input
              className="linear-editor"
              aria-label="Issue title"
              placeholder="Issue title"
              style={linearStyle("app-editor")}
            />
            <textarea
              className="linear-description"
              aria-label="Issue description"
              placeholder="Add description…"
            />
            <div className="linear-composer-footer">
              <Picker />
              <SwitchExample />
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ButtonExample() {
  const [message, setMessage] = useState("Actions run only in this preview");
  return (
    <div className="button-cases">
      {buttonCases.map((item) => (
        <div className="button-case" key={item.id}>
          <div className="button-case-label">
            <strong>{item.name}</strong>
            <span>{item.size === "xs" ? "24" : "28"} px · pill radius</span>
          </div>
          <button
            type="button"
            className="linear-control linear-button-case"
            style={linearStyle(item.id, item.icon ? "both" : "height")}
            data-linear-primary={item.id}
            aria-label={item.label}
            onClick={() => setMessage(`${item.label} previewed locally`)}
          >
            {(item.icon || item.label === "Skills") && (
              <SourceIcon id={item.id} />
            )}
            {!item.icon && item.label}
          </button>
        </div>
      ))}
      <span className="linear-feedback" role="status">
        {message}
      </span>
    </div>
  );
}

function CheckboxExample() {
  return (
    <div className="linear-sample-row">
      {[false, true].map((value, index) => (
        <div key={String(value)} className="linear-switch-label">
          <Checkbox.Root
            defaultChecked={value}
            aria-label={value ? "Selected item" : "Select item"}
            className="linear-square-checkbox"
            style={linearStyle("app-square-checkbox", "both")}
            data-linear-primary={
              index === 0 ? "app-square-checkbox" : undefined
            }
          >
            <Checkbox.Indicator>
              <IconCheckOutline12 />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <span>{value ? "Selected" : "Select item"}</span>
        </div>
      ))}
    </div>
  );
}

function TabsExample() {
  const [value, setValue] = useState("Active");
  return (
    <Tabs.Root value={value} onValueChange={(next) => setValue(String(next))}>
      <Tabs.List className="linear-sample-row" aria-label="Linear view tabs">
        {["Active", "Backlog", "All issues"].map((label, index) => (
          <Tabs.Tab
            key={label}
            value={label}
            className="linear-control"
            style={linearStyle(
              value === label ? "app-view-tab-active" : "app-view-tab",
            )}
            data-linear-primary={
              index === 0
                ? value === label
                  ? "app-view-tab-active"
                  : "app-view-tab"
                : undefined
            }
          >
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {["Active", "Backlog", "All issues"].map((label) => (
        <Tabs.Panel
          key={label}
          value={label}
          className="linear-feedback linear-tab-panel"
        >
          {label}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

function TooltipExample() {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          className="linear-control"
          style={linearStyle("app-create-button", "both")}
          aria-label="New item"
        >
          <SourceIcon id="app-create-button" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner
            sideOffset={6}
            className="linear-positioner"
            data-linear-root
          >
            <Tooltip.Popup
              style={linearStyle("app-tooltip", "fluid")}
              data-linear-overlay="app-tooltip"
            >
              <div
                className="linear-tooltip-content"
                style={linearStyle("app-tooltip-content", "fluid")}
              >
                Create issue<Shortcut>C</Shortcut>
              </div>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function ContextExample() {
  const [message, setMessage] = useState("Right-click this reference");
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="linear-context-target">
        {message}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="linear-positioner" data-linear-root>
          <ContextMenu.Popup
            className="linear-popup"
            style={{
              ...linearStyle("app-context-menu", "both"),
              height: "auto",
            }}
            data-linear-overlay="app-context-menu"
          >
            <div className="linear-menu-items">
              {["Status", "Priority", "Copy", "Open in new tab"].map(
                (label, index) => (
                  <div key={label}>
                    {index === 2 && (
                      <ContextMenu.Separator className="linear-divider" />
                    )}
                    <ContextMenu.Item
                      className="linear-option"
                      style={linearStyle("app-context-option")}
                      onClick={() => setMessage(`${label} selected`)}
                    >
                      <span className="linear-option-label">{label}</span>
                    </ContextMenu.Item>
                  </div>
                ),
              )}
            </div>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function PreferencesExample() {
  return (
    <div
      className="linear-popup"
      style={{ ...linearStyle("app-display-popup", "both"), height: "auto" }}
      data-linear-primary="app-display-popup"
    >
      <div
        className="linear-preferences"
        style={linearStyle("app-preference-section", "fluid")}
      >
        {["Show snoozed", "Show read", "Show unread first"].map(
          (label, index) => (
            <SwitchExample key={label} label={label} initial={index < 2} />
          ),
        )}
      </div>
    </div>
  );
}

function HeaderExample() {
  const [action, setAction] = useState("");
  return (
    <div className="linear-stack linear-wide">
      <div
        className="linear-header"
        style={linearStyle("app-toolbar")}
        data-linear-primary="app-toolbar"
      >
        <span style={linearStyle("app-title")}>Inbox</span>
        <div className="linear-sample-row">
          {[
            ["app-filter-button", "Filter"],
            ["app-display-button", "Display"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className="linear-control"
              style={linearStyle(id ?? "", "both")}
              aria-label={label}
              onClick={() => setAction(action === label ? "" : (label ?? ""))}
            >
              <SourceIcon id={id ?? ""} />
            </button>
          ))}
        </div>
      </div>
      {action && <PreferencesExample />}
    </div>
  );
}

function ChatExample() {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [skills, setSkills] = useState(false);
  return (
    <div className="linear-stack linear-wide">
      <form
        className="linear-chat"
        style={linearStyle("app-chat-surface", "fluid")}
        data-linear-primary="app-chat-surface"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) {
            setMessage("Message previewed locally. Nothing was sent.");
            setValue("");
          }
        }}
      >
        <textarea
          className="linear-chat-editor"
          style={linearStyle("app-chat-editor", "fluid")}
          aria-label="Linear message"
          placeholder="Send a message…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="linear-header">
          <button
            type="button"
            className="linear-control linear-picker-trigger"
            style={linearStyle("app-chat-skills")}
            aria-expanded={skills}
            onClick={() => setSkills(!skills)}
          >
            Skills
          </button>
          <div className="linear-sample-row">
            <button
              type="button"
              className="linear-control"
              style={linearStyle("app-chat-attachment", "both")}
              aria-label="Preview attachment"
              onClick={() => setMessage("reference.png attached locally")}
            >
              <SourceIcon id="app-chat-attachment" />
            </button>
            <button
              type="submit"
              className="linear-control"
              style={linearStyle("app-chat-submit", "both")}
              aria-label="Preview message"
              disabled={!value.trim()}
            >
              <SourceIcon id="app-chat-submit" />
            </button>
          </div>
        </div>
        {skills && (
          <p className="linear-feedback">
            Skills menu structure has not been extracted.
          </p>
        )}
      </form>
      {message && (
        <span className="linear-feedback" role="status">
          {message}
        </span>
      )}
    </div>
  );
}

function ListExample() {
  const [selected, setSelected] = useState("");
  return (
    <div className="linear-issue-list">
      <div
        className="linear-issue-group"
        style={linearStyle("app-list-header")}
      >
        <span style={linearStyle("app-issue-title-text")}>References</span>
        <span className="linear-feedback">3</span>
      </div>
      {["Reference library", "Interface details", "Motion studies"].map(
        (label, index) => (
          <button
            type="button"
            key={label}
            className="linear-issue-row"
            style={linearStyle("app-issue-row")}
            data-linear-primary={index === 0 ? "app-issue-row" : undefined}
            aria-pressed={selected === label}
            onClick={() => setSelected(label)}
          >
            <span style={linearStyle("app-issue-id")}>REF-{index + 1}</span>
            <span style={linearStyle("app-issue-title-text")}>{label}</span>
            <span style={linearStyle("app-issue-date-text")}>Today</span>
          </button>
        ),
      )}
      {selected && (
        <span className="linear-feedback" role="status">
          {selected} selected
        </span>
      )}
    </div>
  );
}

function ChipExample() {
  const [label, setLabel] = useState("Labels");
  return (
    <Menu.Root>
      <Menu.Trigger
        className="linear-control linear-picker-trigger"
        style={linearStyle("app-label-trigger")}
        data-linear-primary="app-label-trigger"
      >
        <SourceIcon id="app-label-trigger" />
        {label}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="linear-positioner"
          sideOffset={6}
          data-linear-root
        >
          <Menu.Popup
            className="linear-popup"
            style={{
              ...linearStyle("app-workspace-menu", "both"),
              height: "auto",
            }}
            data-linear-overlay="app-workspace-menu"
          >
            <div className="linear-menu-items">
              {["Interface", "Research", "Motion"].map((item) => (
                <Menu.Item
                  key={item}
                  className="linear-option"
                  style={linearStyle("app-menu-option")}
                  onClick={() => setLabel(item)}
                >
                  <span className="linear-option-label">{item}</span>
                </Menu.Item>
              ))}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function ToggleExample() {
  const [pressed, setPressed] = useState(false);
  return (
    <div className="linear-stack">
      <button
        type="button"
        className="linear-control"
        style={linearStyle("app-favorite-toggle", "both")}
        data-linear-primary="app-favorite-toggle"
        aria-label="Favorite"
        aria-pressed={pressed}
        onClick={() => setPressed(!pressed)}
      >
        <SourceIcon id="app-favorite-toggle" />
      </button>
      <span className="linear-feedback" role="status">
        {pressed ? "Favorited locally" : "Add to favorites"}
      </span>
    </div>
  );
}

export function LinearSpecimen({ entry }: { entry: Entry }) {
  switch (entry.id) {
    case "Checkbox":
      return <CheckboxExample />;
    case "Tab":
      return <TabsExample />;
    case "Toggle":
      return <ToggleExample />;
    case "ContextMenu":
      return <ContextExample />;
    case "Tooltip":
      return <TooltipExample />;
    case "Settings":
      return <PreferencesExample />;
    case "Toolbar":
    case "TitleBar":
      return <HeaderExample />;
    case "PromptInput":
      return <ChatExample />;
    case "Table":
    case "DataTable":
      return <ListExample />;
    case "Empty":
      return (
        <span
          style={linearStyle("app-empty-label")}
          data-linear-primary="app-empty-label"
        >
          No notification selected
        </span>
      );
    case "Chip":
      return <ChipExample />;
    case "Button":
      return <ButtonExample />;
    case "Sidebar":
      return <SidebarExample />;
    case "Menu":
      return <MenuExample />;
    case "Select":
    case "Combobox":
      return <Picker />;
    case "Popover":
      return <Picker inline />;
    case "Input":
      return (
        <div className="linear-stack">
          <input
            className="linear-search"
            style={linearStyle("app-priority-search", "both")}
            data-linear-primary="app-priority-search"
            aria-label="Linear search"
            placeholder="Set priority…"
          />
          <input
            className="linear-editor"
            style={linearStyle("app-editor")}
            aria-label="Linear title"
            placeholder="Issue title"
          />
        </div>
      );
    case "Switch":
      return <SwitchExample />;
    case "Keyboard":
      return (
        <div
          className="linear-shortcuts"
          data-linear-primary="app-menu-shortcut"
        >
          <Shortcut>⌘</Shortcut>
          <Shortcut>K</Shortcut>
        </div>
      );
    case "Dialog":
      return <ComposerExample />;
    default:
      return (
        <div className="linear-unavailable">
          <strong>Not extracted yet</strong>
          <p>
            This Pond component has no inspected Linear counterpart in the
            current extraction.
          </p>
          <p>The comparison only uses the actual app.</p>
        </div>
      );
  }
}
