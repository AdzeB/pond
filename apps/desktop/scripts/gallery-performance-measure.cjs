const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const os = require("node:os");
const root = path.resolve(process.argv[2]);
const sandbox = process.env.POND_SANDBOX;
const owner = JSON.parse(
  fs.readFileSync(path.join(sandbox, "gallery-fixture-owner.json"), "utf8"),
);
assert.equal(owner.kind, "pond-gallery-performance");
assert.equal(owner.size, Number(process.env.POND_PERF_SIZE));

async function measureSearchAndScroll(contents) {
  const searchStarted = await contents.executeJavaScript(`(()=>{
    const input=document.querySelector('[data-library-search]');
    if(!(input instanceof HTMLElement))throw new Error('Library search is unavailable');
    input.focus();
    const selection=window.getSelection();
    const range=document.createRange();
    range.selectNodeContents(input);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return performance.now();
  })()`);
  await contents.insertText("target");
  return await contents.executeJavaScript(`(async()=>{
    const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const waitFor=async(predicate,label)=>{
      const started=performance.now();
      while(!predicate()){
        if(performance.now()-started>30000)throw new Error(label);
        await frame();
      }
    };
    const cards=()=>[...document.querySelectorAll('[data-save-id]')];
    const isTarget=(card)=>{
      const id=card.getAttribute('data-save-id')||'';
      return Number(id.slice('01QAPERF'.length))%5===0;
    };
    await waitFor(()=>{
      const visible=cards();
      return visible.length>0&&visible.every(isTarget);
    },'Search results did not paint');
    await frame();
    await frame();
    const debounceAndPaintMs=performance.now()-${searchStarted};
    const searchCards=cards().length;
    const clear=document.querySelector('[aria-label="Clear Search"]');
    if(!(clear instanceof HTMLElement))throw new Error('Clear Search is unavailable');
    clear.click();
    await waitFor(()=>{
      const visible=cards();
      return visible.length>0&&visible.some(card=>!isTarget(card));
    },'Search did not clear');
    const viewport=document.querySelector('[data-library-grid-viewport]');
    if(!(viewport instanceof HTMLElement))throw new Error('Gallery viewport is unavailable');
    viewport.scrollTop=0;
    await frame();
    await frame();
    const intervals=[];
    const durationMs=3000;
    const scrollStarted=performance.now();
    const scrollDistance=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
    let previous=scrollStarted;
    await new Promise(resolve=>{
      const step=(now)=>{
        intervals.push(now-previous);
        previous=now;
        const progress=Math.min(1,(now-scrollStarted)/durationMs);
        viewport.scrollTop=scrollDistance*progress;
        if(progress<1)requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    const sorted=[...intervals].sort((a,b)=>a-b);
    const budgetMs=1000/60;
    const withinBudget=intervals.filter(value=>value<=budgetMs).length;
    return {
      search:{debounceAndPaintMs,cards:searchCards},
      scroll:{
        durationMs:performance.now()-scrollStarted,
        distancePx:scrollDistance,
        frames:intervals.length,
        p95FrameMs:sorted[Math.max(0,Math.ceil(sorted.length*0.95)-1)],
        maxFrameMs:sorted.at(-1)??0,
        withinFrameBudgetPercent:intervals.length?withinBudget/intervals.length*100:0,
        frameBudgetMs:budgetMs
      }
    };
  })()`);
}

const started = performance.now();
let used = false;
const timeout = setTimeout(() => {
  console.error("PERF_TIMEOUT", sandbox);
  app.exit(1);
}, 120000);
app.on("web-contents-created", (_, contents) => {
  contents.on("did-finish-load", async () => {
    if (used || !contents.getURL().includes("index.html")) return;
    used = true;
    try {
      await contents.executeJavaScript(
        `new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{if(document.body.innerText.trim())resolve();else if(performance.now()-start>30000)reject(new Error('Empty renderer'));else setTimeout(poll,20)};poll()})`,
      );
      const info = await contents.executeJavaScript(
        `window.pond.query('library.info',{})`,
      );
      assert.ok(
        fs.realpathSync(info.path).startsWith(fs.realpathSync(sandbox)),
      );
      const usable = await contents.executeJavaScript(
        `new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{const cards=document.querySelectorAll('[data-save-id]');const loaded=[...document.querySelectorAll('[data-save-id] img')].filter(img=>img.naturalWidth>0);if(cards.length>0&&loaded.length>0)resolve({cards:cards.length,loadedImages:loaded.length,text:document.body.innerText.slice(0,240)});else if(performance.now()-start>60000)reject(new Error('Gallery not usable: '+document.body.innerText.slice(0,400)));else setTimeout(poll,20)};poll()})`,
      );
      const launchMs = performance.now() - started;
      const samples = await contents.executeJavaScript(`(async()=>{
     const cases=[['all',{}],['folder',{scope:{folderIds:['perf-folder']}}],['keyword',{keywords:'target'}],['folder-keyword',{keywords:'target',scope:{folderIds:['perf-folder']}}],['file-size-sort',{sortKey:'fileSize',sortDir:'desc'}]];
     const out=[];
     for(const [operation,rest] of cases){const input={query:{combinator:'and',rules:[]},limit:250,...rest};const timings=[];let page;for(let index=0;index<21;index++){const start=performance.now();page=await window.pond.query('saves.queryPage',input);const rows=await window.pond.query('saves.getMany',{ids:page.ids});if(rows.length!==page.ids.length)throw new Error('Hydration mismatch');const elapsed=performance.now()-start;if(index)timings.push(elapsed);}timings.sort((a,b)=>a-b);out.push({operation,total:page.total,rows:page.ids.length,samples:timings.length,p50:timings[9],p95:timings[18]});}
     return out;
    })()`);
      const expectedSize = Number(process.env.POND_PERF_SIZE);
      for (const sample of samples) {
        const expected = sample.operation.includes("folder")
          ? expectedSize / 20
          : sample.operation === "keyword"
            ? expectedSize / 5
            : expectedSize;
        assert.equal(sample.total, expected, sample.operation);
        assert.equal(sample.rows, Math.min(250, expected));
      }
      const renderer = await measureSearchAndScroll(contents);
      const result = {
        sandbox,
        size: Number(process.env.POND_PERF_SIZE),
        at: new Date().toISOString(),
        build:
          "desktop out/main + out/renderer, Electron executable; unsigned development output",
        launchBoundary:
          "harness main entry to mounted gallery cards and one decoded image (20ms polling)",
        launchMs,
        usable,
        samples,
        renderer,
        hardware: {
          cpu: os.cpus()[0].model,
          memoryBytes: os.totalmem(),
          electron: process.versions.electron,
        },
        cache:
          "fresh Chromium session; populated SQLite index; repeated originals via hardlinks; 1 priming + 20 measured IPC calls; uncontrolled host workload; generated fixture media",
      };
      fs.writeFileSync(
        path.join(sandbox, "result.json"),
        JSON.stringify(result, null, 2),
      );
      fs.writeFileSync(
        path.join(sandbox, "gallery.png"),
        (await contents.capturePage()).toPNG(),
      );
      console.log("PERF_RESULT", JSON.stringify(result));
      clearTimeout(timeout);
      app.quit();
      setTimeout(() => app.exit(0), 5000).unref();
    } catch (error) {
      clearTimeout(timeout);
      console.error("PERF_FAILED", sandbox, error);
      app.exit(1);
    }
  });
});
import(`${root}/out/main/index.js`).catch((error) => {
  console.error(error);
  app.exit(1);
});
