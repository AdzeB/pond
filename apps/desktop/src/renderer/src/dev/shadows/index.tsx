import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  themeCssVars,
} from "@pond/schema/db";
import sourceCss from "@pond/theme/shadow/shadow.css?raw";
import { Button, Checkbox, Input, Select, Slider } from "@pond/ui";
import { clsx as cn } from "clsx";
import { type CSSProperties, useId, useMemo, useState } from "react";
import {
  defaultLayer,
  parseShadowFile,
  parseToken,
  ringBorderColor,
  ringLayer,
  type ShadowColor,
  type ShadowLayer,
  type ShadowToken,
  serializeShadowFile,
  serializeValue,
} from "./parse";
import styles from "./styles.module.css";

const SCHEMES = ["light", "dark"] as const;
const INITIAL = parseShadowFile(sourceCss);

function themeStyle(scheme: (typeof SCHEMES)[number]): CSSProperties {
  const theme = scheme === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  const vars = themeCssVars(theme);
  const bg = `oklch(${vars.bgL} ${vars.bgC} ${vars.bgH})`;
  const fg = `oklch(${vars.fgL} ${vars.fgC} ${vars.fgH})`;
  /** React forwards CSS custom properties to the element style. */
  return {
    colorScheme: scheme,
    "--ds-bg-l": String(vars.bgL),
    "--ds-bg-c": String(vars.bgC),
    "--ds-bg-h": String(vars.bgH),
    "--ds-fg-l": String(vars.fgL),
    "--ds-fg-c": String(vars.fgC),
    "--ds-fg-h": String(vars.fgH),
    "--ds-accent-l": String(vars.accentL),
    "--ds-accent-c": String(vars.accentC),
    "--ds-accent-h": String(vars.accentH),
    "--ds-contrast": String(vars.contrast),
    "--ds-bg": bg,
    "--ds-fg": fg,
    "--ds-gray-1": bg,
    "--ds-gray-2": `color-mix(in oklch, ${fg} 8%, ${bg})`,
    "--ds-gray-4": `color-mix(in oklch, ${fg} 18%, ${bg})`,
    "--ds-gray-6": `color-mix(in oklch, ${fg} 32%, ${bg})`,
    "--ds-gray-10": `color-mix(in oklch, ${fg} 62%, ${bg})`,
    "--ds-gray-11": `color-mix(in oklch, ${fg} 78%, ${bg})`,
    "--ds-gray-12": fg,
  } as CSSProperties;
}

function shadowVars(tokens: ShadowToken[]): CSSProperties {
  // SAFETY: token names are --ds-shadow-* custom properties.
  return Object.fromEntries(
    tokens.map((token) => [token.name, serializeValue(token)]),
  ) as CSSProperties;
}

function usedBy(tokens: ShadowToken[], name: string): string[] {
  return tokens
    .filter((token) => token.alias === name)
    .map((token) => token.name);
}

function shortName(name: string): string {
  return name.replace("--ds-shadow-", "");
}

function cloneToken(token: ShadowToken): ShadowToken {
  return {
    ...token,
    layers: token.layers.map((layer) => ({
      ...layer,
      light: { ...layer.light },
      dark: { ...layer.dark },
    })),
  };
}

function colorCss(color: ShadowColor): string {
  return `oklch(${color.l} ${color.c} ${color.h} / ${color.a})`;
}

function cardSurface(token: ShadowToken, tokens: ShadowToken[]): CSSProperties {
  if (token.name === "--ds-shadow-inset") {
    return { boxShadow: `var(${token.name})` };
  }
  const ringToken = tokens.find((item) => item.name === "--ds-shadow-ring");
  const ring =
    token.name === "--ds-shadow-ring"
      ? (ringLayer(token) ?? token.layers[0])
      : (ringLayer(ringToken ?? token) ?? ringToken?.layers[0]);
  const borderColor = ring ? ringBorderColor(ring) : "var(--ds-shadow-ring)";
  /** Custom properties and border paint are valid inline style keys. */
  return {
    borderWidth: ring?.spread ?? 1,
    borderStyle: "solid",
    borderColor,
    backgroundClip: "padding-box",
    boxShadow:
      token.name === "--ds-shadow-ring" ? "none" : `var(${token.name})`,
  } as CSSProperties;
}

