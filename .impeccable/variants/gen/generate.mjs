import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVITY,
  area,
  chip,
  page,
  SOURCES,
  seeded,
  spark,
  statusText,
  ticks,
} from "./lib.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..");
const variants = [];
const V = (file, title, theme, css, body) =>
  variants.push({ file, title, theme, css, body });

const sparkColor = (s, dark) =>
  s.state === "run"
    ? dark
      ? "#7dd3fc"
      : "#4472d4"
    : s.state === "warn"
      ? dark
        ? "#fbbf24"
        : "#b57e1c"
      : dark
        ? "#4ade80"
        : "#3c9a52";

/* ---------- A. Status-page family ---------- */
const statusCss = `
.wrap { max-width: 640px; margin: 0 auto; padding: 44px 32px 80px; display:flex; flex-direction:column; gap:20px; }
.top { display:flex; align-items:center; gap:8px; } .top h1 { font-size:14px; font-weight:600; color:var(--ink2); flex:1; }
.verdict { display:flex; flex-direction:column; align-items:center; gap:9px; padding:22px 0 8px; text-align:center; }
.glyph { width:42px; height:42px; display:grid; place-items:center; background:var(--okdim); color:var(--ok); border-radius:50%; font-size:18px; }
.vt { font-size:19px; font-weight:650; letter-spacing:-.02em; } .vs { font-size:12.5px; color:var(--ink2); } .vs b { color:var(--ink); font-weight:600; }
.src { padding:12px 16px 13px; border-top:1px solid var(--hair); } .src:first-child { border-top:0; }
.srct { display:flex; align-items:center; gap:10px; } .name { font-size:13px; font-weight:550; flex:1; }
.state { font-size:12px; color:var(--ink3); }
.panel-head { display:flex; padding:11px 16px; border-bottom:1px solid var(--hair); font-size:12px; font-weight:600; color:var(--ink2); }
.panel-head span:last-child { margin-left:auto; font-weight:400; color:var(--ink3); font-size:11.5px; }
.ticks { margin:9px 0 0 32px; } .foot { display:flex; margin:5px 0 0 32px; font-size:10.5px; color:var(--ink3); } .foot span:last-child { margin-left:auto; }
.spark { margin-left:auto; }`;

function statusBody({ withTicks = true, withSparks = false, dark = false }) {
  const rows = SOURCES.map(
    (s, i) => `
    <div class="src">
      <div class="srct">${chip(s.id, 24, 6)}<span class="name">${s.name}</span>
      ${withSparks ? spark(sparkColor(s, dark), i + 5, 84, 22) : ""}
      <span class="state">${statusText(s)}</span></div>
      ${withTicks ? `${ticks(i * 7 + 3, 30, s.state === "warn" ? "w" : "")}<div class="foot"><span>${s.total} items</span><span>${s.today ? `+${s.today} today` : ""}</span></div>` : ""}
    </div>`,
  ).join("");
  return `<div class="wrap">
    <div class="top"><h1>Sources</h1><button class="btn">Pause all</button><button class="btn primary">Sync all</button></div>
    <div class="verdict"><span class="glyph">✓</span><div class="vt">Your pond is healthy</div>
    <div class="vs"><b>5,056</b> items from 7 sources · <b>12</b> new today · last run 2 minutes ago</div></div>
    <div class="panel">${withTicks ? `<div class="panel-head"><span>Past 30 days</span><span>items collected per day</span></div>` : ""}${rows}</div>
  </div>`;
}
V(
  "v10-status-ticks-light.html",
  "Status page · tick bars · light",
  "light",
  statusCss,
  statusBody({}),
);
V(
  "v11-status-ticks-dark.html",
  "Status page · tick bars · dark",
  "dark",
  statusCss,
  statusBody({ dark: true }),
);
V(
  "v12-status-minimal-light.html",
  "Status page · minimal rows",
  "light",
  statusCss,
  statusBody({ withTicks: false }),
);
V(
  "v13-status-sparks-light.html",
  "Status page · sparklines",
  "light",
  statusCss,
  statusBody({ withTicks: false, withSparks: true }),
);

/* ---------- B. Portfolio hero family ---------- */
const portCss = `
.wrap { max-width:680px; margin:0 auto; padding:48px 32px 80px; }
h1 { font-size:20px; font-weight:650; letter-spacing:-.02em; }
.big { margin-top:10px; display:flex; align-items:baseline; gap:10px; }
.bv { font-size:32px; font-weight:700; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.bd { font-size:13px; font-weight:600; color:var(--ok); } .bs { margin-top:3px; font-size:12.5px; color:var(--ink2); }
.hdr { display:flex; align-items:flex-end; } .hdr .actions { margin-left:auto; display:flex; gap:8px; }
.rows { margin-top:24px; }
.row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-top:1px solid var(--hair); }
.row:first-child { border-top:0; } .row:hover { background:var(--hov); }
.rname { font-size:13px; font-weight:550; width:96px; } .rkind { font-size:11px; color:var(--ink3); }
.rright { margin-left:auto; display:flex; gap:18px; align-items:center; font-size:12.5px; color:var(--ink3); font-variant-numeric:tabular-nums; }
.rright b { color:var(--ink); font-weight:600; }
.addrow { padding:11px 16px; border-top:1px solid var(--hair); font-size:12.5px; color:var(--ink3); cursor:pointer; }
.addrow:hover { color:var(--ink); }
.cards { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:20px; }
.card { padding:14px 16px; } .ct { font-size:11.5px; color:var(--ink3); } .cv { margin-top:3px; font-size:16px; font-weight:650; font-variant-numeric:tabular-nums; }
.cs { margin-top:1px; font-size:11px; color:var(--ink3); }`;

function portBody({ cards = false, dark = false }) {
  const rows = SOURCES.map(
    (s, i) => `
    <div class="row">${chip(s.id, 24, 7)}
      <div><div class="rname">${s.name}</div><div class="rkind">${s.kind}</div></div>
      <span style="font-size:12px">${statusText(s)}</span>
      <span class="rright">${spark(sparkColor(s, dark), i + 2)}<b>${s.total}</b></span>
    </div>`,
  ).join("");
  return `<div class="wrap">
    <div class="hdr"><div><h1>Sources</h1>
      <div class="big"><span class="bv">5,056</span><span class="bd">+12 today</span></div>
      <div class="bs">items collected from 7 sources · all healthy · last run 2m ago</div></div>
      <div class="actions"><button class="btn">Pause all</button><button class="btn primary">Sync all</button></div></div>
    ${
      cards
        ? `<div class="cards">
      <div class="card panel"><div class="ct">Collected · 30d</div><div class="cv">341</div><div class="cs">↗ 8% vs prior</div></div>
      <div class="card panel"><div class="ct">Enriched</div><div class="cv">98%</div><div class="cs">73 in queue</div></div>
      <div class="card panel"><div class="ct">Failures · 7d</div><div class="cv">1</div><div class="cs">rate limit only</div></div></div>`
        : ""
    }
    <div class="rows panel">${rows}<div class="addrow">+ Connect Reddit or Threads</div></div>
  </div>`;
}
V(
  "v14-portfolio-light.html",
  "Portfolio hero · light",
  "light",
  portCss,
  portBody({}),
);
V(
  "v15-portfolio-dark.html",
  "Portfolio hero · dark",
  "dark",
  portCss,
  portBody({ dark: true }),
);
V(
  "v16-portfolio-cards-light.html",
  "Portfolio hero + stat cards",
  "light",
  portCss,
  portBody({ cards: true }),
);

