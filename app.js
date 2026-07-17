
(() => {
  const cfg = window.IMAGE_LIBRARY_CONFIG || {};
  const endpoint = `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com`;
  const $ = s => document.querySelector(s);
  const el = {
    title: $("#siteTitle"), folders: $("#heroFolders"), files: $("#heroFiles"), path: $("#heroPath"),
    mf: $("#metricFolders"), mfi: $("#metricFiles"), ms: $("#metricStatus"),
    grid: $("#grid"), status: $("#status"), back: $("#backBtn"), crumbs: $("#breadcrumbs"),
    search: $("#searchInput"), refresh: $("#refreshBtn"), dialog: $("#previewDialog"),
    pimg: $("#previewImage"), pname: $("#previewName"), ppath: $("#previewPath"),
    open: $("#openOriginal"), download: $("#downloadFile"), copy: $("#copyLink"), close: $("#closeDialog")
  };
  let tree={folders:{},files:[]}, parts=[];

  el.title.textContent="佰睿昇公司";
  document.title="佰睿昇公司";

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isImage=n=>/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(n||"");
  const rawUrl=k=>`${endpoint}/${k.split("/").map(encodeURIComponent).join("/")}`;
  const viewerUrl=(key,name)=>`${location.origin}${location.pathname.replace(/[^/]*$/,"")}viewer.html?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}`;
  const downloadUrl=k=>rawUrl(k);

  function node(){let n=tree;for(const p of parts)n=n.folders[p];return n}
  function count(n){let t=(n.files||[]).length;for(const c of Object.values(n.folders||{}))t+=count(c);return t}
  function bytes(v){v=Number(v||0);if(!v)return"";const u=["B","KB","MB","GB"];const i=Math.min(Math.floor(Math.log(v)/Math.log(1024)),3);return`${(v/1024**i).toFixed(i?1:0)} ${u[i]}`}
  function build(files){
    const root={folders:{},files:[]};
    for(const f of files){
      const key=f.key||f.Key||"";if(!key||key.endsWith("/"))continue;
      const arr=key.split("/").filter(Boolean),name=arr.pop();let n=root;
      for(const p of arr){n.folders[p]??={folders:{},files:[]};n=n.folders[p]}
      n.files.push({name,key,size:f.size||f.Size||0,modified:f.modified||f.LastModified||""});
    }
    const sort=n=>{n.files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));n.folders=Object.fromEntries(Object.entries(n.folders).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})));Object.values(n.folders).forEach(sort)};sort(root);return root;
  }
  async function load(){
    el.status.textContent="正在加载素材目录...";el.ms.textContent="加载中";
    try{
      const r=await fetch(`${cfg.apiUrl}${cfg.apiUrl.includes("?")?"&":"?"}_t=${Date.now()}`);
      const d=await r.json();const files=Array.isArray(d.files)?d.files:[];
      tree=build(files);el.folders.textContent=Object.keys(tree.folders).length;el.files.textContent=count(tree);render();el.status.textContent="素材目录已更新";el.ms.textContent="已连接";
    }catch(e){el.status.textContent=`读取失败：${e.message}`;el.ms.textContent="失败";}
  }
  function render(){
    const n=node(),q=el.search.value.trim().toLowerCase();
    const fs=Object.entries(n.folders||{}).map(([name,val])=>({name,count:count(val)})).filter(x=>x.name.toLowerCase().includes(q));
    const files=(n.files||[]).filter(x=>x.name.toLowerCase().includes(q));
    el.mf.textContent=fs.length;el.mfi.textContent=files.length;el.path.textContent=parts.length?parts.join(" / "):"首页";
    crumbs();
    el.grid.innerHTML=[
      ...fs.map(x=>`<article class="card"><button class="card-main" data-folder="${esc(x.name)}"><div class="thumb"><div class="folder">📁</div></div><div class="card-body"><div class="name">${esc(x.name)}</div><div class="meta">${x.count} 个文件</div></div></button></article>`),
      ...files.map(fileCard)
    ].join("")||`<div class="empty">这个目录是空的</div>`;
    bind();
    requestAnimationFrame(()=>[...el.grid.querySelectorAll(".card")].forEach((c,i)=>setTimeout(()=>c.classList.add("show"),Math.min(i*30,300))));
  }
  function fileCard(x){
    const raw=rawUrl(x.key),view=viewerUrl(x.key,x.name);
    return `<article class="card">
      <button class="card-main" data-file="${esc(x.key)}" data-name="${esc(x.name)}">
        <div class="thumb">${isImage(x.name)?`<img loading="lazy" src="${raw}" alt="${esc(x.name)}">`:"📄"}</div>
        <div class="card-body"><div class="name">${esc(x.name)}</div><div class="meta">${bytes(x.size)}</div></div>
      </button>
      <div class="card-actions">
        <a href="${view}" target="_blank" rel="noopener">查看</a>
        <a href="${raw}" download>下载</a>
        <button data-copy="${esc(view)}">复制链接</button>
      </div>
    </article>`;
  }
  function bind(){
    el.grid.querySelectorAll("[data-folder]").forEach(b=>b.onclick=()=>{parts.push(b.dataset.folder);el.search.value="";render()});
    el.grid.querySelectorAll("[data-file]").forEach(b=>b.onclick=()=>preview(b.dataset.file,b.dataset.name));
    el.grid.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async e=>{e.stopPropagation();await copy(b.dataset.copy,b)});
  }
  function crumbs(){
    const cs=[{name:"首页",i:-1},...parts.map((name,i)=>({name,i}))];
    el.crumbs.innerHTML=cs.map((c,i)=>i===cs.length-1?`<span>${esc(c.name)}</span>`:`<button data-i="${c.i}">${esc(c.name)}</button> / `).join("");
    el.crumbs.querySelectorAll("button").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);parts=i<0?[]:parts.slice(0,i+1);render()});
    el.back.disabled=!parts.length;
  }
  async function copy(url,b){
    try{await navigator.clipboard.writeText(url);const old=b.textContent;b.textContent="已复制";b.classList.add("done");setTimeout(()=>{b.textContent=old;b.classList.remove("done")},1200)}
    catch{prompt("复制下面的链接：",url)}
  }
  function preview(key,name){
    const raw=rawUrl(key),view=viewerUrl(key,name);
    el.pname.textContent=name;el.ppath.textContent=key;el.pimg.src=raw;el.open.href=view;el.download.href=raw;el.download.setAttribute("download",name);el.copy.onclick=()=>copy(view,el.copy);el.dialog.showModal();
  }
  el.search.oninput=render;el.refresh.onclick=load;el.back.onclick=()=>{parts.pop();render()};el.close.onclick=()=>el.dialog.close();el.dialog.onclick=e=>{if(e.target===el.dialog)el.dialog.close()};
  load();
})();
