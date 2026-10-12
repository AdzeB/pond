/** Serves the stage bundle on `stage://` and fixture media on `pond://`, like the app's own protocol. */
const { protocol, net } = require("electron");
const { pathToFileURL } = require("node:url");
const { join, resolve, normalize } = require("node:path");

const root = resolve(__dirname, "../../.tmp/launch-video");
const dist = join(root, "dist");
const fixtures = join(root, "fixtures");

function serve(base, path) {
  const file = normalize(join(base, path));
  if (!file.startsWith(base)) return new Response("forbidden", { status: 403 });
  return net.fetch(pathToFileURL(file).toString());
}

function registerSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "stage",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
    {
      scheme: "pond",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

function handleSchemes() {
  protocol.handle("stage", (request) => {
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (path.startsWith("/fixtures/"))
      return serve(fixtures, path.slice("/fixtures/".length));
    return serve(dist, path);
  });
  protocol.handle("pond", (request) => {
    const url = new URL(request.url);
    return serve(
      join(fixtures, "media", url.hostname.toUpperCase()),
      decodeURIComponent(url.pathname),
    );
  });
}

module.exports = { registerSchemes, handleSchemes, root };