/* ---------- C. Tile grid family ---------- */
const tileCss = `
.wrap { max-width:820px; margin:0 auto; padding:44px 32px 80px; }
.hdr { display:flex; align-items:center; margin-bottom:8px; } h1 { font-size:20px; font-weight:650; letter-spacing:-.02em; flex:1; }
.sub { font-size:12.5px; color:var(--ink2); margin-bottom:20px; } .sub b { color:var(--ink); font-weight:600; }
.grid { display:grid; gap:12px; } .grid.c2 { grid-template-columns:1fr 1fr; } .grid.c3 { grid-template-columns:1fr 1fr 1fr; }
.tile { padding:16px; display:flex; flex-direction:column; gap:12px; cursor:pointer; }
.tile:hover { box-shadow:0 0 0 1px var(--line), 0 2px 8px rgba(0,0,0,.05); }
.tt { display:flex; align-items:center; gap:10px; } .tname { font-size:13px; font-weight:600; flex:1; }
.tstate { font-size:11.5px; color:var(--ink3); }
.tbot { display:flex; align-items:baseline; } .tnum { font-size:19px; font-weight:650; font-variant-numeric:tabular-nums; }
.tdelta { margin-left:8px; font-size:11.5px; font-weight:600; color:var(--ok); }
.tspark { margin-left:auto; }
.tile.add { align-items:center; justify-content:center; color:var(--ink3); font-size:12.5px; box-shadow:0 0 0 1px var(--hair); background:transparent; border:1px dashed var(--line); border-radius:12px; min-height:96px; }
.tile.add:hover { color:var(--ink); }`;

function tileBody({ cols = 2, sparks = false, dark = false }) {
  const tiles = SOURCES.map(
    (s, i) => `
    <div class="tile panel">
      <div class="tt">${chip(s.id, 26, 7)}<span class="tname">${s.name}</span><span class="dot ${s.state === "ok" ? "" : s.state}"></span></div>
      <div class="tstate">${statusText(s)}</div>
      <div class="tbot"><span class="tnum">${s.total}</span>${s.today ? `<span class="tdelta">+${s.today}</span>` : ""}${sparks ? `<span class="tspark">${spark(sparkColor(s, dark), i + 4, 64, 18)}</span>` : ""}</div>
    </div>`,
  ).join("");
  return `<div class="wrap">
    <div class="hdr"><h1>Sources</h1><button class="btn">Pause all</button>&nbsp;<button class="btn primary">Sync all</button></div>
    <div class="sub"><b>5,056</b> items · <b>+12</b> today · all sources healthy · last run 2m ago</div>
    <div class="grid c${cols}">${tiles}<div class="tile add">+ Connect Reddit or Threads</div></div>
  </div>`;
}
V(
  "v17-tiles-2col-light.html",
  "Tiles · 2 col",
  "light",
  tileCss,
  tileBody({ cols: 2 }),
);
V(
  "v18-tiles-3col-sparks-light.html",
  "Tiles · 3 col · sparklines",
  "light",
  tileCss,
  tileBody({ cols: 3, sparks: true }),
);
V(
  "v19-tiles-2col-dark.html",
  "Tiles · 2 col · dark",
  "dark",
  tileCss,
  tileBody({ cols: 2, sparks: true, dark: true }),
);

/* ---------- D. Dense rows (Vercel) ---------- */
const rowsCss = `
.wrap { max-width:900px; margin:0 auto; padding:40px 32px 80px; }
.hdr { display:flex; align-items:center; padding-bottom:20px; } h1 { font-size:21px; font-weight:600; letter-spacing:-.02em; flex:1; }
.hdr .actions { display:flex; gap:8px; }
.list { border-radius:10px; overflow:hidden; }
.item { display:flex; align-items:center; gap:16px; padding:13px 16px; border-top:1px solid var(--hair); }
.item:first-child { border-top:0; } .item:hover { background:var(--hov); }
.cid { width:180px; } .cname { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:550; }
.csub { margin:2px 0 0 26px; font-size:11.5px; color:var(--ink3); }
.cstat { width:170px; } .stt { display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--ink2); }
.stsub { margin:2px 0 0 13px; font-size:11.5px; color:var(--ink3); }
.cdet { flex:1; font-size:12.5px; color:var(--ink2); } .cdet .mono { font-family:ui-monospace,"SF Mono",monospace; font-size:11px; color:var(--ink3); }
.ctime { width:90px; text-align:right; font-size:12.5px; color:var(--ink3); font-variant-numeric:tabular-nums; }`;

function rowsBody({ badges = false }) {
  const label = { ok: "Synced", run: "Syncing", warn: "Rate limited" };
  const sub = {
    ok: (s) => `42s (${s.last})`,
    run: () => "1m 12s",
    warn: () => "resumes 1:20",
  };
  const det = {
    twitter: "+4 items · 2 videos captured",
    cosmos: "12 new so far · fetching media",
    pinterest: "Stopped after 210 items · retries automatically",
    instagram: "No new items",
    arena: "No new blocks in 4 channels",
    tiktok: "No new items",
    youtube: "No new items",
  };
  const rows = SOURCES.map(
    (s) => `
    <div class="item">
      <div class="cid"><div class="cname">${chip(s.id, 18, 5)}${s.name}</div><div class="csub">${s.kind}</div></div>
      <div class="cstat">${
        badges
          ? `<span class="badge ${s.state === "warn" ? "warn" : s.state === "run" ? "run" : "ok"}">${label[s.state]}</span>`
          : `<div class="stt"><span class="dot ${s.state === "ok" ? "" : s.state}"></span>${label[s.state]}</div><div class="stsub">${sub[s.state](s)}</div>`
      }</div>
      <div class="cdet">${det[s.id]}<br/><span class="mono">${s.total} total</span></div>
      <div class="ctime">${s.last}</div>
    </div>`,
  ).join("");
  return `<div class="wrap">
    <div class="hdr"><h1>Sources</h1><div class="actions"><button class="btn">Add source</button><button class="btn primary">Sync all</button></div></div>
    <div class="list panel">${rows}</div></div>`;
}
V(
  "v20-rows-dense-light.html",
  "Dense rows · dot status",
  "light",
  rowsCss,
  rowsBody({}),
);
V(
  "v21-rows-dense-dark.html",
  "Dense rows · dark",
  "dark",
  rowsCss,
  rowsBody({}),
);
V(
  "v22-rows-badges-light.html",
  "Dense rows · badges",
  "light",
  rowsCss,
  rowsBody({ badges: true }),
);

