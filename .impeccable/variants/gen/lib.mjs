// Shared data + markup helpers for generating Sources-screen variants.

export const SOURCES = [
  {
    id: "twitter",
    name: "Twitter",
    kind: "bookmarks & likes",
    total: "2,381",
    n: 2381,
    today: 4,
    state: "ok",
    last: "18m ago",
    pct: 100,
  },
  {
    id: "cosmos",
    name: "Cosmos",
    kind: "saved elements",
    total: "312",
    n: 312,
    today: 12,
    state: "run",
    last: "now",
    pct: 13,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    kind: "boards & pins",
    total: "1,104",
    n: 1104,
    today: 0,
    state: "warn",
    last: "38m ago",
    pct: 47,
  },
  {
    id: "instagram",
    name: "Instagram",
    kind: "saved posts",
    total: "694",
    n: 694,
    today: 0,
    state: "ok",
    last: "1h ago",
    pct: 29,
  },
  {
    id: "arena",
    name: "Are.na",
    kind: "channels",
    total: "245",
    n: 245,
    today: 0,
    state: "ok",
    last: "2h ago",
    pct: 10,
  },
  {
    id: "tiktok",
    name: "TikTok",
    kind: "favorites",
    total: "188",
    n: 188,
    today: 0,
    state: "ok",
    last: "3h ago",
    pct: 8,
  },
  {
    id: "youtube",
    name: "YouTube",
    kind: "watch later",
    total: "132",
    n: 132,
    today: 0,
    state: "ok",
    last: "5h ago",
    pct: 6,
  },
];

export const STATE_LABEL = {
  ok: (s) => `Synced ${s.last}`,
  run: () => "Syncing · 12 new",
  warn: () => "Rate limited · resumes 1:20",
};

export const ACTIVITY = [
  {
    id: "cosmos",
    name: "Cosmos",
    what: "Incremental sync — 12 items, 3 with video",
    st: "run",
    stLabel: "RUNNING",
    time: "now",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    what: "Incremental sync — stopped by rate limit after 210 items",
    st: "warn",
    stLabel: "BACKED OFF",
    time: "38m ago",
  },
  {
    id: "twitter",
    name: "Twitter",
    what: "Incremental sync — 4 items",
    st: "ok",
    stLabel: "COMPLETED",
    time: "1h ago",
  },
  {
    id: "instagram",
    name: "Instagram",
    what: "Incremental sync — no new items",
    st: "ok",
    stLabel: "COMPLETED",
    time: "1h ago",
  },
  {
    id: "arena",
    name: "Are.na",
    what: "Incremental sync — no new blocks in 4 channels",
    st: "ok",
    stLabel: "COMPLETED",
    time: "2h ago",
  },
  {
    id: "youtube",
    name: "YouTube",
    what: "Metadata refresh — 22 items",
    st: "ok",
    stLabel: "COMPLETED",
    time: "9:31 AM",
  },
];

// Deterministic pseudo-random for tick bars / sparklines.
export function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function chip(id, size = 22, radius = 6) {
  return `<span class="chip" style="width:${size}px;height:${size}px;border-radius:${radius}px"><img src="${id}.svg" alt=""/></span>`;
}

export function spark(color, seed = 3, w = 72, h = 20, rising = true) {
  const rnd = seeded(seed);
  const pts = [];
  for (let i = 0; i <= 11; i++) {
    const x = 1 + (i * (w - 2)) / 11;
    const base = rising ? h - 4 - (i / 11) * (h - 9) : h / 2;
    const y = Math.max(2, Math.min(h - 2, base + (rnd() - 0.5) * 6));
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><path d="M${pts.join(" L")}" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}

export function ticks(seed, n = 30, cls = "") {
  const rnd = seeded(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const v = rnd();
    if (v < 0.28) out += `<i class="z"></i>`;
    else
      out += `<i ${cls && i >= n - 5 ? `class="${cls}"` : ""} style="height:${Math.round(5 + v * 16)}px"></i>`;
  }
  return `<div class="ticks">${out}</div>`;
}

export function area(color, w = 720, h = 120, opacity = 0.12) {
  const rnd = seeded(11);
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const x = (i * w) / 16;
    const y = h - 14 - (i / 16) * (h - 34) + (rnd() - 0.5) * 10;
    pts.push(`${x.toFixed(0)} ${y.toFixed(0)}`);
  }
  const line = `M${pts.join(" L")}`;
  return `<svg class="area" viewBox="0 0 ${w} ${h}" fill="none" preserveAspectRatio="none">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${w} ${h} L0 ${h} Z" fill="url(#ag)"/><path d="${line}" stroke="${color}" stroke-width="1.5"/></svg>`;
}