export function ShadowsGallery({
  layout = "embed",
}: {
  layout?: "embed" | "page";
}) {
  const [tokens, setTokens] = useState(INITIAL);
  const [selected, setSelected] = useState(
    INITIAL[0]?.name ?? "--ds-shadow-ring",
  );
  const [copyStatus, setCopyStatus] = useState("");
  const selectedToken =
    tokens.find((token) => token.name === selected) ?? tokens[0];
  const css = useMemo(() => serializeShadowFile(tokens), [tokens]);
  const authored = tokens
    .filter((token) => token.alias === null)
    .map((token) => token.name);

  function update(name: string, next: ShadowToken) {
    setTokens((current) =>
      current.map((token) => (token.name === name ? next : token)),
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(css);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Couldn't copy. Select the CSS to copy it manually.");
    }
  }

  return (
    <div
      className={cn(styles.root, layout === "page" && styles.page)}
      data-layout={layout}
      style={shadowVars(tokens)}
    >
      {layout === "page" ? <h1 className={styles.heading}>Shadows</h1> : null}
      <div className={styles.toolbar}>
        <p className={styles.note}>
          Hairline is a 1px inner border with padding-box clip. Depth shadows
          use -1px spread so they tuck under it.
        </p>
        <div className={styles.actions}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setTokens(INITIAL);
              setCopyStatus("");
            }}
          >
            Reset
          </Button>
          <Button size="sm" onClick={() => void copy()}>
            Copy CSS
          </Button>
        </div>
      </div>
      {copyStatus ? (
        <p className={styles.status} role="status">
          {copyStatus}
        </p>
      ) : null}
      <div className={styles.boards}>
        {SCHEMES.map((scheme) => (
          <section
            key={scheme}
            className={styles.pane}
            data-scheme={scheme}
            style={themeStyle(scheme)}
          >
            <h2 className={styles.scheme}>
              {scheme === "light" ? "Light" : "Dark"}
            </h2>
            <div className={styles.grid}>
              {tokens.map((token) => (
                <button
                  key={`${scheme}-${token.name}`}
                  type="button"
                  className={styles.card}
                  data-selected={token.name === selected || undefined}
                  data-inset={token.name === "--ds-shadow-inset" || undefined}
                  data-edge={
                    token.name === "--ds-shadow-inset" ? undefined : "border"
                  }
                  style={cardSurface(token, tokens)}
                  aria-pressed={token.name === selected}
                  onClick={() => setSelected(token.name)}
                >
                  <span className={styles.token}>{shortName(token.name)}</span>
                  {token.alias ? (
                    <span className={styles.alias}>
                      {shortName(token.alias)}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {selectedToken ? (
        <Editor
          token={selectedToken}
          source={
            selectedToken.alias
              ? tokens.find((token) => token.name === selectedToken.alias)
              : undefined
          }
          aliases={usedBy(tokens, selectedToken.name)}
          authored={authored}
          onChange={(next) => update(selectedToken.name, next)}
        />
      ) : null}
      <section className={styles.output} aria-label="Generated CSS">
        <h2>CSS</h2>
        <Input.Root>
          <Input.Textarea
            aria-label="Generated shadow CSS"
            rows={16}
            value={css}
            readOnly
          />
        </Input.Root>
      </section>
    </div>
  );
}

function Editor({
  token,
  source,
  aliases,
  authored,
  onChange,
}: {
  token: ShadowToken;
  source?: ShadowToken;
  aliases: string[];
  authored: string[];
  onChange: (token: ShadowToken) => void;
}) {
  const aliasItems = authored
    .filter((name) => name !== token.name)
    .map((name) => ({ value: name, label: name }));

  function setLayer(index: number, layer: ShadowLayer) {
    const next = cloneToken(token);
    next.layers[index] = layer;
    next.alias = null;
    next.raw = serializeValue(next);
    onChange(next);
  }

  const valueId = useId();
  return (
    <section className={styles.editor} aria-label={`${token.name} editor`}>
      <header className={styles.editorHeader}>
        <div>
          <h2>
            <code>{token.name}</code>
          </h2>
          {aliases.length ? (
            <p className={styles.meta}>
              Also used by {aliases.map(shortName).join(", ")}.
            </p>
          ) : null}
        </div>
        {token.alias ? (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => {
              onChange({
                ...token,
                alias: null,
                layers: source ? cloneToken(source).layers : [defaultLayer()],
                raw: source ? serializeValue(source) : token.raw,
              });
            }}
          >
            Unlink
          </Button>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            onClick={() =>
              onChange({
                ...token,
                layers: [...token.layers, defaultLayer()],
                alias: null,
              })
            }
          >
            Add Layer
          </Button>
        )}
      </header>
      {token.alias ? (
        <div className={styles.aliasRow}>
          <Select.Root
            items={aliasItems}
            value={token.alias}
            onValueChange={(next) => {
              if (next === null) return;
              onChange({
                ...token,
                alias: next,
                layers: [],
                raw: `var(${next})`,
              });
            }}
          >
            <Select.Trigger size="sm" aria-label="Alias of">
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner align="start">
                <Select.Popup>
                  <Select.Items items={aliasItems} />
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <p className={styles.meta}>
            This token follows another shadow. Unlink it to edit layers.
          </p>
        </div>
      ) : (
        <div className={styles.layers}>
          {token.layers.map((layer, index) => (
            <LayerEditor
              key={layer.id}
              index={index}
              layer={layer}
              canRemove={token.layers.length > 1}
              onChange={(next) => setLayer(index, next)}
              onRemove={() => {
                const next = cloneToken(token);
                next.layers.splice(index, 1);
                next.raw = serializeValue(next);
                onChange(next);
              }}
            />
          ))}
        </div>
      )}
      <div className={styles.raw}>
        <label htmlFor={valueId}>Value</label>
        <Input.Root>
          <Input.Textarea
            id={valueId}
            aria-label={`${token.name} CSS value`}
            rows={4}
            value={serializeValue(token)}
            onValueChange={(value) => onChange(parseToken(token.name, value))}
          />
        </Input.Root>
      </div>
    </section>
  );
}

function LayerEditor({
  index,
  layer,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  layer: ShadowLayer;
  canRemove: boolean;
  onChange: (layer: ShadowLayer) => void;
  onRemove: () => void;
}) {
  const insetId = `inset-${index}`;
  return (
    <div className={styles.layer}>
      <header className={styles.layerHeader}>
        <h3>Layer {index + 1}</h3>
        {canRemove ? (
          <Button size="xs" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </header>
      <div className={styles.metrics}>
        <NumberField
          label="X"
          value={layer.x}
          onChange={(x) => onChange({ ...layer, x })}
        />
        <NumberField
          label="Y"
          value={layer.y}
          onChange={(y) => onChange({ ...layer, y })}
        />
        <NumberField
          label="Blur"
          value={layer.blur}
          min={0}
          onChange={(blur) => onChange({ ...layer, blur })}
        />
        <NumberField
          label="Spread"
          value={layer.spread}
          onChange={(spread) => onChange({ ...layer, spread })}
        />
        <label className={styles.inset} htmlFor={insetId}>
          <Checkbox.Root
            id={insetId}
            checked={layer.inset}
            onCheckedChange={(value) =>
              onChange({ ...layer, inset: value === true })
            }
          >
            <Checkbox.Indicator />
          </Checkbox.Root>
          Inset
        </label>
      </div>
      <div className={styles.colors}>
        <ColorEditor
          label="Light"
          color={layer.light}
          onChange={(light) => onChange({ ...layer, light })}
        />
        <ColorEditor
          label="Dark"
          color={layer.dark}
          onChange={(dark) => onChange({ ...layer, dark })}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <Input.Root size="sm">
        <Input.Field
          id={id}
          type="number"
          step={1}
          min={min}
          aria-label={label}
          value={String(value)}
          onChange={(event) => {
            const next = Number(event.currentTarget.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
      </Input.Root>
    </div>
  );
}

function ColorEditor({
  label,
  color,
  onChange,
}: {
  label: string;
  color: ShadowColor;
  onChange: (color: ShadowColor) => void;
}) {
  return (
    <div className={styles.color}>
      <div className={styles.colorHead}>
        <span
          className={styles.swatch}
          style={{ background: colorCss(color) }}
        />
        <span>{label}</span>
      </div>
      <ChannelSlider
        name={label}
        label="Lightness"
        value={color.l}
        onChange={(l) => onChange({ ...color, l })}
      />
      <ChannelSlider
        name={label}
        label="Alpha"
        value={color.a}
        onChange={(a) => onChange({ ...color, a })}
      />
    </div>
  );
}

function ChannelSlider({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Slider.Root
      min={0}
      max={1}
      step={0.01}
      value={value}
      onValueChange={(next) => {
        const n = Array.isArray(next) ? (next[0] ?? 0) : next;
        onChange(n);
      }}
    >
      <Slider.Label>{label}</Slider.Label>
      <Slider.Control>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb aria-label={`${name} ${label}`} />
        </Slider.Track>
      </Slider.Control>
      <Slider.Value />
    </Slider.Root>
  );
}
