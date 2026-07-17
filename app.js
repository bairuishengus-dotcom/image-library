(() => {
  const cfg = window.IMAGE_LIBRARY_CONFIG;
  const endpoint = `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com`;
  let tree = { folders: {}, files: [] };
  let pathParts = [];
  const $ = s => document.querySelector(s);
  const el = {title:$('#siteTitle'),grid:$('#grid'),status:$('#status'),back:$('#backBtn'),crumbs:$('#breadcrumbs'),search:$('#searchInput'),refresh:$('#refreshBtn'),dialog:$('#previewDialog'),previewImage:$('#previewImage'),previewName:$('#previewName'),openOriginal:$('#openOriginal'),downloadFile:$('#downloadFile'),copyLink:$('#copyLink'),closeDialog:$('#closeDialog')};
  el.title.textContent = cfg.siteTitle; document.title = cfg.siteTitle;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const encodeKey=k=>k.split('/').map(encodeURIComponent).join('/');
  const urlFor=k=>`${endpoint}/${encodeKey(k)}`;
  const isImage=n=>/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(n);
  const bytes=n=>{if(!n)return'';const u=['B','KB','MB','GB'];const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3);return`${(n/1024**i).toFixed(i?1:0)} ${u[i]}`};

  function buildTree(files){
    const root={folders:{},files:[]};
    for(const file of files){
      const parts=file.key.split('/'); const name=parts.pop(); let node=root;
      for(const part of parts){node.folders[part]??={folders:{},files:[]};node=node.folders[part];}
      node.files.push({...file,name});
    }
    return root;
  }
  function node(){let n=tree;for(const p of pathParts)n=n.folders[p];return n;}
  function count(n){let x=n.files.length;for(const c of Object.values(n.folders))x+=count(c);return x;}

  async function load(){
    if(!cfg.apiUrl || cfg.apiUrl.includes('PASTE_YOUR')){
      el.status.className='status error';el.status.textContent='请先在 config.js 填入腾讯云 SCF 函数 URL。';return;
    }
    el.status.className='status';el.status.textContent='正在实时读取 COS…';el.grid.innerHTML='';
    try{
      const res=await fetch(`${cfg.apiUrl}${cfg.apiUrl.includes('?')?'&':'?'}t=${Date.now()}`);
      const data=await res.json();
      if(!res.ok)throw new Error(data.message||`接口返回 ${res.status}`);
      tree=buildTree(data.files||[]);pathParts=[];el.search.value='';render();
    }catch(e){el.status.className='status error';el.status.textContent=`读取失败：${e.message}`;el.grid.innerHTML='<div class="empty">请检查函数 URL、运行角色和函数 CORS。</div>';}
  }
  function render(){
    const n=node(),q=el.search.value.trim().toLowerCase();
    const folders=Object.entries(n.folders).map(([name,v])=>({name,count:count(v)})).filter(x=>x.name.toLowerCase().includes(q));
    const files=n.files.filter(x=>x.name.toLowerCase().includes(q));
    crumbs();el.status.className='status';el.status.textContent=`当前目录：${folders.length} 个文件夹，${files.length} 个文件`;
    const out=[];
    for(const f of folders)out.push(`<article class="card"><button class="card-main" data-folder="${esc(f.name)}"><div class="thumb"><span class="folder-icon">📁</span></div><div class="card-info"><div class="card-name">${esc(f.name)}</div><div class="card-meta">${f.count} 个文件</div></div></button></article>`);
    for(const f of files){const u=urlFor(f.key),thumb=isImage(f.name)?`<img loading="lazy" src="${u}" alt="${esc(f.name)}">`:`<span class="file-icon">📄</span>`;out.push(`<article class="card"><button class="card-main" data-key="${esc(f.key)}" data-name="${esc(f.name)}"><div class="thumb">${thumb}</div><div class="card-info"><div class="card-name">${esc(f.name)}</div><div class="card-meta">${bytes(f.size)}</div></div></button><div class="card-actions"><a href="${u}" target="_blank">打开</a><a href="${u}" download>下载</a></div></article>`)}
    el.grid.innerHTML=out.length?out.join(''):'<div class="empty">这个目录是空的</div>';
    el.grid.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>{pathParts.push(b.dataset.folder);el.search.value='';render()});
    el.grid.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>preview(b.dataset.key,b.dataset.name));
  }
  function crumbs(){const a=[{name:'首页',i:-1},...pathParts.map((name,i)=>({name,i}))];el.crumbs.innerHTML=a.map((c,i)=>i===a.length-1?`<span>${esc(c.name)}</span>`:`<button data-i="${c.i}">${esc(c.name)}</button> <span>/</span>`).join(' ');el.crumbs.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);pathParts=i<0?[]:pathParts.slice(0,i+1);el.search.value='';render()});el.back.disabled=!pathParts.length;}
  function preview(key,name){const u=urlFor(key);el.previewName.textContent=name;el.openOriginal.href=u;el.downloadFile.href=u;el.downloadFile.download=name;if(isImage(name)){el.previewImage.src=u;el.previewImage.style.display=''}else{el.previewImage.removeAttribute('src');el.previewImage.style.display='none'}el.copyLink.onclick=async()=>{try{await navigator.clipboard.writeText(u);el.copyLink.textContent='已复制';setTimeout(()=>el.copyLink.textContent='复制链接',1200)}catch{prompt('复制链接：',u)}};el.dialog.showModal();}
  el.search.oninput=render;el.refresh.onclick=load;el.back.onclick=()=>{pathParts.pop();el.search.value='';render()};el.closeDialog.onclick=()=>el.dialog.close();el.dialog.onclick=e=>{if(e.target===el.dialog)el.dialog.close()};load();
})();
