
(() => {
  const cfg = window.IMAGE_LIBRARY_CONFIG;
  const endpoint = `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com`;
  let currentPrefix = normalizePrefix(cfg.rootPrefix || "");
  let items = [];

  const el = {
    title: document.querySelector("#siteTitle"),
    grid: document.querySelector("#grid"),
    status: document.querySelector("#status"),
    back: document.querySelector("#backBtn"),
    crumbs: document.querySelector("#breadcrumbs"),
    search: document.querySelector("#searchInput"),
    refresh: document.querySelector("#refreshBtn"),
    dialog: document.querySelector("#previewDialog"),
    previewImage: document.querySelector("#previewImage"),
    previewName: document.querySelector("#previewName"),
    openOriginal: document.querySelector("#openOriginal"),
    downloadFile: document.querySelector("#downloadFile"),
    copyLink: document.querySelector("#copyLink"),
    closeDialog: document.querySelector("#closeDialog")
  };

  el.title.textContent = cfg.siteTitle || "Image Library";
  document.title = cfg.siteTitle || "Image Library";

  function normalizePrefix(value) {
    if (!value) return "";
    return value.replace(/^\/+/, "").replace(/\/?$/, "/");
  }

  function encodeObjectKey(key) {
    return key.split("/").map(encodeURIComponent).join("/");
  }

  function objectUrl(key) {
    return `${endpoint}/${encodeObjectKey(key)}`;
  }

  function isImage(key) {
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(key);
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return "";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  async function listObjects(prefix) {
    const params = new URLSearchParams({
      "list-type": "2",
      "delimiter": "/",
      "prefix": prefix,
      "max-keys": String(cfg.maxKeys || 1000)
    });
    const response = await fetch(`${endpoint}/?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`COS 返回 ${response.status}。请检查“公有读权限”和 CORS 设置。`);
    }
    const text = await response.text();
    const xml = new DOMParser().parseFromString(text, "application/xml");
    const error = xml.querySelector("Error > Message");
    if (error) throw new Error(error.textContent);

    const folders = [...xml.querySelectorAll("CommonPrefixes > Prefix")]
      .map(node => node.textContent)
      .filter(key => key !== prefix)
      .map(key => ({
        type: "folder",
        key,
        name: key.slice(prefix.length).replace(/\/$/, "")
      }));

    const files = [...xml.querySelectorAll("Contents")]
      .map(node => ({
        type: "file",
        key: node.querySelector("Key")?.textContent || "",
        size: node.querySelector("Size")?.textContent || "0",
        modified: node.querySelector("LastModified")?.textContent || ""
      }))
      .filter(file => file.key && file.key !== prefix && !file.key.endsWith("/"))
      .map(file => ({
        ...file,
        name: file.key.slice(prefix.length)
      }));

    return [...folders, ...files];
  }

  async function load(prefix = currentPrefix) {
    currentPrefix = normalizePrefix(prefix);
    el.status.className = "status";
    el.status.textContent = "正在读取目录…";
    el.grid.innerHTML = "";
    el.search.value = "";
    renderBreadcrumbs();

    try {
      items = await listObjects(currentPrefix);
      render(items);
      el.status.textContent = `当前目录共 ${items.length} 项`;
    } catch (error) {
      console.error(error);
      items = [];
      el.status.className = "status error";
      el.status.innerHTML =
        `${escapeHtml(error.message)}<br><br>` +
        `请在腾讯云 COS 中确认：<strong>存储桶允许公有读</strong>，并在“安全管理 → 跨域访问 CORS”允许来源 ` +
        `<code>https://bairuishengus-dotcom.github.io</code>，允许方法 GET、HEAD。`;
      el.grid.innerHTML = `<div class="empty">暂时无法读取文件。</div>`;
    }
  }

  function render(list) {
    const query = el.search.value.trim().toLowerCase();
    const filtered = query
      ? list.filter(item => item.name.toLowerCase().includes(query))
      : list;

    if (!filtered.length) {
      el.grid.innerHTML = `<div class="empty">${query ? "没有匹配的文件" : "这个目录是空的"}</div>`;
      return;
    }

    el.grid.innerHTML = filtered.map(item => {
      if (item.type === "folder") {
        return `
          <article class="card">
            <button class="card-main" data-folder="${escapeHtml(item.key)}">
              <div class="thumb"><span class="folder-icon">📁</span></div>
              <div class="card-info">
                <div class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                <div class="card-meta">文件夹</div>
              </div>
            </button>
          </article>`;
      }

      const url = objectUrl(item.key);
      const preview = isImage(item.key)
        ? `<img loading="lazy" src="${url}" alt="${escapeHtml(item.name)}"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'file-icon',textContent:'🖼️'}))">`
        : `<span class="file-icon">📄</span>`;

      return `
        <article class="card">
          <button class="card-main" data-file="${escapeHtml(item.key)}">
            <div class="thumb">${preview}</div>
            <div class="card-info">
              <div class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div class="card-meta">${formatBytes(item.size)}</div>
            </div>
          </button>
          <div class="card-actions">
            <a href="${url}" target="_blank" rel="noopener">打开</a>
            <a href="${url}" download>下载</a>
          </div>
        </article>`;
    }).join("");

    el.grid.querySelectorAll("[data-folder]").forEach(button => {
      button.addEventListener("click", () => load(button.dataset.folder));
    });
    el.grid.querySelectorAll("[data-file]").forEach(button => {
      button.addEventListener("click", () => openPreview(button.dataset.file));
    });
  }

  function renderBreadcrumbs() {
    const root = normalizePrefix(cfg.rootPrefix || "");
    const relative = currentPrefix.slice(root.length).replace(/\/$/, "");
    const parts = relative ? relative.split("/") : [];
    const crumbs = [{ name: "首页", prefix: root }];
    let build = root;
    for (const part of parts) {
      build += `${part}/`;
      crumbs.push({ name: part, prefix: build });
    }

    el.crumbs.innerHTML = crumbs.map((crumb, index) =>
      index === crumbs.length - 1
        ? `<span>${escapeHtml(crumb.name)}</span>`
        : `<button data-prefix="${escapeHtml(crumb.prefix)}">${escapeHtml(crumb.name)}</button> <span>/</span>`
    ).join(" ");

    el.crumbs.querySelectorAll("[data-prefix]").forEach(button => {
      button.addEventListener("click", () => load(button.dataset.prefix));
    });
    el.back.disabled = currentPrefix === root;
  }

  function parentPrefix() {
    const root = normalizePrefix(cfg.rootPrefix || "");
    if (currentPrefix === root) return root;
    const relative = currentPrefix.slice(root.length).replace(/\/$/, "");
    const parts = relative.split("/");
    parts.pop();
    return root + (parts.length ? `${parts.join("/")}/` : "");
  }

  function openPreview(key) {
    const name = key.split("/").pop();
    const url = objectUrl(key);
    el.previewName.textContent = name;
    el.openOriginal.href = url;
    el.downloadFile.href = url;
    el.downloadFile.setAttribute("download", name);

    if (isImage(key)) {
      el.previewImage.src = url;
      el.previewImage.alt = name;
      el.previewImage.style.display = "";
    } else {
      el.previewImage.removeAttribute("src");
      el.previewImage.style.display = "none";
    }

    el.copyLink.onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        el.copyLink.textContent = "已复制";
        setTimeout(() => el.copyLink.textContent = "复制链接", 1200);
      } catch {
        prompt("复制下面的链接：", url);
      }
    };
    el.dialog.showModal();
  }

  el.search.addEventListener("input", () => render(items));
  el.refresh.addEventListener("click", () => load(currentPrefix));
  el.back.addEventListener("click", () => load(parentPrefix()));
  el.closeDialog.addEventListener("click", () => el.dialog.close());
  el.dialog.addEventListener("click", event => {
    if (event.target === el.dialog) el.dialog.close();
  });

  load();
})();
