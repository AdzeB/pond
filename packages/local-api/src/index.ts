import type { EnqueueRequest } from "@pond/schema/ingest";
import type { JsonObject, JsonValue } from "@pond/schema/json";
import {
  LocalApiAppInfoSchema,
  LocalApiEnqueueResultSchema,
  LocalApiErrorSchema,
  LocalApiJsonSchema,
  LocalApiLibrarySchema,
  LocalApiOperationPreviewSchema,
  LocalApiOperationSchema,
  LocalApiQueryPageSchema,
  LocalApiSaveSchema,
  LocalApiSwitchResultSchema,
  localApiSuccessSchema,
} from "@pond/schema/local-api";

export type { JsonObject, JsonValue } from "@pond/schema/json";
export type {
  LocalApiCursor,
  LocalApiLibrary,
  LocalApiLibraryQueryRequest,
  LocalApiSave,
  LocalApiSavesGetParams,
} from "@pond/schema/local-api";

import type {
  LocalApiLibraryQueryRequest,
  LocalApiSavesGetParams,
} from "@pond/schema/local-api";

interface Schema<Output> {
  safeParse(
    value: JsonValue,
  ): { success: true; data: Output } | { success: false };
}

interface LocalApiHeaders {
  [key: string]: string;
  "content-type": string;
}

export interface LocalApiThumbnail {
  type: string;
  bytes: Uint8Array;
}

export type LocalApiFailure =
  | "authentication"
  | "connection"
  | "conflict"
  | "internal"
  | "not-found"
  | "response";

export class PondLocalApiError extends Error {
  readonly kind: LocalApiFailure;
  readonly status?: number;

  constructor(message: string, kind: LocalApiFailure, status?: number) {
    super(message);
    this.name = "PondLocalApiError";
    this.kind = kind;
    this.status = status;
  }
}

export interface PondLocalApiOptions {
  baseUrl?: string;
  token?: string | (() => string | Promise<string>);
  fetch?: typeof fetch;
  ensureAvailable?: () => void | Promise<void>;
  allowRemote?: boolean;
}

function endpoint(value: string, allowRemote: boolean): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PondLocalApiError("Enter a valid Local API URL.", "connection");
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "http:" || (!loopback && !allowRemote)) {
    throw new PondLocalApiError(
      "The Local API URL must use loopback HTTP.",
      "connection",
    );
  }
  return url.toString().replace(/\/+$/, "");
}

function failureKind(status: number): LocalApiFailure {
  if (status === 401 || status === 403) return "authentication";
  if (status === 404) return "not-found";
  if (status === 409 || status === 422 || status === 429) return "conflict";
  return status >= 500 ? "internal" : "response";
}

export class PondLocalApi {
  readonly baseUrl: string;
  private readonly token: () => string | Promise<string> | undefined;
  private readonly fetcher: typeof fetch;
  private readonly ensureAvailable?: () => void | Promise<void>;

  constructor(options: PondLocalApiOptions = {}) {
    this.baseUrl = endpoint(
      options.baseUrl ?? "http://127.0.0.1:41610/api/v2",
      options.allowRemote ?? false,
    );
    if (options.token instanceof Function) {
      this.token = options.token;
    } else {
      const token = options.token;
      this.token = () => token;
    }
    this.fetcher = options.fetch ?? fetch;
    this.ensureAvailable = options.ensureAvailable;
  }

  private async authorization(): Promise<string | undefined> {
    const token = await this.token();
    return token ? `Bearer ${token}` : undefined;
  }

  private async send(path: string, init: RequestInit = {}): Promise<Response> {
    await this.ensureAvailable?.();
    const authorization = await this.authorization();
    const headers: LocalApiHeaders = {
      "content-type": "application/json",
    };
    if (authorization) headers.authorization = authorization;
    Object.assign(headers, Object.fromEntries(new Headers(init.headers)));
    try {
      return await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      throw new PondLocalApiError(
        error instanceof Error ? error.message : "Pond is unavailable.",
        "connection",
      );
    }
  }

  private async failure(response: Response): Promise<PondLocalApiError> {
    const decoded = LocalApiJsonSchema.safeParse(
      await response.json().catch(() => null),
    );
    const parsed = LocalApiErrorSchema.safeParse(
      decoded.success ? decoded.data : null,
    );
    const message = parsed.success
      ? Object(parsed.data.error) === parsed.data.error
        ? (JSON.stringify(parsed.data.error) ?? String(parsed.data.error))
        : String(parsed.data.error)
      : `Pond returned ${response.status}.`;
    return new PondLocalApiError(
      message,
      failureKind(response.status),
      response.status,
    );
  }

  async request<Output>(
    path: string,
    schema: Schema<Output>,
    init: RequestInit = {},
  ): Promise<Output> {
    const response = await this.send(path, init);
    if (!response.ok) throw await this.failure(response);
    const decoded = LocalApiJsonSchema.safeParse(
      await response.json().catch(() => null),
    );
    const payload = decoded.success ? decoded.data : null;
    const envelope =
      localApiSuccessSchema(LocalApiJsonSchema).safeParse(payload);
    if (!envelope.success)
      throw new PondLocalApiError(
        "Pond returned an unexpected response.",
        "response",
        response.status,
      );
    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success)
      throw new PondLocalApiError(
        "Pond returned an unexpected response.",
        "response",
        response.status,
      );
    return parsed.data;
  }

  appInfo() {
    return this.request("/app/info", LocalApiAppInfoSchema);
  }

  query(input: LocalApiLibraryQueryRequest) {
    return this.request("/library/query", LocalApiQueryPageSchema, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  saves(input: LocalApiSavesGetParams) {
    return this.request("/saves/get", LocalApiSaveSchema.array(), {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Resolves `null` when the Save has no image cover. */
  async thumbnail(id: string): Promise<LocalApiThumbnail | null> {
    const response = await this.send(
      `/saves/thumb?id=${encodeURIComponent(id)}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) throw await this.failure(response);
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/"))
      throw new PondLocalApiError(
        "Pond returned an unexpected response.",
        "response",
        response.status,
      );
    return { type, bytes: new Uint8Array(await response.arrayBuffer()) };
  }

  enqueue(input: EnqueueRequest) {
    return this.request("/enqueue", LocalApiEnqueueResultSchema, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  libraries() {
    return this.request("/library/recent", LocalApiLibrarySchema.array());
  }

  switchLibrary(path: string) {
    return this.request("/library/switch", LocalApiSwitchResultSchema, {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  }

  operations() {
    return this.request("/operations", LocalApiOperationSchema.array());
  }

  previewOperation(operation: string, args: JsonObject) {
    return this.request("/operations/preview", LocalApiOperationPreviewSchema, {
      method: "POST",
      body: JSON.stringify({ operation, arguments: args }),
    });
  }

  runOperation(operation: string, args: JsonObject, token?: string) {
    return this.request("/operations/run", LocalApiJsonSchema, {
      method: "POST",
      body: JSON.stringify({ operation, arguments: args, token }),
    });
  }
}
