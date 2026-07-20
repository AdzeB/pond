import {
  IconTrash2Outline18 as TrashIcon,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Dialog, Field, Input } from "@pond/ui";
import { useEffect, useState } from "react";
import {
  type CustomSkill,
  makeSkillId,
  slugifySkillName,
} from "@/lib/save/skills";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

interface SkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-seeds the name field from the text typed after "/". */
  initialName?: string;
}

export function SkillDialog({
  open,
  onOpenChange,
  initialName,
}: SkillDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open ? <SkillForm initialName={initialName} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SkillForm({ initialName }: { initialName?: string }) {
  const [prefs, patch] = usePrefs("skills");
  const skills = prefs.custom ?? [];

  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only seed
  useEffect(() => {
    if (initialName) setName(initialName);
  }, []);

  const slug = slugifySkillName(name);
  const duplicate = skills.some((s) => s.name === slug);
  const canAdd = slug.length > 0 && prompt.trim().length > 0 && !duplicate;

  const add = () => {
    if (!canAdd) return;
    const skill: CustomSkill = {
      id: makeSkillId(),
      name: slug,
      description: description.trim(),
      prompt: prompt.trim(),
    };
    patch({ custom: [...skills, skill] });
    setName("");
    setDescription("");
    setPrompt("");
  };

  const remove = (id: string) => {
    patch({ custom: skills.filter((s) => s.id !== id) });
  };

  return (
    <Dialog.Popup className={styles.popup}>
      <header className={styles.header}>
        <Dialog.Title className={styles.title}>Skills</Dialog.Title>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          <X />
        </Dialog.Close>
      </header>

      <div className={styles.body}>
        {skills.length > 0 ? (
          <ul className={styles.list}>
            {skills.map((skill) => (
              <li key={skill.id} className={styles.item}>
                <div className={styles["item-text"]}>
                  <span className={styles["item-name"]}>/{skill.name}</span>
                  <span className={styles["item-description"]}>
                    {skill.description || skill.prompt}
                  </span>
                </div>
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete /${skill.name}`}
                  onClick={() => remove(skill.id)}
                >
                  <TrashIcon width={16} height={16} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.form}>
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
              rows={3}
              spellCheck={false}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Field.Root>
        </div>
      </div>

      <Dialog.Footer className={styles.footer}>
        <Dialog.Close render={<Button variant="ghost">Done</Button>} />
        <Button variant="primary" disabled={!canAdd} onClick={add}>
          Add skill
        </Button>
      </Dialog.Footer>
    </Dialog.Popup>
  );
}