/* ---------- E. Split pane ---------- */
const splitCss = `
.shell { display:grid; grid-template-columns:300px 1fr; min-height:100vh; }
.rail { border-right:1px solid var(--hair); padding:24px 0; }
.rail h1 { font-size:13px; font-weight:650; padding:0 20px 12px; }
.ritem { display:flex; align-items:center; gap:10px; padding:9px 20px; cursor:pointer; font-size:12.5px; }
.ritem:hover { background:var(--hov); } .ritem.sel { background:var(--hov); box-shadow:inset 2px 0 0 var(--ink); }
.rname { font-weight:550; flex:1; } .rcount { font-size:11.5px; color:var(--ink3); font-variant-numeric:tabular-nums; }
.main { padding:32px 36px; }
.mh { display:flex; align-items:center; gap:12px; } .mh h2 { font-size:18px; font-weight:650; flex:1; }
.msub { margin-top:4px; font-size:12.5px; color:var(--ink2); }
.stats { display:flex; gap:36px; margin:24px 0; }
.stat .l { font-size:11.5px; color:var(--ink3); } .stat .v { margin-top:2px; font-size:16px; font-weight:650; font-variant-numeric:tabular-nums; }
.runs { margin-top:8px; }
.runs h3 { font-size:12px; font-weight:600; color:var(--ink2); padding-bottom:8px; }
.run { display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px solid var(--hair); font-size:12.5px; }
.run .what { color:var(--ink2); flex:1; } .run .t { color:var(--ink3); font-variant-numeric:tabular-nums; }
.area { display:block; width:100%; margin-top:8px; }`;

function splitBody({ dark = false }) {
  const rail = SOURCES.map(
    (s, i) => `
    <div class="ritem ${i === 2 ? "sel" : ""}">${chip(s.id, 20, 6)}<span class="rname">${s.name}</span>
    <span class="dot ${s.state === "ok" ? "" : s.state}"></span><span class="rcount">${s.total}</span></div>`,
  ).join("");
  return `<div class="shell">
    <div class="rail"><h1>Sources</h1>${rail}
      <div class="ritem" style="color:var(--ink3)">＋ <span style="flex:1">Connect more</span></div></div>
    <div class="main">
      <div class="mh">${chip("pinterest", 30, 8)}<h2>Pinterest</h2><button class="btn">Backfill</button><button class="btn primary">Retry now</button></div>
      <div class="msub"><span style="color:var(--warn);font-weight:550">Rate limited</span> — stopped after 210 items at 12:40. Resumes automatically at 1:20.</div>
      <div class="stats">
        <div class="stat"><div class="l">Items</div><div class="v">1,104</div></div>
        <div class="stat"><div class="l">Today</div><div class="v">+0</div></div>
        <div class="stat"><div class="l">Boards</div><div class="v">14</div></div>
        <div class="stat"><div class="l">Last success</div><div class="v">11:58 AM</div></div>
      </div>
      ${area(dark ? "#fbbf24" : "#b57e1c", 700, 110, 0.1)}
      <div class="runs"><h3>Recent runs</h3>
        <div class="run"><span class="st warn">BACKED OFF</span><span class="what">Incremental sync — rate limit after 210 items</span><span class="t">12:40 PM</span></div>
        <div class="run"><span class="st ok">COMPLETED</span><span class="what">Incremental sync — 18 items</span><span class="t">8:02 AM</span></div>
        <div class="run"><span class="st ok">COMPLETED</span><span class="what">Incremental sync — 4 items</span><span class="t">Yesterday</span></div>
        <div class="run"><span class="st ok">COMPLETED</span><span class="what">Metadata refresh — 96 items</span><span class="t">Yesterday</span></div>
      </div>
    </div></div>`;
}
V(
  "v23-split-light.html",
  "Split pane · source detail",
  "light",
  splitCss,
  splitBody({}),
);
V(
  "v24-split-dark.html",
  "Split pane · dark",
  "dark",
  splitCss,
  splitBody({ dark: true }),
);

/* ---------- F. Sidebar dashboards ---------- */
const mercCss = `
.shell { display:grid; grid-template-columns:200px 1fr; min-height:100vh; }
.nav { border-right:1px solid var(--hair); padding:22px 14px; font-size:12.5px; color:var(--ink2); }
.nav .brand { font-weight:650; color:var(--ink); padding:0 8px 18px; font-size:13px; }
.nitem { padding:7px 8px; border-radius:6px; cursor:pointer; } .nitem.sel { background:var(--hov); color:var(--ink); font-weight:550; }
.main { padding:30px 36px; max-width:900px; }
.hello { font-size:18px; font-weight:650; letter-spacing:-.01em; }
.quick { display:flex; gap:8px; margin:14px 0 18px; }
.two { display:grid; grid-template-columns:1.4fr 1fr; gap:14px; }
.bal { padding:18px 20px; } .bl { font-size:12px; color:var(--ink3); } .bv { margin-top:4px; font-size:24px; font-weight:700; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.bd { font-size:12px; color:var(--ok); font-weight:600; margin-top:2px; }
.area { display:block; width:100%; margin-top:12px; }
.accounts { padding:16px 18px; } .accounts h3 { font-size:12.5px; font-weight:600; padding-bottom:8px; }
.acc { display:flex; align-items:center; gap:9px; padding:7px 0; font-size:12.5px; border-top:1px solid var(--hair); }
.acc:first-of-type { border-top:0; } .acc .n { flex:1; font-weight:530; } .acc .v { color:var(--ink3); font-variant-numeric:tabular-nums; }
.movement { margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.mv { padding:15px 18px; } .mv .l { font-size:12px; color:var(--ink3); } .mv .v { margin-top:3px; font-size:16px; font-weight:650; }
.mv .s { margin-top:8px; font-size:11.5px; color:var(--ink3); border-top:1px solid var(--hair); padding-top:8px; }`;

