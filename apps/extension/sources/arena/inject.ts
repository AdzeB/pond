import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";

const GRAPHQL_RE = /\/graphql(?:\?|$)/i;
const CONN_RE = /\/v2\/channels\/[^/]+\/connections(?:\?|$|\/)/;
const BLOCK_RE = /\/v2\/channels\/[^/]+\/blocks(?:\?|$|\/)/;

const SAVE_OPERATIONS = new Set([
  "ConnectCreateConnectionMutation",
  "CreateConnectionMutation",
  "ConnectableCreateConnectionMutation",
  "BlockCreateMutation",
  "CreateBlockMutation",
]);

function parseJson(body: string | null): any {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function asOps(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  return [json];
}

function pickSaveOpFromRequest(body: string | null): any {
  const ops = asOps(parseJson(body));
  for (const op of ops) {
    if (!op || typeof op !== "object") continue;
    if (op.operationName && SAVE_OPERATIONS.has(op.operationName)) return op;
    const vars = op.variables;
    if (vars && typeof vars === "object" && vars.connectableId) return op;
  }
  return null;
}

function pickSaveOpFromResponse(json: any): any {
  for (const op of asOps(json)) {
    if (op?.data?.create_connection?.connectable?.id) return op;
  }
  return null;
}

export function inject(): void {
  const emitted = new Set<string>();

  function emitBlock(blockId: string): void {
    if (!blockId || emitted.has(blockId)) return;
    emitted.add(blockId);
    capture(`https://www.are.na/block/${blockId}`, "arena:save");
  }

  function isInteresting(url: string): boolean {
    return GRAPHQL_RE.test(url) || CONN_RE.test(url) || BLOCK_RE.test(url);
  }

  installInterceptor({
    id: "arena",
    match: (req: RequestLens) =>
      req.method === "POST" && isInteresting(req.url),
    async onResponse(req, res) {
      if (!res.ok) return;
      const text = await res.readText();
      if (GRAPHQL_RE.test(req.url)) {
        const requestOp = pickSaveOpFromRequest(await req.readBody());
        const responseOp = pickSaveOpFromResponse(parseJson(text));
        if (!requestOp && !responseOp) return;
        const conn = responseOp?.data?.create_connection;
        const blockId = String(
          conn?.connectable?.id ?? requestOp?.variables?.connectableId ?? "",
        );
        if (blockId) emitBlock(blockId);
        return;
      }
      if (CONN_RE.test(req.url) || BLOCK_RE.test(req.url)) {
        const json = parseJson(text);
        if (!json || typeof json !== "object") return;
        const block = json.block ?? json.connectable ?? (json.id ? json : null);
        if (block?.id) emitBlock(String(block.id));
      }
    },
  });
}
