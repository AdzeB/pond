import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";
import type { JsonValue } from "@pond/schema/json";
import type { RawQueryPlan } from "@pond/schema/query-plan";
import { parseQueryPlan } from "@pond/schema/query-plan";
import { app } from "electron";
import log from "electron-log/main.js";
import { buildSystemPrompt, queryJsonSchema } from "./schema-prompt";
import type { AiProvider, CompileContext } from "./types";

/** Small, permissively-licensed instruct model that's good at structured output. */
const MODEL_FILE = "Llama-3.2-1B-Instruct-Q4_K_M.gguf";
const MODEL_URL =
  "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf";

// biome-ignore lint/suspicious/noExplicitAny: optional native module
type LlamaModule = any;

let modulePromise: Promise<LlamaModule | null> | null = null;

async function loadModule(): Promise<LlamaModule | null> {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        const specifier = ["node", "llama", "cpp"].join("-");
        // SAFETY: node-llama-cpp is an optional dependency with no bundled types; every
        // call through this handle is behind `available()`.
        const mod = (await import(specifier)) as LlamaModule;
        return mod;
      } catch (err) {
        log.warn("[ai/bundled] node-llama-cpp not installed", err);
        return null;
      }
    })();
  }
  return modulePromise;
}

function modelDir(): string {
  return join(app.getPath("userData"), "models");
}

function modelPath(): string {
  return join(modelDir(), MODEL_FILE);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

let downloadInflight: Promise<void> | null = null;

async function ensureModel(): Promise<string> {
  const path = modelPath();
  if (await fileExists(path)) return path;
  if (!downloadInflight) {
    downloadInflight = (async () => {
      await mkdir(modelDir(), { recursive: true });
      log.info("[ai/bundled] downloading model", MODEL_URL);
      const res = await fetch(MODEL_URL);
      if (!res.ok || !res.body) {
        throw new Error(`model download failed: ${res.status}`);
      }
      const tmp = `${path}.part`;
      await streamPipeline(
        // SAFETY: `res.body` is non-null (checked above) and node's `fromWeb` wants its own
        // ReadableStream nominal type, not the DOM one this fetch returns.
        Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
        createWriteStream(tmp),
      );
      const { rename } = await import("node:fs/promises");
      await rename(tmp, path);
      log.info("[ai/bundled] model ready", path);
    })().finally(() => {
      downloadInflight = null;
    });
  }
  await downloadInflight;
  return path;
}

export class LlamaCppProvider implements AiProvider {
  readonly id = "bundled";
  // biome-ignore lint/suspicious/noExplicitAny: native session handle
  private session: any = null;
  // biome-ignore lint/suspicious/noExplicitAny: native model handle
  private model: any = null;

  async available(): Promise<boolean> {
    return (await loadModule()) != null;
  }

  private async ensureSession(): Promise<{
    mod: LlamaModule;
    session: unknown;
  }> {
    const mod = await loadModule();
    if (!mod) throw new Error("node-llama-cpp not installed");
    if (!this.session) {
      const path = await ensureModel();
      const llama = await mod.getLlama();
      this.model = await llama.loadModel({ modelPath: path });
      const context = await this.model.createContext();
      this.session = new mod.LlamaChatSession({
        contextSequence: context.getSequence(),
      });
    }
    return { mod, session: this.session };
  }

  async compilePlan(
    input: string,
    ctx: CompileContext,
  ): Promise<RawQueryPlan | null> {
    const { mod, session } = await this.ensureSession();
    const grammar = await mod
      .getLlama()
      .then((l: LlamaModule) =>
        l.createGrammarForJsonSchema
          ? l.createGrammarForJsonSchema(queryJsonSchema())
          : undefined,
      );
    const system = buildSystemPrompt(ctx);
    // SAFETY: the session comes from the untyped optional module above.
    // biome-ignore lint/suspicious/noExplicitAny: native session
    const s = session as any;
    s.resetChatHistory?.();
    const prompt = `${system}\n\nUser request: ${input}\n\nJSON:`;
    const answer: string = await s.prompt(prompt, {
      grammar,
      temperature: 0,
      maxTokens: 512,
    });
    const direct = grammar?.parse
      ? tryPlan(() => grammar.parse(answer))
      : tryPlan(() => JSON.parse(answer));
    if (direct) return direct;

    const start = answer.indexOf("{");
    const end = answer.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return tryPlan(() => JSON.parse(answer.slice(start, end + 1)));
  }
}

function tryPlan(read: () => JsonValue): RawQueryPlan | null {
  try {
    return parseQueryPlan({ filter: read() });
  } catch {
    return null;
  }
}
