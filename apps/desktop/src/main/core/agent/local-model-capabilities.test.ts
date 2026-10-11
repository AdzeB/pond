import { describe, expect, it } from "vitest";
import { modelCapabilities } from "../../../shared/provider-models";
import { normalizeLocalModel } from "./local-model-capabilities";

describe("local model capabilities", () => {
  it("normalizes capabilities declared by Ollama", () => {
    expect(
      normalizeLocalModel({
        provider: "ollama",
        id: "gemma4:e2b",
        capabilities: [" Completion ", "VISION", " Tools "],
      }),
    ).toMatchObject({
      id: "gemma4:e2b",
      name: "gemma4:e2b",
      modelCapabilities: {
        text: true,
        vision: true,
        audio: false,
        tools: true,
      },
    });
  });

  it("defaults an unknown local model to text only without reading its name", () => {
    expect(
      normalizeLocalModel({ provider: "ollama", id: "vision-in-the-name" }),
    ).toMatchObject({
      modelCapabilities: {
        text: true,
        vision: false,
        audio: false,
        tools: false,
      },
    });
  });

  it("normalizes capability metadata declared by LM Studio", () => {
    expect(
      normalizeLocalModel({
        provider: "lmstudio",
        id: "local/model",
        name: "Local Model",
        capabilities: {
          vision: true,
          audio: true,
          trainedForToolUse: true,
        },
      }),
    ).toEqual({
      id: "local/model",
      name: "Local Model",
      modelCapabilities: {
        text: true,
        vision: true,
        audio: true,
        tools: true,
      },
    });
  });

  it("provides conservative defaults through the shared schema", () => {
    expect(modelCapabilities.parse({})).toEqual({
      text: true,
      vision: false,
      audio: false,
      tools: false,
    });
  });
});