function mercBody({ dark = false }) {
  const accs = SOURCES.slice(0, 5)
    .map(
      (s) => `
    <div class="acc">${chip(s.id, 18, 5)}<span class="n">${s.name}</span><span class="dot ${s.state === "ok" ? "" : s.state}"></span><span class="v num">${s.total}</span></div>`,
    )
    .join("");
  return `<div class="shell">
    <div class="nav"><div class="brand">◍ Pond</div>
      <div class="nitem">Library</div><div class="nitem sel">Sources</div><div class="nitem">Ask</div><div class="nitem">Tags</div><div class="nitem">Settings</div></div>
    <div class="main">
      <div class="hello">Welcome back</div>
      <div class="quick"><button class="btn primary">Sync all</button><button class="btn">Add source</button><button class="btn">Import</button><button class="btn">Retry failed</button></div>
      <div class="two">
        <div class="bal panel"><div class="bl">Pond total ◍</div><div class="bv">5,056</div><div class="bd">+12 today</div>
          ${area(dark ? "#8b8bf7" : "#6e6ee0", 460, 120, 0.14)}</div>
        <div class="accounts panel"><h3>Sources</h3>${accs}
          <div class="acc" style="color:var(--ink3)">＋ <span class="n" style="font-weight:400">Connect more</span></div></div>
      </div>
      <div class="movement">
        <div class="mv panel"><div class="l">Collected today</div><div class="v">+12 items</div><div class="s">all from Cosmos · 3 with video</div></div>
        <div class="mv panel"><div class="l">Needs attention</div><div class="v" style="color:var(--warn)">1 source</div><div class="s">Pinterest rate limited · resumes 1:20</div></div>
      </div>
    </div></div>`;
}
V(
  "v25-mercury-light.html",
  "Mercury dashboard · light",
  "light",
  mercCss,
  mercBody({}),
);
V(
  "v26-mercury-dark.html",
  "Mercury dashboard · dark",
  "dark",
  mercCss,
  mercBody({ dark: true }),
);

/* ---------- G. Narrated recap family ---------- */
const recapCss = `
.wrap { max-width:660px; margin:0 auto; padding:48px 32px 80px; }
.kick { font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--ink3); }
h1 { margin-top:8px; font-size:22px; font-weight:650; letter-spacing:-.02em; }
h1 .a { color:var(--ok); }
.recap { margin-top:14px; font-size:14px; line-height:1.7; color:var(--ink2); }
.recap b { color:var(--ink); font-weight:600; } .recap .w { color:var(--warn); font-weight:600; } .recap .g { color:var(--ok); font-weight:600; }
.actions { display:flex; gap:8px; margin-top:20px; }
.rows { margin-top:32px; }
.row { display:flex; align-items:center; gap:12px; padding:11px 2px; border-top:1px solid var(--hair); }
.row:last-child { border-bottom:1px solid var(--hair); }
.rname { font-size:13px; font-weight:550; width:100px; } .rstate { font-size:12px; }
.rr { margin-left:auto; font-size:12.5px; color:var(--ink3); font-variant-numeric:tabular-nums; } .rr b { color:var(--ink); font-weight:600; }
.label { margin:28px 0 4px; font-size:12px; font-weight:600; color:var(--ink2); }`;

function recapBody() {
  const rows = SOURCES.map(
    (s) => `
    <div class="row">${chip(s.id, 22, 6)}<span class="rname">${s.name}</span>
    <span class="rstate">${statusText(s)}</span><span class="rr">${s.today ? `+${s.today} · ` : ""}<b>${s.total}</b></span></div>`,
  ).join("");
  return `<div class="wrap">
    <div class="kick">Tuesday, July 7 · sync report</div>
    <h1>Your pond is <span class="a">growing</span></h1>
    <div class="recap">Pond collected <b>12 items</b> today, all from <b>Cosmos</b> — mostly type and layout references. Twitter added <span class="g">4 bookmarks</span> overnight, two with video captured at full quality. <b>Pinterest</b> hit a rate limit at 12:40 and is <span class="w">backing off</span>; it resumes automatically at 1:20. Everything else is quiet and up to date.</div>
    <div class="actions"><button class="btn primary">Sync all</button><button class="btn">View activity</button></div>
    <div class="label">Sources</div>
    <div class="rows">${rows}</div>
  </div>`;
}
V(
  "v27-recap-light.html",
  "Narrated recap · light",
  "light",
  recapCss,
  recapBody(),
);
V(
  "v28-recap-dark.html",
  "Narrated recap · dark",
  "dark",
  recapCss,
  recapBody(),
);

/* ---------- H. Activity log family ---------- */
const logCss = `
.wrap { max-width:860px; margin:0 auto; padding:44px 32px 80px; }
.hdr { text-align:center; padding-bottom:28px; }
h1 { font-size:24px; font-weight:650; letter-spacing:-.02em; }
.hsub { margin-top:6px; font-size:12.5px; color:var(--ink2); } .hsub b { color:var(--ok); font-weight:600; }
.strip { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; padding-bottom:20px; }
.tile { padding:10px 8px; text-align:center; cursor:pointer; }
.tn { margin-top:6px; font-size:11px; font-weight:550; } .ts { margin-top:1px; font-size:10px; color:var(--ink3); }
.ts.ok { color:var(--ok); } .ts.run { color:var(--run); } .ts.warn { color:var(--warn); }
table { width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border-radius:12px; }
thead th { font-size:10.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ink3); text-align:left; padding:10px 14px; border-bottom:1px solid var(--hair); }
tbody td { padding:11px 14px; border-top:1px solid var(--hair); font-size:12.5px; color:var(--ink2); }
tbody tr:first-child td { border-top:0; } tbody tr:hover td { background:var(--hov); }
.srccell { display:flex; align-items:center; gap:8px; font-weight:550; color:var(--ink); }
.time { color:var(--ink3); font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; }
.mono body, .mono td, .mono th { font-family: ui-monospace, "SF Mono", monospace; }`;

