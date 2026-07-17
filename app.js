
(() => {
  const cfg = window.IMAGE_LIBRARY_CONFIG;
  const endpoint = `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com`;
  let manifest = { folders: {} };
  let pathParts = [];

  const $ = (s) => document.querySelector(s);
  const el = {
    title: $("#siteTitle"), grid: $("#grid"), status: $("#status"),
    back: $("#backBtn"), crumbs: $("#breadcrumbs"), search: $("#searchInput"),
    refresh: $("#refreshBtn"), dialog: $("#previewDialog"),
    previewImage: $("#previewImage"), previewName: $("#previewName"),
    openOriginal: $("#openOriginal"), downloadFile: $("#downloadFile"),
    copyLink: $("#copyLink"), closeDialog: $("#closeDialog")
  };

  el.title.textContent = cfg.siteTitle;
  document.title = cfg.siteTitle;

  const esc = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isImage = (name) => /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(name);
  const encodeKey = (key) => key.split("/").map(encodeURIComponent).join("/");
  const objectUrl = (key) => `${endpoint}/${encodeKey(key)}`;

  function currentNode() {
    let node = manifest;
    for (const part of pathParts) node = node.folders[part];
    return node;
  }

  async function loadManifest() {
    el.status.className = "status";
    el.status.textContent = "正在加载目录…";
    try {
      const res = await fetch(`${cfg.manifestFile}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`无法读取 ${cfg.manifestFile}`);
      manifest = await res.json();
      render();
    } catch (err) {
      el.status.className = "status error";
      el.status.textContent = `${err.message}。请确认 index.json 已上传到 GitHub 仓库根目录。`;
      el.grid.innerHTML = `<div class="empty">目录文件加载失败。</div>`;
    }
  }

  function render() {
    const node = currentNode();
    const q = el.search.value.trim().toLowerCase();
    const folders = Object.entries(node.folders || {})
      .map(([name, value]) => ({type:"folder", name, count:countFiles(value)}))
      .filter(x => x.name.toLowerCase().includes(q));
    const files = (node.files || [])
      .map(x => typeof x === "string" ? {name:x, key:buildKey(x)} : x)
      .filter(x => x.name.toLowerCase().includes(q));

    renderBreadcrumbs();
    el.status.className = "status";
    el.status.textContent = `当前目录：${folders.length} 个文件夹，${files.length} 个文件`;

    const items = [
      ...folders.map(item => `
        <article class="card">
          <button class="card-main" data-folder="${esc(item.name)}">
            <div class="thumb"><span class="folder-icon">📁</span></div>
            <div class="card-info">
              <div class="card-name">${esc(item.name)}</div>
              <div class="card-meta">${item.count} 个文件</div>
            </div>
          </button>
        </article>`),
      ...files.map(item => {
        const key = item.key || buildKey(item.name);
        const url = objectUrl(key);
        const thumb = isImage(item.name)
          ? `<img loading="lazy" src="${url}" alt="${esc(item.name)}">`
          : `<span class="file-icon">📄</span>`;
        return `
          <article class="card">
            <button class="card-main" data-file="${esc(key)}" data-name="${esc(item.name)}">
              <div class="thumb">${thumb}</div>
              <div class="card-info"><div class="card-name">${esc(item.name)}</div></div>
            </button>
            <div class="card-actions">
              <a href="${url}" target="_blank" rel="noopener">打开</a>
              <a href="${url}" download>下载</a>
            </div>
          </article>`;
      })
    ];

    el.grid.innerHTML = items.length ? items.join("") : `<div class="empty">这个目录是空的</div>`;

    el.grid.querySelectorAll("[data-folder]").forEach(btn => {
      btn.onclick = () => { pathParts.push(btn.dataset.folder); el.search.value = ""; render(); };
    });
    el.grid.querySelectorAll("[data-file]").forEach(btn => {
      btn.onclick = () => openPreview(btn.dataset.file, btn.dataset.name);
    });
  }

  function buildKey(filename) {
    return [...pathParts, filename].join("/");
  }

  function countFiles(node) {
    let total = (node.files || []).length;
    for (const child of Object.values(node.folders || {})) total += countFiles(child);
    return total;
  }

  function renderBreadcrumbs() {
    const crumbs = [{name:"首页", index:-1}, ...pathParts.map((name,index)=>({name,index}))];
    el.crumbs.innerHTML = crumbs.map((c,i) =>
      i === crumbs.length-1
        ? `<span>${esc(c.name)}</span>`
        : `<button data-index="${c.index}">${esc(c.name)}</button> <span>/</span>`
    ).join(" ");
    el.crumbs.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.index);
        pathParts = idx < 0 ? [] : pathParts.slice(0, idx + 1);
        el.search.value = "";
        render();
      };
    });
    el.back.disabled = pathParts.length === 0;
  }

  function openPreview(key, name) {
    const url = objectUrl(key);
    el.previewName.textContent = name;
    el.openOriginal.href = url;
    el.downloadFile.href = url;
    el.downloadFile.download = name;
    if (isImage(name)) {
      el.previewImage.src = url;
      el.previewImage.style.display = "";
    } else {
      el.previewImage.removeAttribute("src");
      el.previewImage.style.display = "none";
    }
    el.copyLink.onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        el.copyLink.textContent = "已复制";
        setTimeout(()=>el.copyLink.textContent="复制链接",1200);
      } catch {
        prompt("复制下面的链接：", url);
      }
    };
    el.dialog.showModal();
  }

  el.search.oninput = render;
  el.refresh.onclick = loadManifest;
  el.back.onclick = () => { pathParts.pop(); el.search.value = ""; render(); };
  el.closeDialog.onclick = () => el.dialog.close();
  el.dialog.onclick = e => { if (e.target === el.dialog) el.dialog.close(); };

  loadManifest();
})();
