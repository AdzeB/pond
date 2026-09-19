import { IconMinusOutline18, IconPlusOutline18 } from "@pond/icons/outline/18";
import { isGroup, type Query } from "@pond/schema/filters/types";
import { Button } from "@pond/ui";
import { useId } from "react";
import { Predicate } from "../predicate";
import { RuleSelect } from "../rule-select";
import type { RuleChoices } from "../types";
import { useRuleGroup } from "../use-rule-group";
import styles from "./styles.module.css";

interface GroupProps {
  query: Query;
  choices: RuleChoices;
  onChange: (query: Query) => void;
  onRemove?: () => void;
  path: string;
}

export function Group({
  query,
  choices,
  onChange,
  onRemove,
  path,
}: GroupProps) {
  const labelId = useId();
  const editor = useRuleGroup(query, onChange);
  return (
    <fieldset className={styles.root} aria-labelledby={labelId}>
      <legend id={labelId} className={styles["sr-only"]}>
        {path}
      </legend>
      <div className={styles.header}>
        <RuleSelect.Single
          value={query.combinator}
          label={`${path} Match`}
          width="content"
          items={[
            { value: "or", label: "any" },
            { value: "and", label: "all" },
          ]}
          onChange={editor.setCombinator}
        />
        <span>of the following are</span>
        <RuleSelect.Single
          value={query.not ? "false" : "true"}
          label={`${path} Truth`}
          width="content"
          items={[
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ]}
          onChange={editor.setTruth}
        />
        <span className={styles.spacer} />
        {onRemove ? (
          <Button
            icon
            variant="secondary"
            aria-label={`Remove ${path}`}
            onClick={onRemove}
          >
            <IconMinusOutline18 />
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onClick={editor.addGroup}>
          Add Rule Group
        </Button>
        <Button
          icon
          variant="secondary"
          aria-label={`Add Rule to ${path}`}
          onClick={editor.addRule}
        >
          <IconPlusOutline18 />
        </Button>
      </div>
      <div className={styles.rules}>
        {query.rules.map((rule, index) =>
          isGroup(rule) ? (
            <Group
              key={rule.id}
              query={rule}
              choices={choices}
              path={`${path} Group ${index + 1}`}
              onChange={(next) => editor.updateRule(index, next)}
              onRemove={() => editor.removeRule(index)}
            />
          ) : (
            <Predicate
              key={rule.id}
              rule={rule}
              index={index}
              choices={choices}
              onChange={(next) => editor.updateRule(index, next)}
              onRemove={() => editor.removeRule(index)}
              onInsert={() => editor.insertRule(index)}
            />
          ),
        )}
        {query.rules.length === 0 ? (
          <p className={styles["no-value"]}>
            All saves match. Add a rule to narrow the results.
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
