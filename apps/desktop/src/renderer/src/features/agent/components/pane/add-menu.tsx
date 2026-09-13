import {
  IconAlbum2Outline18,
  IconLink2Outline18,
} from "@pond/icons/outline/18";
import { ComposerOptions } from "@pond/ui/composer-options";
import { ASSISTANT_ACTIONS, type AssistantAction } from "./actions";

export function ComposerActions({
  referencedCount,
  onSaves,
  onReferenced,
  onAction,
  onModels,
  modelLabel,
  modelsDisabled,
}: {
  referencedCount: number;
  onSaves: () => void;
  onReferenced: () => void;
  onAction: (action: AssistantAction) => void;
  onModels: () => void;
  modelLabel: string;
  modelsDisabled: boolean;
}) {
  return (
    <>
      <ComposerOptions.Group label="Add">
        <ComposerOptions.Item
          icon={<IconAlbum2Outline18 />}
          description="Choose saved items"
          onClick={onSaves}
        >
          Saves from Library
        </ComposerOptions.Item>
        {referencedCount ? (
          <ComposerOptions.Item
            icon={<IconLink2Outline18 />}
            description={`${referencedCount} from this response`}
            onClick={onReferenced}
          >
            Referenced Saves
          </ComposerOptions.Item>
        ) : null}
      </ComposerOptions.Group>
      <ComposerOptions.Group label="Actions">
        {ASSISTANT_ACTIONS.map((action) => (
          <ComposerOptions.Item
            key={action.id}
            icon={<action.icon />}
            description={action.detail}
            onClick={() => onAction(action.id)}
          >
            {action.title}
          </ComposerOptions.Item>
        ))}
      </ComposerOptions.Group>
      <ComposerOptions.Group label="Settings">
        <ComposerOptions.Item
          description={modelLabel}
          disabled={modelsDisabled}
          onClick={onModels}
        >
          Model
        </ComposerOptions.Item>
      </ComposerOptions.Group>
    </>
  );
}
