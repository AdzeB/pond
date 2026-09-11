import { IconPlusOutline12 } from "@pond/icons/outline/12";
import { Button, Checkbox, Input } from "@pond/ui";
import { useId, useState } from "react";
import { Choice } from "./choice";
import styles from "./examples.module.css";

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
const variants = [
  "primary",
  "secondary",
  "tertiary",
  "ghost",
  "text",
  "accent",
  "destructive",
  "link",
] as const;

export function ButtonExample() {
  const id = useId();
  const [size, setSize] = useState<(typeof sizes)[number]>("md");
  const [variant, setVariant] = useState<(typeof variants)[number]>("primary");
  const [disabled, setDisabled] = useState(false);
  const [icon, setIcon] = useState(false);
  const [label, setLabel] = useState("Create collection");
  const [clicks, setClicks] = useState(0);
  const snippet = `<Button size="${size}" variant="${variant}"${disabled ? " disabled" : ""}${icon ? ' icon aria-label="Add collection"' : ""}>\n  ${icon ? "<IconPlusOutline12 />" : label.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("{", "&#123;")}\n</Button>`;

  return (
    <div className={styles.stack}>
      <div className={styles.buttonPlayground}>
        <Button
          size={size}
          variant={variant}
          disabled={disabled}
          icon={icon}
          aria-label={icon ? "Add collection" : undefined}
          onClick={() => setClicks((count) => count + 1)}
          data-gallery-button
        >
          {icon ? <IconPlusOutline12 /> : label}
        </Button>
        <span className={styles.caption} role="status">
          {clicks
            ? `Clicked ${clicks} ${clicks === 1 ? "time" : "times"}`
            : "Hover, focus, or click to try it"}
        </span>
      </div>
      <section className={styles.properties} aria-label="Button properties">
        <div>
          <span>Size</span>
          <Choice
            label="Button size"
            value={size}
            values={sizes}
            onChange={setSize}
          />
        </div>
        <div>
          <span>Variant</span>
          <Choice
            label="Button variant"
            value={variant}
            values={variants}
            onChange={setVariant}
          />
        </div>
        <div>
          <span>Label</span>
          <Input.Root size="sm">
            <Input.Field
              aria-label="Button label"
              value={label}
              onValueChange={setLabel}
            />
          </Input.Root>
        </div>
        <label className={styles.row} htmlFor={`${id}-disabled`}>
          <Checkbox.Root
            id={`${id}-disabled`}
            checked={disabled}
            onCheckedChange={(value) => setDisabled(value === true)}
          >
            <Checkbox.Indicator />
          </Checkbox.Root>
          Disabled
        </label>
        <label className={styles.row} htmlFor={`${id}-icon`}>
          <Checkbox.Root
            id={`${id}-icon`}
            checked={icon}
            onCheckedChange={(value) => setIcon(value === true)}
          >
            <Checkbox.Indicator />
          </Checkbox.Root>
          Icon only
        </label>
      </section>
      <pre className={styles.snippet}>
        <code>{snippet}</code>
      </pre>
      <div className={styles.inventory}>
        <section className={styles.stack} aria-label="Button sizes">
          <h3 className={styles.label}>Sizes</h3>
          <p className={styles.caption}>Same label and icon at every size.</p>
          <div className={styles.sizeScale}>
            {sizes.map((size) => (
              <section
                key={size}
                className={styles.sizeSample}
                aria-label={size}
              >
                <h4 className={styles.label}>{size}</h4>
                <div className={styles.scaleControl}>
                  <Button size={size}>Continue</Button>
                </div>
                <div className={styles.scaleControl}>
                  <Button size={size} variant="secondary">
                    <IconPlusOutline12 />
                    Create
                  </Button>
                </div>
                <div className={styles.scaleControl}>
                  <Button
                    size={size}
                    variant="secondary"
                    icon
                    aria-label={`Add, ${size}`}
                  >
                    <IconPlusOutline12 />
                  </Button>
                </div>
              </section>
            ))}
          </div>
        </section>
        <section className={styles.stack} aria-label="Button variants">
          <h3 className={styles.label}>Variants</h3>
          <div className={styles.row}>
            {variants.map((variant) => (
              <Button key={variant} variant={variant} size="sm">
                {variant}
              </Button>
            ))}
          </div>
        </section>
        <section className={styles.stack} aria-label="Button states">
          <h3 className={styles.label}>States</h3>
          <div className={styles.row}>
            <Button size="sm">Default</Button>
            <Button size="sm" data-demo-state="hover">
              Hover
            </Button>
            <Button size="sm" data-demo-state="focus">
              Focus
            </Button>
            <Button size="sm" disabled>
              Disabled
            </Button>
            <Button size="sm" icon aria-label="Add">
              <IconPlusOutline12 />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