function logBody({ mono = false }) {
  const strip = SOURCES.map(
    (s) => `
    <div class="tile panel">${chip(s.id, 22, 6)}<div class="tn">${s.name}</div>
    <div class="ts ${s.state === "ok" ? "ok" : s.state}">${s.state === "ok" ? "synced" : s.state === "run" ? "syncing" : "limited"}</div></div>`,
  ).join("");
  const rows = ACTIVITY.map(
    (a) => `
    <tr><td><span class="srccell">${chip(a.id, 16, 4)}${a.name}</span></td>
    <td${mono ? ` style="font-family:ui-monospace,'SF Mono',monospace;font-size:11.5px"` : ""}>${a.what}</td>
    <td><span class="st ${a.st === "warn" ? "warn" : a.st}">${a.stLabel}</span></td>
    <td class="time">${a.time}</td></tr>`,
  ).join("");
  return `<div class="wrap">
    <div class="hdr"><h1>Activity</h1><div class="hsub">5,056 items collected · <b>+12 today</b> · 7 sources connected</div></div>
    <div class="strip">${strip}</div>
    <table class="panel"><thead><tr><th>Source</th><th>Run</th><th>Status</th><th style="text-align:right">Time</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
V("v29-log-light.html", "Activity log · light", "light", logCss, logBody({}));
V(
  "v30-log-mono-dark.html",
  "Activity log · terminal dark",
  "dark",
  logCss,
  logBody({ mono: true }),
);

/* ---------- I. Timeline family ---------- */
const tlCss = `
.wrap { max-width:620px; margin:0 auto; padding:48px 32px 80px; }
.hdr { display:flex; align-items:baseline; padding-bottom:26px; } h1 { font-size:20px; font-weight:650; flex:1; letter-spacing:-.02em; }
.hs { font-size:12.5px; color:var(--ink2); }
.day { font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--ink3); margin:20px 0 6px 30px; }
.ev { position:relative; display:flex; gap:14px; padding:10px 0 10px 30px; }
.ev::before { content:""; position:absolute; left:8px; top:0; bottom:0; width:1px; background:var(--hair); }
.ev .marker { position:absolute; left:5px; top:16px; width:7px; height:7px; border-radius:50%; background:var(--ok); box-shadow:0 0 0 3px var(--panel); }
.ev.run .marker { background:var(--run); } .ev.warn .marker { background:var(--warn); }
.etext { font-size:13px; color:var(--ink2); line-height:1.55; flex:1; }
.etext b { color:var(--ink); font-weight:600; } .etext .g { color:var(--ok); font-weight:600; } .etext .w { color:var(--warn); font-weight:600; }
.etime { font-size:11.5px; color:var(--ink3); white-space:nowrap; padding-top:1px; font-variant-numeric:tabular-nums; }`;

function tlBody() {
  return `<div class="wrap">
    <div class="hdr"><h1>Sources</h1><span class="hs">5,056 items · +12 today · <span style="color:var(--ok);font-weight:600">healthy</span></span></div>
    <div class="day">Now</div>
    <div class="ev run"><span class="marker"></span><span class="etext">${chip("cosmos", 18, 5)} <b>Cosmos</b> is syncing — <span class="g">12 new</span> items so far, mostly type &amp; layout references.</span><span class="etime">now</span></div>
    <div class="day">Earlier today</div>
    <div class="ev warn"><span class="marker"></span><span class="etext">${chip("pinterest", 18, 5)} <b>Pinterest</b> hit a <span class="w">rate limit</span> after 210 items — backing off, resumes 1:20.</span><span class="etime">12:40</span></div>
    <div class="ev"><span class="marker"></span><span class="etext">${chip("twitter", 18, 5)} <b>Twitter</b> synced — <span class="g">+4 bookmarks</span>, 2 videos captured at full quality.</span><span class="etime">12:02</span></div>
    <div class="ev"><span class="marker"></span><span class="etext">${chip("instagram", 18, 5)} <b>Instagram</b> synced — no new saved posts.</span><span class="etime">11:47</span></div>
    <div class="ev"><span class="marker"></span><span class="etext">${chip("arena", 18, 5)} <b>Are.na</b> synced — nothing new across 4 channels.</span><span class="etime">10:58</span></div>
    <div class="day">Yesterday</div>
    <div class="ev"><span class="marker"></span><span class="etext">${chip("youtube", 18, 5)} <b>YouTube</b> metadata refresh — 22 items updated.</span><span class="etime">21:31</span></div>
    <div class="ev"><span class="marker"></span><span class="etext">${chip("tiktok", 18, 5)} <b>TikTok</b> synced — <span class="g">+3 favorites</span>, 1 video failed and will retry.</span><span class="etime">18:12</span></div>
  </div>`;
}
V("v31-timeline-light.html", "Timeline feed · light", "light", tlCss, tlBody());
V("v32-timeline-dark.html", "Timeline feed · dark", "dark", tlCss, tlBody());

/* ---------- J. Big type editorial ---------- */
const bigCss = `
.wrap { max-width:760px; margin:0 auto; padding:70px 32px 80px; }
.huge { font-size:96px; font-weight:700; letter-spacing:-0.05em; line-height:1; font-variant-numeric:tabular-nums; }
.huge .d { font-size:22px; font-weight:600; color:var(--ok); letter-spacing:-.02em; vertical-align:super; margin-left:10px; }
.lede { margin-top:18px; font-size:16px; line-height:1.65; color:var(--ink2); max-width:560px; }
.lede b { color:var(--ink); font-weight:600; } .lede .w { color:var(--warn); font-weight:600; }
.srcline { margin-top:44px; display:flex; flex-wrap:wrap; gap:10px 26px; }
.sl { display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink2); }
.sl b { color:var(--ink); font-weight:600; font-variant-numeric:tabular-nums; }
.actions { margin-top:40px; display:flex; gap:8px; }`;

function bigBody() {
  const line = SOURCES.map(
    (s) => `
    <span class="sl">${chip(s.id, 18, 5)}<b>${s.total}</b> ${s.name.toLowerCase()}<span class="dot ${s.state === "ok" ? "" : s.state}" style="margin-left:2px"></span></span>`,
  ).join("");
  return `<div class="wrap">
    <div class="huge">5,056<span class="d">+12</span></div>
    <div class="lede">Things you've saved, kept safe on this Mac. <b>Cosmos</b> is bringing in 12 new references right now; <b>Pinterest</b> is <span class="w">waiting out a rate limit</span> until 1:20. Everything else is quiet.</div>
    <div class="srcline">${line}</div>
    <div class="actions"><button class="btn primary">Sync all</button><button class="btn">Add source</button><button class="btn">Activity</button></div>
  </div>`;
}
V(
  "v33-bigtype-light.html",
  "Big type editorial · light",
  "light",
  bigCss,
  bigBody(),
);
V(
  "v34-bigtype-dark.html",
  "Big type editorial · dark",
  "dark",
  bigCss,
  bigBody(),
);

/* ---------- K. Kanban by status ---------- */
const kanCss = `
.wrap { max-width:1000px; margin:0 auto; padding:44px 32px 80px; }
.hdr { display:flex; align-items:center; padding-bottom:22px; } h1 { font-size:20px; font-weight:650; flex:1; letter-spacing:-.02em; }
.cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; align-items:start; }
.colh { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:var(--ink2); padding:0 4px 10px; }
.colh .n { margin-left:auto; color:var(--ink3); font-weight:500; }
.card { padding:13px 14px; margin-bottom:8px; cursor:pointer; }
.ch { display:flex; align-items:center; gap:9px; } .cn { font-size:12.5px; font-weight:600; flex:1; }
.cs { margin-top:7px; font-size:11.5px; color:var(--ink3); line-height:1.5; }
.cf { margin-top:9px; display:flex; font-size:11px; color:var(--ink3); font-variant-numeric:tabular-nums; }
.cf b { color:var(--ink); font-weight:600; } .cf span:last-child { margin-left:auto; }`;

function kanBody() {
  const card = (s, note) => `
    <div class="card panel"><div class="ch">${chip(s.id, 20, 6)}<span class="cn">${s.name}</span></div>
    <div class="cs">${note}</div>
    <div class="cf"><span><b>${s.total}</b> items</span><span>${s.last}</span></div></div>`;
  return `<div class="wrap">
    <div class="hdr"><h1>Sources</h1><button class="btn">Add source</button>&nbsp;<button class="btn primary">Sync all</button></div>
    <div class="cols">
      <div><div class="colh"><span class="dot run"></span>Active <span class="n">1</span></div>
        ${card(SOURCES[1], "Syncing now — 12 new items so far, fetching media.")}</div>
      <div><div class="colh"><span class="dot warn"></span>Needs attention <span class="n">1</span></div>
        ${card(SOURCES[2], "Rate limited at 12:40 after 210 items. Resumes automatically at 1:20.")}</div>
      <div><div class="colh"><span class="dot"></span>Up to date <span class="n">5</span></div>
        ${card(SOURCES[0], "+4 bookmarks overnight, 2 videos captured.")}
        ${card(SOURCES[3], "No new saved posts.")}
        ${card(SOURCES[4], "Nothing new across 4 channels.")}
        ${card(SOURCES[5], "No new favorites.")}
        ${card(SOURCES[6], "No new videos in watch later.")}</div>
    </div></div>`;
}
V(
  "v35-kanban-light.html",
  "Kanban by status · light",
  "light",
  kanCss,
  kanBody(),
);
V("v36-kanban-dark.html", "Kanban by status · dark", "dark", kanCss, kanBody());

/* ---------- L. Data table (Fey/Uniswap) ---------- */
const dtCss = `
.wrap { max-width:960px; margin:0 auto; padding:44px 32px 80px; }
.hdr { display:flex; align-items:baseline; padding-bottom:18px; } h1 { font-size:20px; font-weight:650; flex:1; letter-spacing:-.02em; }
.hs { font-size:12.5px; color:var(--ink2); }
table { width:100%; border-collapse:separate; border-spacing:0; border-radius:12px; overflow:hidden; }
thead th { font-size:10.5px; font-weight:500; color:var(--ink3); text-align:right; padding:9px 14px; border-bottom:1px solid var(--hair); }
thead th:first-child, thead th:nth-child(2) { text-align:left; }
tbody td { padding:11px 14px; border-top:1px solid var(--hair); font-size:12.5px; text-align:right; font-variant-numeric:tabular-nums; color:var(--ink2); }
tbody tr:first-child td { border-top:0; } tbody tr:hover td { background:var(--hov); }
td.l { text-align:left; } .who { display:flex; align-items:center; gap:9px; font-weight:550; color:var(--ink); }
.idx { color:var(--ink3); width:20px; } td b { color:var(--ink); font-weight:600; }
.pct { display:inline-block; min-width:52px; }`;

function dtBody({ dark = false }) {
  const rows = SOURCES.map(
    (s, i) => `
    <tr><td class="l idx">${i + 1}</td>
    <td class="l"><span class="who">${chip(s.id, 20, 6)}${s.name}<span style="color:var(--ink3);font-weight:400;font-size:11px">&nbsp;${s.kind}</span></span></td>
    <td><b>${s.total}</b></td>
    <td>${s.today ? `<span style="color:var(--ok);font-weight:600">+${s.today}</span>` : "0"}</td>
    <td><span class="badge ${s.state === "warn" ? "warn" : s.state === "run" ? "run" : "ok"}">${s.state === "warn" ? "Limited" : s.state === "run" ? "Syncing" : "Synced"}</span></td>
    <td>${spark(sparkColor(s, dark), i + 6)}</td>
    <td>${s.last}</td></tr>`,
  ).join("");
  return `<div class="wrap">
    <div class="hdr"><h1>Sources</h1><span class="hs">5,056 items · +12 today · sorted by size</span></div>
    <table class="panel"><thead><tr><th></th><th>Source</th><th>Items</th><th>Today</th><th>Status</th><th>30 days</th><th>Last sync</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