// Base CSS shared by all variants. Light + dark palettes switched by body class.
export const BASE_CSS = `
* { box-sizing: border-box; margin: 0; }
body { font: 400 13px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
body.light { color: #1a1a1c; background: #fafafa; --ink:#1a1a1c; --ink2:#6b6b70; --ink3:#9b9ba0; --panel:#fff; --line:rgba(0,0,0,.07); --hair:rgba(0,0,0,.055); --hov:rgba(0,0,0,.02);
  --ok:#3c9a52; --okdim:rgba(60,154,82,.12); --warn:#b57e1c; --warndim:rgba(181,126,28,.12); --err:#cf3f3f; --run:#4472d4; --rundim:rgba(68,114,212,.10); }
body.dark { color: #ececee; background: #0c0c0d; --ink:#ececee; --ink2:#8a8a90; --ink3:#5b5b61; --panel:#121214; --line:rgba(255,255,255,.07); --hair:rgba(255,255,255,.05); --hov:rgba(255,255,255,.02);
  --ok:#4ade80; --okdim:rgba(74,222,128,.13); --warn:#fbbf24; --warndim:rgba(251,191,36,.12); --err:#f87171; --run:#7dd3fc; --rundim:rgba(125,211,252,.12); }
.chip { display:inline-block; overflow:hidden; flex:none; box-shadow:0 0 0 1px var(--hair); background:#fff; vertical-align:middle; }
.chip img { display:block; width:100%; height:100%; }
.dot { width:6px; height:6px; border-radius:50%; background:var(--ok); flex:none; }
.dot.run { background:var(--run); } .dot.warn { background:var(--warn); } .dot.err { background:var(--err); }
.badge { display:inline-block; padding:2px 7px; border-radius:5px; font-size:11px; font-weight:600; }
.badge.ok { color:var(--ok); background:var(--okdim); } .badge.warn { color:var(--warn); background:var(--warndim); } .badge.run { color:var(--run); background:var(--rundim); }
.btn { padding:5px 12px; font:inherit; font-size:12.5px; font-weight:550; border:0; border-radius:7px; cursor:pointer; background:var(--panel); color:var(--ink); box-shadow:0 0 0 1px var(--line); }
.btn.primary { background:var(--ink); color:var(--panel); box-shadow:none; }
.panel { background:var(--panel); border-radius:12px; box-shadow:0 0 0 1px var(--hair), 0 1px 3px rgba(0,0,0,.03); }
.ticks { display:flex; gap:2.5px; align-items:flex-end; height:22px; }
.ticks i { flex:1; min-height:4px; background:var(--ok); opacity:.8; border-radius:1.5px; }
.ticks i.z { background:var(--hair); height:4px !important; }
.ticks i.w { background:var(--warn); }
.num { font-variant-numeric: tabular-nums; }
.st { font-size:10.5px; font-weight:700; letter-spacing:.07em; }
.st.ok { color:var(--ok); } .st.warn { color:var(--warn); } .st.err { color:var(--err); } .st.run { color:var(--run); }
`;

export function page({ title, theme = "light", css = "", body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
<style>${BASE_CSS}${css}</style></head>
<body class="${theme}">${body}</body></html>`;
}

export function statusText(s) {
  if (s.state === "run")
    return `<span style="color:var(--run);font-weight:550">Syncing</span> <span style="color:var(--ink3)">· 12 new</span>`;
  if (s.state === "warn")
    return `<span style="color:var(--warn);font-weight:550">Rate limited</span> <span style="color:var(--ink3)">· resumes 1:20</span>`;
  return `Synced <span style="color:var(--ink3)">${s.last}</span>`;
}
