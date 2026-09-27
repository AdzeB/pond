import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const repo = "/Users/raphaelsalaja/Developer/pond";
const eagle = "/private/tmp/pond-eagle-detail-viewers-20260923/app";
const out = join(repo, ".artifacts/eagle-detail-css-comparison-2026-09-24");
const pond = join(
  repo,
  "apps/desktop/src/renderer/src/features/saves/components",
);

const e = (path, inline = false) => ({ root: eagle, path, inline });
const p = (path) => ({ root: pond, path, inline: false });

const sharedImageEagle = [
  e("style/components/_box-container.scss"),
  e("style/components/_toolbar.scss"),
  e("css/components/_content-area.scss"),
  e("style/components/_inspector.scss"),
];
const pondImage = [
  p("viewers/image-inspector/styles.module.css"),
  p("viewers/image-inspector/controls/styles.module.css"),
  p("viewers/image-inspector/navigator/styles.module.css"),
  p("viewers/image-inspector/overlay/styles.module.css"),
  p("annotations/image-comments/styles.module.css"),
];

const surfaces = [
  {
    id: "raster-image",
    title: "Raster image",
    status: "Pond leads",
    note: "Eagle concentrates the viewer in shared shell SCSS. Pond splits viewport, controls, navigator, overlay, and annotations into deeper modules.",
    eagle: [
      ...sharedImageEagle,
      e("css/components/_crop-image-tool.scss"),
      e("css/components/_annotation-preview.scss"),
    ],
    pond: pondImage,
  },
  {
    id: "svg",
    title: "SVG",
    status: "Close",
    note: "Both reuse their standard image workspace rather than a separate SVG stylesheet.",
    eagle: sharedImageEagle,
    pond: pondImage,
  },
  {
    id: "gif",
    title: "GIF and frame viewer",
    status: "Eagle leads",
    note: "Eagle adds a dedicated frame-player layer. Pond keeps GIF styling inside the general image inspector controls.",
    eagle: [
      e("style/components/_gif-player.scss"),
      e("gif-viewer/index.html", true),
      ...sharedImageEagle,
    ],
    pond: pondImage,
  },
  {
    id: "video",
    title: "Video",
    status: "Pond leads",
    note: "Both have a dedicated control system; Pond also separates carousel chrome and timestamped comment styling.",
    eagle: [
      e("style/components/_video-player.scss"),
      e("css/vendors/videojs/video-js.css"),
      e("style/components/_inspector.scss"),
    ],
    pond: [
      p("video-player/styles.module.css"),
      p("detail/video-notes/styles.module.css"),
      p("viewers/media-viewer/styles.module.css"),
      p("viewers/media-viewer/chrome/styles.module.css"),
      p("viewers/media-viewer/slide/styles.module.css"),
    ],
  },
  {
    id: "audio",
    title: "Audio",
    status: "Close",
    note: "Eagle's audio progress styling lives in the shared item/detail container. Pond's waveform and controls live in the shared file-viewer module.",
    eagle: [
      e("style/components/_box-container.scss"),
      e("style/components/_inspector.scss"),
    ],
    pond: [p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "pdf",
    title: "PDF",
    status: "Eagle leads",
    note: "The size difference is meaningful: Eagle ships the full pdf.js viewer chrome; Pond currently styles a continuous canvas stack and file bar.",
    eagle: [e("pdf-viewer/web/viewer.css")],
    pond: [p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "font",
    title: "Font",
    status: "Close — Eagle slight lead",
    note: "Eagle's standalone font app is heavily minified. Pond shares one readable module with PDF/audio/native file layouts.",
    eagle: [
      e("font-viewer/css/font-viewer.css"),
      e("font-viewer/medium-editor/css/medium-editor.min.css"),
    ],
    pond: [
      p("viewers/file-viewer/styles.module.css"),
      p("viewers/hud/styles.module.css"),
    ],
  },
  {
    id: "text",
    title: "Text and structured text",
    status: "Mixed",
    note: "This compares Eagle's editable text surface with Pond's read-only file preview, not Pond's separate rich Notes editor.",
    eagle: [e("text-editor/css/text-editor.css")],
    pond: [p("viewers/text-file-viewer/styles.module.css")],
  },
  {
    id: "raw",
    title: "RAW camera image",
    status: "Eagle leads",
    note: "Eagle's dedicated RAW shell uses inline CSS. Pond falls through the generated/native preview and shared file-viewer presentation.",
    eagle: [e("raw-viewer/index.html", true)],
    pond: [p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "model-3d",
    title: "3D model",
    status: "Eagle leads",
    note: "Eagle has a multi-panel 3D application stylesheet set. Pond intentionally keeps a minimal canvas with reset and grid HUD controls.",
    eagle: [
      e("model-viewer/website/css/core.css"),
      e("model-viewer/website/css/controls.css"),
      e("model-viewer/website/css/navigator.css"),
      e("model-viewer/website/css/sidebar.css"),
      e("model-viewer/website/css/panelset.css"),
      e("model-viewer/website/css/treeview.css"),
      e("model-viewer/website/css/dialogs.css"),
      e("model-viewer/website/css/themes.css"),
      e("model-viewer/website/css/website.css"),
      e("model-viewer/website/css/icons.css"),
    ],
    pond: [
      p("viewers/model-viewer/styles.module.css"),
      p("viewers/hud/styles.module.css"),
    ],
  },
  {
    id: "web",
    title: "URL, HTML, and MHTML",
    status: "Mixed",
    note: "Eagle styles an interactive web panel. Pond styles a sandboxed rendered/source viewer and makes the safety boundary visible.",
    eagle: [
      e("css/components/_website-panel.scss"),
      e("style/components/_webview-toolbar.scss"),
    ],
    pond: [
      p("viewers/safe-web-viewer/styles.module.css"),
      p("viewers/hud/styles.module.css"),
    ],
  },
  {
    id: "native-preview",
    title: "Native document and design preview",
    status: "Close",
    note: "Eagle's generated-preview shell is inline. Pond uses the shared file card and file bar around generated previews.",
    eagle: [e("native-viewer/index.html", true)],
    pond: [p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "native-raster",
    title: "TIFF, TGA, HEIC/HEIF, and JXL",
    status: "Close",
    note: "These formats reuse the image shell when directly decoded and the native-preview shell when they need platform rendering.",
    eagle: [...sharedImageEagle, e("native-viewer/index.html", true)],
    pond: [...pondImage, p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "hdr-exr",
    title: "HDR and EXR texture",
    status: "Eagle leads",
    note: "Eagle has dedicated texture-canvas styling. Pond has no dedicated tone-mapping surface, so the right side is its generated-preview CSS.",
    eagle: [e("texture-viewer/main.css")],
    pond: [p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "exif",
    title: "EXIF",
    status: "Eagle leads",
    note: "Eagle has a dedicated inline-styled EXIF image surface. Pond exposes metadata in its general Details sections instead.",
    eagle: [e("exif-viewer/index.html", true)],
    pond: [
      p("detail/pane/styles.module.css"),
      p("detail/info-sections/styles.module.css"),
      p("detail/section/styles.module.css"),
    ],
  },
  {
    id: "archive",
    title: "Archive",
    status: "Pond leads",
    note: "Eagle uses its unsupported/native fallback for the tested ZIP. Pond has a dedicated guarded directory-list surface.",
    eagle: [e("native-viewer/index.html", true)],
    pond: [
      p("viewers/archive-file-viewer/styles.module.css"),
      p("viewers/archive-viewer/styles.module.css"),
      p("viewers/hud/styles.module.css"),
    ],
  },
  {
    id: "epub",
    title: "EPUB",
    status: "Pond only",
    note: "No first-party Eagle EPUB stylesheet was found in the audited viewer inventory.",
    eagle: [],
    pond: [
      p("viewers/epub-viewer/styles.module.css"),
      p("viewers/hud/styles.module.css"),
    ],
  },
  {
    id: "live-photo",
    title: "Live Photo",
    status: "Pond only",
    note: "No distinct first-party Eagle Live Photo stylesheet was found in the audited viewer inventory.",
    eagle: [],
    pond: [p("viewers/live-photo-viewer/styles.module.css")],
  },
  {
    id: "generic",
    title: "Generic unsupported file",
    status: "Parity",
    note: "Both surfaces reduce to file identity plus original-file actions.",
    eagle: [e("native-viewer/index.html", true)],
    pond: [p("viewers/file-viewer/styles.module.css")],
  },
  {
    id: "presentation",
    title: "Slideshow, presentation, and detach",
    status: "Broad parity",
    note: "Eagle centralizes slideshow and preview-window chrome. Pond composes presentation from media-viewer, slide, HUD, and image-inspector modules.",
    eagle: [
      e("css/components/_slideshow.scss"),
      e("css/preview-window.scss"),
      e("css/preview-window-new.css"),
    ],
    pond: [
      p("viewers/media-viewer/styles.module.css"),
      p("viewers/media-viewer/chrome/styles.module.css"),
      p("viewers/media-viewer/slide/styles.module.css"),
      p("viewers/hud/styles.module.css"),
      ...pondImage,
    ],
  },
];

function extractInlineStyles(source) {
  const blocks = [
    ...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi),
  ];
  return blocks.map((match) => match[1].trim()).join("\n\n");
}

function safeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, "-");
}

function loadSide(surfaceId, side, entries) {
  if (entries.length === 0) {
    return {
      files: [],
      content: `/* No dedicated ${side === "eagle" ? "Eagle" : "Pond"} stylesheet found for this surface. */`,
    };
  }
  const files = [];
  const chunks = [];
  for (const [index, entry] of entries.entries()) {
    const sourcePath = join(entry.root, entry.path);
    const raw = readFileSync(sourcePath, "utf8");
    const content = entry.inline ? extractInlineStyles(raw) : raw;
    const outputName = `${String(index + 1).padStart(2, "0")}-${safeName(
      basename(entry.path),
    )}${entry.inline ? ".inline.css" : ""}`;
    const outputPath = join(out, "sources", side, surfaceId, outputName);
    mkdirSync(dirname(outputPath), { recursive: true });
    if (entry.inline) writeFileSync(outputPath, `${content}\n`);
    else copyFileSync(sourcePath, outputPath);
    const displayPath =
      side === "eagle"
        ? `Eagle.app/app/${relative(eagle, sourcePath)}`
        : relative(repo, sourcePath);
    files.push({
      path: displayPath,
      extractedTo: relative(out, outputPath),
      lines: content.split("\n").length,
      inline: entry.inline,
    });
    chunks.push(
      `/* ── ${displayPath}${entry.inline ? " · extracted <style>" : ""} ── */\n${content}`,
    );
  }
  return { files, content: chunks.join("\n\n") };
}

const data = surfaces.map((surface) => {
  const eagleSide = loadSide(surface.id, "eagle", surface.eagle);
  const pondSide = loadSide(surface.id, "pond", surface.pond);
  return {
    id: surface.id,
    title: surface.title,
    status: surface.status,
    note: surface.note,
    eagle: eagleSide,
    pond: pondSide,
  };
});

const embedded = JSON.stringify(data).replaceAll("</script", "<\\/script");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eagle ↔ Pond detail-view CSS</title>
<style>
:root{color-scheme:dark;--bg:#101112;--panel:#17191b;--panel2:#1e2023;--line:#303338;--muted:#969ba4;--text:#f3f4f6;--accent:#8cb4ff;--left:50%;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);overflow:hidden}button,input,select{font:inherit;color:inherit}header{height:118px;padding:14px 18px;background:rgba(16,17,18,.96);border-bottom:1px solid var(--line)}h1{font:600 18px/1.2 system-ui,sans-serif;margin:0 0 5px}.sub{color:var(--muted);font:12px/1.4 system-ui,sans-serif;margin-bottom:12px}.bar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,320px) auto auto;gap:8px;align-items:center}select,input,button{height:32px;border:1px solid var(--line);border-radius:7px;background:var(--panel2);padding:0 10px}button{cursor:pointer}.status{justify-self:start;border:1px solid #4a5468;border-radius:999px;padding:4px 9px;color:#c9d9ff;font:600 11px system-ui,sans-serif}.workspace{height:calc(100vh - 118px);display:grid;grid-template-columns:var(--left) 6px calc(100% - var(--left) - 6px)}.divider{background:var(--line);cursor:col-resize}.pane{min-width:0;display:grid;grid-template-rows:auto 1fr;background:var(--panel)}.pane+.pane{border-left:1px solid var(--line)}.paneHead{padding:12px 14px;border-bottom:1px solid var(--line);background:var(--panel);position:relative;z-index:2}.paneTitle{display:flex;justify-content:space-between;gap:12px;align-items:center;font:600 13px system-ui,sans-serif}.meta{margin-top:5px;color:var(--muted);font:11px/1.45 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.copy{height:26px;padding:0 8px;font-size:11px}.code{overflow:auto;overscroll-behavior:contain;tab-size:2}.lines{counter-reset:line;margin:0;padding:12px 0 50vh;min-width:max-content}.line{display:block;min-height:20px;padding-right:18px;white-space:pre}.line::before{counter-increment:line;content:counter(line);display:inline-block;width:54px;margin-right:14px;padding-right:10px;color:#5f6570;text-align:right;border-right:1px solid #272a2f;user-select:none}.line.match{background:#3b3218}.line mark{background:#66531b;color:#fff;border-radius:2px}.empty{padding:28px;color:var(--muted)}.note{position:fixed;left:18px;right:18px;bottom:12px;pointer-events:none;text-align:center}.note span{display:inline-block;max-width:900px;padding:7px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(23,25,27,.94);color:#c4c7ce;font:12px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px #0008}@media(max-width:800px){header{height:150px}.bar{grid-template-columns:1fr 1fr}.workspace{height:calc(100vh - 150px)}.status{justify-self:stretch;text-align:center}}
</style>
</head>
<body>
<header>
  <h1>Eagle ↔ Pond detail-view CSS</h1>
  <div class="sub">Local inspection artifact · Eagle 4.0.0 extracted styles on the left · current Pond modules on the right</div>
  <div class="bar">
    <select id="surface" aria-label="Detail view"></select>
    <input id="search" type="search" placeholder="Find in both sides…" aria-label="Find in CSS">
    <button id="prev" type="button">Previous match</button>
    <span id="status" class="status"></span>
  </div>
</header>
<main class="workspace" id="workspace">
  <section class="pane" id="eaglePane"><div class="paneHead"><div class="paneTitle"><span>Eagle 4.0.0</span><button class="copy" data-copy="eagle">Copy CSS</button></div><div class="meta" id="eagleMeta"></div></div><div class="code" id="eagleCode"></div></section>
  <div class="divider" id="divider" role="separator" aria-orientation="vertical" aria-label="Resize comparison"></div>
  <section class="pane" id="pondPane"><div class="paneHead"><div class="paneTitle"><span>Pond current</span><button class="copy" data-copy="pond">Copy CSS</button></div><div class="meta" id="pondMeta"></div></div><div class="code" id="pondCode"></div></section>
</main>
<div class="note"><span id="note"></span></div>
<script id="data" type="application/json">${embedded}</script>
<script>
const data=JSON.parse(document.querySelector('#data').textContent);const select=document.querySelector('#surface');const search=document.querySelector('#search');const panes={eagle:document.querySelector('#eagleCode'),pond:document.querySelector('#pondCode')};let active=data[0];let matches=[];let matchIndex=-1;let syncing=false;
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const item of data){const o=document.createElement('option');o.value=item.id;o.textContent=item.title;select.append(o)}
function sideMeta(side){const files=active[side].files;const lines=active[side].content.split(String.fromCharCode(10)).length;return files.length?files.length+' source file'+(files.length===1?'':'s')+' · '+lines.toLocaleString()+' lines · '+files.map(f=>f.path).join(' · '):'No dedicated stylesheet found'}
function renderCode(side){const q=search.value.trim();const lower=q.toLowerCase();const lines=active[side].content.split(String.fromCharCode(10));panes[side].innerHTML='<pre class="lines">'+lines.map((line,index)=>{let body=esc(line);let cls='line';if(lower&&line.toLowerCase().includes(lower)){cls+=' match';const start=line.toLowerCase().indexOf(lower);body=esc(line.slice(0,start))+'<mark>'+esc(line.slice(start,start+q.length))+'</mark>'+esc(line.slice(start+q.length))}return '<code class="'+cls+'" data-side="'+side+'" data-line="'+(index+1)+'">'+body+'</code>'}).join('')+'</pre>'}
function collectMatches(){matches=[...document.querySelectorAll('.line.match')];matchIndex=-1;document.querySelector('#prev').textContent=matches.length?'Next match ('+matches.length+')':'Previous match'}
function render(){active=data.find(item=>item.id===select.value)||data[0];history.replaceState(null,'','#'+active.id);document.querySelector('#status').textContent=active.status;document.querySelector('#note').textContent=active.note;document.querySelector('#eagleMeta').textContent=sideMeta('eagle');document.querySelector('#pondMeta').textContent=sideMeta('pond');renderCode('eagle');renderCode('pond');collectMatches()}
select.value=location.hash.slice(1)&&data.some(x=>x.id===location.hash.slice(1))?location.hash.slice(1):data[0].id;select.addEventListener('change',render);search.addEventListener('input',render);document.querySelector('#prev').addEventListener('click',()=>{if(!matches.length)return;matchIndex=(matchIndex+1)%matches.length;matches[matchIndex].scrollIntoView({block:'center',behavior:'smooth'})});
for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{const side=button.dataset.copy;await navigator.clipboard.writeText(active[side].content);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,900)});
for(const [a,b] of [['eagle','pond'],['pond','eagle']])panes[a].addEventListener('scroll',()=>{if(syncing)return;syncing=true;const maxA=panes[a].scrollHeight-panes[a].clientHeight;const maxB=panes[b].scrollHeight-panes[b].clientHeight;panes[b].scrollTop=maxA?panes[a].scrollTop/maxA*maxB:0;panes[b].scrollLeft=panes[a].scrollLeft;requestAnimationFrame(()=>syncing=false)});
const divider=document.querySelector('#divider');divider.addEventListener('pointerdown',event=>{divider.setPointerCapture(event.pointerId);const move=e=>{const pct=Math.max(25,Math.min(75,e.clientX/window.innerWidth*100));document.documentElement.style.setProperty('--left',pct+'%')};divider.addEventListener('pointermove',move);divider.addEventListener('pointerup',()=>divider.removeEventListener('pointermove',move),{once:true})});
render();
</script>
</body>
</html>`;

writeFileSync(join(out, "index.html"), html);
writeFileSync(join(out, "manifest.json"), `${JSON.stringify(data, null, 2)}\n`);
writeFileSync(
  join(out, "README.md"),
  `# Eagle ↔ Pond detail-view CSS explorer\n\nGenerated September 24, 2026. Open [index.html](index.html) for the side-by-side explorer.\n\n- 20 detail-view classes\n- Eagle 4.0.0 extracted CSS/SCSS and inline style blocks on the left\n- current Pond CSS Modules on the right\n- synchronized scrolling, resizing, search, and copy controls\n\nThe Eagle files are proprietary local inspection material. Keep this ignored artifact local and do not redistribute it. No Eagle code or assets are used by Pond.\n\nThe product-level findings are in [the detail-view comparison](../../docs/references/eagle-detail-view-comparison-2026-09-23.md).\n`,
);

console.log(`Wrote ${data.length} side-by-side CSS comparisons to ${out}`);
