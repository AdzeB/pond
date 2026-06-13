import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";

const GRAPHQL_HOST_RE = /(^|\.)api\.cosmos\.so$/i;
const SAVE_OP = "EditElementsConnectionsToClusters";

function isCosmosGraphql(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, location.href);
    return GRAPHQL_HOST_RE.test(u.hostname) && u.pathname === "/graphql";
  } catch {
    return false;
  }
}

function readJson(text: string | null): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function opFromUrl(url: string): string | null {
  try {
    return new URL(url, location.href).searchParams.get("q");
  } catch {
    return null;
  }
}

export function inject(): void {
  const emitted = new Set<string>();

  function emitElement(id: string): void {
    if (!id || emitted.has(id)) return;
    emitted.add(id);
    capture(`https://www.cosmos.so/e/${id}`, "cosmos:save");
  }

  installInterceptor({
    id: "cosmos",
    match: (req: RequestLens) => isCosmosGraphql(req.url),
    async onResponse(req, res) {
      if (!res.ok || req.method !== "POST") return;
      const json = readJson(await res.readText());
      if (!json) return;
      const reqBody = readJson(await req.readBody());
      const opName = opFromUrl(req.url) ?? reqBody?.operationName;
      if (
        opName !== SAVE_OP ||
        !json?.data?.element?.editElementsConnectionsToClusters?.success
      ) {
        return;
      }
      const variables = reqBody?.variables ?? {};
      const ids = Array.isArray(variables.elementIds)
        ? variables.elementIds
        : [];
      const adding = Array.isArray(variables.clusterIdsToConnect)
        ? variables.clusterIdsToConnect
        : [];
      if (ids.length === 0 || adding.length === 0) return;
      for (const id of ids) emitElement(String(id));
    },
  });
}
