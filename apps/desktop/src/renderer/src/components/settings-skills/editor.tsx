import { IconDotsFill18 as Ellipsis } from "@pond/icons/fill/18";
import {
  IconChevronLeftOutline18 as Back,
  IconTrash2Outline18 as TrashIcon,
} from "@pond/icons/outline/18";
import {
  Button,
  Field,
  Input,
  Menu,
  type MenuItemSpec,
  Settings,
} from "@pond/ui";
import { useState } from "react";
import {
  type CustomSkill,
  makeSkillId,
  slugifySkillName,
} from "@/lib/save/skills";
import styles from "./styles.module.css";

interface SkillEditorProps {
  /** Null when creating a new skill. */
  skill: CustomSkill | null;
  /** Slugs of the other skills, guarding against duplicate commands. */
  existingNames: string[];
  onCancel: () => void;
  onSave: (skill: CustomSkill) => void;
  onDelete?: () => void;
}

export function SkillEditor({
  skill,
  existingNames,
  onCancel,
  onSave,
  onDelete,
}: SkillEditorProps) {
  const [name, setName] = useState(skill?.name ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [prompt, setPrompt] = useState(skill?.prompt ?? "");

  const slug = slugifySkillName(name);
  const duplicate = existingNames.includes(slug);
  const canSave = slug.length > 0 && prompt.trim().length > 0 && !duplicate;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: skill?.id ?? makeSkillId(),
      name: slug,
      description: description.trim(),
      prompt: prompt.trim(),
    });
  };

  return (
    <Settings.Page width="medium">
      <Settings.Header className={styles["editor-header"]}>
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Back to skills"
          className={styles.back}
          onClick={onCancel}
        >
          <Back width={18} height={18} />
        </Button>
        <Settings.HeaderText>
          <Settings.Title>
            {skill ? `/${skill.name}` : "New skill"}
          </Settings.Title>
        </Settings.HeaderText>
        {onDelete ? (
          <Menu.Root>
            <Menu.Trigger
              icon
              size="sm"
              variant="ghost"
              aria-label="Skill actions"
            >
              <Ellipsis width={16} height={16} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end" sideOffset={6}>
                <Menu.Popup>
                  <Menu.Items
                    items={
                      [
                        {
                          label: "Delete",
                          icon: <TrashIcon />,
                          onClick: onDelete,
                        },
                      ] satisfies MenuItemSpec[]
                    }
                  />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ) : null}
      </Settings.Header>

      <div className={styles["editor-body"]}>
        <div className={styles["editor-form"]}>
          <Field.Root className={styles.field}>
            <Field.Label className={styles.label}>Command</Field.Label>
            <Input.Root>
              <Input.Icon>/</Input.Icon>
              <Input.Field
                data-size="sm"
                placeholder="untagged-images"
                value={name}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
            </Input.Root>
            {slug && slug !== name ? (
              <Field.Description className={styles.hint}>
                Saved as <code>/{slug}</code>
              </Field.Description>
            ) : duplicate ? (
              <Field.Description className={styles.hint}>
                A skill named <code>/{slug}</code> already exists.
              </Field.Description>
            ) : null}
          </Field.Root>

          <Field.Root className={styles.field}>
            <Field.Label className={styles.label}>Description</Field.Label>
            <Input.Field
              data-size="sm"
              placeholder="Optional, shown in the menu"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field.Root>

          <Field.Root className={styles.field}>
            <Field.Label className={styles.label}>Prompt</Field.Label>
            <textarea
              className={styles.textarea}
              placeholder="The question this skill asks, e.g. “images with no tags from this month”"
              value={prompt}
              spellCheck={false}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Field.Root>
        </div>

        <div className={styles.footer}>
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!canSave}
            onClick={save}
          >
            Save
          </Button>
        </div>
      </div>
    </Settings.Page>
  );
}
