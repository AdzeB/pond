import { Button, Checkbox } from "@pond/ui";
import type { AssistantProvider } from "@shared/assistant";
import type { CatalogModel } from "../types";
import {
  compactTokens,
  contextHint,
  modelHint,
  priceHint,
  tokenPrice,
} from "./format";
import { Hint } from "./hint";
import styles from "./styles.module.css";

function MetricCell({
  className,
  hint,
  value,
}: {
  className: string | undefined;
  hint: string | undefined;
  value: string;
}) {
  return (
    <td className={className}>
      <Hint label={hint}>
        {hint ? (
          <Button type="button" variant="link" size="sm" aria-label={hint}>
            {value}
          </Button>
        ) : (
          <span>{value}</span>
        )}
      </Hint>
    </td>
  );
}

export function ModelRow({
  model,
  provider,
  checked,
  disabled,
  onCheckedChange,
}: {
  model: CatalogModel;
  provider: AssistantProvider;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `model-visible-${model.provider}-${model.id}`;
  return (
    <tr>
      <td>
        <Hint label={modelHint(model) || undefined}>
          <label htmlFor={id} className={styles.name}>
            {model.name}
          </label>
        </Hint>
      </td>
      <MetricCell
        className={styles.metric}
        hint={priceHint("Input", model.pricing?.input)}
        value={tokenPrice(model.pricing?.input)}
      />
      <MetricCell
        className={styles.metric}
        hint={priceHint("Output", model.pricing?.output)}
        value={tokenPrice(model.pricing?.output)}
      />
      <MetricCell
        className={styles.context}
        hint={contextHint(model.contextWindow)}
        value={compactTokens(model.contextWindow)}
      />
      <td className={styles.check}>
        <Checkbox.Root
          id={id}
          size="sm"
          aria-label={`Show ${model.name} in model pickers`}
          checked={checked}
          disabled={disabled}
          aria-describedby={
            model.available === false ? `connection-${provider}` : undefined
          }
          onCheckedChange={onCheckedChange}
        >
          <Checkbox.Indicator />
        </Checkbox.Root>
      </td>
    </tr>
  );
}
