import { IconChevronDownOutline18 as ChevronDown } from "@pond/icons/outline/18";
import { Accordion, Slider, Toggle, ToggleGroup } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./form-controls.module.css";

function sliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

/** Base UI lets a lone pressed toggle be unpressed; ignoring the empty pick keeps exactly one option active. */
export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; ariaLabel?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles["field-label"]}>{label}</span>
      <ToggleGroup
        value={[value]}
        aria-label={label}
        className={styles["field-seg"]}
        onValueChange={(next) => {
          const pick = next[0] as T | undefined;
          if (pick && pick !== value) onChange(pick);
        }}
      >
        {options.map((option) => (
          <Toggle
            key={option.value}
            value={option.value}
            size="sm"
            aria-label={option.ariaLabel}
          >
            {option.label}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Accordion.Item value={id} className={styles.section}>
      <Accordion.Header className={styles["section-header"]}>
        <Accordion.Trigger className={styles["section-trigger"]}>
          {label}
          <ChevronDown className={styles["section-chevron"]} />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className={styles["section-panel"]}>
        <div className={styles["section-fields"]}>{children}</div>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function KnobSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles["field-label"]}>{label}</span>
      <div className={styles.knob}>
        <Slider.Root
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={(next) => onChange(sliderValue(next))}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb aria-label={label} />
            </Slider.Track>
          </Slider.Control>
          <Slider.Value />
        </Slider.Root>
      </div>
    </div>
  );
}
