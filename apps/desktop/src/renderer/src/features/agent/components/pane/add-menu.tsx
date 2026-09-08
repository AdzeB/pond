import {
  IconAlbum2Outline18,
  IconLink2Outline18,
} from "@pond/icons/outline/18";
import { Menu, Toolbar } from "@pond/ui";
import { ASSISTANT_ACTIONS, type AssistantAction } from "./actions";
import trayStyles from "./composer-tray.module.css";

export function ComposerActions({
  referencedCount,
  onSaves,
  onReferenced,
  onAction,
  onModels,
  onScope,
  modelLabel,
  modelsDisabled,
}: {
  referencedCount: number;
  onSaves: () => void;
  onReferenced: () => void;
  onAction: (action: AssistantAction) => void;
  onModels: () => void;
  onScope: () => void;
  modelLabel: string;
  modelsDisabled: boolean;
}) {
  return (
    <Toolbar.Root
      orientation="vertical"
      aria-label="Composer options"
      className={trayStyles.options}
    >
      <Menu.SectionLabel>Add</Menu.SectionLabel>
      <Toolbar.Button render={<Menu.Row />} onClick={onSaves}>
        <Menu.ItemIcon>
          <IconAlbum2Outline18 />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Saves from Library</Menu.ItemLabel>
        <Menu.SecondaryLabel data-tray-detail>
          Choose saved items
        </Menu.SecondaryLabel>
      </Toolbar.Button>
      {referencedCount ? (
        <Toolbar.Button render={<Menu.Row />} onClick={onReferenced}>
          <Menu.ItemIcon>
            <IconLink2Outline18 />
          </Menu.ItemIcon>
          <Menu.ItemLabel>Referenced Saves</Menu.ItemLabel>
          <Menu.SecondaryLabel data-tray-detail>
            {referencedCount} from this response
          </Menu.SecondaryLabel>
        </Toolbar.Button>
      ) : null}
      <Menu.SectionLabel>Actions</Menu.SectionLabel>
      {ASSISTANT_ACTIONS.map((action) => (
        <Toolbar.Button
          key={action.id}
          render={<Menu.Row />}
          onClick={() => onAction(action.id)}
        >
          <Menu.ItemIcon>
            <action.icon />
          </Menu.ItemIcon>
          <Menu.ItemLabel>{action.title}</Menu.ItemLabel>
          <Menu.SecondaryLabel data-tray-detail>
            {action.detail}
          </Menu.SecondaryLabel>
        </Toolbar.Button>
      ))}
      <Menu.SectionLabel>Settings</Menu.SectionLabel>
      <Toolbar.Button
        render={<Menu.Row />}
        onClick={onModels}
        disabled={modelsDisabled}
      >
        <Menu.ItemLabel>Model</Menu.ItemLabel>
        <Menu.SecondaryLabel data-tray-detail>{modelLabel}</Menu.SecondaryLabel>
      </Toolbar.Button>
      <Toolbar.Button render={<Menu.Row />} onClick={onScope}>
        <Menu.ItemLabel>Search Scope</Menu.ItemLabel>
        <Menu.SecondaryLabel data-tray-detail>
          Choose where to search
        </Menu.SecondaryLabel>
      </Toolbar.Button>
    </Toolbar.Root>
  );
}
