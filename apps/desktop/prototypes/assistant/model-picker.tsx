import {
  IconChevronDownOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui/button";
import { Combobox } from "@pond/ui/combobox";
import { useState } from "react";
import type { Provider } from "./fixtures";

const models = [
  {
    id: "Minnow",
    name: "Minnow",
    detail: "Local",
    search: "Minnow local on this Mac",
  },
  {
    id: "Anthropic",
    name: "Sonnet 4.5",
    detail: "Anthropic",
    search: "Claude Sonnet 4.5 Anthropic cloud",
  },
  {
    id: "OpenAI",
    name: "GPT-4.1 mini",
    detail: "OpenAI",
    search: "GPT-4.1 mini OpenAI cloud",
  },
] satisfies { id: Provider; name: string; detail: string; search: string }[];

export function ModelPicker({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (provider: Provider) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = models.find((model) => model.id === value) ?? models[0];

  return (
    <Combobox.Root<(typeof models)[number]>
      items={models}
      value={selected}
      onValueChange={(model) => {
        if (model) onChange(model.id);
      }}
      itemToStringLabel={(model) => model.search}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={() => setQuery("")}
      autoHighlight
    >
      <Combobox.Trigger
        render={<Button size="xs" variant="ghost" className="model-trigger" />}
        aria-label={`Choose model, ${selected.name}`}
      >
        <span className="model-trigger-name">{selected.name}</span>
        <IconChevronDownOutline18 />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner side="top" align="start" sideOffset={8}>
          <Combobox.Popup className="assistant-model-picker">
            <div className="model-search">
              <IconMagnifierOutline18 aria-hidden />
              <Combobox.Input
                className="model-search-input"
                aria-label="Search models"
                placeholder="Search models…"
                autoFocus
              />
            </div>
            <Combobox.List className="model-list" aria-label="Models">
              {(model: (typeof models)[number]) => (
                <Combobox.Item
                  className="model-row"
                  key={model.id}
                  value={model}
                >
                  <Combobox.ItemLabel className="model-name">
                    {model.name}
                  </Combobox.ItemLabel>
                  <span
                    className="model-detail"
                    data-local={model.id === "Minnow" || undefined}
                  >
                    {model.detail}
                  </span>
                  <span className="model-check">
                    <Combobox.ItemIndicator />
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
            <Combobox.Empty className="model-empty">
              No models found. Try another name.
            </Combobox.Empty>
            <div className="model-picker-note">
              Cloud models use your API key.
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
