import log from "electron-log/main.js";
import { getAiApiKey } from "../../keychain";
import {
  buildSummaryPrompt,
  buildSystemPrompt,
  formatSummaryItems,
  queryJsonSchema,
} from "./schema-prompt";
import type { AiProvider, CompileContext, SummaryItem } from "./types";

// Local HTTP LLM providers. Ollama uses its native /api/chat with structured
// `format`; LM Studio and custom endpoints use the OpenAI-compatible
// /v1/chat/completions. Both run entirely on the user's machine (or wherever
// they point `endpoint`); responses are parsed leniently and re-validated downstream.

export type HttpProviderKind = "ollama" | "lmstudio" | "custom";

interface HttpProviderConfig {
  kind: HttpProviderKind;
  endpoint: string;
  model: string;
}

const DEFAULT_ENDPOINTS: Record<HttpProviderKind, string> = {
  ollama: "http://127.0.0.1:11434",
  lmstudio: "http://127.0.0.1:1234",
  custom: "",
};

const DEFAULT_MODELS: Record<HttpProviderKind, string> = {
  ollama: "llama3.2:1b",
  lmstudio: "local-model",
  custom: "local-model",
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

// Pull the first JSON object out of a model response that may include prose or
// markdown fences despite our instructions.
function extractJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to brace extraction
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export class HttpProvider implements AiProvider {
  readonly id: string;
  private readonly config: HttpProviderConfig;

  constructor(
    config: Partial<HttpProviderConfig> & { kind: HttpProviderKind },
  ) {
    this.config = {
      kind: config.kind,
      endpoint: stripTrailingSlash(
        config.endpoint && config.endpoint.trim().length > 0
          ? config.endpoint
          : DEFAULT_ENDPOINTS[config.kind],
      ),
      model:
        config.model && config.model.trim().length > 0
          ? config.model
          : DEFAULT_MODELS[config.kind],
    };
    this.id = config.kind;
  }

  async available(): Promise<boolean> {
    if (!this.config.endpoint) return false;
    try {
      const res = await fetch(this.config.endpoint, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return res.ok || res.status === 404; // reachable host is enough
    } catch {
      return false;
    }
  }

  async compileQuery(input: string, ctx: CompileContext): Promise<unknown> {
    if (!this.config.endpoint) {
      throw new Error(`${this.id}: no endpoint configured`);
    }
    const system = buildSystemPrompt(ctx);
    const content =
      this.config.kind === "ollama"
        ? await this.callOllama(system, input)
        : await this.callOpenAiCompatible(system, input);
    const parsed = extractJson(content);
    if (parsed == null) {
      log.warn(
        `[ai/${this.id}] could not parse model output`,
        content.slice(0, 200),
      );
    }
    return parsed;
  }

  async summarize(question: string, items: SummaryItem[]): Promise<string> {
    if (!this.config.endpoint) {
      throw new Error(`${this.id}: no endpoint configured`);
    }
    if (items.length === 0) return "";
    const system = buildSummaryPrompt();
    const user = formatSummaryItems(question, items);
    const content =
      this.config.kind === "ollama"
        ? await this.callOllamaText(system, user)
        : await this.callOpenAiText(system, user);
    return content.trim();
  }

  private async callOllama(system: string, input: string): Promise<string> {
    const res = await fetch(`${this.config.endpoint}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.config.model,
        stream: false,
        format: queryJsonSchema(),
        options: { temperature: 0 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`ollama ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }

  // Plain-text completion (no structured `format`), used by the summarizer.
  private async callOllamaText(system: string, input: string): Promise<string> {
    const res = await fetch(`${this.config.endpoint}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.config.model,
        stream: false,
        options: { temperature: 0.3 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`ollama ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }

  private async callOpenAiCompatible(
    system: string,
    input: string,
  ): Promise<string> {
    const apiKey = await getAiApiKey().catch(() => null);
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const res = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`${this.id} ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  // Plain-text completion (no `response_format`), used by the summarizer.
  private async callOpenAiText(system: string, input: string): Promise<string> {
    const apiKey = await getAiApiKey().catch(() => null);
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const res = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`${this.id} ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? "";
  }
}
