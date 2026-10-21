import type { EnqueueRequest } from "@pond/schema/ingest";
import type { JsonObject, JsonValue } from "@pond/schema/json";
import {
  ApiAppInfoSchema,
  ApiEnqueueResultSchema,
  ApiErrorBodySchema,
  ApiErrorSchema,
  ApiJsonSchema,
  ApiLibrarySchema,
  ApiOperationPreviewSchema,
  ApiOperationSchema,
  ApiQueryPageSchema,
  ApiSaveSchema,
  ApiSwitchResultSchema,
  apiSuccessSchema,
} from "@pond/schema/api";

export type { JsonObject, JsonValue } from "@pond/schema/json";
export type {
  ApiAppInfo,
  ApiCursor,
  ApiErrorCode,
  ApiLibrary,
  ApiLibraryQueryRequest,
  ApiSave,
  ApiSavesGetParams,
} from "@pond/schema/api";
export {
  API_ERROR_CODES,
  API_VERSION,
} from "@pond/schema/api";

import type {
  ApiLibraryQueryRequest,
  ApiSavesGetParams,
} from "@pond/schema/api";

interface Schema<Output> {
  safeParse(
    value: JsonValue,
  ): { success: true; data: Output } | { success: false };
}

interface ApiHeaders {
  [key: string]: string;
  "content-type": string;
}

export interface ApiThumbnail {
  type: string;
  bytes: Uint8Array;
}

export type ApiFailure =
  | "authentication"
  | "connection"
  | "conflict"
  | "internal"
  | "invalid"
  | "not-found"
  | "response";

export class PondApiError extends Error {
  readonly kind: ApiFailure;
  readonly status?: number;
  /** Stable machine-readable reason. Absent for connection failures and Pond before 2.1. */
  readonly code?: string;

  constructor(
    message: string,
    kind: ApiFailure,
    status?: number,
    code?: string,
  ) {
    super(message);
    this.name = "PondApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export interface PondApiOptions {
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
    throw new PondApiError("Enter a valid Local API URL.", "connection");
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "http:" || (!loopback && !allowRemote)) {
    throw new PondApiError(
      "The Local API URL must use loopback HTTP.",
      "connection",
    );
  }
  return url.toString().replace(/\/+$/, "");
}

function failureKind(status: number, code?: string): ApiFailure {
  if (code === "invalid_json" || code === "invalid_request") return "invalid";
  if (status === 401 || status === 403) return "authentication";
  if (status === 404) return "not-found";
  if (status === 409 || status === 422 || status === 429) return "conflict";
  return status >= 500 ? "internal" : "response";
}

export class PondApi {
  readonly baseUrl: string;
  private readonly token: () => string | Promise<string> | undefined;
  private readonly fetcher: typeof fetch;
  private readonly ensureAvailable?: () => void | Promise<void>;

  constructor(options: PondApiOptions = {}) {
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
    const headers: ApiHeaders = {
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
      throw new PondApiError(
        error instanceof Error ? error.message : "Pond is unavailable.",
        "connection",
      );
    }
  }

  private async failure(response: Response): Promise<PondApiError> {
    const decoded = ApiJsonSchema.safeParse(
      await response.json().catch(() => null),
    );
    const parsed = ApiErrorSchema.safeParse(
      decoded.success ? decoded.data : null,
    );
    const body = ApiErrorBodySchema.safeParse(
      parsed.success ? parsed.data.error : null,
    );
    if (body.success)
      return new PondApiError(
        body.data.message,
        failureKind(response.status, body.data.code),
        response.status,
        body.data.code,
      );
    const message = parsed.success
      ? Object(parsed.data.error) === parsed.data.error
        ? (JSON.stringify(parsed.data.error) ?? String(parsed.data.error))
        : String(parsed.data.error)
      : `Pond returned ${response.status}.`;
    return new PondApiError(
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
    const decoded = ApiJsonSchema.safeParse(
      await response.json().catch(() => null),
    );
    const payload = decoded.success ? decoded.data : null;
    const envelope =
      apiSuccessSchema(ApiJsonSchema).safeParse(payload);
    if (!envelope.success)
      throw new PondApiError(
        "Pond returned an unexpected response.",
        "response",
        response.status,
      );
    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success)
      throw new PondApiError(
        "Pond returned an unexpected response.",
        "response",
        response.status,
      );
    return parsed.data;
  }

  appInfo() {
    return this.request("/app/info", ApiAppInfoSchema);
  }

  query(input: ApiLibraryQueryRequest) {
    return this.request("/library/query", ApiQueryPageSchema, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  saves(input: ApiSavesGetParams) {
    return this.request("/saves/get", ApiSaveSchema.array(), {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Resolves `null` when the Save has no image cover. */
  async thumbnail(id: string): Promise<ApiThumbnail | null> {
    const response = await this.send(
      `/saves/thumb?id=${encodeURIComponent(id)}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) throw await this.failure(response);
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/"))
      throw new PondApiError(
        "Pond returned an unexpected response.",
        "response",
        response.status,
      );
    return { type, bytes: new Uint8Array(await response.arrayBuffer()) };
  }

  enqueue(input: EnqueueRequest) {
    return this.request("/enqueue", ApiEnqueueResultSchema, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  libraries() {
    return this.request("/library/recent", ApiLibrarySchema.array());
  }

  switchLibrary(path: string) {
    return this.request("/library/switch", ApiSwitchResultSchema, {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  }

  operations() {
    return this.request("/operations", ApiOperationSchema.array());
  }

  previewOperation(operation: string, args: JsonObject) {
    return this.request("/operations/preview", ApiOperationPreviewSchema, {
      method: "POST",
      body: JSON.stringify({ operation, arguments: args }),
    });
  }

  runOperation(operation: string, args: JsonObject, token?: string) {
    return this.request("/operations/run", ApiJsonSchema, {
      method: "POST",
      body: JSON.stringify({ operation, arguments: args, token }),
    });
  }
}