V(
  "v37-table-light.html",
  "Ranked data table · light",
  "light",
  dtCss,
  dtBody({}),
);
V(
  "v38-table-dark.html",
  "Ranked data table · dark",
  "dark",
  dtCss,
  dtBody({ dark: true }),
);

/* ---------- M. Chart-hero (Visitors) accent variants ---------- */
const vhCss = `
.wrap { max-width:760px; margin:0 auto; padding:52px 32px 80px; }
.kpis { display:flex; gap:40px; align-items:flex-start; }
.kl { font-size:12px; color:var(--ink3); } .kv { margin-top:3px; font-size:17px; font-weight:650; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.kd { margin-top:1px; font-size:11px; font-weight:600; color:var(--ok); } .kd.dim { color:var(--ink3); font-weight:400; }
.spacer { flex:1; }
.chart-wrap { margin:26px -32px 0; } .area { display:block; width:100%; }
.axis { display:flex; justify-content:space-between; padding:6px 32px 0; font-size:10.5px; color:var(--ink3); }
.rows { margin-top:34px; }
.row { display:flex; align-items:center; gap:12px; padding:12px 2px; border-bottom:1px solid var(--hair); }
.row:first-child { border-top:1px solid var(--hair); } .row:hover { background:var(--hov); }
.rname { font-size:13px; font-weight:550; width:100px; } .rstate { font-size:12.5px; color:var(--ink2); }
.rr { margin-left:auto; font-size:12.5px; color:var(--ink3); font-variant-numeric:tabular-nums; } .rr b { color:var(--ink); font-weight:600; }`;

function vhBody({ accent, dark = false }) {
  const rows = SOURCES.map(
    (s) => `
    <div class="row"><span class="dot ${s.state === "ok" ? "" : s.state}"></span>${chip(s.id, 22, 6)}
    <span class="rname">${s.name}</span><span class="rstate">${statusText(s)}</span>
    <span class="rr">${s.today ? `+${s.today} · ` : ""}<b>${s.total}</b></span></div>`,
  ).join("");
  return `<div class="wrap">
    <div class="kpis">
      <div><div class="kl">Items</div><div class="kv">5,056</div><div class="kd">+12 today</div></div>
      <div><div class="kl">Sources</div><div class="kv">7</div><div class="kd dim">all healthy</div></div>
      <div><div class="kl">Enriched</div><div class="kv">98%</div><div class="kd dim">73 queued</div></div>
      <div><div class="kl">Last sync</div><div class="kv">2m</div><div class="kd dim">ago</div></div>
      <div class="spacer"></div><button class="btn">Sync all</button></div>
    <div class="chart-wrap">${area(accent, 760, 120, dark ? 0.2 : 0.12)}<div class="axis"><span>Jun 7</span><span>Jun 22</span><span>Jul 7</span></div></div>
    <div class="rows">${rows}</div></div>`;
}
V(
  "v39-chart-hero-green-light.html",
  "Chart hero · green · light",
  "light",
  vhCss,
  vhBody({ accent: "#3c9a52" }),
);
V(
  "v40-chart-hero-mono-light.html",
  "Chart hero · monochrome",
  "light",
  vhCss,
  vhBody({ accent: "#3a3a3e" }),
);
V(
  "v41-chart-hero-violet-dark.html",
  "Chart hero · violet · dark",
  "dark",
  vhCss,
  vhBody({ accent: "#8b8bf7", dark: true }),
);

