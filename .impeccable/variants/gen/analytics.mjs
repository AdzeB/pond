// Generates 10 compact Analytics-page variations (an01–an10).
// Run: node .impeccable/variants/gen/analytics.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { area, chip, page, seeded, spark, ticks } from "./lib.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- shared analytics fixture data ---------- */

const KPIS = [
  { label: "Items synced", value: "1,284", sub: "last 7 days" },
  { label: "Runs", value: "96", sub: "last 7 days" },
  { label: "Success rate", value: "94%", sub: "90 of 96" },
  { label: "Avg duration", value: "42s", sub: "per run" },
  { label: "Storage", value: "4.2 GB", sub: "library folder" },
  { label: "Active now", value: "1", sub: "Cosmos syncing" },
];

const TOP_ITEMS = [
  { id: "twitter", label: "Twitter", v: 412 },
  { id: "pinterest", label: "Pinterest", v: 288 },
  { id: "instagram", label: "Instagram", v: 154 },
  { id: "cosmos", label: "Cosmos", v: 121 },
  { id: "arena", label: "Are.na", v: 58 },
  { id: "tiktok", label: "TikTok", v: 31 },
];

const RUNS_BY_SOURCE = [
  { id: "twitter", label: "Twitter", v: 28 },
  { id: "pinterest", label: "Pinterest", v: 22 },
  { id: "instagram", label: "Instagram", v: 16 },
  { id: "cosmos", label: "Cosmos", v: 12 },
  { id: "arena", label: "Are.na", v: 9 },
  { id: "youtube", label: "YouTube", v: 9 },
];

const OUTCOMES = [
  { label: "Completed", v: 71, st: "ok" },
  { label: "No new items", v: 14, st: "" },
  { label: "Rate limited", v: 8, st: "warn" },
  { label: "Failed", v: 3, st: "err" },
];

const TRIGGERS = [
  { label: "Scheduled", v: 64 },
  { label: "App launch", v: 18 },
  { label: "Manual", v: 11 },
  { label: "Retry", v: 3 },
];

const DURATIONS = [
  { id: "pinterest", label: "Pinterest", v: 72, d: "1m 12s" },
  { id: "twitter", label: "Twitter", v: 48, d: "48s" },
  { id: "instagram", label: "Instagram", v: 39, d: "39s" },
  { id: "cosmos", label: "Cosmos", v: 24, d: "24s" },
  { id: "arena", label: "Are.na", v: 11, d: "11s" },
  { id: "youtube", label: "YouTube", v: 8, d: "8s" },
];

const RECENT = [
  {
    id: "cosmos",
    name: "Cosmos",
    what: "Incremental sync",
    trigger: "Scheduled",
    items: "12",
    dur: "—",
    st: "run",
    stLabel: "Running",
    time: "now",
  },
  {
    id: "twitter",
    name: "Twitter",
    what: "Incremental sync",
    trigger: "Scheduled",
    items: "4",
    dur: "36s",
    st: "ok",
    stLabel: "Completed",
    time: "18m ago",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    what: "Incremental sync",
    trigger: "Scheduled",
    items: "210",
    dur: "1m 44s",
    st: "warn",
    stLabel: "Rate limited",
    time: "38m ago",
  },
  {
    id: "instagram",
    name: "Instagram",
    what: "Incremental sync",
    trigger: "App launch",
    items: "0",
    dur: "12s",
    st: "ok",
    stLabel: "No new items",
    time: "1h ago",
  },
  {
    id: "arena",
    name: "Are.na",
    what: "Incremental sync",
    trigger: "Scheduled",
    items: "0",
    dur: "9s",
    st: "ok",
    stLabel: "No new items",
    time: "2h ago",
  },
  {
    id: "youtube",
    name: "YouTube",
    what: "Metadata refresh",
    trigger: "Manual",
    items: "22",
    dur: "31s",
    st: "ok",
    stLabel: "Completed",
    time: "3h ago",
  },
  {
    id: "tiktok",
    name: "TikTok",
    what: "Incremental sync",
    trigger: "Scheduled",
    items: "3",
    dur: "14s",
    st: "ok",
    stLabel: "Completed",
    time: "5h ago",
  },
];

const max = (rows) => rows.reduce((m, r) => Math.max(m, r.v), 0);
const dots = `<span class="dots">···</span>`;

const variants = [];
const V = (file, title, theme, css, body) =>
  variants.push({ file, title, theme, css, body });

/* ---------- an01 · Vercel traffic panels (light) ---------- */

const trafficCss = `
.wrap { max-width: 920px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:14px; }
.top { display:flex; align-items:center; gap:10px; } .top h1 { font-size:16px; font-weight:650; letter-spacing:-.01em; flex:1; }
.range { font-size:12px; color:var(--ink2); padding:4px 10px; border-radius:6px; box-shadow:0 0 0 1px var(--line); background:var(--panel); }
.kpis { display:flex; background:var(--panel); border-radius:10px; box-shadow:0 0 0 1px var(--hair); overflow:hidden; }
.kpi { flex:1; padding:11px 16px 12px; border-left:1px solid var(--hair); } .kpi:first-child { border-left:0; }
.kpi .l { font-size:11px; color:var(--ink2); } .kpi .v { font-size:17px; font-weight:640; letter-spacing:-.01em; margin-top:1px; }
.kpi .s { font-size:10.5px; color:var(--ink3); margin-top:1px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.panel { padding:0; }
.ph { display:flex; align-items:center; padding:10px 14px; border-bottom:1px solid var(--hair); font-size:12px; font-weight:600; }
.ph span + span { margin-left:auto; font-weight:400; font-size:11px; color:var(--ink3); }
.rows { padding:4px 6px 6px; }
.row { display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:6px; font-size:12.5px; }
.row:hover { background:var(--hov); }
.row .name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.row .val { font-weight:550; font-variant-numeric:tabular-nums; }
.track { width:56px; height:6px; border-radius:2px; background:var(--hair); overflow:hidden; flex:none; }
.track i { display:block; height:100%; background:rgba(0,0,0,.22); border-radius:2px; }
body.dark .track i { background:rgba(255,255,255,.28); }
.track i.w { background:var(--warn); } .track i.e { background:var(--err); } .track i.g { background:var(--ok); }
.dots { color:var(--ink3); letter-spacing:1px; font-size:11px; flex:none; cursor:default; }
.runs .row { padding:7px 8px; }
.runs .meta { font-size:11.5px; color:var(--ink3); flex:none; font-variant-numeric:tabular-nums; }
`;

function barRows(rows, { icons = true, stateColor = false, display } = {}) {
  const m = max(rows);
  return `<div class="rows">${rows
    .map((r) => {
      const cls =
        stateColor && r.st === "warn"
          ? "w"
          : stateColor && r.st === "err"
            ? "e"
            : "";
      return `<div class="row">${icons && r.id ? chip(r.id, 18, 5) : ""}<span class="name">${r.label}</span><span class="val">${display ? r.d : r.v.toLocaleString()}</span><span class="track"><i class="${cls}" style="width:${Math.max(4, Math.round((r.v / m) * 100))}%"></i></span>${dots}</div>`;
    })
    .join("")}</div>`;
}

function trafficBody(_dark) {
  return `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span class="range">Last 7 days</span></div>
    <div class="kpis">${KPIS.map((k) => `<div class="kpi"><div class="l">${k.label}</div><div class="v num">${k.value}</div><div class="s">${k.sub}</div></div>`).join("")}</div>
    <div class="grid3">
      <div class="panel"><div class="ph"><span>Top sources by items</span></div>${barRows(TOP_ITEMS)}</div>
      <div class="panel"><div class="ph"><span>Runs by source</span></div>${barRows(RUNS_BY_SOURCE)}</div>
      <div class="panel"><div class="ph"><span>Run outcomes</span></div>${barRows(OUTCOMES, { icons: false, stateColor: true })}</div>
    </div>
    <div class="grid2">
      <div class="panel"><div class="ph"><span>Triggers</span></div>${barRows(TRIGGERS, { icons: false })}</div>
      <div class="panel"><div class="ph"><span>Avg run duration</span></div>${barRows(DURATIONS, { display: true })}</div>
    </div>
    <div class="panel runs"><div class="ph"><span>Recent runs</span><span>96 in the last 7 days</span></div>
      <div class="rows">${RECENT.map(
        (r) =>
          `<div class="row">${chip(r.id, 18, 5)}<span class="name">${r.name} <span style="color:var(--ink3)">· ${r.what}</span></span><span class="st ${r.st}" style="letter-spacing:.04em">${r.stLabel.toUpperCase()}</span><span class="meta" style="width:52px;text-align:right">${r.items === "0" ? "—" : `+${r.items}`}</span><span class="meta" style="width:56px;text-align:right">${r.dur}</span><span class="meta" style="width:64px;text-align:right">${r.time}</span></div>`,
      ).join("")}</div>
    </div>
  </div>`;
}

