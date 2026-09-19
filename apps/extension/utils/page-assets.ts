export interface PageAssetFolder {
  id: string;
  name: string;
}

export interface PageAssetSelection {
  urls: string[];
  originUrl: string;
  title: string;
  tagText: string;
  folderIds: string[];
}

export async function pickPageAssets(
  catalog: { folders: PageAssetFolder[] } = { folders: [] },
): Promise<PageAssetSelection | null> {
  const assets = [
    ...new Map(
      Array.from(document.images)
        .filter(
          (image) =>
            image.naturalWidth > 0 &&
            /^https?:/.test(image.currentSrc || image.src),
        )
        .map((image) => [
          image.currentSrc || image.src,
          {
            url: image.currentSrc || image.src,
            width: image.naturalWidth,
            height: image.naturalHeight,
            title: image.alt,
          },
        ]),
    ).values(),
  ];
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `:host{all:initial}*{box-sizing:border-box}dialog{display:flex;flex-direction:column;position:fixed;inset:24px;margin:auto;width:min(1000px,calc(100vw - 48px));height:calc(100vh - 48px);padding:24px;border:1px solid #aaa;border-radius:16px;background:#fafafa;color:#222;font:14px system-ui;box-shadow:0 10px 80px #0006}header,footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}h2{font-size:20px;margin:0 auto 0 0}button,input{font:inherit}button{padding:8px 12px;border:1px solid #bbb;border-radius:7px;background:white;color:#222;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #1670ee}button:disabled{opacity:.5;cursor:default}input[type=number]{width:80px;padding:6px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;overflow:auto;flex:1;padding:16px 0;margin:12px 0}.asset{display:flex;flex-direction:column;border:1px solid #ccc;border-radius:8px;padding:8px;gap:8px;cursor:pointer;position:relative}.asset:has(input:checked){outline:2px solid #1670ee}.asset img{width:100%;height:115px;object-fit:contain}.asset input{position:absolute;top:8px;left:8px}.asset span{font-size:12px;text-align:center}.count{margin-right:auto}.save{background:#166be8;color:white;border-color:#166be8}`;
  shadow.append(style);
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Collect images from this page");
  const header = document.createElement("header");
  const heading = document.createElement("h2");
  heading.textContent = "Collect images";
  const sizeLabel = document.createElement("label");
  sizeLabel.textContent = "Minimum width ";
  const size = document.createElement("input");
  size.type = "number";
  size.min = "0";
  size.value = "100";
  size.step = "100";
  sizeLabel.append(size);
  const all = document.createElement("button");
  all.textContent = "Select visible";
  const close = document.createElement("button");
  close.textContent = "Cancel";
  header.append(heading, sizeLabel, all, close);
  const grid = document.createElement("div");
  grid.className = "grid";
  const footer = document.createElement("footer");
  const count = document.createElement("span");
  count.className = "count";
  count.setAttribute("aria-live", "polite");
  const tagsLabel = document.createElement("label");
  tagsLabel.append("Tags ");
  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.placeholder = "design, reference";
  tagsLabel.append(tagsInput);
  const folderBoxes: HTMLInputElement[] = [];
  const folders = document.createElement("fieldset");
  folders.style.cssText =
    "border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px";
  if (catalog.folders.length) {
    const legend = document.createElement("legend");
    legend.textContent = "Folders";
    folders.append(legend);
    for (const folder of catalog.folders) {
      const boxLabel = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = folder.id;
      folderBoxes.push(box);
      boxLabel.append(box, ` ${folder.name}`);
      folders.append(boxLabel);
    }
  }
  const save = document.createElement("button");
  save.className = "save";
  save.textContent = "Save Selected";
  footer.append(count, tagsLabel, folders, save);
  dialog.append(header, grid, footer);
  shadow.append(dialog);
  for (const name of ["click", "keydown", "keyup", "pointerdown", "pointerup"])
    shadow.addEventListener(name, (event) => event.stopPropagation());
  document.documentElement.append(host);
  const selected = new Set<string>();
  const updateCount = () => {
    count.textContent = `${selected.size} selected · ${assets.length} images on this page`;
    save.disabled = selected.size === 0 || selected.size > 500;
  };
  const visible = () =>
    assets.filter(
      (asset) => asset.width >= Math.max(0, Number(size.value) || 0),
    );
  function render() {
    grid.replaceChildren();
    for (const asset of visible()) {
      const label = document.createElement("label");
      label.className = "asset";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = selected.has(asset.url);
      input.setAttribute(
        "aria-label",
        asset.title || `${asset.width} by ${asset.height} image`,
      );
      input.onchange = () => {
        if (input.checked) selected.add(asset.url);
        else selected.delete(asset.url);
        updateCount();
      };
      const image = document.createElement("img");
      image.src = asset.url;
      image.alt = asset.title;
      image.loading = "lazy";
      const dimensions = document.createElement("span");
      dimensions.textContent = `${asset.width} × ${asset.height}`;
      label.append(input, image, dimensions);
      grid.append(label);
    }
    updateCount();
  }
  size.oninput = render;
  all.onclick = () => {
    const items = visible();
    const clear = items.every((asset) => selected.has(asset.url));
    for (const asset of items) {
      if (clear) selected.delete(asset.url);
      else if (selected.size < 500) selected.add(asset.url);
    }
    render();
  };
  render();
  try {
    dialog.showModal();
    size.focus();
  } catch (error) {
    host.remove();
    throw error;
  }
  return new Promise((resolve) => {
    const finish = (result: PageAssetSelection | null) => {
      host.remove();
      resolve(result);
    };
    close.onclick = () => finish(null);
    dialog.oncancel = (event) => {
      event.preventDefault();
      finish(null);
    };
    save.onclick = () =>
      finish({
        urls: [...selected],
        originUrl: location.href,
        title: document.title,
        tagText: tagsInput.value,
        folderIds: folderBoxes
          .filter((box) => box.checked)
          .map((box) => box.value),
      });
  });
}