/* ---------- N. Contribution heatmap ---------- */
const hmCss = `
.wrap { max-width:780px; margin:0 auto; padding:48px 32px 80px; }
.hdr { display:flex; align-items:baseline; padding-bottom:24px; } h1 { font-size:20px; font-weight:650; flex:1; letter-spacing:-.02em; }
.hs { font-size:12.5px; color:var(--ink2); }
.srcrow { display:flex; align-items:center; gap:12px; padding:11px 0; border-top:1px solid var(--hair); }
.srcrow:last-of-type { border-bottom:1px solid var(--hair); }
.rname { font-size:13px; font-weight:550; width:92px; }
.cells { display:flex; gap:3px; flex:1; }
.cells i { width:10px; height:10px; border-radius:2.5px; background:var(--hair); }
.cells i.l1 { background:color-mix(in srgb, var(--ok) 25%, transparent); }
.cells i.l2 { background:color-mix(in srgb, var(--ok) 50%, transparent); }
.cells i.l3 { background:color-mix(in srgb, var(--ok) 80%, transparent); }
.cells i.w { background:color-mix(in srgb, var(--warn) 60%, transparent); }
.rr { font-size:12px; color:var(--ink3); font-variant-numeric:tabular-nums; width:110px; text-align:right; } .rr b { color:var(--ink); font-weight:600; }
.legend { display:flex; align-items:center; gap:5px; margin-top:16px; font-size:10.5px; color:var(--ink3); justify-content:flex-end; }
.legend i { width:10px; height:10px; border-radius:2.5px; }`;

function hmBody() {
  const rows = SOURCES.map((s, idx) => {
    const rnd = seeded(idx * 13 + 7);
    let cells = "";
    for (let i = 0; i < 40; i++) {
      const v = rnd();
      const warn = s.state === "warn" && i > 36;
      cells += `<i class="${warn ? "w" : v < 0.35 ? "" : v < 0.6 ? "l1" : v < 0.85 ? "l2" : "l3"}"></i>`;
    }
    return `<div class="srcrow">${chip(s.id, 22, 6)}<span class="rname">${s.name}</span>
      <div class="cells">${cells}</div>
      <span class="rr">${s.today ? `+${s.today} · ` : ""}<b>${s.total}</b></span></div>`;
  }).join("");
  return `<div class="wrap">
    <div class="hdr"><h1>Sources</h1><span class="hs">activity · last 40 days · <b style="color:var(--ink)">5,056</b> items</span></div>
    ${rows}
    <div class="legend">less <i style="background:var(--hair)"></i><i style="background:color-mix(in srgb, var(--ok) 25%, transparent)"></i><i style="background:color-mix(in srgb, var(--ok) 50%, transparent)"></i><i style="background:color-mix(in srgb, var(--ok) 80%, transparent)"></i> more</div>
  </div>`;
}
V(
  "v42-heatmap-light.html",
  "Contribution heatmap · light",
  "light",
  hmCss,
  hmBody(),
);
V(
  "v43-heatmap-dark.html",
  "Contribution heatmap · dark",
  "dark",
  hmCss,
  hmBody(),
);

/* ---------- O. Composition donut ---------- */
const donutCss = `
.wrap { max-width:860px; margin:0 auto; padding:48px 32px 80px; display:grid; grid-template-columns:300px 1fr; gap:48px; align-items:start; }
.left { text-align:center; }
h1 { font-size:16px; font-weight:650; letter-spacing:-.01em; text-align:left; margin-bottom:24px; }
.donut { position:relative; width:220px; height:220px; margin:0 auto; }
.dc { position:absolute; inset:0; display:grid; place-items:center; flex-direction:column; }
.dnum { font-size:26px; font-weight:700; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.dsub { font-size:11.5px; color:var(--ink3); margin-top:2px; }
.actions { margin-top:24px; display:flex; gap:8px; justify-content:center; }
.rows { padding-top:34px; }
.row { display:flex; align-items:center; gap:11px; padding:10px 0; border-top:1px solid var(--hair); }
.row:last-child { border-bottom:1px solid var(--hair); }
.swatch { width:9px; height:9px; border-radius:3px; flex:none; }
.rname { font-size:13px; font-weight:550; width:92px; } .rstate { font-size:12px; color:var(--ink2); }
.rr { margin-left:auto; font-size:12.5px; color:var(--ink3); font-variant-numeric:tabular-nums; } .rr b { color:var(--ink); font-weight:600; }`;

function donutBody({ dark = false }) {
  const palette = dark
    ? [
        "#e8e8ec",
        "#a5a5f0",
        "#f2b8b8",
        "#f0d9a8",
        "#9adbb0",
        "#8fd0e8",
        "#c9c9cf",
      ]
    : [
        "#26262a",
        "#6e6ee0",
        "#d97575",
        "#d9a83f",
        "#3c9a52",
        "#4aa3c7",
        "#9b9ba0",
      ];
  const total = SOURCES.reduce((a, s) => a + s.n, 0);
  let angle = 0;
  const segs = SOURCES.map((s, i) => {
    const frac = s.n / total;
    const a0 = angle;
    angle += frac * 360;
    return { color: palette[i], a0, a1: angle };
  });
  const grad = `conic-gradient(${segs.map((g) => `${g.color} ${g.a0.toFixed(1)}deg ${g.a1.toFixed(1)}deg`).join(", ")})`;
  const rows = SOURCES.map(
    (s, i) => `
    <div class="row"><span class="swatch" style="background:${palette[i]}"></span>${chip(s.id, 20, 6)}
    <span class="rname">${s.name}</span><span class="rstate">${statusText(s)}</span>
    <span class="rr">${Math.round((s.n / total) * 100)}% · <b>${s.total}</b></span></div>`,
  ).join("");
  return `<div class="wrap">
    <div class="left">
      <div class="donut" style="background:${grad}; border-radius:50%;">
        <div style="position:absolute; inset:26px; background:${dark ? "#0c0c0d" : "#fafafa"}; border-radius:50%;"></div>
        <div class="dc"><div><div class="dnum">5,056</div><div class="dsub">+12 today · healthy</div></div></div>
      </div>
      <div class="actions"><button class="btn primary">Sync all</button><button class="btn">Add</button></div>
    </div>
    <div><h1>Sources</h1><div class="rows" style="padding-top:0">${rows}</div></div>
  </div>`;
}
V(
  "v44-donut-light.html",
  "Composition donut · light",
  "light",
  donutCss,
  donutBody({}),
);
V(
  "v45-donut-dark.html",
  "Composition donut · dark",
  "dark",
  donutCss,
  donutBody({ dark: true }),
);

/* ---------- P. Notion document style ---------- */
const notionCss = `
.wrap { max-width:620px; margin:0 auto; padding:64px 32px 80px; }
.icon { font-size:34px; }
h1 { margin-top:12px; font-size:26px; font-weight:700; letter-spacing:-.02em; }
.callout { margin-top:20px; padding:13px 16px; background:var(--okdim); border-radius:8px; font-size:13px; line-height:1.6; color:var(--ink); display:flex; gap:10px; }
.callout.warn { background:var(--warndim); }
.h2 { margin:30px 0 6px; font-size:15px; font-weight:650; border-bottom:1px solid var(--hair); padding-bottom:6px; }
.li { display:flex; align-items:center; gap:9px; padding:6px 0; font-size:13.5px; }
.li .meta { margin-left:auto; font-size:12px; color:var(--ink3); font-variant-numeric:tabular-nums; }
.li b { font-weight:600; }
.todo { color:var(--ink3); padding:6px 0; font-size:13.5px; }`;