V(
  "an01-traffic-light.html",
  "Analytics · Traffic panels",
  "light",
  trafficCss,
  trafficBody(false),
);

/* ---------- an02 · Tinted row bars, tabbed panels (Dub / Plausible) ---------- */

const tintedCss = `
.wrap { max-width: 860px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:12px; }
.top { display:flex; align-items:center; gap:10px; margin-bottom:2px; } .top h1 { font-size:16px; font-weight:650; flex:1; }
.range { font-size:12px; color:var(--ink2); padding:4px 10px; border-radius:6px; box-shadow:0 0 0 1px var(--line); background:var(--panel); }
.stat-line { display:flex; gap:22px; padding:2px 2px 8px; }
.sl { display:flex; align-items:baseline; gap:6px; font-size:12px; color:var(--ink2); }
.sl b { font-size:15px; font-weight:640; color:var(--ink); font-variant-numeric:tabular-nums; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.panel { padding:0; }
.ph { display:flex; align-items:center; gap:14px; padding:10px 14px 0; }
.tab { font-size:12px; font-weight:600; padding-bottom:8px; border-bottom:2px solid var(--ink); }
.tab.off { color:var(--ink3); font-weight:500; border-bottom-color:transparent; }
.ph .u { margin-left:auto; font-size:10.5px; color:var(--ink3); letter-spacing:.06em; padding-bottom:8px; }
.body { padding:8px 10px 10px; display:flex; flex-direction:column; gap:3px; border-top:1px solid var(--hair); }
.trow { position:relative; display:flex; align-items:center; gap:8px; height:28px; padding:0 8px; font-size:12.5px; border-radius:5px; overflow:hidden; }
.trow .fill { position:absolute; inset:0; border-radius:5px; background:var(--rundim); }
.trow .fill.warn { background:var(--warndim); } .trow .fill.err { background:rgba(207,63,63,.10); } .trow .fill.ok { background:var(--okdim); }
.trow > * { position:relative; } .trow .name { flex:1; } .trow .val { font-weight:550; font-variant-numeric:tabular-nums; }
.foot { display:flex; justify-content:center; padding:7px 0 9px; border-top:1px solid var(--hair); font-size:10.5px; letter-spacing:.08em; color:var(--ink3); font-weight:600; }
`;

function tintRows(
  rows,
  { icons = true, tint = "", display, stateTint = false } = {},
) {
  const m = max(rows);
  return rows
    .map((r) => {
      const t = stateTint
        ? r.st === "warn"
          ? "warn"
          : r.st === "err"
            ? "err"
            : r.st === "ok"
              ? "ok"
              : ""
        : tint;
      return `<div class="trow"><span class="fill ${t}" style="width:${Math.max(5, Math.round((r.v / m) * 100))}%"></span>${icons && r.id ? chip(r.id, 17, 5) : ""}<span class="name">${r.label}</span><span class="val">${display ? r.d : r.v.toLocaleString()}</span></div>`;
    })
    .join("");
}

