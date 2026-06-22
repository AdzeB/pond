import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";
import { app } from "electron";
import log from "electron-log/main.js";
import {
  buildSummaryPrompt,
  buildSystemPrompt,
  formatSummaryItems,
  queryJsonSchema,
} from "./schema-prompt";
import type { AiProvider, CompileContext, SummaryItem } from "./types";

// Bundled, fully-offline LLM provider using node-llama-cpp (Metal/CUDA via
// llama.cpp). The native dependency is loaded through a computed dynamic import
// so the app builds and runs even when it isn't installed; in that case the
// provider reports unavailable and the compiler falls back to the deterministic
// stages. The GGUF model is downloaded to userData on first use, not bundled,
// to keep the installer small.

// Small, permissively-licensed instruct model that's good at structured output.
const MODEL_FILE = "Llama-3.2-1B-Instruct-Q4_K_M.gguf";
const MODEL_URL =
  "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf";

// node-llama-cpp is optional and loaded at runtime; keep it untyped.
// biome-ignore lint/suspicious/noExplicitAny: optional native module
type LlamaModule = any;

let modulePromise: Promise<LlamaModule | null> | null = null;

async function loadModule(): Promise<LlamaModule | null> {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        // Computed specifier so bundlers don't try to resolve the optional dep.
        const specifier = ["node", "llama", "cpp"].join("-");
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

  async compileQuery(input: string, ctx: CompileContext): Promise<unknown> {
    const { mod, session } = await this.ensureSession();
    const grammar = await mod
      .getLlama()
      .then((l: LlamaModule) =>
        l.createGrammarForJsonSchema
          ? l.createGrammarForJsonSchema(queryJsonSchema())
          : undefined,
      );
    const system = buildSystemPrompt(ctx);
    // biome-ignore lint/suspicious/noExplicitAny: native session
    const s = session as any;
    const prompt = `${system}\n\nUser request: ${input}\n\nJSON:`;
    const answer: string = await s.prompt(prompt, {
      grammar,
      temperature: 0,
      maxTokens: 512,
    });
    try {
      return grammar?.parse ? grammar.parse(answer) : JSON.parse(answer);
    } catch {
      const start = answer.indexOf("{");
      const end = answer.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(answer.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async summarize(question: string, items: SummaryItem[]): Promise<string> {
    if (items.length === 0) return "";
    const { session } = await this.ensureSession();
    const system = buildSummaryPrompt();
    const user = formatSummaryItems(question, items);
    // biome-ignore lint/suspicious/noExplicitAny: native session
    const s = session as any;
    // Drop any prior compile turns so prose isn't biased toward JSON output.
    s.resetChatHistory?.();
    const answer: string = await s.prompt(`${system}\n\n${user}\n\nSummary:`, {
      temperature: 0.3,
      maxTokens: 200,
    });
    return String(answer).trim();
  }
}