function notionBody() {
  const items = SOURCES.map(
    (s) => `
    <div class="li">${chip(s.id, 19, 5)}<b>${s.name}</b>
    <span style="font-size:12px;color:var(--ink2)">${s.state === "run" ? "— syncing, 12 new" : s.state === "warn" ? "— rate limited until 1:20" : ""}</span>
    <span class="meta">${s.total} items · ${s.last}</span></div>`,
  ).join("");
  return `<div class="wrap">
    <div class="icon">🌿</div>
    <h1>Sources</h1>
    <div class="callout">✅&nbsp; Your pond is healthy — <b>5,056 items</b>, 12 new today, last run 2 minutes ago.</div>
    <div class="callout warn">⏳&nbsp; Pinterest hit a rate limit at 12:40 and resumes automatically at 1:20. Nothing to do.</div>
    <div class="h2">Connected</div>
    ${items}
    <div class="todo">＋ Connect Reddit or Threads…</div>
  </div>`;
}
V(
  "v46-notion-light.html",
  "Notion document · light",
  "light",
  notionCss,
  notionBody(),
);
V(
  "v47-notion-dark.html",
  "Notion document · dark",
  "dark",
  notionCss,
  notionBody(),
);

/* ---------- Q. Compact statusbar grid ---------- */
const compactCss = `
.wrap { max-width:980px; margin:0 auto; padding:40px 32px 80px; }
.bar { display:flex; align-items:center; gap:14px; padding:10px 16px; font-size:12.5px; margin-bottom:18px; }
.bar b { font-weight:650; font-variant-numeric:tabular-nums; } .bar .sep { color:var(--ink3); }
.bar .right { margin-left:auto; display:flex; gap:8px; }
.grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; }
.cell { padding:12px 13px; }
.ch { display:flex; align-items:center; gap:8px; } .cn { font-size:12px; font-weight:600; flex:1; }
.cnum { margin-top:8px; font-size:17px; font-weight:650; font-variant-numeric:tabular-nums; }
.cst { margin-top:2px; font-size:10.5px; color:var(--ink3); }
.cst.run { color:var(--run); font-weight:600; } .cst.warn { color:var(--warn); font-weight:600; }
.ticks { margin-top:10px; height:16px; }`;

function compactBody() {
  const cells = SOURCES.map(
    (s, i) => `
    <div class="cell panel"><div class="ch">${chip(s.id, 18, 5)}<span class="cn">${s.name}</span><span class="dot ${s.state === "ok" ? "" : s.state}"></span></div>
    <div class="cnum">${s.total}</div>
    <div class="cst ${s.state === "ok" ? "" : s.state}">${s.state === "run" ? "syncing · 12 new" : s.state === "warn" ? "rate limited · 1:20" : `synced ${s.last}`}</div>
    ${ticks(i * 3 + 11, 20, s.state === "warn" ? "w" : "")}</div>`,
  ).join("");
  return `<div class="wrap">
    <div class="bar panel"><span><b>5,056</b> items</span><span class="sep">·</span><span style="color:var(--ok);font-weight:600">+12 today</span><span class="sep">·</span><span>7 sources</span><span class="sep">·</span><span>enrichment 98%</span><span class="sep">·</span><span style="color:var(--ink3)">last run 2m ago</span>
    <span class="right"><button class="btn">Add</button><button class="btn primary">Sync all</button></span></div>
    <div class="grid">${cells}<div class="cell panel" style="display:grid;place-items:center;color:var(--ink3);font-size:12px;box-shadow:none;border:1px dashed var(--line);background:transparent">+ Connect more</div></div>
  </div>`;
}
V(
  "v48-compact-grid-light.html",
  "Compact stat grid · light",
  "light",
  compactCss,
  compactBody(),
);
V(
  "v49-compact-grid-dark.html",
  "Compact stat grid · dark",
  "dark",
  compactCss,
  compactBody(),
);

/* ---------- R. Pond-brand playful ---------- */
const pondCss = `
.hero { position:relative; padding:64px 32px 90px; text-align:center; overflow:hidden;
  background: radial-gradient(ellipse 90% 120% at 50% -20%, rgba(110,110,224,.14), transparent 60%),
              radial-gradient(ellipse 70% 90% at 80% 0%, rgba(60,154,82,.10), transparent 55%); }
.ripple { position:absolute; left:50%; top:38px; transform:translateX(-50%); width:340px; height:340px; pointer-events:none; }
.ripple i { position:absolute; inset:0; border-radius:50%; border:1px solid var(--line); }
.ripple i:nth-child(2) { inset:40px; } .ripple i:nth-child(3) { inset:80px; } .ripple i:nth-child(4) { inset:120px; }
h1 { position:relative; font-size:15px; font-weight:600; color:var(--ink2); }
.big { position:relative; margin-top:14px; font-size:64px; font-weight:700; letter-spacing:-.045em; font-variant-numeric:tabular-nums; }
.sub { position:relative; margin-top:6px; font-size:13.5px; color:var(--ink2); } .sub b { color:var(--ok); font-weight:650; }
.wrap { max-width:640px; margin:-30px auto 0; padding:0 32px 80px; position:relative; }
.rows { overflow:hidden; }
.row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-top:1px solid var(--hair); background:var(--panel); }
.row:first-child { border-top:0; }
.rname { font-size:13px; font-weight:550; flex:1; } .rstate { font-size:12px; }
.rr { font-size:12.5px; color:var(--ink3); font-variant-numeric:tabular-nums; } .rr b { color:var(--ink); font-weight:600; }
.actions { display:flex; gap:8px; justify-content:center; margin-top:18px; }`;

function pondBody() {
  const rows = SOURCES.map(
    (s) => `
    <div class="row">${chip(s.id, 22, 6)}<span class="rname">${s.name}</span>
    <span class="rstate">${statusText(s)}</span><span class="rr"><b>${s.total}</b></span></div>`,
  ).join("");
  return `<div class="hero">
    <div class="ripple"><i></i><i></i><i></i><i></i></div>
    <h1>◍ Your pond</h1><div class="big">5,056</div>
    <div class="sub"><b>+12 today</b> · 7 sources flowing in · everything healthy</div></div>
  <div class="wrap"><div class="rows panel">${rows}</div>
    <div class="actions"><button class="btn primary">Sync all</button><button class="btn">Add source</button></div></div>`;
}
V(
  "v50-pond-brand-light.html",
  "Pond brand hero · light",
  "light",
  pondCss,
  pondBody(),
);

/* ---------- write ---------- */
for (const v of variants) {
  writeFileSync(
    join(OUT, v.file),
    page({ title: v.title, theme: v.theme, css: v.css, body: v.body }),
  );
  console.log("wrote", v.file);
}
console.log(`\n${variants.length} variants generated`);