V(
  "an02-tinted-tabs.html",
  "Analytics · Tinted rows",
  "light",
  tintedCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span class="range">Last 7 days</span></div>
    <div class="stat-line">
      <span class="sl"><b>1,284</b> items</span><span class="sl"><b>96</b> runs</span>
      <span class="sl"><b>94%</b> success</span><span class="sl"><b>42s</b> avg run</span>
      <span class="sl"><b>4.2 GB</b> on disk</span>
    </div>
    <div class="grid2">
      <div class="panel"><div class="ph"><span class="tab">Sources</span><span class="tab off">Items</span><span class="u">ITEMS</span></div>
        <div class="body">${tintRows(TOP_ITEMS)}</div><div class="foot">VIEW ALL</div></div>
      <div class="panel"><div class="ph"><span class="tab">Runs</span><span class="tab off">Failures</span><span class="u">RUNS</span></div>
        <div class="body">${tintRows(RUNS_BY_SOURCE)}</div><div class="foot">VIEW ALL</div></div>
      <div class="panel"><div class="ph"><span class="tab">Outcomes</span><span class="tab off">Errors</span><span class="u">RUNS</span></div>
        <div class="body">${tintRows(OUTCOMES, { icons: false, stateTint: true })}</div><div class="foot">DETAILS</div></div>
      <div class="panel"><div class="ph"><span class="tab">Triggers</span><span class="tab off">Schedule</span><span class="u">RUNS</span></div>
        <div class="body">${tintRows(TRIGGERS, { icons: false })}</div><div class="foot">DETAILS</div></div>
    </div>
  </div>`,
);

/* ---------- an03 · Grouped stat sections (Cloudflare) ---------- */

const groupedCss = `
.wrap { max-width: 880px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:14px; }
.top h1 { font-size:16px; font-weight:650; }
.sec { padding:0; }
.sh { padding:11px 16px 0; font-size:13px; font-weight:640; }
.cells { display:grid; grid-template-columns:repeat(4, 1fr); }
.cell { padding:12px 16px 14px; }
.cell .l { font-size:11px; color:var(--ink2); } .cell .v { font-size:20px; font-weight:640; letter-spacing:-.01em; margin:2px 0 6px; }
.cols { display:grid; grid-template-columns:1fr 1fr 1fr; border-top:1px solid var(--hair); }
.col { padding:12px 16px 14px; border-left:1px solid var(--hair); } .col:first-child { border-left:0; }
.col .t { font-size:11.5px; font-weight:600; margin-bottom:8px; }
.mini { display:flex; align-items:center; gap:8px; font-size:12px; height:24px; }
.mini .name { flex:1; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mini .val { font-variant-numeric:tabular-nums; color:var(--ink2); width:34px; text-align:right; }
.mini .bar { width:64px; height:7px; background:var(--hair); border-radius:2px; overflow:hidden; flex:none; }
.mini .bar i { display:block; height:100%; background:#5b7fd9; border-radius:2px; }
.mini .bar i.w { background:var(--warn); } .mini .bar i.e { background:var(--err); }
`;

function cellSpark(v, color, seed) {
  return `<div class="cell"><div class="l">${v.l}</div><div class="v num">${v.v}</div>${spark(color, seed, 150, 26)}</div>`;
}

function miniCol(title, rows, { icons = true, state = false } = {}) {
  const m = max(rows);
  return `<div class="col"><div class="t">${title}</div>${rows
    .slice(0, 4)
    .map(
      (r) =>
        `<div class="mini">${icons && r.id ? chip(r.id, 16, 4) : ""}<span class="name">${r.label}</span><span class="val">${r.v}</span><span class="bar"><i class="${state && r.st === "warn" ? "w" : state && r.st === "err" ? "e" : ""}" style="width:${Math.max(5, Math.round((r.v / m) * 100))}%"></i></span></div>`,
    )
    .join("")}</div>`;
}

V(
  "an03-grouped-sections.html",
  "Analytics · Grouped sections",
  "light",
  groupedCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1></div>
    <div class="panel sec"><div class="sh">Volume</div>
      <div class="cells">
        ${cellSpark({ l: "Items synced", v: "1,284" }, "#5b7fd9", 4)}
        ${cellSpark({ l: "Items per day", v: "183" }, "#5b7fd9", 9)}
        ${cellSpark({ l: "New this week", v: "+312" }, "#3c9a52", 14)}
        ${cellSpark({ l: "Storage", v: "4.2 GB" }, "#9b9ba0", 21)}
      </div></div>
    <div class="panel sec"><div class="sh">Runs</div>
      <div class="cells">
        ${cellSpark({ l: "Total runs", v: "96" }, "#5b7fd9", 6)}
        ${cellSpark({ l: "Success rate", v: "94%" }, "#3c9a52", 11)}
        ${cellSpark({ l: "Rate limited", v: "8" }, "#b57e1c", 17)}
        ${cellSpark({ l: "Failed", v: "3" }, "#cf3f3f", 23)}
      </div></div>
    <div class="panel sec"><div class="sh">Breakdown</div>
      <div class="cols">
        ${miniCol("Top sources", TOP_ITEMS)}
        ${miniCol("Triggers", TRIGGERS, { icons: false })}
        ${miniCol("Outcomes", OUTCOMES, { icons: false, state: true })}
      </div></div>
  </div>`,
);

/* ---------- an04 · Chart hero + KPI tabs (Vercel analytics) ---------- */

const heroCss = `
.wrap { max-width: 880px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:12px; }
.top { display:flex; align-items:center; gap:10px; } .top h1 { font-size:16px; font-weight:650; flex:1; }
.range { font-size:12px; color:var(--ink2); padding:4px 10px; border-radius:6px; box-shadow:0 0 0 1px var(--line); background:var(--panel); }
.hero { padding:0; overflow:hidden; }
.ktabs { display:flex; border-bottom:1px solid var(--hair); }
.ktab { flex:1; max-width:180px; padding:12px 18px 11px; border-right:1px solid var(--hair); cursor:default; }
.ktab.on { box-shadow:inset 0 -2px 0 var(--ink); }
.ktab .l { font-size:11.5px; color:var(--ink2); } .ktab .v { font-size:19px; font-weight:640; letter-spacing:-.01em; margin-top:1px; }
.chart { padding:18px 16px 4px; } .chart svg { width:100%; height:150px; display:block; }
.axis { display:flex; justify-content:space-between; padding:6px 16px 12px; font-size:10.5px; color:var(--ink3); }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.panel { padding:0; }
.ph { display:flex; align-items:center; gap:14px; padding:10px 14px 0; }
.tab { font-size:12px; font-weight:600; padding-bottom:8px; border-bottom:2px solid var(--ink); }
.tab.off { color:var(--ink3); font-weight:500; border-bottom-color:transparent; }
.body { padding:6px 8px 8px; border-top:1px solid var(--hair); }
.row { display:flex; align-items:center; gap:8px; height:29px; padding:0 8px; font-size:12.5px; border-radius:5px; }
.row:hover { background:var(--hov); }
.row .name { flex:1; } .row .val { font-weight:550; font-variant-numeric:tabular-nums; }
.track { width:60px; height:6px; border-radius:2px; background:var(--hair); overflow:hidden; }
.track i { display:block; height:100%; background:rgba(0,0,0,.22); }
`;

V(
  "an04-chart-hero.html",
  "Analytics · Chart hero",
  "light",
  heroCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span class="range">Last 7 days</span></div>
    <div class="panel hero">
      <div class="ktabs">
        <div class="ktab on"><div class="l">Items synced</div><div class="v num">1,284</div></div>
        <div class="ktab"><div class="l">Runs</div><div class="v num">96</div></div>
        <div class="ktab"><div class="l">Success rate</div><div class="v num">94%</div></div>
        <div class="ktab"><div class="l">Avg duration</div><div class="v num">42s</div></div>
      </div>
      <div class="chart">${area("#4472d4", 800, 150, 0.14)}</div>
      <div class="axis"><span>Jun 30</span><span>Jul 1</span><span>Jul 2</span><span>Jul 3</span><span>Jul 4</span><span>Jul 5</span><span>Jul 6</span><span>Today</span></div>
    </div>
    <div class="grid2">
      <div class="panel"><div class="ph"><span class="tab">Sources</span><span class="tab off">Runs</span><span class="tab off">Duration</span></div>
        <div class="body">${TOP_ITEMS.map((r) => `<div class="row">${chip(r.id, 17, 5)}<span class="name">${r.label}</span><span class="val">${r.v.toLocaleString()}</span><span class="track"><i style="width:${Math.max(5, Math.round((r.v / 412) * 100))}%"></i></span></div>`).join("")}</div></div>
      <div class="panel"><div class="ph"><span class="tab">Outcomes</span><span class="tab off">Triggers</span></div>
        <div class="body">${OUTCOMES.map((r) => `<div class="row"><span class="dot ${r.st || "ok"}" style="${r.st === "" ? "background:var(--ink3)" : ""}"></span><span class="name">${r.label}</span><span class="val">${r.v}</span><span class="track"><i style="width:${Math.max(5, Math.round((r.v / 71) * 100))}%"></i></span></div>`).join("")}
        ${TRIGGERS.slice(0, 2)
          .map(() => "")
          .join("")}</div></div>
    </div>
  </div>`,
);

/* ---------- an05 · Dark ops console (mono log) ---------- */

const consoleCss = `
body.dark { background:#0a0a0b; }
.wrap { max-width: 880px; margin: 0 auto; padding: 30px 32px 80px; display:flex; flex-direction:column; gap:12px; }
.top { display:flex; align-items:baseline; gap:10px; } .top h1 { font-size:15px; font-weight:640; flex:1; }
.top .live { font-size:11px; color:var(--ok); display:flex; align-items:center; gap:6px; }
.stats { display:flex; gap:10px; }
.s { flex:1; padding:10px 14px 12px; background:var(--panel); border-radius:9px; box-shadow:0 0 0 1px var(--hair); }
.s .l { font-size:10.5px; color:var(--ink3); letter-spacing:.05em; text-transform:uppercase; }
.s .v { font-size:17px; font-weight:640; margin-top:2px; font-variant-numeric:tabular-nums; }
.s .v em { font-style:normal; font-size:11px; font-weight:500; color:var(--ink3); margin-left:4px; }
.mono, .log { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
.log { padding:4px 0 8px; font-size:11.5px; }
.lh { display:grid; grid-template-columns: 74px 110px 1fr 92px 70px 58px; gap:10px; padding:8px 16px; color:var(--ink3); font-size:10px; letter-spacing:.08em; text-transform:uppercase; border-bottom:1px solid var(--hair); }
.lr { display:grid; grid-template-columns: 74px 110px 1fr 92px 70px 58px; gap:10px; padding:7px 16px; border-bottom:1px solid rgba(255,255,255,.03); align-items:center; }
.lr:hover { background:var(--hov); }
.lr .t { color:var(--ink3); } .lr .src { display:flex; align-items:center; gap:7px; color:var(--ink); }
.lr .what { color:var(--ink2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lr .n { text-align:right; color:var(--ink2); } .lr .d { text-align:right; color:var(--ink3); }
.bars { padding:12px 16px 14px; display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.bt { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3); margin-bottom:8px; }
.hrow { display:flex; align-items:center; gap:8px; height:22px; font-size:11.5px; }
.hrow .name { width:76px; color:var(--ink2); } .hrow .val { width:34px; text-align:right; color:var(--ink); font-variant-numeric:tabular-nums; }
.hbar { flex:1; height:6px; background:rgba(255,255,255,.05); border-radius:2px; overflow:hidden; }
.hbar i { display:block; height:100%; background:#7dd3fc; border-radius:2px; opacity:.85; }
.hbar i.w { background:var(--warn); } .hbar i.e { background:var(--err); } .hbar i.g { background:var(--ok); }
`;

V(
  "an05-dark-console.html",
  "Analytics · Ops console",
  "dark",
  consoleCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span class="live"><span class="dot run"></span>1 sync running</span></div>
    <div class="stats">
      <div class="s"><div class="l">Items · 7d</div><div class="v">1,284<em>+312</em></div></div>
      <div class="s"><div class="l">Runs · 7d</div><div class="v">96</div></div>
      <div class="s"><div class="l">Success</div><div class="v">94%<em>90/96</em></div></div>
      <div class="s"><div class="l">Avg run</div><div class="v">42s</div></div>
      <div class="s"><div class="l">Storage</div><div class="v">4.2 GB</div></div>
    </div>
    <div class="panel bars">
      <div><div class="bt">Items by source</div>${TOP_ITEMS.slice(0, 5)
        .map(
          (r) =>
            `<div class="hrow"><span class="name">${r.label}</span><span class="hbar"><i style="width:${Math.max(4, Math.round((r.v / 412) * 100))}%"></i></span><span class="val">${r.v}</span></div>`,
        )
        .join("")}</div>
      <div><div class="bt">Run outcomes</div>${OUTCOMES.map(
        (r) =>
          `<div class="hrow"><span class="name">${r.label}</span><span class="hbar"><i class="${r.st === "warn" ? "w" : r.st === "err" ? "e" : "g"}" style="width:${Math.max(4, Math.round((r.v / 71) * 100))}%"></i></span><span class="val">${r.v}</span></div>`,
      ).join("")}</div>
    </div>
    <div class="panel log">
      <div class="lh"><span>Time</span><span>Source</span><span>Run</span><span>Outcome</span><span>Items</span><span>Took</span></div>
      ${RECENT.map(
        (r) =>
          `<div class="lr"><span class="t">${r.time}</span><span class="src">${chip(r.id, 15, 4)}${r.name}</span><span class="what">${r.what} · ${r.trigger.toLowerCase()}</span><span class="st ${r.st}">${r.stLabel.toUpperCase()}</span><span class="n">${r.items === "0" ? "·" : `+${r.items}`}</span><span class="d">${r.dur}</span></div>`,
      ).join("")}
    </div>
  </div>`,
);

/* ---------- an06 · Heatmap + donut (Front / Circle) ---------- */

function donut() {
  const total = OUTCOMES.reduce((s, o) => s + o.v, 0);
  const C = 2 * Math.PI * 34;
  const colors = {
    ok: "#3c9a52",
    "": "#9b9ba0",
    warn: "#b57e1c",
    err: "#cf3f3f",
  };
  let off = 0;
  const segs = OUTCOMES.map((o) => {
    const len = (o.v / total) * C;
    const s = `<circle cx="45" cy="45" r="34" fill="none" stroke="${colors[o.st]}" stroke-width="9" stroke-dasharray="${(len - 2).toFixed(1)} ${(C - len + 2).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 45 45)"/>`;
    off += len;
    return s;
  }).join("");
  return `<svg width="90" height="90" viewBox="0 0 90 90">${segs}<text x="45" y="42" text-anchor="middle" font-size="17" font-weight="640" fill="currentColor">96</text><text x="45" y="56" text-anchor="middle" font-size="8.5" fill="#9b9ba0">RUNS</text></svg>`;
}

function heatmap() {
  const rnd = seeded(41);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = ["12a", "4a", "8a", "12p", "4p", "8p"];
  let html = `<div class="hm"><div class="hm-row"><span class="hm-l"></span>${days.map((d) => `<span class="hm-d">${d}</span>`).join("")}</div>`;
  for (const s of slots) {
    html += `<div class="hm-row"><span class="hm-l">${s}</span>${days
      .map(() => {
        const v = rnd();
        const op = v < 0.25 ? 0 : (0.12 + v * 0.75).toFixed(2);
        return `<span class="hm-c" style="background:rgba(68,114,212,${op})">${v > 0.72 ? `<i>${Math.round(v * 9)}</i>` : ""}</span>`;
      })
      .join("")}</div>`;
  }
  return `${html}</div>`;
}

const heatCss = `
.wrap { max-width: 860px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:12px; }
.top { display:flex; align-items:center; } .top h1 { font-size:16px; font-weight:650; flex:1; }
.range { font-size:12px; color:var(--ink2); padding:4px 10px; border-radius:6px; box-shadow:0 0 0 1px var(--line); background:var(--panel); }
.split { display:grid; grid-template-columns: 1.5fr 1fr; gap:12px; }
.panel { padding:14px 16px; }
.pt { font-size:12.5px; font-weight:600; margin-bottom:12px; display:flex; } .pt span:last-child { margin-left:auto; font-weight:400; font-size:11px; color:var(--ink3); }
.hm { display:flex; flex-direction:column; gap:3px; }
.hm-row { display:flex; gap:3px; align-items:center; }
.hm-l { width:26px; font-size:10px; color:var(--ink3); text-align:right; padding-right:4px; }
.hm-d { flex:1; text-align:center; font-size:10px; color:var(--ink3); }
.hm-c { flex:1; height:22px; border-radius:4px; background:var(--hair); display:grid; place-items:center; }
.hm-c i { font-style:normal; font-size:9.5px; font-weight:600; color:#fff; }
.don { display:flex; align-items:center; gap:16px; }
.leg { display:flex; flex-direction:column; gap:6px; flex:1; }
.li { display:flex; align-items:center; gap:8px; font-size:12px; }
.li .sw { width:8px; height:8px; border-radius:2.5px; }
.li .name { flex:1; color:var(--ink2); } .li .v { font-weight:550; font-variant-numeric:tabular-nums; }
.srcs { padding:6px 8px 8px; }
.srow { display:flex; align-items:center; gap:9px; height:32px; padding:0 8px; font-size:12.5px; border-radius:6px; }
.srow:hover { background:var(--hov); }
.srow .name { width:90px; font-weight:550; } .srow .val { font-variant-numeric:tabular-nums; color:var(--ink2); width:60px; text-align:right; }
.srow .spark { margin-left:auto; }
`;

V(
  "an06-heatmap.html",
  "Analytics · Heatmap",
  "light",
  heatCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span class="range">Last 7 days</span></div>
    <div class="split">
      <div class="panel"><div class="pt"><span>Sync activity</span><span>runs per 4h</span></div>${heatmap()}</div>
      <div class="panel"><div class="pt"><span>Outcomes</span></div>
        <div class="don">${donut()}
          <div class="leg">
            ${OUTCOMES.map((o) => `<div class="li"><span class="sw" style="background:${{ ok: "#3c9a52", "": "#9b9ba0", warn: "#b57e1c", err: "#cf3f3f" }[o.st]}"></span><span class="name">${o.label}</span><span class="v">${o.v}</span></div>`).join("")}
          </div></div></div>
    </div>
    <div class="panel srcs" style="padding-top:12px"><div class="pt" style="padding:0 8px"><span>Sources</span><span>items · 7 days</span></div>
      ${TOP_ITEMS.map((r, i) => `<div class="srow">${chip(r.id, 18, 5)}<span class="name">${r.label}</span><span class="val">${r.v} items</span>${spark(i === 1 ? "#b57e1c" : "#3c9a52", i + 7, 120, 20)}</div>`).join("")}
    </div>
  </div>`,
);

/* ---------- an07 · Quiet ledger (single column, no cards) ---------- */

const ledgerCss = `
body.light { background:#fcfcfc; }
.wrap { max-width: 620px; margin: 0 auto; padding: 44px 32px 80px; }
.top { display:flex; align-items:baseline; margin-bottom:6px; } .top h1 { font-size:15px; font-weight:640; flex:1; }
.top span { font-size:12px; color:var(--ink3); }
.sum { display:flex; gap:8px; font-size:12.5px; color:var(--ink2); padding-bottom:18px; border-bottom:1px solid var(--hair); }
.sum b { color:var(--ink); font-weight:600; }
.lrow { display:flex; align-items:center; gap:11px; padding:13px 2px; border-bottom:1px solid var(--hair); }
.lrow .name { width:86px; font-size:13px; font-weight:550; }
.lrow .items { width:74px; font-size:12px; color:var(--ink2); font-variant-numeric:tabular-nums; text-align:right; }
.lrow .dur { width:52px; font-size:12px; color:var(--ink3); font-variant-numeric:tabular-nums; text-align:right; }
.lrow .ticks { flex:1; margin:0; height:18px; }
.sect { margin-top:26px; }
.sect .t { font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--ink3); margin-bottom:6px; }
.orow { display:flex; align-items:center; gap:10px; padding:8px 2px; border-bottom:1px solid var(--hair); font-size:12.5px; }
.orow .name { flex:1; } .orow .v { font-variant-numeric:tabular-nums; font-weight:550; }
.orow .pct { width:44px; text-align:right; color:var(--ink3); font-size:11.5px; font-variant-numeric:tabular-nums; }
`;

V(
  "an07-quiet-ledger.html",
  "Analytics · Quiet ledger",
  "light",
  ledgerCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span>Last 7 days</span></div>
    <div class="sum"><span><b>1,284</b> items across <b>96</b> runs</span><span>·</span><span><b>94%</b> succeeded</span><span>·</span><span>avg <b>42s</b></span></div>
    ${TOP_ITEMS.map((r, i) => {
      const d = DURATIONS.find((x) => x.id === r.id);
      return `<div class="lrow">${chip(r.id, 22, 6)}<span class="name">${r.label}</span>${ticks(i * 5 + 2, 34, i === 1 ? "w" : "")}<span class="items num">${r.v} items</span><span class="dur num">${d ? d.d : "—"}</span></div>`;
    }).join("")}
    <div class="sect"><div class="t">Outcomes</div>
      ${OUTCOMES.map((o) => `<div class="orow"><span class="dot ${o.st || ""}" style="${o.st === "" ? "background:var(--ink3)" : ""}"></span><span class="name">${o.label}</span><span class="v">${o.v}</span><span class="pct">${Math.round((o.v / 96) * 100)}%</span></div>`).join("")}
    </div>
    <div class="sect"><div class="t">Triggers</div>
      ${TRIGGERS.map((t) => `<div class="orow"><span class="name">${t.label}</span><span class="v">${t.v}</span><span class="pct">${Math.round((t.v / 96) * 100)}%</span></div>`).join("")}
    </div>
  </div>`,
);

/* ---------- an08 · Stat cards with mini charts (StackAI) ---------- */

function miniBars(seed, color, n = 14, w = 170, h = 34) {
  const rnd = seeded(seed);
  const bw = (w - (n - 1) * 3) / n;
  let out = "";
  for (let i = 0; i < n; i++) {
    const v = 6 + rnd() * (h - 8);
    out += `<rect x="${(i * (bw + 3)).toFixed(1)}" y="${(h - v).toFixed(1)}" width="${bw.toFixed(1)}" height="${v.toFixed(1)}" rx="1.5" fill="${color}" opacity="${i === n - 1 ? 1 : 0.45}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out}</svg>`;
}

const cardsCss = `
.wrap { max-width: 880px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:12px; }
.top { display:flex; align-items:center; } .top h1 { font-size:16px; font-weight:650; flex:1; }
.range { font-size:12px; color:var(--ink2); padding:4px 10px; border-radius:6px; box-shadow:0 0 0 1px var(--line); background:var(--panel); }
.grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
.card { padding:13px 16px 12px; }
.card .h { display:flex; align-items:baseline; gap:6px; }
.card .l { font-size:11.5px; color:var(--ink2); flex:1; }
.card .delta { font-size:11px; font-weight:600; }
.card .delta.up { color:var(--ok); } .card .delta.dn { color:var(--err); } .card .delta.fl { color:var(--ink3); }
.card .v { font-size:21px; font-weight:640; letter-spacing:-.015em; margin:2px 0 8px; }
.tbl { padding:0; }
.th { display:grid; grid-template-columns: 1.4fr 66px 66px 74px 88px 92px; gap:10px; padding:9px 16px; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink3); border-bottom:1px solid var(--hair); }
.tr { display:grid; grid-template-columns: 1.4fr 66px 66px 74px 88px 92px; gap:10px; padding:8px 16px; align-items:center; font-size:12.5px; border-bottom:1px solid var(--hair); }
.tr:last-child { border-bottom:0; } .tr:hover { background:var(--hov); }
.tr .src { display:flex; align-items:center; gap:9px; font-weight:550; }
.tr .r { text-align:right; font-variant-numeric:tabular-nums; color:var(--ink2); }
.tr .last { text-align:right; font-size:12px; color:var(--ink3); }
`;

V(
  "an08-stat-cards.html",
  "Analytics · Stat cards",
  "light",
  cardsCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><span class="range">Last 7 days</span></div>
    <div class="grid">
      <div class="panel card"><div class="h"><span class="l">Items synced</span><span class="delta up">+32%</span></div><div class="v num">1,284</div>${miniBars(5, "#4472d4")}</div>
      <div class="panel card"><div class="h"><span class="l">Runs</span><span class="delta fl">±0%</span></div><div class="v num">96</div>${miniBars(9, "#4472d4")}</div>
      <div class="panel card"><div class="h"><span class="l">Success rate</span><span class="delta up">+2%</span></div><div class="v num">94%</div>${miniBars(13, "#3c9a52")}</div>
      <div class="panel card"><div class="h"><span class="l">Avg duration</span><span class="delta dn">+6s</span></div><div class="v num">42s</div>${miniBars(17, "#9b9ba0")}</div>
      <div class="panel card"><div class="h"><span class="l">Rate limited</span><span class="delta dn">+3</span></div><div class="v num">8</div>${miniBars(21, "#b57e1c")}</div>
      <div class="panel card"><div class="h"><span class="l">Storage</span><span class="delta fl">4.2 GB</span></div><div class="v num">+180 MB</div>${miniBars(25, "#9b9ba0")}</div>
    </div>
    <div class="panel tbl">
      <div class="th"><span>Source</span><span style="text-align:right">Runs</span><span style="text-align:right">Items</span><span style="text-align:right">Avg run</span><span style="text-align:right">Failures</span><span style="text-align:right">Last sync</span></div>
      ${RUNS_BY_SOURCE.map((r) => {
        const it = TOP_ITEMS.find((x) => x.id === r.id);
        const d = DURATIONS.find((x) => x.id === r.id);
        const fail =
          r.id === "pinterest" ? "2" : r.id === "youtube" ? "1" : "0";
        const last = {
          twitter: "18m ago",
          pinterest: "38m ago",
          instagram: "1h ago",
          cosmos: "now",
          arena: "2h ago",
          youtube: "3h ago",
        }[r.id];
        return `<div class="tr"><span class="src">${chip(r.id, 18, 5)}${r.label}</span><span class="r">${r.v}</span><span class="r">${it ? it.v : 0}</span><span class="r">${d ? d.d : "—"}</span><span class="r" style="${fail !== "0" ? "color:var(--warn);font-weight:600" : ""}">${fail}</span><span class="last">${last}</span></div>`;
      }).join("")}
    </div>
  </div>`,
);

/* ---------- an09 · One dense table (Mixpanel register) ---------- */

const denseCss = `
.wrap { max-width: 920px; margin: 0 auto; padding: 32px 32px 80px; display:flex; flex-direction:column; gap:10px; }
.top { display:flex; align-items:center; gap:10px; } .top h1 { font-size:16px; font-weight:650; flex:1; }
.chipbar { display:flex; gap:6px; }
.fchip { font-size:11.5px; padding:3px 9px; border-radius:6px; background:var(--panel); box-shadow:0 0 0 1px var(--line); color:var(--ink2); }
.fchip.on { color:var(--ink); font-weight:600; }
.note { font-size:12px; color:var(--ink2); padding:0 2px 4px; }
.note b { color:var(--ink); font-weight:600; }
.tbl { padding:0; overflow:hidden; }
.th { display:grid; grid-template-columns: 1.5fr 64px 64px 76px 100px 1fr 90px; gap:12px; padding:9px 16px; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink3); border-bottom:1px solid var(--hair); background:var(--hov); }
.tr { display:grid; grid-template-columns: 1.5fr 64px 64px 76px 100px 1fr 90px; gap:12px; padding:0 16px; height:40px; align-items:center; font-size:12.5px; border-bottom:1px solid var(--hair); }
.tr:last-child { border-bottom:0; } .tr:hover { background:var(--hov); }
.src { display:flex; align-items:center; gap:9px; font-weight:550; }
.src small { font-weight:400; color:var(--ink3); font-size:11px; }
.r { text-align:right; font-variant-numeric:tabular-nums; color:var(--ink); }
.r.mut { color:var(--ink2); }
.health { display:flex; gap:2px; align-items:center; height:14px; }
.health i { width:5px; height:14px; border-radius:1.5px; background:var(--okdim); }
.health i.f { background:var(--ok); } .health i.w { background:var(--warn); } .health i.x { background:var(--err); }
.last { text-align:right; color:var(--ink3); font-size:12px; }
.totals { display:grid; grid-template-columns: 1.5fr 64px 64px 76px 100px 1fr 90px; gap:12px; padding:9px 16px; font-size:12px; font-weight:600; border-top:1px solid var(--line); background:var(--hov); }
`;

function healthCells(seed, warnAt = -1, failAt = -1) {
  const rnd = seeded(seed);
  let out = "";
  for (let i = 0; i < 14; i++) {
    const cls =
      i === failAt ? "x" : i === warnAt ? "w" : rnd() > 0.3 ? "f" : "";
    out += `<i class="${cls}"></i>`;
  }
  return `<div class="health">${out}</div>`;
}

V(
  "an09-dense-table.html",
  "Analytics · Dense table",
  "light",
  denseCss,
  `<div class="wrap">
    <div class="top"><h1>Analytics</h1><div class="chipbar"><span class="fchip on">7 days</span><span class="fchip">30 days</span><span class="fchip">All time</span></div></div>
    <div class="note"><b>1,284</b> items across <b>96</b> runs · <b>94%</b> success · avg <b>42s</b> · <b>4.2 GB</b> on disk</div>
    <div class="panel tbl">
      <div class="th"><span>Source</span><span style="text-align:right">Runs</span><span style="text-align:right">Items</span><span style="text-align:right">Avg run</span><span style="text-align:right">Rate limits</span><span>Last 14 runs</span><span style="text-align:right">Last sync</span></div>
      ${RUNS_BY_SOURCE.map((r) => {
        const it = TOP_ITEMS.find((x) => x.id === r.id);
        const d = DURATIONS.find((x) => x.id === r.id);
        const kind = {
          twitter: "bookmarks & likes",
          pinterest: "boards & pins",
          instagram: "saved posts",
          cosmos: "saved elements",
          arena: "channels",
          youtube: "watch later",
        }[r.id];
        const rl = r.id === "pinterest" ? "6" : r.id === "twitter" ? "2" : "0";
        const last = {
          twitter: "18m ago",
          pinterest: "38m ago",
          instagram: "1h ago",
          cosmos: "syncing",
          arena: "2h ago",
          youtube: "3h ago",
        }[r.id];
        const warnAt = r.id === "pinterest" ? 12 : -1;
        const failAt = r.id === "youtube" ? 9 : -1;
        return `<div class="tr"><span class="src">${chip(r.id, 20, 6)}${r.label}&nbsp;<small>${kind}</small></span><span class="r mut">${r.v}</span><span class="r">${it ? it.v : 0}</span><span class="r mut">${d ? d.d : "—"}</span><span class="r mut" style="${rl !== "0" ? "color:var(--warn);font-weight:600" : ""}">${rl}</span>${healthCells(r.v + 3, warnAt, failAt)}<span class="last" style="${last === "syncing" ? "color:var(--run);font-weight:550" : ""}">${last}</span></div>`;
      }).join("")}
      <div class="totals"><span>6 sources</span><span style="text-align:right">96</span><span style="text-align:right">1,064</span><span style="text-align:right">42s</span><span style="text-align:right">8</span><span></span><span></span></div>
    </div>
  </div>`,
);

/* ---------- an10 · Vercel traffic, dark ---------- */

V(
  "an10-traffic-dark.html",
  "Analytics · Traffic panels dark",
  "dark",
  trafficCss,
  trafficBody(true),
);

/* ---------- an11/an12 · Linear Insights dashboard ---------- */

// Muted per-source segment colors (Linear stacks priorities; we stack sources).
const SEG = {
  twitter: { dark: "#7dd3fc", light: "#4472d4" },
  pinterest: { dark: "#f47c7c", light: "#d45454" },
  instagram: { dark: "#c495f4", light: "#9256cc" },
  cosmos: { dark: "#8a8a90", light: "#9b9ba0" },
  arena: { dark: "#4ade80", light: "#3c9a52" },
  tiktok: { dark: "#fbbf24", light: "#b57e1c" },
};

// items per day per source, 7 days
const STACK_DAYS = [
  "Jul 1",
  "Jul 2",
  "Jul 3",
  "Jul 4",
  "Jul 5",
  "Jul 6",
  "Today",
];
const STACKS = [
  {
    twitter: 48,
    pinterest: 30,
    instagram: 18,
    cosmos: 10,
    arena: 6,
    tiktok: 4,
  },
  {
    twitter: 62,
    pinterest: 41,
    instagram: 22,
    cosmos: 14,
    arena: 8,
    tiktok: 5,
  },
  {
    twitter: 44,
    pinterest: 36,
    instagram: 20,
    cosmos: 12,
    arena: 9,
    tiktok: 3,
  },
  {
    twitter: 71,
    pinterest: 52,
    instagram: 28,
    cosmos: 21,
    arena: 11,
    tiktok: 6,
  },
  {
    twitter: 58,
    pinterest: 44,
    instagram: 24,
    cosmos: 18,
    arena: 8,
    tiktok: 5,
  },
  {
    twitter: 66,
    pinterest: 48,
    instagram: 22,
    cosmos: 24,
    arena: 9,
    tiktok: 4,
  },
  {
    twitter: 63,
    pinterest: 37,
    instagram: 20,
    cosmos: 22,
    arena: 7,
    tiktok: 4,
  },
];

function stackedBars(dark) {
  const W = 300,
    H = 150,
    pad = 26,
    bw = 18;
  const maxV = 220;
  const y = (v) => H - 18 - (v / maxV) * (H - 30);
  let out = "";
  // dashed gridlines + right axis labels
  for (const g of [0, 50, 100, 150, 200]) {
    out += `<line x1="0" x2="${W - pad}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"}" stroke-dasharray="3 4"/>`;
    out += `<text x="${W - pad + 6}" y="${(y(g) + 3).toFixed(1)}" font-size="8.5" fill="${dark ? "#5b5b61" : "#9b9ba0"}">${g}</text>`;
  }
  STACKS.forEach((day, i) => {
    const x = 10 + i * ((W - pad - 20) / 7);
    let acc = 0;
    for (const src of [
      "twitter",
      "pinterest",
      "instagram",
      "cosmos",
      "arena",
      "tiktok",
    ]) {
      const v = day[src];
      const y1 = y(acc + v),
        y0 = y(acc);
      out += `<rect x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw}" height="${Math.max(1, y0 - y1 - 1).toFixed(1)}" rx="1" fill="${SEG[src][dark ? "dark" : "light"]}" opacity=".85"/>`;
      acc += v;
    }
    out += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 5}" font-size="8.5" text-anchor="middle" fill="${dark ? "#5b5b61" : "#9b9ba0"}">${STACK_DAYS[i]}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${out}</svg>`;
}

function scatter(dark) {
  const W = 300,
    H = 150;
  const rnd = seeded(29);
  const srcs = Object.keys(SEG);
  let out = "";
  for (const g of [30, 70, 110]) {
    out += `<line x1="0" x2="${W}" y1="${g}" y2="${g}" stroke="${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"}" stroke-dasharray="3 4"/>`;
  }
  const yl = dark ? "#5b5b61" : "#9b9ba0";
  out += `<text x="${W - 4}" y="27" font-size="8.5" text-anchor="end" fill="${yl}">2m</text>`;
  out += `<text x="${W - 4}" y="67" font-size="8.5" text-anchor="end" fill="${yl}">1m</text>`;
  out += `<text x="${W - 4}" y="107" font-size="8.5" text-anchor="end" fill="${yl}">30s</text>`;
  for (let d = 0; d < 7; d++) {
    for (let k = 0; k < 9; k++) {
      const src = srcs[Math.floor(rnd() * srcs.length)];
      const x = 14 + d * 40 + rnd() * 22;
      const yy = 26 + rnd() * 108;
      out += `<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="2.6" fill="${SEG[src][dark ? "dark" : "light"]}" opacity=".9"/>`;
    }
    out += `<line x1="${14 + d * 40 + 11}" x2="${14 + d * 40 + 11}" y1="18" y2="${H - 14}" stroke="${dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)"}" stroke-dasharray="2 5"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${out}</svg>`;
}

const linearCss = (dark) => `
body.dark { background:#101012; } body.dark .tile { background:#17181a; }
body.light { background:#f9f9fa; } body.light .tile { background:#fff; }
.wrap { max-width: 960px; margin: 0 auto; padding: 22px 28px 80px; display:flex; flex-direction:column; gap:14px; }
.crumb { display:flex; align-items:center; gap:8px; font-size:13px; padding:2px 2px 8px; border-bottom:1px solid var(--hair); }
.crumb .g { color:var(--ink3); } .crumb b { font-weight:600; }
.crumb .icons { margin-left:auto; display:flex; gap:12px; color:var(--ink3); font-size:12px; }
.range { font-size:12px; color:var(--ink2); padding:3px 9px; border-radius:6px; box-shadow:0 0 0 1px var(--line); }
.row3 { display:grid; grid-template-columns: 1.15fr 1fr 0.85fr; gap:14px; }
.row2 { display:grid; grid-template-columns: 1.15fr 1fr; gap:14px; }
.tile { border-radius:10px; box-shadow:0 0 0 1px ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"}; padding:14px 16px 12px; min-width:0; }
.tt { font-size:13px; font-weight:600; margin-bottom:12px; letter-spacing:-.005em; }
.tt small { font-weight:400; font-size:11px; color:var(--ink3); margin-left:6px; }
.mini-tbl { display:flex; flex-direction:column; }
.mth { display:flex; font-size:11px; color:var(--ink3); padding:0 0 7px; border-bottom:1px solid var(--hair); }
.mth span:last-child { margin-left:auto; }
.mtr { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--hair); font-size:12.5px; }
.mtr:last-child { border-bottom:0; }
.mtr .n { margin-left:auto; font-variant-numeric:tabular-nums; }
.big { display:grid; place-items:center; min-height:120px; }
.big .v { font-size:34px; font-weight:550; letter-spacing:-.02em; color:var(--ink); }
.big .s { font-size:11.5px; color:var(--ink3); margin-top:4px; text-align:center; }
.legend { display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; }
.leg { display:flex; align-items:center; gap:5px; font-size:10.5px; color:var(--ink2); }
.leg i { width:7px; height:7px; border-radius:2px; }
.dd { padding:0; overflow:hidden; }
.dd .tt { padding:13px 16px 0; }
.ddh { display:grid; grid-template-columns: 1.2fr 46px 76px 86px 48px 52px; gap:6px; padding:9px 16px; font-size:11px; color:var(--ink3); border-bottom:1px solid var(--hair); }
.ddh span:not(:first-child) { text-align:right; }
.ddr { display:grid; grid-template-columns: 1.2fr 46px 76px 86px 48px 52px; gap:6px; padding:0 16px; height:37px; align-items:center; font-size:12.5px; border-bottom:1px solid var(--hair); }
.ddr:last-child { border-bottom:0; }
.ddr:hover { background:var(--hov); }
.ddr .src { display:flex; align-items:center; gap:9px; font-weight:550; }
.ddr .c { text-align:right; font-variant-numeric:tabular-nums; color:var(--ink2); }
.ddr .c.hi { color:var(--ink); }
.cellsel { display:inline-flex; align-items:center; gap:6px; justify-content:flex-end; margin-left:auto; padding:2px 7px; border-radius:5px; box-shadow:0 0 0 1.5px #5e6ad2; color:var(--ink); font-variant-numeric:tabular-nums; }
.cellsel span { color:var(--ink3); font-size:10px; cursor:default; }
.tip { position:absolute; top:16px; right:14px; background:${dark ? "#1f2023" : "#fff"}; border-radius:8px; box-shadow:0 0 0 1px ${dark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.09)"}, 0 4px 14px rgba(0,0,0,${dark ? ".4" : ".08"}); padding:8px 11px; font-size:11.5px; }
.tip .t1 { display:flex; gap:8px; align-items:center; font-weight:600; }
.tip .t1 em { font-style:normal; color:var(--ink3); font-weight:400; }
.tip .t2 { color:var(--ink2); margin-top:2px; }
.chartbox { position:relative; }
`;

function linearBody(dark) {
  const seg = (id) => SEG[id][dark ? "dark" : "light"];
  return `<div class="wrap">
    <div class="crumb"><span class="g">Analytics</span><span class="g">›</span><b>Sync health</b><span class="g">···</span><span class="g">☆</span>
      <span class="icons"><span class="range">Last 7 days</span></span></div>
    <div class="row3">
      <div class="tile"><div class="tt">Items synced over time</div>
        ${stackedBars(dark)}
        <div class="legend">${["twitter", "pinterest", "instagram", "cosmos", "arena", "tiktok"].map((s) => `<span class="leg"><i style="background:${seg(s)}"></i>${TOP_ITEMS.find((t) => t.id === s)?.label ?? s}</span>`).join("")}</div>
      </div>
      <div class="tile"><div class="tt">Run outcomes<small>96 runs</small></div>
        <div class="mini-tbl">
          <div class="mth"><span>Outcome</span><span>Run count</span></div>
          ${OUTCOMES.map((o) => `<div class="mtr"><span class="dot ${o.st || ""}" style="${o.st === "" ? "background:var(--ink3)" : ""}"></span>${o.label}<span class="n">${o.v}</span></div>`).join("")}
        </div>
      </div>
      <div class="tile"><div class="tt">Median run duration</div>
        <div class="big"><div><div class="v">42s</div><div class="s">p95 · 1m 38s</div></div></div>
      </div>
    </div>
    <div class="row2">
      <div class="tile dd" style="padding:0"><div class="tt" style="margin-bottom:10px">Runs by source</div>
        <div class="ddh"><span>Source</span><span>Runs</span><span>Completed</span><span>Rate limited</span><span>Failed</span><span>Items</span></div>
        ${RUNS_BY_SOURCE.map((r) => {
          const it = TOP_ITEMS.find((x) => x.id === r.id);
          const rl = r.id === "pinterest" ? 6 : r.id === "twitter" ? 2 : 0;
          const fail = r.id === "youtube" ? 1 : r.id === "pinterest" ? 2 : 0;
          const done = r.v - rl - fail;
          const rlCell =
            r.id === "pinterest"
              ? `<span class="cellsel">6<span>✕</span></span>`
              : `<span class="c">${rl}</span>`;
          return `<div class="ddr"><span class="src">${chip(r.id, 18, 5)}${r.label}</span><span class="c hi">${r.v}</span><span class="c">${done}</span>${rlCell}<span class="c" style="${fail ? "color:var(--err)" : ""}">${fail}</span><span class="c hi">${it ? it.v : 0}</span></div>`;
        }).join("")}
      </div>
      <div class="tile"><div class="tt">Run duration<small>every run, colored by source</small></div>
        <div class="chartbox">${scatter(dark)}
          <div class="tip"><div class="t1">Pinterest <em>38m ago</em></div><div class="t2">Rate limited · 210 items · 1m 44s</div></div>
        </div>
      </div>
    </div>
  </div>`;
}

V(
  "an11-linear-dark.html",
  "Analytics · Linear Insights dark",
  "dark",
  linearCss(true),
  linearBody(true),
);
V(
  "an12-linear-light.html",
  "Analytics · Linear Insights light",
  "light",
  linearCss(false),
  linearBody(false),
);

/* ---------- an13 · Laravel Pulse (light) ---------- */

// Multi-line queue chart, Pulse-style: one line per series.
function pulseLines(series, w = 250, h = 44) {
  let out = "";
  series.forEach(({ color, seed, lift }) => {
    const rnd = seeded(seed);
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const x = (i * w) / 24;
      const y = h - 6 - lift * (h - 14) + (rnd() - 0.5) * 10;
      pts.push(`${x.toFixed(1)} ${Math.max(3, Math.min(h - 3, y)).toFixed(1)}`);
    }
    out += `<path d="M${pts.join(" L")}" stroke="${color}" stroke-width="1.4" fill="none" stroke-linejoin="round"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block" preserveAspectRatio="none">${out}</svg>`;
}

function storageDonut(pct, color = "#6d7ce0") {
  const C = 2 * Math.PI * 8;
  return `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="none" stroke="rgba(0,0,0,.1)" stroke-width="4"/><circle cx="11" cy="11" r="8" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="${(C * pct).toFixed(1)} ${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 11 11)"/></svg>`;
}

const pulseCss = `
body.light { background:#f4f4f6; }
.wrap { max-width: 960px; margin: 0 auto; padding: 24px 28px 80px; display:flex; flex-direction:column; gap:12px; }
.topbar { display:flex; align-items:center; gap:8px; padding:0 2px 2px; }
.topbar h1 { font-size:15px; font-weight:650; flex:1; letter-spacing:-.01em; }
.ranges { display:flex; gap:10px; font-size:12px; color:var(--ink3); font-weight:550; }
.ranges b { color:var(--ink); font-weight:650; }
.server { display:flex; align-items:center; gap:22px; padding:10px 16px; background:var(--panel); border-radius:10px; box-shadow:0 0 0 1px var(--hair); }
.server .host { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; }
.sv { display:flex; align-items:center; gap:9px; flex:1; min-width:0; }
.sv .l { font-size:10px; letter-spacing:.07em; color:var(--ink3); text-transform:uppercase; }
.sv .v { font-size:13px; font-weight:640; font-variant-numeric:tabular-nums; white-space:nowrap; }
.sv .v small { font-weight:450; color:var(--ink3); }
.sv svg.line { flex:1; min-width:40px; }
.cards { display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; }
.card { grid-column:span 2; background:var(--panel); border-radius:10px; box-shadow:0 0 0 1px var(--hair); padding:0; min-width:0; overflow:hidden; }
.card.w3 { grid-column:span 3; } .card.w6 { grid-column:span 6; }
.ch { display:flex; align-items:baseline; gap:7px; padding:12px 15px 10px; }
.ch .ic { font-size:11px; color:var(--ink3); } .ch .t { font-size:12.5px; font-weight:640; }
.ch .sub { font-size:10.5px; color:var(--ink3); } .ch .end { margin-left:auto; font-size:10.5px; color:var(--ink3); }
.cols { display:flex; padding:0 15px 8px; gap:18px; }
.cstat .n { font-size:16px; font-weight:640; font-variant-numeric:tabular-nums; }
.cstat .cl { font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink3); }
.legend { display:flex; flex-wrap:wrap; gap:9px; padding:0 15px 8px; }
.leg { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--ink2); }
.leg i { width:8px; height:2px; border-radius:1px; }
.chart-pad { padding:2px 15px 12px; }
.qlabel { padding:0 15px; font-size:11px; font-weight:600; color:var(--ink2); }
.tbl-h { display:flex; gap:10px; padding:7px 15px; font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3); border-top:1px solid var(--hair); }
.rrow { display:flex; align-items:center; gap:10px; padding:7px 15px; font-size:12px; }
.rrow:nth-child(odd) { background:var(--hov); }
.rrow .name { flex:1; display:flex; align-items:center; gap:9px; font-weight:550; overflow:hidden; white-space:nowrap; }
.rrow .name small { font-weight:400; color:var(--ink3); }
.rrow .cnt { font-size:13px; font-weight:640; font-variant-numeric:tabular-nums; }
.rrow .sub2 { font-size:11px; color:var(--ink3); font-variant-numeric:tabular-nums; width:64px; text-align:right; }
.mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size:11px; }
.mrow { display:flex; align-items:center; gap:10px; padding:8px 15px; }
.mrow:nth-child(odd) { background:var(--hov); }
.mrow .q { flex:1; min-width:0; } .mrow .q .p { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink); font-weight:520; }
.mrow .q .s { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10.5px; color:var(--ink3); margin-top:1px; }
.mrow .num { font-variant-numeric:tabular-nums; font-size:12px; font-weight:600; width:52px; text-align:right; }
.mrow .num small { display:block; font-size:9px; font-weight:500; letter-spacing:.06em; color:var(--ink3); }
.mchip { font-size:9.5px; font-weight:700; letter-spacing:.05em; padding:2px 6px; border-radius:4px; flex:none; }
.mchip.ok { color:var(--ok); background:var(--okdim); } .mchip.warn { color:var(--warn); background:var(--warndim); }
.mchip.err { color:var(--err); background:rgba(207,63,63,.1); } .mchip.run { color:var(--run); background:var(--rundim); }
.sortby { margin-left:auto; font-size:10.5px; color:var(--ink2); padding:2px 8px; border-radius:5px; box-shadow:0 0 0 1px var(--line); }
`;

const PULSE_QUEUE = [
  { color: "#6d7ce0", label: "Queued", seed: 31, lift: 0.55 },
  { color: "#38bdf8", label: "Processing", seed: 37, lift: 0.35 },
  { color: "#4ade80", label: "Processed", seed: 43, lift: 0.7 },
  { color: "#fbbf24", label: "Rate limited", seed: 47, lift: 0.18 },
  { color: "#f87171", label: "Failed", seed: 53, lift: 0.08 },
];

V(
  "an13-pulse.html",
  "Analytics · Pulse",
  "light",
  pulseCss,
  `<div class="wrap">
    <div class="topbar"><h1>Analytics</h1><div class="ranges"><b>1h</b><span>6h</span><span>24h</span><span>7d</span></div></div>

    <div class="server">
      <span class="host">⌂ Pond library</span>
      <span class="sv"><span class="l">Items</span><span class="v">24,982</span>${spark("#6d7ce0", 8, 120, 18)}</span>
      <span class="sv"><span class="l">Today</span><span class="v">+183</span>${spark("#4ade80", 12, 120, 18)}</span>
      <span class="sv" style="flex:none"><span class="l">Storage</span><span class="v">4.2 GB <small>/ 10 GB</small></span>${storageDonut(0.42)}</span>
    </div>

    <div class="cards">
      <div class="card"><div class="ch"><span class="t">Source usage</span><span class="sub">past hour</span><span class="end">items synced</span></div>
        ${TOP_ITEMS.map((r) => `<div class="rrow"><span class="name">${chip(r.id, 20, 6)}${r.label}<small>${{ twitter: "bookmarks", pinterest: "pins", instagram: "saved", cosmos: "elements", arena: "blocks", tiktok: "favorites" }[r.id]}</small></span><span class="cnt">${r.v}</span></div>`).join("")}
      </div>

      <div class="card"><div class="ch"><span class="t">Sync queue</span><span class="sub">past hour</span></div>
        <div class="legend">${PULSE_QUEUE.map((q) => `<span class="leg"><i style="background:${q.color}"></i>${q.label}</span>`).join("")}</div>
        <div class="qlabel">scheduled</div>
        <div class="chart-pad">${pulseLines(PULSE_QUEUE.slice(0, 3))}</div>
        <div class="qlabel">manual</div>
        <div class="chart-pad">${pulseLines(PULSE_QUEUE.slice(2))}</div>
      </div>

      <div class="card"><div class="ch"><span class="t">Runs</span><span class="sub">past hour</span></div>
        <div class="cols">
          <span class="cstat"><span class="n">96</span><div class="cl">Runs</div></span>
          <span class="cstat"><span class="n">90</span><div class="cl">Completed</div></span>
          <span class="cstat"><span class="n" style="color:var(--warn)">8</span><div class="cl">Limited</div></span>
          <span class="cstat"><span class="n" style="color:var(--err)">3</span><div class="cl">Failed</div></span>
        </div>
        <div class="tbl-h"><span style="flex:1">Source</span><span>Runs</span><span style="width:64px;text-align:right">Success</span></div>
        ${RUNS_BY_SOURCE.slice(0, 4)
          .map(
            (r) =>
              `<div class="rrow"><span class="name">${chip(r.id, 18, 5)}${r.label}</span><span class="cnt" style="font-size:12px">${r.v}</span><span class="sub2">${r.id === "pinterest" ? "73%" : r.id === "youtube" ? "89%" : "100%"}</span></div>`,
          )
          .join("")}
      </div>

      <div class="card w3"><div class="ch"><span class="t">Slow runs</span><span class="sub">30s threshold, past hour</span><span class="end">COUNT · SLOWEST</span></div>
        ${[
          {
            p: "pinterest:boards · full harvest",
            s: "rate limited twice, resumed",
            n: "6",
            d: "1m 44s",
          },
          {
            p: "twitter:bookmarks · incremental",
            s: "media download queue backed up",
            n: "12",
            d: "58s",
          },
          {
            p: "instagram:saved · incremental",
            s: "session refresh mid-run",
            n: "4",
            d: "51s",
          },
        ]
          .map(
            (r) =>
              `<div class="mrow mono"><span class="q"><span class="p">${r.p}</span><span class="s">${r.s}</span></span><span class="num">${r.n}<small>COUNT</small></span><span class="num">${r.d}<small>SLOWEST</small></span></div>`,
          )
          .join("")}
      </div>

      <div class="card w3"><div class="ch"><span class="t">Failures</span><span class="sub">past hour</span><span class="sortby">Sort by: count ▾</span></div>
        ${[
          {
            chipCls: "err",
            chipTxt: "AUTH",
            p: "YouTube · session expired",
            s: "renew by opening youtube.com in browser tab",
            latest: "3h ago",
            n: "1",
          },
          {
            chipCls: "warn",
            chipTxt: "LIMIT",
            p: "Pinterest · 429 too many requests",
            s: "auto-backoff · resumes 1:20",
            latest: "38m ago",
            n: "6",
          },
          {
            chipCls: "err",
            chipTxt: "MEDIA",
            p: "TikTok · video fetch failed",
            s: "2 items retried and recovered",
            latest: "5h ago",
            n: "2",
          },
        ]
          .map(
            (r) =>
              `<div class="mrow"><span class="mchip ${r.chipCls}">${r.chipTxt}</span><span class="q"><span class="p" style="font-size:12px">${r.p}</span><span class="s">${r.s}</span></span><span class="num" style="width:58px">${r.latest}<small>LATEST</small></span><span class="num" style="width:36px">${r.n}<small>COUNT</small></span></div>`,
          )
          .join("")}
      </div>
    </div>
  </div>`,
);

/* ---------- write ---------- */

for (const v of variants) {
  writeFileSync(join(OUT, v.file), page(v));
  console.log("wrote", v.file);
}
