import {
  IconMinusOutline18 as Minus,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import { NumberField } from "@pond/ui";
import { Calligraph } from "calligraph";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

type RootProps = ComponentProps<typeof NumberField.Root>;

export function NumberFieldStepper(props: RootProps) {
  return (
    <NumberField.Root {...props}>
      <NumberField.Group>
        <NumberField.Decrement aria-label="Decrement">
          <Minus />
        </NumberField.Decrement>
        <NumberField.Input
          render={(inputProps, state) => (
            <span
              className={styles["input-wrap"]}
              data-focused={state.focused ? "" : undefined}
            >
              <input {...inputProps} className={styles.input} />
              <Calligraph
                variant="number"
                aria-hidden
                className={styles["input-display"]}
              >
                {state.inputValue}
              </Calligraph>
            </span>
          )}
        />
        <NumberField.Increment aria-label="Increment">
          <Plus />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
