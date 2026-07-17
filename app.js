
(() => {
  const cfg = window.IMAGE_LIBRARY_CONFIG || {};
  const endpoint = `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com`;
  const $ = (s) => document.querySelector(s);
  const el = {
    siteTitle: $("#siteTitle"), heroFolders: $("#heroFolders"), heroFiles: $("#heroFiles"), heroPath: $("#heroPath"),
    metricFolders: $("#metricFolders"), metricFiles: $("#metricFiles"), metricStatus: $("#metricStatus"),
    grid: $("#grid"), status: $("#status"), back: $("#backBtn"), crumbs: $("#breadcrumbs"),
    search: $("#searchInput"), refresh: $("#refreshBtn"), dialog: $("#previewDialog"),
    previewImage: $("#previewImage"), previewName: $("#previewName"), previewPath: $("#previewPath"),
    openOriginal: $("#openOriginal"), downloadFile: $("#downloadFile"), copyLink: $("#copyLink"), closeDialog: $("#closeDialog")
  };

  let rootNode = { folders: {}, files: [] };
  let pathParts = [];

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isImage = (name) => /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(name || "");
  const objectUrl = (key) => `${endpoint}/${key.split("/").map(encodeURIComponent).join("/")}`;

  el.siteTitle.textContent = cfg.siteTitle || "佰睿昇公司";
  document.title = cfg.siteTitle || "佰睿昇公司";

  function formatBytes(bytes){
    const value = Number(bytes || 0);
    if (!value) return "未知大小";
    const units = ["B","KB","MB","GB","TB"];
    const i = Math.min(Math.floor(Math.log(value)/Math.log(1024)), units.length - 1);
    return `${(value/1024**i).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  function currentNode(){
    let node = rootNode;
    for (const part of pathParts) node = node.folders[part];
    return node;
  }

  function countAllFiles(node){
    let total = (node.files || []).length;
    for (const child of Object.values(node.folders || {})) total += countAllFiles(child);
    return total;
  }

  function buildTree(files){
    const root = { folders: {}, files: [] };
    for (const file of files){
      const key = file.key || file.Key || "";
      if (!key || key.endsWith("/")) continue;
      const parts = key.split("/").filter(Boolean);
      const name = parts.pop();
      let node = root;
      for (const part of parts){
        node.folders[part] ??= { folders: {}, files: [] };
        node = node.folders[part];
      }
      node.files.push({
        name,
        key,
        size: file.size || file.Size || 0,
        lastModified: file.lastModified || file.LastModified || ""
      });
    }

    const sortNode = (node) => {
      node.files.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}));
      node.folders = Object.fromEntries(
        Object.entries(node.folders).sort((a,b) => a[0].localeCompare(b[0], undefined, {numeric:true}))
      );
      Object.values(node.folders).forEach(sortNode);
    };

    sortNode(root);
    return root;
  }

  async function copyText(text, button){
    try{
      await navigator.clipboard.writeText(text);
      const old = button.textContent;
      button.textContent = "已复制";
      button.classList.add("is-copied");
      setTimeout(() => {
        button.textContent = old;
        button.classList.remove("is-copied");
      }, 1200);
    }catch{
      prompt("复制下面的链接：", text);
    }
  }

  async function loadData(){
    if (!cfg.apiUrl){
      showError("config.js 中缺少 apiUrl，请先填写云函数 URL。");
      return;
    }

    setLoading("正在加载素材目录...");
    try{
      const response = await fetch(`${cfg.apiUrl}${cfg.apiUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`);
      if (!response.ok) throw new Error(`接口返回 ${response.status}`);
      const data = await response.json();
      const files = Array.isArray(data.files) ? data.files : (Array.isArray(data.data) ? data.data : []);
      rootNode = buildTree(files);

      el.heroFolders.textContent = Object.keys(rootNode.folders).length;
      el.heroFiles.textContent = countAllFiles(rootNode);

      render();
      setOk("素材目录已更新");
    }catch(error){
      console.error(error);
      showError(`实时读取失败：${error.message}`);
    }
  }

  function setLoading(message){
    el.status.className = "status glass status--loading";
    el.status.textContent = message;
    el.metricStatus.textContent = "加载中";
    el.grid.innerHTML = skeletonHtml(8);
  }

  function setOk(message){
    el.status.className = "status glass status--ok";
    el.status.textContent = message;
    el.metricStatus.textContent = message;
  }

  function showError(message){
    el.status.className = "status glass status--error";
    el.status.textContent = message;
    el.metricStatus.textContent = "失败";
    el.grid.innerHTML = `<div class="empty-state"><div class="empty-state__emoji">⚠️</div><div>${esc(message)}</div></div>`;
  }

  function skeletonHtml(n){
    return Array.from({length:n}).map(() => `
      <article class="card is-visible">
        <div class="card__thumb" style="background:linear-gradient(90deg,#eff4fb 25%,#f8fbff 37%,#eff4fb 63%);background-size:400% 100%;animation:shimmer 1.4s infinite"></div>
        <div class="card__body">
          <div style="height:14px;width:62%;border-radius:999px;background:#eef3fa;margin-bottom:10px"></div>
          <div style="height:12px;width:40%;border-radius:999px;background:#f3f6fb"></div>
        </div>
      </article>
    `).join("") + `<style>@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}</style>`;
  }

  function render(){
    const node = currentNode();
    const query = el.search.value.trim().toLowerCase();

    const folders = Object.entries(node.folders || {})
      .map(([name,value]) => ({name,count:countAllFiles(value)}))
      .filter(item => item.name.toLowerCase().includes(query));

    const files = (node.files || [])
      .filter(item => item.name.toLowerCase().includes(query));

    renderBreadcrumbs();
    updateMetrics(folders.length, files.length);

    el.grid.innerHTML = [
      ...folders.map(folderCard),
      ...files.map(fileCard)
    ].join("") || `
      <div class="empty-state">
        <div class="empty-state__emoji">🗂️</div>
        <div style="font-size:18px;font-weight:700;color:#2f3c50;margin-bottom:8px">这个目录是空的</div>
        <div>你可以返回上一级，或者尝试搜索其它内容。</div>
      </div>
    `;

    bindGridEvents();
    animateCards();
  }

  function updateMetrics(folderCount,fileCount){
    el.metricFolders.textContent = folderCount;
    el.metricFiles.textContent = fileCount;
    el.heroPath.textContent = pathParts.length ? pathParts.join(" / ") : "首页";
  }

  function folderCard(item){
    return `
      <article class="card">
        <button class="card__button" data-folder="${esc(item.name)}">
          <div class="card__thumb">
            <span class="card__badge">Folder</span>
            <div class="card__folder-icon">📁</div>
          </div>
          <div class="card__body">
            <h3 class="card__title">${esc(item.name)}</h3>
            <div class="card__meta">${item.count} 个文件</div>
          </div>
        </button>
      </article>
    `;
  }

  function fileCard(item){
    const url = objectUrl(item.key);
    const thumb = isImage(item.name)
      ? `<img loading="lazy" src="${url}" alt="${esc(item.name)}">`
      : `<div class="card__folder-icon" style="font-size:58px">📄</div>`;

    return `
      <article class="card">
        <button class="card__button" data-file="${esc(item.key)}" data-name="${esc(item.name)}">
          <div class="card__thumb">
            <span class="card__badge">${isImage(item.name) ? "Image" : "File"}</span>
            ${thumb}
          </div>
          <div class="card__body">
            <h3 class="card__title" title="${esc(item.name)}">${esc(item.name)}</h3>
            <div class="card__meta">${formatBytes(item.size)}${item.lastModified ? ` · ${esc(item.lastModified).slice(0,10)}` : ""}</div>
          </div>
        </button>

        <div class="card__footer">
          <a class="quick-link" href="${url}" target="_blank" rel="noopener">打开</a>
          <a class="quick-link" href="${url}" download>下载</a>
          <button class="copy-card-link" data-copy-url="${esc(url)}">复制链接</button>
        </div>
      </article>
    `;
  }

  function bindGridEvents(){
    el.grid.querySelectorAll("[data-folder]").forEach(btn => {
      btn.addEventListener("click", () => {
        pathParts.push(btn.dataset.folder);
        el.search.value = "";
        render();
      });
    });

    el.grid.querySelectorAll("[data-file]").forEach(btn => {
      btn.addEventListener("click", () => openPreview(btn.dataset.file, btn.dataset.name));
    });

    el.grid.querySelectorAll("[data-copy-url]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        copyText(btn.dataset.copyUrl, btn);
      });
    });
  }

  function animateCards(){
    const cards = [...el.grid.querySelectorAll(".card")];
    requestAnimationFrame(() => {
      cards.forEach((card,index) => {
        setTimeout(() => card.classList.add("is-visible"), Math.min(index * 35, 320));
      });
    });
  }

  function renderBreadcrumbs(){
    const crumbs = [{name:"首页",index:-1}, ...pathParts.map((name,index) => ({name,index}))];

    el.crumbs.innerHTML = crumbs.map((crumb,i) => {
      if (i === crumbs.length - 1) return `<span>${esc(crumb.name)}</span>`;
      return `<button data-index="${crumb.index}">${esc(crumb.name)}</button> <span>/</span>`;
    }).join(" ");

    el.crumbs.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        pathParts = idx < 0 ? [] : pathParts.slice(0, idx + 1);
        el.search.value = "";
        render();
      });
    });

    el.back.disabled = pathParts.length === 0;
  }

  function openPreview(key,name){
    const url = objectUrl(key);
    el.previewName.textContent = name;
    el.previewPath.textContent = key;
    el.openOriginal.href = url;
    el.downloadFile.href = url;
    el.downloadFile.download = name;

    if (isImage(name)){
      el.previewImage.src = url;
      el.previewImage.style.display = "";
    }else{
      el.previewImage.removeAttribute("src");
      el.previewImage.style.display = "none";
    }

    el.copyLink.onclick = () => copyText(url, el.copyLink);
    el.dialog.showModal();
  }

  el.search.addEventListener("input", render);
  el.refresh.addEventListener("click", loadData);
  el.back.addEventListener("click", () => {
    pathParts.pop();
    el.search.value = "";
    render();
  });
  el.closeDialog.addEventListener("click", () => el.dialog.close());
  el.dialog.addEventListener("click", (e) => {
    if (e.target === el.dialog) el.dialog.close();
  });

  loadData();
})();
