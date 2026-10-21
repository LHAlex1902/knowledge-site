// 兜底：若 site-config.js 未加载成功，用默认配置，避免进不去
if(!window.SITE_CONFIG){ window.SITE_CONFIG = { password:"2026", rememberDays:7 }; }

// ===== 配置 =====
var GH_USER = 'lhalex1902';
var GH_REPO  = 'knowledge-site';
var LS_LAYOUT = 'zhishi-pulse-layout-v1';
var LS_LINKS  = 'zhishi-pulse-links-v1';
var LS_NOTES  = 'zhishi-pulse-notes-v1';
var LS_COLLAPSE = 'zhishi-pulse-collapse-v1';   // 板块折叠状态：{secId:true} 表示该板块已折叠
var LS_TOKEN  = 'zhishi-pulse-token-v1';   // 本设备记住的 GitHub PAT
var DATA_FILE = 'site-data.json';          // 仓库里存放同步数据的文件
var SYNC_BRANCH = 'main';

// ===== DeepSeek AI 问答配置 =====
// Worker 代理地址：部署 ai-worker.js 后，把地址填到这里（末尾不要带斜杠）
var AI_WORKER_URL = 'https://project-9xcgb.vercel.app/api/chat';
// 客户端密钥：与 Worker 的 CLIENT_KEY 环境变量一致；未设则留空（仅靠地址保密）
var AI_CLIENT_KEY = '';
var AI_MODEL = 'deepseek-chat';            // DeepSeek 模型名
var LS_AI_CHAT = 'zhishi-pulse-ai-chat-v1'; // 对话历史本地存储

var BUILTIN_SECTIONS = [
  {id:'dev',     icon:'💻', name:'开发'},
  {id:'stash',   icon:'📦', name:'暂存'},
  {id:'test',    icon:'🧪', name:'测试'},
  {id:'summary', icon:'📝', name:'总结与回顾'},
  {id:'learn',   icon:'📚', name:'学无止境'},
  {id:'links',   icon:'🔗', name:'常用网址'}
];
// 自定义板块：存 localStorage + 云同步，运行时并入 SECTIONS，实现「页面内新增/删除板块」
var LS_CUSTOM = 'zhishi-pulse-custom-sections-v1';
var CUSTOM = [];   // [{id,name,icon}]
var SECTIONS = [];
var SEC_IDS = [];
// 由 BUILTIN + CUSTOM 重建 SECTIONS 与 SEC_IDS（保持引用不变，供各处原地使用）
function rebuildSections(){
  SECTIONS.length = 0;
  BUILTIN_SECTIONS.forEach(function(s){ SECTIONS.push({id:s.id, icon:s.icon, name:s.name}); });
  (CUSTOM||[]).forEach(function(s){
    if(s && s.id) SECTIONS.push({id:s.id, icon:s.icon||'📁', name:s.name||s.id});
  });
  SEC_IDS = SECTIONS.map(function(s){ return s.id; });
}
function loadCustomSections(){
  try{ var s = JSON.parse(localStorage.getItem(LS_CUSTOM)); CUSTOM = Array.isArray(s) ? s : []; }catch(e){ CUSTOM = []; }
  rebuildSections();
}
function saveCustomSections(){ try{ localStorage.setItem(LS_CUSTOM, JSON.stringify(CUSTOM)); }catch(e){} }
// 生成一个空的板块布局对象（含所有板块 + inbox），替代写死的板块 id 列表
function blankLayout(){
  var o = {};
  SECTIONS.forEach(function(s){ o[s.id] = []; });
  o.inbox = [];
  return o;
}
rebuildSections();   // 首次填充（此时 CUSTOM 为空，仅内置板块）
// 判断某板块 id 是否为内置板块（自定义板块 = 非内置）
function isBuiltinSec(id){
  for(var i=0;i<BUILTIN_SECTIONS.length;i++){ if(BUILTIN_SECTIONS[i].id === id) return true; }
  return false;
}

var NAME2SEC = {
  'tutorials/移动端抓包与日志分析实战教程.html':'test',
  'tutorials/Fiddler抓包工具实操教程.html':'test',
  'tutorials/ADB工具使用实操教程.html':'test',
  'tutorials/移动端测试脚本代码交互手册.html':'dev',
  'tutorials/Python自学笔记精解.html':'dev',
  'tutorials/C-C++自学笔记精解.html':'dev',
  'tutorials/Requests接口测试快速入门教程.html':'test',
  'tutorials/JMeter性能测试快速入门教程.html':'test',
  'tutorials/pytest测试框架快速入门教程.html':'test',
  'tutorials/题库.html':'summary'
};

var META = {
  'tutorials/移动端测试脚本代码交互手册.html':{
    emoji:'🧰', title:'测试脚本代码交互手册',
    desc:'可交互代码库：Shell / ADB / 抓包 / Python / FiddlerScript 分类，语法高亮、一键复制、命令试玩区。',
    tags:[{cls:'inter',text:'交互'},{cls:'',text:'代码'}]
  },
  'tutorials/移动端抓包与日志分析实战教程.html':{
    emoji:'📡', title:'抓包与日志分析实战教程',
    desc:'总纲篇：抓包原理、Charles/Fiddler/mitmproxy、安卓/iOS 抓包、Shell、logcat 日志分析、Python 自动化，共 9 章。',
    tags:[{cls:'doc',text:'教程'},{cls:'',text:'抓包'}]
  },
  'tutorials/Fiddler抓包工具实操教程.html':{
    emoji:'🎯', title:'Fiddler 抓包工具实操教程',
    desc:'半天速成：HTTPS 解密、抓包过滤、断点重放、AutoResponder Mock、FiddlerScript、移动端抓包 6 大模块。',
    tags:[{cls:'doc',text:'教程'},{cls:'',text:'抓包'}]
  },
  'tutorials/ADB工具使用实操教程.html':{
    emoji:'🤖', title:'ADB 工具使用实操教程',
    desc:'安卓测试核心：设备管理、应用管理、文件传输、logcat 日志抓取与崩溃定位、Shell 调试，7 章 + 速查表。',
    tags:[{cls:'doc',text:'教程'},{cls:'',text:'日志'}]
  },
  'tutorials/Python自学笔记精解.html':{
    emoji:'🐍', title:'Python 自学笔记精解',
    desc:'逐行注释版：装饰器、输入输出、四大容器、循环、推导式、迭代器与生成器等核心语法精讲。',
    tags:[{cls:'doc',text:'笔记'},{cls:'',text:'Python'}]
  },
  'tutorials/C-C++自学笔记精解.html':{
    emoji:'📘', title:'C/C++ 自学笔记精解',
    desc:'逐行注释版：指针、内存管理、函数、结构体、模板、STL 等 C/C++ 核心知识精讲。',
    tags:[{cls:'doc',text:'笔记'},{cls:'',text:'C/C++'}]
  },
  'tutorials/Requests接口测试快速入门教程.html':{
    emoji:'🔌', title:'Requests 接口测试快速入门',
    desc:'可上手的 HTTP 请求实战：GET/POST、参数与请求体、响应断言、会话保持、异常处理与接口测试落地。',
    tags:[{cls:'doc',text:'教程'},{cls:'',text:'接口'}]
  },
  'tutorials/JMeter性能测试快速入门教程.html':{
    emoji:'⚡', title:'JMeter 性能测试快速入门',
    desc:'可上手的性能测试实战：线程组、取样器、断言、参数化、聚合报告、压力场景设计与结果分析。',
    tags:[{cls:'doc',text:'教程'},{cls:'',text:'性能'}]
  },
  'tutorials/pytest测试框架快速入门教程.html':{
    emoji:'🧪', title:'pytest 测试框架快速入门',
    desc:'可上手的实战学习路径：断言、fixture、参数化、mock、插件生态与测试工程化最佳实践。',
    tags:[{cls:'doc',text:'教程'},{cls:'',text:'测试'}]
  },
  'tutorials/题库.html':{
    emoji:'📚', title:'游戏测试面试题库',
    desc:'基于简历深度定制的游戏测试面试题库，覆盖测试用例设计、缺陷管理、抓包与自动化等高频考点。',
    tags:[{cls:'doc',text:'总结'},{cls:'',text:'面试'}]
  }
};

var NOTE_COLORS = ['#f5d76e','#f6a5c0','#a5c8f6','#a8e6a3','#c9b6f0','#ffb27f','#7fe0d0'];

// 全局状态
var LAYOUT = {};   // 各板块 + inbox：存放 item token（文件名 或 'link:<id>'）
var LINKS  = [];   // {id,url,title,desc,icon}
var NOTES  = [];   // {id,text,color}

// ===== 路径规范化 =====
// 教程 HTML 统一存放在 tutorials/ 子目录。旧数据里可能是纯文件名（无前缀），
// 这里统一补全前缀，保证卡片链接、META 查表、云端同步三者一致，避免点开 404。
var FILE_DIR = 'tutorials/';
function canonFile(tk){
  if(typeof tk !== 'string') return tk;
  if(tk.indexOf('link:') === 0) return tk;         // 网址卡片 token，原样
  if(tk.indexOf('/') !== -1) return tk;            // 已含子目录路径，原样
  if(/^index\.html?$/i.test(tk)) return tk;        // 首页自身
  if(/\.html?$/i.test(tk)) return FILE_DIR + tk;   // 纯文件名 → 补 tutorials/ 前缀
  return tk;
}
// 把整个 layout 的 token 批量规范化
function canonLayout(layout){
  var out = blankLayout();
  SEC_IDS.forEach(function(id){ out[id] = (layout[id]||[]).map(canonFile); });
  out.inbox = (layout.inbox||[]).map(canonFile);
  // 兼容旧数据：已删除的板块（基础知识 basic / 速记手册 memo）里的条目并入「待分类」，避免丢失
  ['basic','memo'].forEach(function(dead){
    (layout[dead]||[]).forEach(function(tk){
      var t = canonFile(tk);
      for(var k in out){ if(out[k].indexOf(t) !== -1) return; }   // 已在其他板块则跳过
      out.inbox.push(t);
    });
  });
  return out;
}

// ===== 工具 =====
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function hostOf(url){
  try{ return new URL(url).hostname; }catch(e){ return url; }
}
// 从网址提取简要名称：www.bilibili.com → bilibili；github.com → github
function shortNameOf(url){
  var h = hostOf(url);
  if(!h || h === url) return url;              // 不是合法网址，原样返回
  h = h.replace(/^www\./i, '');                // 去掉 www.
  // 常见二级后缀（如 com.cn / co.jp），保留主体
  var parts = h.split('.');
  if(parts.length >= 3){
    var last2 = parts.slice(-2).join('.');
    var known2 = ['com.cn','net.cn','org.cn','gov.cn','co.jp','co.uk','com.tw','com.hk','com.au','co.kr','com.sg'];
    if(known2.indexOf(last2) !== -1){
      return parts.slice(-3).join('.');        // 取最后三段：xxx.com.cn
    }
  }
  return parts[0];                             // 取主域名第一段
}

// ===== LAYOUT =====
function initLayout(){
  var saved = null;
  try{ saved = JSON.parse(localStorage.getItem(LS_LAYOUT)); }catch(e){}
  if(saved && typeof saved === 'object'){
    var base = blankLayout();
    SEC_IDS.forEach(function(id){ base[id] = Array.isArray(saved[id]) ? saved[id] : []; });
    base.inbox = Array.isArray(saved.inbox) ? saved.inbox : [];
    return canonLayout(base);
  }
  var layout = blankLayout();
  Object.keys(META).forEach(function(file){
    var sec = NAME2SEC[file] || 'inbox';
    layout[sec].push(file);
  });
  return layout;
}
function saveLayout(){ try{ localStorage.setItem(LS_LAYOUT, JSON.stringify(LAYOUT)); }catch(e){} scheduleSync(); }

// ===== 板块折叠状态 =====
var COLLAPSED = {};   // {secId:true} 表示该板块内容已折叠，仅保留标题行
var TRASH = [];       // 回收站：[{path,name,dir,content_b64,sha,deletedAt}]，随 site-data.json 云同步
function loadCollapse(){ try{ var s=JSON.parse(localStorage.getItem(LS_COLLAPSE)); COLLAPSED = (s && typeof s==='object') ? s : {}; }catch(e){ COLLAPSED = {}; } }
function saveCollapse(){ try{ localStorage.setItem(LS_COLLAPSE, JSON.stringify(COLLAPSED)); }catch(e){} }
function loadTrashLocal(){ try{ var t=JSON.parse(localStorage.getItem(LS_TRASH)); TRASH = (Array.isArray(t)?t:[]); }catch(e){ TRASH = []; } }
function saveTrashLocal(){ try{ localStorage.setItem(LS_TRASH, JSON.stringify(TRASH)); }catch(e){} }
// 切换某板块的折叠状态（折叠=隐藏内容网格，只留标题行）
function toggleCollapse(id){
  if(COLLAPSED[id]){ delete COLLAPSED[id]; } else { COLLAPSED[id] = true; }
  saveCollapse();
  render();
  scheduleSync();   // 折叠状态改动也纳入云同步（多设备一致）
}

// ===== LINKS =====
function loadLinks(){
  try{ var s = JSON.parse(localStorage.getItem(LS_LINKS)); return Array.isArray(s) ? s : []; }catch(e){ return []; }
}
function saveLinks(){ try{ localStorage.setItem(LS_LINKS, JSON.stringify(LINKS)); }catch(e){} scheduleSync(); }

// ===== NOTES =====
function loadNotes(){
  try{ var s = JSON.parse(localStorage.getItem(LS_NOTES)); return Array.isArray(s) ? s : null; }catch(e){ return null; }
}
function saveNotes(){ try{ localStorage.setItem(LS_NOTES, JSON.stringify(NOTES)); }catch(e){} scheduleSync(); }

// 防抖自动同步：有令牌时，数据改动 2 秒后自动推送到云端
var _syncTimer = null;
var _booted = false;          // 启动初始化阶段不触发推送（避免一开页面就推空改动）
var _lastPushedFp = null;     // 上次成功推送/拉取的数据指纹（不含 updatedAt，用于跳过无变化的推送）
function dataFp(){ return JSON.stringify({l:LAYOUT, k:LINKS, n:NOTES, s:sectionOrder(), c:COLLAPSED, u:CUSTOM, t:TRASH.map(function(r){return {p:r.path,d:r.deletedAt};})}); }
function scheduleSync(){
  if(!_booted) return;               // 初始化阶段（boot 中）不推
  if(!getToken()) return;            // 未设令牌 → 只存本地
  if(_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function(){ syncPush(); }, 2000);
}
function initNotes(){
  var saved = loadNotes();
  if(saved){ return saved; }
  // 默认 5 张空便签
  var arr = [];
  for(var i=0;i<5;i++){ arr.push({id:uid(), text:'', color:NOTE_COLORS[i % NOTE_COLORS.length]}); }
  return arr;
}

// ===== 渲染：便签 =====
function renderNotes(){
  var grid = document.getElementById('notesGrid');
  if(NOTES.length === 0){
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="plus">＋</span>点右上角「新增便签」记录灵感</div>';
    return;
  }
  var html = '';
  NOTES.forEach(function(n){
    html += '<div class="note" style="background:'+esc(n.color)+'">'+
      '<button class="note-del" title="删除" onclick="delNote(\''+n.id+'\')">×</button>'+
      '<div class="note-body" contenteditable="true" data-ph="点击编辑…" '+
        'data-id="'+n.id+'" '+
        'onblur="saveNoteText(this)" '+
        'onkeydown="noteKeydown(event,this)">'+esc(n.text)+'</div>'+
    '</div>';
  });
  grid.innerHTML = html;
}
function noteKeydown(e, el){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); el.blur(); }
}
function saveNoteText(el){
  var id = el.getAttribute('data-id');
  var note = NOTES.filter(function(n){return n.id===id;})[0];
  if(note){ note.text = el.textContent.trim(); saveNotes(); }
}
function addNote(){
  var color = NOTE_COLORS[NOTES.length % NOTE_COLORS.length];
  var n = {id:uid(), text:'', color:color};
  NOTES.push(n); saveNotes(); renderNotes();
  // 聚焦新便签
  var el = document.querySelector('.note-body[data-id="'+n.id+'"]');
  if(el) el.focus();
}
function delNote(id){
  NOTES = NOTES.filter(function(n){return n.id!==id;});
  saveNotes(); renderNotes();
}

// ===== 统计 =====
function totalCount(){
  var n = 0;
  SEC_IDS.forEach(function(id){ n += LAYOUT[id].length; });
  return n;
}

// ===== 渲染：单个文件卡片 =====
function cardHtml(token){
  var m = META[token] || {};
  // 文件卡片仅显示文件名本身（去掉 .html 扩展名），不再用定制标题，风格统一
  var title = token.replace(/\.html?$/i,'').split('/').pop();
  var tags = (m.tags || []).map(function(t){
    var cls = t.cls ? (' class="'+esc(t.cls)+'"') : '';
    return '<span class="tag'+cls+'">'+esc(t.text)+'</span>';
  }).join('');
  // token 可能含子文件夹路径与中文，逐段编码（保留 / 分隔符）
  var href = token.split('/').map(function(seg){ return encodeURIComponent(seg); }).join('/');
  return '<a class="card" draggable="true" data-item="'+esc(token)+'" href="'+esc(href)+'" title="'+esc(title)+'">'+
      '<span class="grip">⠿</span>'+
      '<button class="card-del" title="从列表移除" onclick="delCard(event,\''+esc(token).replace(/'/g,'\\\'')+'\')">×</button>'+
      '<div class="c-name">'+esc(title)+'</div>'+
      '<div class="c-tags">'+tags+'</div>'+
    '</a>';
}

// ===== 渲染：单个网址卡片 =====
function linkCardHtml(id){
  var lk = LINKS.filter(function(x){return x.id===id;})[0];
  if(!lk) return '';
  var host = hostOf(lk.url);
  var shortName = lk.name ? lk.name : shortNameOf(lk.url);   // 优先自定义名称，否则自动简要名称
  var iconSrc = lk.icon || ('https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=64');
  var tags = '<span class="tag link">网址</span>';
  return '<a class="card is-link" draggable="true" data-item="link:'+esc(id)+'" href="'+esc(lk.url)+'" target="_blank" rel="noopener" title="'+esc(lk.url)+'">'+
      '<span class="grip">⠿</span>'+
      '<button class="card-edit" title="编辑" onclick="editLink(event,\''+id+'\')">✎</button>'+
      '<button class="card-del" title="删除" onclick="delLink(event,\''+id+'\')">×</button>'+
      '<div class="c-emoji"><span class="fi-bg">🌐</span><img class="fi-img" src="'+esc(iconSrc)+'" loading="lazy" onerror="this.style.display=\'none\'"></div>'+
      '<div class="c-name">'+esc(shortName)+'</div>'+
      '<div class="c-tags">'+tags+'</div>'+
    '</a>';
}

// ===== item token → HTML =====
function itemHtml(token){
  if(typeof token === 'string' && token.indexOf('link:')===0){
    return linkCardHtml(token.slice(5));
  }
  return cardHtml(token);
}

// ===== 板块排序（上移/下移）=====
// 顺序保存在 localStorage，并随云同步一起上传，保证各设备一致。
var LS_SECTIONS = 'zhishi-pulse-sections-order-v1';
function sectionOrder(){ return SECTIONS.map(function(s){ return s.id; }); }
// 按给定 id 序列重排 SECTIONS（原地修改，保持数组引用不变）
function applySectionOrder(ids){
  if(!Array.isArray(ids) || !ids.length) return;
  var byId = {};
  SECTIONS.forEach(function(s){ byId[s.id] = s; });
  var ordered = [];
  ids.forEach(function(id){ if(byId[id]){ ordered.push(byId[id]); delete byId[id]; } });
  // 补上未出现在保存顺序里的板块（如新增板块），保持其原有相对顺序
  SECTIONS.forEach(function(s){ if(byId[s.id]){ ordered.push(s); delete byId[s.id]; } });
  SECTIONS.length = 0;
  ordered.forEach(function(s){ SECTIONS.push(s); });
}
function loadSectionOrder(){
  try{
    var s = JSON.parse(localStorage.getItem(LS_SECTIONS));
    if(Array.isArray(s)) applySectionOrder(s);
  }catch(e){}
}
function saveSectionOrder(){
  try{ localStorage.setItem(LS_SECTIONS, JSON.stringify(sectionOrder())); }catch(e){}
  scheduleSync();
}
// dir: -1 上移 / +1 下移
function moveSection(id, dir){
  var i = -1;
  SECTIONS.forEach(function(s, k){ if(s.id === id) i = k; });
  var j = i + dir;
  if(i < 0 || j < 0 || j >= SECTIONS.length) return;   // 已在首/末，忽略
  var tmp = SECTIONS[i]; SECTIONS[i] = SECTIONS[j]; SECTIONS[j] = tmp;
  saveSectionOrder();
  render();
}

// ===== 自定义板块：新增 / 删除 =====
function openSectionModal(){
  var nameEl = document.getElementById('secNameInput');
  var iconEl = document.getElementById('secIconInput');
  if(nameEl) nameEl.value = '';
  if(iconEl) iconEl.value = '';
  document.getElementById('sectionModal').classList.add('show');
  if(nameEl) setTimeout(function(){ nameEl.focus(); }, 30);
}
function closeSectionModal(){
  document.getElementById('sectionModal').classList.remove('show');
}
function saveSection(){
  var name = (document.getElementById('secNameInput').value || '').trim();
  var icon = (document.getElementById('secIconInput').value || '').trim();
  if(!name){ alert('请填写板块名称'); return; }
  // 重名检查（忽略大小写与首尾空格）
  var dup = SECTIONS.some(function(s){ return s.name === name; });
  if(dup){ alert('已存在同名板块「' + name + '」'); return; }
  // 生成唯一 id：优先用名称拼音/英文，兜底用时间戳
  var id = 'sec-' + uid();
  CUSTOM = CUSTOM || [];
  CUSTOM.push({ id: id, name: name, icon: icon || '📁' });
  saveCustomSections();
  rebuildSections();
  // 确保布局里该板块有空数组
  if(!LAYOUT[id]) LAYOUT[id] = [];
  saveLayout();
  closeSectionModal();
  render();
  scheduleSync();
}
function delSection(id){
  if(isBuiltinSec(id)){ alert('内置板块不可删除'); return; }
  var sec = null;
  SECTIONS.forEach(function(s){ if(s.id === id) sec = s; });
  var nm = sec ? sec.name : id;
  if(!confirm('确定删除板块「' + nm + '」？\n该板块内的卡片不会丢失，会统一并入「待分类」，可另行归类。')) return;
  // 从 CUSTOM 移除
  CUSTOM = (CUSTOM || []).filter(function(s){ return s.id !== id; });
  saveCustomSections();
  // 该板块的卡片并入待分类
  var cards = (LAYOUT[id] || []).slice();
  delete LAYOUT[id];
  cards.forEach(function(tk){
    if(LAYOUT.inbox.indexOf(tk) === -1) LAYOUT.inbox.push(tk);
  });
  // 清理该板块的折叠状态
  if(COLLAPSED && COLLAPSED[id]){ delete COLLAPSED[id]; saveCollapse(); }
  rebuildSections();
  saveLayout();
  render();
  scheduleSync();
}

// ===== 渲染：主区域板块 =====
function render(){
  var main = document.getElementById('main');
  var nav = document.getElementById('navLinks');
  var html = '';
  var navHtml = '';

  SECTIONS.forEach(function(sec, si){
    var items = LAYOUT[sec.id] || [];
    navHtml += '<a href="#sec-'+sec.id+'">'+esc(sec.name)+'</a>';
    html += '<section class="category" id="sec-'+sec.id+'" data-sec="'+sec.id+'">';
    html += '<div class="cat-head">';
    html += '<span class="icon">'+sec.icon+'</span>';
    html += '<h2>'+esc(sec.name)+'</h2>';
    // 折叠按钮（暂存板块专属：折叠后仅保留标题行）——紧贴标题右侧
    var collapsed = (sec.id === 'stash') ? !!COLLAPSED[sec.id] : false;
    if(sec.id === 'stash'){
      html += '<button class="btn mini mv sec-collapse'+(collapsed?' is-collapsed':'')+'" title="'+(collapsed?'展开':'折叠')+'板块内容" aria-label="'+(collapsed?'展开':'折叠')+'板块内容" onclick="toggleCollapse(\''+sec.id+'\')">'+(collapsed?'▸':'▾')+'</button>';
    }
    if(sec.id === 'links'){
      html += '<button class="btn mini" onclick="openLinkModal(null,\'links\')" style="margin-left:8px">＋ 添加网址</button>';
    }
    // 板块上移/下移按钮（位于数量左侧；首末板块对应按钮禁用）
    html += '<span class="sec-move">'
         +  '<button class="btn mini mv" title="上移板块" aria-label="上移板块"'+(si === 0 ? ' disabled' : '')
         +  ' onclick="moveSection(\''+sec.id+'\',-1)">▲</button>'
         +  '<button class="btn mini mv" title="下移板块" aria-label="下移板块"'+(si === SECTIONS.length-1 ? ' disabled' : '')
         +  ' onclick="moveSection(\''+sec.id+'\',1)">▼</button>'
         +  '</span>';
    // 自定义板块：删除按钮（内置板块不可删）
    if(!isBuiltinSec(sec.id)){
      html += '<button class="btn mini mv sec-del" title="删除板块" aria-label="删除板块" style="color:#f85149" onclick="delSection(\''+sec.id+'\')">🗑</button>';
    }
    html += '<span class="count">'+(sec.id==='links' ? items.length+' 个' : items.length+' 份')+'</span>';
    html += '</div>';
    html += '<div class="grid" data-sec="'+sec.id+'"'+(collapsed?' style="display:none"':'')+'>';
    if(collapsed){
      html += '<div class="stash-collapsed-tip">已折叠 · '+items.length+' 份内容已收起，点标题栏 ▸ 展开</div>';
    } else if(items.length === 0){
      if(sec.id === 'links'){
        html += '<div class="empty"><span class="plus">＋</span>点上方「添加网址」录入常用网站，或把其他板块的网址卡片拖到这里</div>';
      } else {
        html += '<div class="empty"><span class="plus">＋</span>把卡片拖到这里，或点「仓库检索」拉取新教程</div>';
      }
    } else {
      items.forEach(function(tk){ html += itemHtml(tk); });
    }
    html += '<div class="drop-placeholder">松开鼠标，放到「'+esc(sec.name)+'」</div>';
    html += '</div></section>';
  });

  // 待分类区（inbox）
  var inbox = LAYOUT.inbox || [];
  navHtml += '<a href="#inbox">待分类</a>';
  html += '<section class="category" id="inbox" data-sec="inbox">';
  html += '<div class="cat-head">';
  html += '<span class="icon">📥</span>';
  html += '<h2>待分类</h2>';
  html += '<button class="btn mini" onclick="openLinkModal()" style="margin-left:8px">＋ 添加网址</button>';
  html += '<span class="count" style="margin-left:auto">'+inbox.length+' 个</span>';
  html += '</div>';
  html += '<div class="grid" data-sec="inbox">';
  if(inbox.length === 0){
    html += '<div class="empty"><span class="plus">∅</span>点「仓库检索」拉取仓库教程，或点上方「＋ 添加网址」录入常用网站，会出现在这里等你归类</div>';
  } else {
    inbox.forEach(function(tk){ html += itemHtml(tk); });
  }
  html += '<div class="drop-placeholder">松开鼠标，放回待分类</div>';
  html += '</div></section>';

  main.innerHTML = html;
  nav.innerHTML = navHtml;
  document.getElementById('totalCount').textContent = totalCount();
  bindDnD();
  bindScrollSpy();
}

// ===== 拖拽逻辑 =====
var DRAG_ITEM = null;
function bindDnD(){
  var cards = document.querySelectorAll('.card');
  var grids = document.querySelectorAll('.grid');

  cards.forEach(function(c){
    c.addEventListener('dragstart', function(e){
      DRAG_ITEM = c.getAttribute('data-item');
      c.classList.add('dragging');
      try{ e.dataTransfer.setData('text/plain', DRAG_ITEM); }catch(err){}
      e.dataTransfer.effectAllowed = 'move';
    });
    c.addEventListener('dragend', function(){
      c.classList.remove('dragging');
      DRAG_ITEM = null;
    });
  });

  grids.forEach(function(g){
    g.addEventListener('dragover', function(e){
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      g.classList.add('drop-active');
    });
    g.addEventListener('dragleave', function(e){
      if(e.target === g) g.classList.remove('drop-active');
    });
    g.addEventListener('drop', function(e){
      e.preventDefault();
      g.classList.remove('drop-active');
      var item = DRAG_ITEM;
      try{ item = e.dataTransfer.getData('text/plain') || item; }catch(err){}
      if(!item) return;
      moveTo(e.currentTarget.getAttribute('data-sec'), item);
    });
  });
}

function moveTo(toSec, item){
  SEC_IDS.forEach(function(id){
    var i = LAYOUT[id].indexOf(item);
    if(i !== -1){ LAYOUT[id].splice(i,1); }
  });
  var ii = LAYOUT.inbox.indexOf(item);
  if(ii !== -1){ LAYOUT.inbox.splice(ii,1); }

  if(SEC_IDS.indexOf(toSec) !== -1){
    if(LAYOUT[toSec].indexOf(item) === -1) LAYOUT[toSec].push(item);
  } else if(toSec === 'inbox'){
    if(LAYOUT.inbox.indexOf(item) === -1) LAYOUT.inbox.push(item);
  }
  saveLayout();
  render();
}

// 手动从列表移除单个卡片（仅从本地布局删除该 token，不删除 GitHub 上的文件）
function delCard(e, token){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  SEC_IDS.forEach(function(id){
    var i = LAYOUT[id].indexOf(token);
    if(i !== -1){ LAYOUT[id].splice(i,1); }
  });
  var ii = LAYOUT.inbox.indexOf(token);
  if(ii !== -1){ LAYOUT.inbox.splice(ii,1); }
  saveLayout();
  render();
  scheduleSync();
}

// ===== 导航滚动高亮 =====
function bindScrollSpy(){
  var sections = document.querySelectorAll('section[id]');
  var links = document.querySelectorAll('#navLinks a');
  window.addEventListener('scroll', function(){
    var cur = '';
    sections.forEach(function(s){
      if(window.scrollY >= s.offsetTop - 90) cur = s.getAttribute('id');
    });
    links.forEach(function(a){
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    });
  });
}

// ===== 仓库检索 =====
// 递归扫描仓库目录，收集所有 HTML 文件（含子文件夹）—— 作为兜底方案
function scanDir(path){
  var tk = getToken();
  var h = {'Accept':'application/vnd.github+json'};
  if(tk) h['Authorization'] = 'token ' + tk;   // 带 PAT：认证后限流 60/h→5000/h，避免递归多请求被 403
  var url = 'https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/contents/' + (path || '') + '?ref=' + SYNC_BRANCH + '&t=' + Date.now();
  return fetch(url, {headers:h, cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(items){
      if(!Array.isArray(items)) return [];   // 单个文件对象（不应出现在目录扫描）
      var htmls = [];
      var subs = [];
      items.forEach(function(it){
        if(it.type === 'file'){
          if(/\.html?$/i.test(it.name)) htmls.push(it);
        } else if(it.type === 'dir'){
          subs.push(scanDir(it.path));        // 递归进入子文件夹
        }
      });
      return Promise.all(subs).then(function(results){
        results.forEach(function(arr){ htmls = htmls.concat(arr); });
        return htmls;
      });
    });
}
// 合并去重：把一批 {name,path} 归一化后并入 out（按规范化路径去重）
function mergeFiles(out, arr){
  arr.forEach(function(f){
    var full = canonFile(f.path || f.name);
    var name = full.split('/').pop();
    var dup = out.filter(function(o){ return o.path === full; });
    if(dup.length === 0) out.push({ name: name, path: full });
  });
  return out;
}
// 源⓪：Git Trees API（递归全树）—— 权威、实时、单次请求返回所有文件完整路径。
// 相比 Contents API 逐层递归（多次请求、易被 403 限流而整体失败），此接口一次到位，
// 且返回的 path 已是完整相对路径（含 tutorials/ 前缀），最可靠。未认证同样可能被限流，故失败不致命。
function scanTree(){
  var tk = getToken();
  var h = {'Accept':'application/vnd.github+json'};
  if(tk) h['Authorization'] = 'token ' + tk;   // 带 PAT：认证后限流 60/h→5000/h，避免被 403 限流
  var url = 'https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/git/trees/' + SYNC_BRANCH + '?recursive=1&t=' + Date.now();
  return fetch(url, {headers:h, cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d){
      var tree = (d && d.tree) || [];
      return tree
        .filter(function(it){ return it.type === 'blob' && /\.html?$/i.test(it.path); })
        .map(function(it){
          var fullPath = canonFile(it.path);   // 已是 tutorials/xxx.html，canonFile 幂等原样返回
          return { name: fullPath.split('/').pop(), path: fullPath };
        });
    });
}
// 扫描主入口（v2026-09-11.4）：
// 【有 PAT 令牌】→ 只用带令牌的 Git Trees 权威源（实时、全路径），
//   不再混入 jsDelivr / Contents 的缓存结果，彻底避免"陈旧幽灵文件"残留。
// 【无令牌】→ 退回多源并集兜底（Git Trees + jsDelivr + Contents 递归），任一源失败不致命。
function scanAllFiles(){
  var tk = getToken();
  // 有令牌：权威单源，绝不掺入缓存，保证与仓库实时一致
  if(tk){
    return scanTree().catch(function(){ return []; });
  }
  // 无令牌：多源兜底
  var jsdUrl = 'https://data.jsdelivr.com/v1/packages/gh/' + GH_USER + '/' + GH_REPO + '@' + SYNC_BRANCH + '?t=' + Date.now();
  var jsd = fetch(jsdUrl, {headers:{'Accept':'application/json'}})
    .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(pkg){
      var files = (pkg && pkg.files) || [];
      return files
        .filter(function(it){ return it.type === 'file' && /\.html?$/i.test(it.name); })
        .map(function(it){
          var fullPath = canonFile(it.name);
          return { name: fullPath.split('/').pop(), path: fullPath };
        });
    })
    .catch(function(){ return []; });   // jsDelivr 失败不致命
  var gh = scanDir('').then(function(items){
    return items.map(function(it){
      var fullPath = canonFile(it.path || it.name);
      return { name: fullPath.split('/').pop(), path: fullPath };
    });
  }).catch(function(){ return []; });   // Contents 递归失败（如 403 限流）不致命
  var tree = scanTree().catch(function(){ return []; });   // Git Trees 失败不致命
  return Promise.all([tree, jsd, gh]).then(function(res){
    return mergeFiles([], res[0].concat(res[1]).concat(res[2]));
  });
}

function scanRepo(){
  var btn = document.getElementById('scanBtn');
  var status = document.getElementById('scanStatus');
  btn.disabled = true;
  status.textContent = '🔍 正在扫描仓库 ' + GH_USER + '/' + GH_REPO + ' ...';

  scanAllFiles().then(function(files){
    // 排除首页 index.html 自身
    var scanned = files.filter(function(f){
      return decodeURIComponent(f.name) !== 'index.html';
    });

    // 建立“文件名 → 仓库实际路径”映射
    var nameToPath = {};
    scanned.forEach(function(f){ nameToPath[decodeURIComponent(f.name)] = f.path; });

    // 按文件名对齐：若教程被移动到子文件夹，把旧 token 更新为新路径，保持原分类不丢
    SEC_IDS.forEach(function(id){
      LAYOUT[id] = (LAYOUT[id] || []).map(function(tk){
        if(typeof tk !== 'string' || tk.indexOf('link:') === 0) return tk;
        return nameToPath.hasOwnProperty(tk) ? nameToPath[tk] : tk;
      });
    });

    // 清理失效卡片：仓库里已不存在的文件（被删除/改名），从所有板块 + 待分类区移除其 token。
    // 网址卡片(link:)不受影响；只有文件类 token 参与存在性判断。
    var existPaths = {}, existNames = {};
    scanned.forEach(function(f){
      existPaths[f.path] = 1;
      existNames[decodeURIComponent(f.name)] = 1;
    });
    function tokenAlive(tk){
      if(typeof tk !== 'string' || tk.indexOf('link:') === 0) return true;  // 网址永远保留
      if(existPaths[tk]) return true;                    // 规范化路径命中
      var base = tk.split('/').pop();                     // 纯文件名也能命中（兼容旧 token）
      return !!existNames[base];
    }
    var removed = 0;
    SEC_IDS.forEach(function(id){
      LAYOUT[id] = (LAYOUT[id] || []).filter(function(tk){
        if(tokenAlive(tk)) return true;
        removed++; return false;
      });
    });
    LAYOUT.inbox = (LAYOUT.inbox || []).filter(function(tk){
      if(tokenAlive(tk)) return true;
      removed++; return false;
    });

    var added = 0;
    scanned.forEach(function(f){
      var name = decodeURIComponent(f.name);
      var path = f.path;
      if(!META[path]){   // 用实际路径作 key，子文件夹文件也能正确渲染
        META[path] = {
          emoji:'📄',
          title: name.replace(/\.html?$/i,''),
          desc:'仓库中的教程文件，点击打开。',
          tags:[{cls:'',text:'仓库文件'}]
        };
      }
      var placed = false;
      SEC_IDS.forEach(function(id){ if(LAYOUT[id].indexOf(path) !== -1) placed = true; });
      if(!placed && LAYOUT.inbox.indexOf(path) === -1){
        LAYOUT.inbox.push(path);
        added++;
      }
    });
    saveLayout();
    render();
    var msg = '';
    if(added > 0) msg += '发现 ' + added + ' 个新文件，已放入「📥 待分类」区。';
    if(removed > 0) msg += '清理 ' + removed + ' 个已失效的卡片（仓库中已删除/改名）。';
    if(!msg) msg = '没有变化：仓库里 ' + scanned.length + ' 个 HTML 均已归类，无失效卡片。';
    status.textContent = '✅ ' + msg;
  })
    .catch(function(err){
      status.textContent = '⚠️ 检索失败：' + err.message + '（可能是网络或 API 速率限制，稍后再试）。';
    })
    .then(function(){ btn.disabled = false; });
}

// ===== 常用网址：弹窗 =====
var EDIT_LINK_ID = null;
var LINK_TARGET_SEC = 'inbox';   // 新增网址默认落入的板块
function openLinkModal(id, targetSec){
  EDIT_LINK_ID = id || null;
  LINK_TARGET_SEC = targetSec || 'inbox';
  var input = document.getElementById('linkUrlInput');
  var nameInput = document.getElementById('linkNameInput');
  var titleEl = document.getElementById('linkModalTitle');
  var btnEl = document.getElementById('linkSubmitBtn');
  var status = document.getElementById('linkModalStatus');
  status.textContent = '';
  if(EDIT_LINK_ID){
    var lk = LINKS.filter(function(x){return x.id===EDIT_LINK_ID;})[0];
    titleEl.textContent = '编辑网址';
    btnEl.textContent = '保存';
    input.value = lk ? lk.url : '';
    nameInput.value = lk && lk.name ? lk.name : '';
  } else {
    titleEl.textContent = '添加常用网址';
    btnEl.textContent = '添加';
    input.value = '';
    nameInput.value = '';
  }
  document.getElementById('linkModal').classList.add('show');
  setTimeout(function(){ input.focus(); }, 30);
}
function closeLinkModal(){
  document.getElementById('linkModal').classList.remove('show');
  EDIT_LINK_ID = null;
}
function normalizeUrl(v){
  v = (v||'').trim();
  if(!v) return '';
  if(!/^https?:\/\//i.test(v)) v = 'https://' + v;
  return v;
}
function submitLink(){
  var input = document.getElementById('linkUrlInput');
  var nameInput = document.getElementById('linkNameInput');
  var url = normalizeUrl(input.value);
  var customName = (nameInput.value || '').trim();
  var status = document.getElementById('linkModalStatus');
  if(!url){ status.textContent = '⚠️ 请输入网址。'; return; }

  if(EDIT_LINK_ID){
    var lk = LINKS.filter(function(x){return x.id===EDIT_LINK_ID;})[0];
    if(lk){ lk.url = url; lk.name = customName; lk.title = customName ? customName : '读取中…'; lk.desc=''; lk.icon=''; }
  } else {
    var id = uid();
    LINKS.push({id:id, url:url, name:customName, title: customName ? customName : '读取中…', desc:'', icon:''});
    // 放进目标板块（常用网址板块 or 待分类）
    var token = 'link:'+id;
    var dest = (SEC_IDS.indexOf(LINK_TARGET_SEC)!==-1) ? LINK_TARGET_SEC : 'inbox';
    if(LAYOUT[dest].indexOf(token) === -1) LAYOUT[dest].push(token);
  }
  saveLinks(); saveLayout();
  closeLinkModal();
  render();

  // 异步抓取网页信息（有自定义名称则不覆盖名称，仅补图标/描述）
  var targetId = EDIT_LINK_ID || id;
  fetchLinkMeta(url, targetId, customName);
}

// 编辑网址卡片（点 ✎）
function editLink(e, id){
  e.preventDefault();
  e.stopPropagation();
  openLinkModal(id);
}

// 删除网址卡片（点 ×，与文件卡片 delCard 同款逻辑）
function delLink(e, id){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  if(!confirm('确定删除这个网址卡片？仅从本页移除，不会删除目标网站。')) return;
  // 从 LINKS 数据里删
  LINKS = LINKS.filter(function(x){ return x.id !== id; });
  saveLinks();
  // 从所有板块 + 待分类的布局里移除 link:<id> token
  var tok = 'link:' + id;
  SEC_IDS.forEach(function(sid){
    var i = LAYOUT[sid].indexOf(tok);
    if(i !== -1){ LAYOUT[sid].splice(i,1); }
  });
  var ii = LAYOUT.inbox.indexOf(tok);
  if(ii !== -1){ LAYOUT.inbox.splice(ii,1); }
  saveLayout();
  render();
  scheduleSync();
}

// 通过 CORS 代理抓取网页 title / description / favicon
function fetchLinkMeta(url, id, customName){
  var proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  fetch(proxy)
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
    .then(function(html){
      var info = parseHtmlMeta(html, url);
      var lk = LINKS.filter(function(x){return x.id===id;})[0];
      if(lk){
        // 有自定义名称则保留，不覆盖；否则用抓取的标题
        if(!lk.name){
          if(info.title) lk.title = info.title;
          else if(!lk.title || lk.title==='读取中…') lk.title = hostOf(url);
        }
        if(info.desc) lk.desc = info.desc;
        if(info.icon) lk.icon = info.icon;
      }
      saveLinks(); render();
    })
    .catch(function(){
      // 抓取失败：用域名兜底（有自定义名称则不覆盖）
      var lk = LINKS.filter(function(x){return x.id===id;})[0];
      if(lk && !lk.name && (!lk.title || lk.title==='读取中…')) lk.title = hostOf(url);
      saveLinks(); render();
    });
}
function parseHtmlMeta(html, url){
  var out = {title:'', desc:'', icon:''};
  // title
  var ogTitle = html.match(/property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  var ttl = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  var title = (ogTitle && ogTitle[1]) || (ttl && ttl[1]) || '';
  out.title = title.replace(/\s+/g,' ').trim();
  // description
  var ogDesc = html.match(/property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  var metaDesc = html.match(/name=["']description["'][^>]*content=["']([^"']*)["']/i);
  var desc = (ogDesc && ogDesc[1]) || (metaDesc && metaDesc[1]) || '';
  out.desc = desc.replace(/\s+/g,' ').trim();
  // favicon
  var ico = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)
         || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:shortcut )?icon["']/i)
         || html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i);
  if(ico && ico[1]){
    try{ out.icon = new URL(ico[1], url).href; }catch(e){ out.icon = ico[1]; }
  }
  return out;
}

// ===== 启动 =====
var LS_GATE = 'zhishi-pulse-gate-v1';

function boot(){
  LINKS = loadLinks();
  NOTES = initNotes();
  saveNotes();
  loadCustomSections();   // 先加载自定义板块，重建 SECTIONS/SEC_IDS（供 initLayout 用）
  LAYOUT = initLayout();
  loadSectionOrder();   // 先套用本机保存的板块顺序，云端数据到达后可能再覆盖
  loadCollapse();       // 加载板块折叠状态（暂存板块等）
  loadTrashLocal();     // 加载回收站（云端数据到达后可能覆盖）
  renderNotes();
  render();
  aiInitInput();   // 初始化 AI 问答输入框事件（回车发送、自适应高度）
  // 启动后自动尝试从云端拉取最新数据（无需令牌，公开仓库可读）
  // 迁移在数据最终确定后（syncPull 回调）执行，避免被云端覆盖
  syncPull(true, function(){ migrateLinksToSection(); render(); });
  _booted = true;   // 初始化完成，之后的数据改动才允许自动推送（避免开页面就推空改动）
}

// 一次性迁移：把散落在各板块/待分类里的网址卡片(link:*)统一归入「常用网址」板块
function migrateLinksToSection(){
  var flag = 'zhishi-pulse-migrate-links-v1';
  try{ if(localStorage.getItem(flag)) return; }catch(e){}
  var moved = false;
  // 从所有板块和待分类里收集网址 token
  var linkTokens = [];
  SEC_IDS.forEach(function(id){
    LAYOUT[id] = (LAYOUT[id]||[]).filter(function(tk){
      if(typeof tk==='string' && tk.indexOf('link:')===0){ linkTokens.push(tk); return false; }
      return true;
    });
  });
  LAYOUT.inbox = (LAYOUT.inbox||[]).filter(function(tk){
    if(typeof tk==='string' && tk.indexOf('link:')===0){ linkTokens.push(tk); return false; }
    return true;
  });
  // 去重后放入常用网址板块
  linkTokens.forEach(function(tk){
    if(LAYOUT.links.indexOf(tk) === -1){ LAYOUT.links.push(tk); moved = true; }
  });
  if(moved) saveLayout();
  try{ localStorage.setItem(flag, '1'); }catch(e){}
}

// ===== 云同步（GitHub site-data.json） =====
function getToken(){ try{ return localStorage.getItem(LS_TOKEN) || ''; }catch(e){ return ''; } }
function setToken(v){ try{ if(v) localStorage.setItem(LS_TOKEN, v); else localStorage.removeItem(LS_TOKEN); }catch(e){} }

function collectData(){
  // 汇总需要同步的数据（含板块顺序 sections、折叠状态 collapsed、自定义板块 custom、回收站 trash）
  return {
    layout: LAYOUT,
    links: LINKS,
    notes: NOTES,
    sections: sectionOrder(),
    collapsed: COLLAPSED,
    custom: CUSTOM,
    trash: TRASH,
    updatedAt: new Date().toISOString()
  };
}
function applyData(d){
  if(!d || typeof d !== 'object') return false;
  // 自定义板块：云端为准，先落地并重建 SECTIONS/SEC_IDS（后续 layout 依赖它）
  if(Array.isArray(d.custom)){
    CUSTOM = d.custom.filter(function(s){ return s && s.id; });
    saveCustomSections();
    rebuildSections();
  }
  if(d.layout && typeof d.layout === 'object'){
    var base = blankLayout();
    SEC_IDS.forEach(function(id){ base[id] = Array.isArray(d.layout[id]) ? d.layout[id] : []; });
    base.inbox = Array.isArray(d.layout.inbox) ? d.layout.inbox : [];
    LAYOUT = canonLayout(base);
    try{ localStorage.setItem(LS_LAYOUT, JSON.stringify(LAYOUT)); }catch(e){}
  }
  if(Array.isArray(d.links)){ LINKS = d.links; try{ localStorage.setItem(LS_LINKS, JSON.stringify(LINKS)); }catch(e){} }
  if(Array.isArray(d.notes)){ NOTES = d.notes; try{ localStorage.setItem(LS_NOTES, JSON.stringify(NOTES)); }catch(e){} }
  // 板块顺序（云端为准），并写回本机
  if(Array.isArray(d.sections) && d.sections.length){
    applySectionOrder(d.sections);
    try{ localStorage.setItem(LS_SECTIONS, JSON.stringify(sectionOrder())); }catch(e){}
  }
  // 折叠状态（云端为准），写回本机，使多设备折叠状态一致
  COLLAPSED = (d.collapsed && typeof d.collapsed==='object') ? d.collapsed : {};
  try{ localStorage.setItem(LS_COLLAPSE, JSON.stringify(COLLAPSED)); }catch(e){}
  // 回收站（云端为准），写回本机，使多设备回收站一致；先清理过期项
  if(Array.isArray(d.trash)){
    var tr = d.trash.filter(function(r){ return r && r.path && (Date.now()-(r.deletedAt||0)) <= TRASH_TTL; });
    TRASH = tr; try{ localStorage.setItem(LS_TRASH, JSON.stringify(TRASH)); }catch(e){}
  }
  _lastPushedFp = dataFp();   // 刚拉下来的内容即"已同步"，避免随即又推回去
  return true;
}

// 读取仓库里的 site-data.json
// 【重要事实】GitHub Pages 的边缘缓存**忽略查询串**（实测：任意不同 ?r= 都命中同一 ETag），
// 且响应头为 Cache-Control: max-age=600 —— 改了文件后，边缘节点最长 10 分钟才刷新。
// 所以 ?t= 时间戳对 Pages 无效，必须换成更实时的读取源。
// 读取源按"实时性"依次尝试，取第一个成功者：
//   1) GitHub Contents API —— 不受 Pages 边缘缓存影响、TTL 仅 60s，最实时（公开仓库免令牌，带令牌更佳）
//   2) 同源 Pages 直读   —— 可能滞后 ≤10 分钟
//   3) raw.githubusercontent —— 独立 CDN 链路，缓存与 Pages 不共享
//   4) jsDelivr          —— 仅兜底（可能滞后数小时）
function b64ToUtf8(b64){
  try{ return decodeURIComponent(escape(atob(String(b64).replace(/\n/g,'')))); }
  catch(e){ try{ return atob(String(b64).replace(/\n/g,'')); }catch(e2){ return ''; } }
}
function fetchCloudData(cb){
  var ts = '&t=' + Date.now();
  var tk = getToken();
  function jget(url, opt){
    return fetch(url, opt).then(function(r){
      if(r.status === 404) return null;
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  // 源①：GitHub Contents API —— 最实时(TTL 60s)，但未认证会被限流(60次/时→403)，故仅在有令牌时用
  function apiSrc(){
    var h = {'Accept':'application/vnd.github+json'};
    if(tk) h['Authorization'] = 'token ' + tk;
    return jget('https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/contents/' + DATA_FILE + '?ref=' + SYNC_BRANCH + ts,
        {headers:h, cache:'no-store'})
      .then(function(j){ return j ? JSON.parse(b64ToUtf8(j.content)) : null; });
  }
  // 源②：同源 Pages 直读（可能滞后 ≤10 分钟）
  function sameSrc(){
    if(location.protocol !== 'http:' && location.protocol !== 'https:') return Promise.resolve(null);
    return jget(location.origin + '/' + DATA_FILE + '?x=1' + ts, {cache:'no-store'});
  }
  // 源③：raw.githubusercontent —— 独立 CDN 链路，缓存与 Pages 不共享
  function rawSrc(){
    return jget('https://raw.githubusercontent.com/' + GH_USER + '/' + GH_REPO + '/' + SYNC_BRANCH + '/' + DATA_FILE + '?x=1' + ts, {cache:'no-store'});
  }
  // 源④：jsDelivr —— 仅最后兜底（可能滞后数小时）
  function jsdSrc(){
    return jget('https://cdn.jsdelivr.net/gh/' + GH_USER + '/' + GH_REPO + '@' + SYNC_BRANCH + '/' + DATA_FILE + '?x=1' + ts, {cache:'no-store'});
  }
  function tsof(d){ return (d && d.updatedAt) ? (Date.parse(d.updatedAt) || 0) : 0; }

  // 【逐源诊断】记录每个读取源的成败原因，失败时一并展示，方便手机端定位到底是哪条链路挂了
  var trace = [];
  function mark(name, r){
    if(r && r.ok){ trace.push(name + ':ok'); }
    else {
      var e = (r && r.err) ? (r.err.message || String(r.err)) : 'no';
      trace.push(name + ':' + e);
    }
  }

  // 兼容封装：把 promise 转成"永不 reject"的结果对象。
  // 不用 ES2020 的 Promise.allSettled —— 旧内核浏览器(IE/老版Chromium/国产浏览器兼容模式)没有它，
  // 会让读取函数直接抛错、回调永不触发，页面就停在默认初始界面。
  function settle(p){ return p.then(function(v){ return {ok:true, value:v}; }, function(e){ return {ok:false, err:e}; }); }
  function safe(fn){ try{ return settle(fn()); }catch(e){ return Promise.resolve({ok:false, err:e}); } }

  var done = false;
  var watchdog = setTimeout(function(){ finish(null, 'timeout'); }, 10000);  // 看门狗：10s 无结果就放弃
  function finish(data, why){
    if(done) return;                 // 保证回调恰好触发一次
    done = true;
    clearTimeout(watchdog);
    // 失败时把逐源诊断拼进 why，页面 diag 行即可显示完整链路情况
    if(!data && trace.length){ why = why + '（' + trace.join(' | ') + '）'; }
    cb(data, why);
  }

  try{
    safe(function(){ return tk ? apiSrc() : Promise.resolve(null); }).then(function(r){
      mark('api', r);
      var dApi = (r.ok && r.value) ? r.value : null;
      if(dApi){ finish(dApi, 'ok'); return; }
      // 无令牌：同源与 raw 并行取，选 updatedAt 更新的一份（两个缓存互相独立，降低滞后概率）
      Promise.all([safe(sameSrc), safe(rawSrc)]).then(function(rs){
        mark('pages', rs[0]); mark('raw', rs[1]);
        var cands = [];
        rs.forEach(function(x){ if(x.ok && x.value) cands.push(x.value); });
        if(cands.length){
          cands.sort(function(a, b){ return tsof(b) - tsof(a); });
          finish(cands[0], 'ok');
          return;
        }
        safe(jsdSrc).then(function(r2){
          mark('jsd', r2);
          if(r2.ok && r2.value) finish(r2.value, 'ok');
          else finish(null, 'notfound');
        });
      });
    });
  }catch(e){ finish(null, e.message); }
}

// 把数据写回仓库（需要 PAT）。带 409 冲突自动重试：
// 若写入期间仓库又被改动（自动同步/多标签/连点导致 SHA 失配），
// 不再硬覆盖，而是【拉取云端实时内容 → 与本机做并集合并 → 用合并结果重试】，
// 从根上杜绝"A、B 并发时后写者覆盖先写者"的丢失更新问题。
// data 可选：传入则推送该数据（合并场景），否则推送 collectData()。
function pushCloudData(token, cb, data){
  var url = 'https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/contents/' + DATA_FILE;
  var MAX_TRY = 4;
  var payloadData = data || collectData();

  function encodeContent(obj){
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function putOnce(tryLeft, mergeOnConflict){
    // 1) 先拿文件当前 sha（若已存在）。
    // 【关键】必须禁用 HTTP 缓存：GitHub Contents API 的 GET 响应带
    // `Cache-Control: public, max-age=60`，若命中浏览器缓存会拿到"过期 sha"，
    // PUT 必然 409；且几秒内的重试全会复用同一个旧 sha → 重试完全无效。
    // 加 cache:'no-store' + 时间戳参数，强制每次取到实时 sha。
    return fetch(url + '?ref=' + SYNC_BRANCH + '&t=' + Date.now(), {
        headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},
        cache:'no-store'
      })
      .then(function(r){
        if(r.status === 404) return {sha:null, content:null};
        return r.json().then(function(j){ return {sha:(j&&j.sha)||null, content:(j&&j.content)||null}; });
      })
      .then(function(existing){
        var payload = {
          message: 'sync: 更新个人资料库数据 ' + new Date().toLocaleString('zh-CN'),
          content: encodeContent(payloadData),
          branch: SYNC_BRANCH
        };
        if(existing.sha) payload.sha = existing.sha;
        return fetch(url, {
          method:'PUT',
          headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},
          body: JSON.stringify(payload)
        }).then(function(rr){
          return rr.json().then(function(j){ return {ok:rr.ok, status:rr.status, json:j, _cloudContent:existing.content}; });
        });
      })
      .then(function(res){
        // 409 冲突：SHA 失配（仓库在 GET 与 PUT 之间被改动）→ 拉云端实时内容做并集合并后重试
        if(!res.ok && res.status === 409 && tryLeft > 0 && mergeOnConflict){
          var cloud = null;
          try{ if(res._cloudContent) cloud = JSON.parse(b64ToUtf8(res._cloudContent)); }catch(e){}
          if(cloud){
            // 用云端实时内容与本机合并，合并结果替换 payloadData 后重试（两边改动都保留）
            payloadData = unionMerge({layout:LAYOUT, links:LINKS, notes:NOTES, sections:sectionOrder(), collapsed:COLLAPSED, custom:CUSTOM, trash:TRASH}, cloud);
            LAYOUT = canonLayout(payloadData.layout); LINKS = payloadData.links; NOTES = payloadData.notes;
            TRASH = (Array.isArray(payloadData.trash)) ? payloadData.trash : [];
            try{ localStorage.setItem(LS_LAYOUT, JSON.stringify(LAYOUT)); }catch(e){}
            try{ localStorage.setItem(LS_LINKS, JSON.stringify(LINKS)); }catch(e){}
            try{ localStorage.setItem(LS_NOTES, JSON.stringify(NOTES)); }catch(e){}
            try{ localStorage.setItem(LS_TRASH, JSON.stringify(TRASH)); }catch(e){}
            if(typeof renderNotes==='function') renderNotes();
            if(typeof render==='function') render();
          }
          return new Promise(function(resolve){ setTimeout(function(){ resolve(putOnce(tryLeft-1, true)); }, 400 + Math.random()*400); });
        }
        return res;
      });
  }

  putOnce(MAX_TRY, true)
    .then(function(res){ cb(res.ok, res.json); })
    .catch(function(err){ cb(false, {message: err.message}); });
}

// ================= 上传教程到 tutorials/ =================
// 复用站点已有的 PAT（getToken）与 GitHub Contents API 写入机制。
// 每个文件：读取文本 → base64 → PUT 到 tutorials/<文件名>，存在则更新(带sha)、不存在则新建。
var UP_FILES = [];   // {name, size, content, state:'wait'|'ok'|'err', msg:''}

function openUploadModal(){
  var modal = document.getElementById('uploadModal');
  modal.classList.add('show');
  document.getElementById('upStatus').textContent = '';
  var drop = document.getElementById('upDrop');
  var input = document.getElementById('upFileInput');
  // 防止重复绑定
  if(!drop._bound){
    drop._bound = true;
    drop.addEventListener('click', function(){ input.click(); });
    drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', function(){ drop.classList.remove('dragover'); });
    drop.addEventListener('drop', function(e){
      e.preventDefault(); drop.classList.remove('dragover');
      handleUpFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', function(){ handleUpFiles(input.files); input.value=''; });
  }
  // 打开弹窗时自动读取仓库目录，填充目标目录下拉框
  loadUpDirs();
}
function closeUploadModal(){ document.getElementById('uploadModal').classList.remove('show'); }

// 用 PAT 读取仓库根目录的文件夹，动态生成「目标目录」下拉选项。
// 固定首项为（根目录）用于更新首页 index.html；其余为仓库现有子文件夹。
function loadUpDirs(){
  var sel = document.getElementById('upTargetDir');
  if(!sel) return;
  var token = getToken();
  sel.disabled = true;
  sel.innerHTML = '<option value="">⏳ 正在读取目录...</option>';
  // 无令牌：只给根目录 + tutorials 兜底，提示填入 PAT 后可自动读取
  if(!token){
    sel.disabled = false;
    sel.innerHTML = '<option value="">（根目录 · 更新首页）</option><option value="tutorials/">tutorials/</option>';
    return;
  }
  var url = 'https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/contents/?ref=' + SYNC_BRANCH + '&t=' + Date.now();
  fetch(url, {headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token}, cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(items){
      var dirs = [''];   // 根目录放最前
      (items || []).forEach(function(it){
        if(it.type === 'dir' && it.name !== '.git'){ dirs.push(it.name + '/'); }
      });
      // 确保 tutorials/ 存在（万一仓库里还没有）
      if(dirs.indexOf('tutorials/') === -1) dirs.push('tutorials/');
      sel.disabled = false;
      sel.innerHTML = '';
      dirs.forEach(function(d){
        var opt = document.createElement('option');
        opt.value = d;
        opt.textContent = (d === '') ? '（根目录 · 更新首页 index.html）' : d;
        sel.appendChild(opt);
      });
    })
    .catch(function(err){
      // 读取失败：退回根目录 + tutorials 兜底
      sel.disabled = false;
      sel.innerHTML = '<option value="">（根目录 · 更新首页）</option><option value="tutorials/">tutorials/</option>';
      var st = document.getElementById('upStatus');
      if(st) st.textContent = '⚠️ 读取目录失败（' + (err.message||'') + '），已退回默认选项。可点「🔄 读取目录」重试。';
    });
}

// 当前选中的目标目录（已保证以 / 结尾，根目录为 ''）
function upTargetPath(){
  var sel = document.getElementById('upTargetDir');
  var v = sel ? (sel.value || '') : '';
  if(v && v.charAt(v.length-1) !== '/') v += '/';
  return v;
}

function upFmtSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

function handleUpFiles(fileList){
  // 不限制文件类型：任意文件都可上传（html、图片、pdf、zip、md 等）
  var files = Array.prototype.slice.call(fileList);
  if(!files.length){
    document.getElementById('upStatus').textContent = '⚠️ 请选择要上传的文件。';
    return;
  }
  var pending = files.length;
  files.forEach(function(f){
    var reader = new FileReader();
    reader.onload = function(e){
      // 统一以 base64 存储内容：文本与二进制（图片/pdf/zip 等）都能正确写入仓库
      UP_FILES.push({ name:f.name, size:f.size, content:e.target.result, state:'wait', msg:'' });
      pending--;
      if(pending === 0) renderUpFiles();
    };
    reader.onerror = function(){
      UP_FILES.push({ name:f.name, size:f.size, content:'', state:'err', msg:'读取失败' });
      pending--;
      if(pending === 0) renderUpFiles();
    };
    reader.readAsDataURL(f);   // 读为 dataURL（含 base64），二进制安全
  });
  renderUpFiles();
}

function renderUpFiles(){
  var box = document.getElementById('upFileList');
  box.innerHTML = '';
  UP_FILES.forEach(function(f, idx){
    var item = document.createElement('div');
    item.className = 'up-file-item';
    var stateText = f.state==='ok' ? '已上传' : (f.state==='err' ? (f.msg||'失败') : '待上传');
    item.innerHTML =
      '<span>📄</span>' +
      '<span class="up-fname">'+esc(f.name)+'</span>' +
      '<span class="up-fsize">'+upFmtSize(f.size)+'</span>' +
      '<span class="up-fstate '+f.state+'">'+stateText+'</span>' +
      '<span class="up-fremove" title="移除" data-idx="'+idx+'">×</span>';
    box.appendChild(item);
  });
  box.querySelectorAll('.up-fremove').forEach(function(el){
    el.addEventListener('click', function(){
      UP_FILES.splice(parseInt(el.getAttribute('data-idx'),10),1);
      renderUpFiles();
    });
  });
  var btn = document.getElementById('upStartBtn');
  btn.disabled = UP_FILES.length === 0;
}

// base64 编码已改由 FileReader.readAsDataURL 直接产出（二进制安全），此处不再需要 upB64

function startUpload(){
  var token = getToken();
  if(!token){
    document.getElementById('upStatus').textContent = '⚠️ 尚未填入 GitHub PAT。请先点「☁️ 云同步」填入有 repo 权限的令牌。';
    return;
  }
  if(!UP_FILES.length) return;
  var btn = document.getElementById('upStartBtn');
  btn.disabled = true;
  var status = document.getElementById('upStatus');
  var total = UP_FILES.length;
  var done = 0;
  status.textContent = '⏳ 正在上传 0/' + total + ' ...';

  function next(i){
    if(i >= UP_FILES.length){
      var dir = upTargetPath();
      var where = (dir === '') ? '根目录' : dir;
      status.textContent = '✅ 全部完成：' + total + ' 个文件已写入 ' + where + '。约 1 分钟后刷新页面即可看到更新。';
      btn.disabled = false;
      // 若上传到 tutorials/，自动触发一次仓库检索，让新文件立即出现
      if(dir === 'tutorials/' && typeof scanRepo === 'function'){ setTimeout(function(){ scanRepo(); }, 1500); }
      return;
    }
    var f = UP_FILES[i];
    if(f.state === 'ok'){ done++; next(i+1); return; }
    status.textContent = '⏳ 正在上传 ' + (done+1) + '/' + total + '：' + f.name;
    upPutFile(token, f).then(function(res){
      if(res.ok){ f.state='ok'; f.msg=''; }
      else { f.state='err'; f.msg=(res.json && res.json.message) ? res.json.message : ('HTTP '+res.status); }
    }).catch(function(err){
      f.state='err'; f.msg=err.message || '网络错误';
    }).then(function(){
      done++;
      renderUpFiles();
      next(i+1);
    });
  }
  next(0);
}

// 写入单个文件到选定目录：先查是否已存在拿 sha（存在则更新），再 PUT
function upPutFile(token, f){
  var dir = upTargetPath();          // 根目录为 ''，子目录形如 'tutorials/'
  var path = dir + f.name;
  var apiUrl = 'https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/contents/' + path;
  // 1) 先查是否已存在（拿 sha，用于更新；禁用缓存避免拿到旧 sha）
  return fetch(apiUrl + '?ref=' + SYNC_BRANCH + '&t=' + Date.now(), {
      headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},
      cache:'no-store'
    })
    .then(function(r){
      if(r.status === 404) return null;
      return r.json().then(function(j){ return (j && j.sha) || null; });
    })
    .then(function(sha){
      // content 为 readAsDataURL 得到的 dataURL，取逗号后的纯 base64
      var b64 = (f.content || '').split(',')[1] || '';
      var payload = {
        message: 'upload: ' + (dir === '' ? '更新首页 ' : '上传文件 ') + f.name + ' ' + new Date().toLocaleString('zh-CN'),
        content: b64,
        branch: SYNC_BRANCH
      };
      if(sha) payload.sha = sha;   // 已存在 → 更新
      return fetch(apiUrl, {
        method:'PUT',
        headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},
        body: JSON.stringify(payload)
      }).then(function(rr){
        return rr.json().then(function(j){ return { ok: rr.ok, status: rr.status, json: j }; });
      });
    });
}

// 页脚诊断行：显示"云端数据是否读取成功"，便于快速定位（无令牌设备尤其有用）
// ===== 安全删除文件 =====
// 机制：读取目录文件 → 勾选 → 删除前先把内容备份到本地「回收站」→ 再调 GitHub DELETE 真正删除。
// 备份保留 7 天，可从回收站一键恢复（重新写回仓库原位置），防误删。
var LS_TRASH = 'zhishi-pulse-trash-v1';   // 回收站：[{path,name,dir,content_b64,sha,deletedAt}]
var TRASH_TTL = 7 * 24 * 3600 * 1000;     // 7 天
var DEL_FILES = [];   // 当前目录读到的文件：{path,name,size,sha,checked}
var LS_DEL_DIR = 'zhishi-pulse-deldir-v1';

function getTrash(){ return TRASH; }
function saveTrash(t){ TRASH = Array.isArray(t)?t:[]; saveTrashLocal(); if(typeof scheduleSync==='function') scheduleSync(); }
// 清理过期回收站记录（超过 TTL），云端同步时也触发，保证多设备一致
function pruneTrash(){
  var now=Date.now(), out=[];
  TRASH.forEach(function(r){ if(now - (r.deletedAt||0) <= TRASH_TTL) out.push(r); });
  if(out.length !== TRASH.length){
    TRASH = out; saveTrashLocal();
    if(typeof scheduleSync==='function') scheduleSync();   // 过期项清理也同步到云端
  }
  return out;
}

function openDelModal(){
  var m=document.getElementById('delModal'); m.classList.add('show');
  document.getElementById('delStatus').textContent='';
  // 复用上传弹窗的目录读取思路：填目录下拉
  loadDelDirs();
}
function closeDelModal(){ document.getElementById('delModal').classList.remove('show'); }

function loadDelDirs(){
  var sel=document.getElementById('delTargetDir');
  if(!sel) return;
  var token=getToken();
  sel.disabled=true;
  var saved=''; try{ saved=localStorage.getItem(LS_DEL_DIR)||''; }catch(e){}
  sel.innerHTML='<option value="">⏳ 读取目录...</option>';
  if(!token){
    sel.disabled=false;
    sel.innerHTML='<option value="">（根目录）</option><option value="tutorials/">tutorials/</option>';
    if(saved) sel.value=saved;
    return;
  }
  var url='https://api.github.com/repos/'+GH_USER+'/'+GH_REPO+'/contents/?ref='+SYNC_BRANCH+'&t='+Date.now();
  fetch(url,{headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(items){
      var dirs=[''];
      (items||[]).forEach(function(it){ if(it.type==='dir'&&it.name!=='.git'){ dirs.push(it.name+'/'); } });
      if(dirs.indexOf('tutorials/')===-1) dirs.push('tutorials/');
      sel.disabled=false; sel.innerHTML='';
      dirs.forEach(function(d){
        var o=document.createElement('option'); o.value=d;
        o.textContent=(d==='')?'（根目录）':d; sel.appendChild(o);
      });
      if(saved && dirs.indexOf(saved)!==-1) sel.value=saved;
    })
    .catch(function(err){
      sel.disabled=false;
      sel.innerHTML='<option value="">（根目录）</option><option value="tutorials/">tutorials/</option>';
    });
}

// 读取选中目录下的文件，列出供勾选
function loadDelFiles(){
  var token=getToken();
  var st=document.getElementById('delStatus');
  var list=document.getElementById('delFileList');
  if(!token){ st.textContent='⚠️ 尚未填入 GitHub PAT，无法读取目录。请先在「☁️ 云同步」里填入有 repo 权限的令牌。'; return; }
  var sel=document.getElementById('delTargetDir');
  var dir=sel?(sel.value||''):'';
  if(dir && dir.charAt(dir.length-1)!=='/') dir+='/';
  try{ localStorage.setItem(LS_DEL_DIR, dir); }catch(e){}
  st.textContent='⏳ 正在读取文件列表...';
  list.innerHTML='';
  DEL_FILES=[];
  var url='https://api.github.com/repos/'+GH_USER+'/'+GH_REPO+'/contents/'+dir+'?ref='+SYNC_BRANCH+'&t='+Date.now();
  fetch(url,{headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(items){
      var files=(items||[]).filter(function(it){ return it.type==='file'; });
      if(!files.length){ st.textContent='该目录下没有文件。'; return; }
      DEL_FILES=files.map(function(it){ return { path:it.path, name:it.name, size:it.size, sha:it.sha, checked:false }; });
      renderDelFiles();
      st.textContent='共 '+DEL_FILES.length+' 个文件，勾选后点「删除所选」。';
    })
    .catch(function(err){ st.textContent='⚠️ 读取失败：'+(err.message||''); });
}

function renderDelFiles(){
  var list=document.getElementById('delFileList');
  list.innerHTML='';
  if(!DEL_FILES.length){ return; }
  DEL_FILES.forEach(function(f, idx){
    var item=document.createElement('label');
    item.className='up-file-item'; item.style.cursor='pointer';
    var sz=upFmtSize(f.size||0);
    item.innerHTML='<input type="checkbox" data-idx="'+idx+'" style="margin:0 4px 0 0;cursor:pointer">'+
      '<span class="up-fname">'+esc(f.name)+'</span>'+
      '<span class="up-fsize">'+sz+'</span>';
    item.querySelector('input').addEventListener('change', function(){
      f.checked=this.checked; updateDelBtn();
    });
    list.appendChild(item);
  });
}
function updateDelBtn(){
  var n=DEL_FILES.filter(function(f){ return f.checked; }).length;
  var btn=document.getElementById('delExecBtn');
  btn.disabled=n===0;
  btn.textContent=n>0?('🗑 删除所选（'+n+'）'):'🗑 删除所选';
}

// 执行删除：先备份 → 再 DELETE
function execDelete(){
  var token=getToken();
  var st=document.getElementById('delStatus');
  var picks=DEL_FILES.filter(function(f){ return f.checked; });
  if(!picks.length){ st.textContent='⚠️ 请先勾选要删除的文件。'; return; }
  if(!token){ st.textContent='⚠️ 尚未填入 GitHub PAT。'; return; }
  // 二次确认
  var names=picks.map(function(f){ return f.name; }).join('、');
  if(picks.length>3) names=picks.slice(0,3).map(function(f){return f.name;}).join('、')+' 等 '+picks.length+' 个文件';
  if(!confirm('确定删除以下文件？\n\n'+names+'\n\n删除前会自动备份到「回收站」，7 天内可恢复。')) return;

  var btn=document.getElementById('delExecBtn');
  btn.disabled=true;
  var trash=getTrash();
  var total=picks.length, done=0;
  st.textContent='⏳ 正在备份并删除 0/'+total+' ...';

  function next(i){
    if(i>=picks.length){
      pruneTrash();
      st.textContent='✅ 已删除 '+total+' 个文件，并已备份到「回收站」（7 天内可恢复）。约 1 分钟后刷新页面生效。';
      // 从列表移除已删项
      DEL_FILES=DEL_FILES.filter(function(f){ return !f.checked; });
      renderDelFiles(); updateDelBtn();
      btn.disabled=false;
      if(typeof scanRepo==='function'){ setTimeout(function(){ scanRepo(); }, 1500); }
      return;
    }
    var f=picks[i];
    st.textContent='⏳ 正在备份并删除 '+(done+1)+'/'+total+'：'+f.name;
    // 1) 先读内容做备份
    delFetchContent(token, f.path).then(function(b64){
      // 2) 存入回收站
      trash.push({ path:f.path, name:f.name, dir:f.path.split('/').slice(0,-1).join('/'), content_b64:b64, sha:f.sha, deletedAt:Date.now() });
      saveTrash(trash);
      // 3) 真正删除
      return delDeleteFile(token, f);
    }).then(function(res){
      done++;
      if(!res.ok){ f._err=(res.json&&res.json.message)||('HTTP '+res.status); }
      next(i+1);
    }).catch(function(err){
      done++;
      f._err=err.message||'网络错误';
      next(i+1);
    });
  }
  next(0);
}

// 读取文件内容（base64），用于备份
function delFetchContent(token, path){
  var url='https://api.github.com/repos/'+GH_USER+'/'+GH_REPO+'/contents/'+path+'?ref='+SYNC_BRANCH+'&t='+Date.now();
  return fetch(url,{headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(j){ return (j&&j.content)? j.content : ''; });
}

// 调 GitHub DELETE API 删除文件
function delDeleteFile(token, f){
  var url='https://api.github.com/repos/'+GH_USER+'/'+GH_REPO+'/contents/'+f.path;
  var payload={ message:'delete: 安全删除 '+f.name+' '+new Date().toLocaleString('zh-CN'), branch:SYNC_BRANCH };
  if(f.sha) payload.sha=f.sha;
  return fetch(url,{
      method:'DELETE',
      headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},
      body:JSON.stringify(payload)
    }).then(function(rr){ return rr.json().then(function(j){ return { ok:rr.ok, status:rr.status, json:j }; }); });
}

/* ===== 回收站：查看 / 恢复 / 清空 ===== */
function openTrashModal(){
  pruneTrash();
  document.getElementById('trashModal').classList.add('show');
  renderTrash();
}
function closeTrashModal(){ document.getElementById('trashModal').classList.remove('show'); }
function renderTrash(){
  var list=document.getElementById('trashList');
  var t=pruneTrash();
  list.innerHTML='';
  if(!t.length){ list.innerHTML='<div style="color:var(--text2);font-size:13px;text-align:center;padding:30px 10px">回收站为空</div>'; return; }
  t.forEach(function(r, idx){
    var item=document.createElement('div');
    item.className='up-file-item';
    var ago=Math.floor((Date.now()-(r.deletedAt||0))/3600000);
    var remain=Math.max(0, 7- Math.floor(ago/24));
    item.innerHTML='<span class="up-fname">📄 '+esc(r.name)+'<div style="font-size:10.5px;color:var(--text2);margin-top:2px">原位置：'+esc(r.dir||'根目录')+' · 剩余 '+remain+' 天</div></span>'+
      '<button class="btn mini" style="color:#3fb950" onclick="restoreTrash('+idx+')">↩ 恢复</button>'+
      '<button class="up-fremove" title="彻底清除" onclick="purgeTrash('+idx+')">×</button>';
    list.appendChild(item);
  });
}
// 恢复：把备份内容重新写回仓库原位置
function restoreTrash(idx){
  var token=getToken();
  var st=document.getElementById('trashStatus');
  if(!token){ st.textContent='⚠️ 尚未填入 GitHub PAT，无法恢复。'; return; }
  var t=pruneTrash();
  var r=t[idx];
  if(!r){ renderTrash(); return; }
  st.textContent='⏳ 正在恢复 '+r.name+' ...';
  var apiUrl='https://api.github.com/repos/'+GH_USER+'/'+GH_REPO+'/contents/'+r.path;
  // 先查当前 sha（若已存在同名文件需更新）
  fetch(apiUrl+'?ref='+SYNC_BRANCH+'&t='+Date.now(),{headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token},cache:'no-store'})
    .then(function(rr){ return rr.status===404? null : rr.json().then(function(j){ return (j&&j.sha)||null; }); })
    .then(function(sha){
      var payload={ message:'restore: 从回收站恢复 '+r.name+' '+new Date().toLocaleString('zh-CN'), content:r.content_b64, branch:SYNC_BRANCH };
      if(sha) payload.sha=sha;
      return fetch(apiUrl,{ method:'PUT', headers:{'Accept':'application/vnd.github+json','Authorization':'token '+token}, body:JSON.stringify(payload) })
        .then(function(rr2){ return rr2.json().then(function(j){ return { ok:rr2.ok, status:rr2.status }; }); });
    })
    .then(function(res){
      if(res.ok){
        // 从回收站移除该记录
        var tt=pruneTrash(); tt.splice(idx,1); saveTrash(tt);
        st.textContent='✅ 已恢复 '+r.name+' 到仓库原位置。';
        renderTrash();
        if(typeof scanRepo==='function'){ setTimeout(function(){ scanRepo(); }, 1500); }
      } else {
        st.textContent='⚠️ 恢复失败：'+((res.json&&res.json.message)||('HTTP '+res.status));
      }
    })
    .catch(function(err){ st.textContent='⚠️ 恢复失败：'+(err.message||''); });
}
// 彻底清除单条
function purgeTrash(idx){
  if(!confirm('彻底清除这条备份？此操作不可恢复。')) return;
  var t=pruneTrash(); t.splice(idx,1); saveTrash(t); renderTrash();
}
// 清空回收站
function emptyTrash(){
  if(!confirm('清空整个回收站？所有备份将被永久删除，不可恢复。')) return;
  saveTrash([]); renderTrash();
  document.getElementById('trashStatus').textContent='回收站已清空。';
}

function diag(msg){
  var el = document.getElementById('diagLine');
  if(el) el.textContent = msg ? ('· ' + msg) : '';
}

// ===== 并发写覆盖防护（A+B 方案）=====
// 计算云端数据 d 的指纹，结构与 dataFp() 对齐（排除 updatedAt），用于乐观锁比对。
function cloudFp(d){
  if(!d || typeof d !== 'object') return null;
  var layout = blankLayout();
  // 遍历本机板块 + 云端自定义板块 id（避免漏掉云端独有自定义板块的布局）
  var ids = SEC_IDS.slice();
  (Array.isArray(d.custom) ? d.custom : []).forEach(function(s){ if(s && s.id && ids.indexOf(s.id)===-1) ids.push(s.id); });
  ids.forEach(function(id){
    layout[id] = (d.layout && Array.isArray(d.layout[id])) ? d.layout[id].map(canonFile) : [];
  });
  layout.inbox = (d.layout && Array.isArray(d.layout.inbox)) ? d.layout.inbox.map(canonFile) : [];
  var secs = (Array.isArray(d.sections) && d.sections.length) ? d.sections : sectionOrder();
  var col = (d.collapsed && typeof d.collapsed==='object') ? d.collapsed : {};
  var cus = Array.isArray(d.custom) ? d.custom : [];
  return JSON.stringify({l:layout, k:(d.links||[]), n:(d.notes||[]), s:secs, c:col, u:cus});
}
// 纯函数：把 base（本机，优先保留顺序/同 id 值）与 inc（云端）按 id/token 取并集，
// 返回合并后的普通数据对象 {layout,links,notes,sections}（不触碰内存，供两条路径复用）。
function unionMerge(base, inc){
  base = base || {}; inc = inc || {};
  var out = {};
  // NOTES：按 id 并集，本机顺序在前，云端独有的补后
  var nMap = {};
  (inc.notes||[]).forEach(function(n){ if(n && n.id) nMap[n.id] = n; });
  (base.notes||[]).forEach(function(n){ if(n && n.id) nMap[n.id] = n; });
  var nIds = [];
  (base.notes||[]).forEach(function(n){ if(n && n.id) nIds.push(n.id); });
  (inc.notes||[]).forEach(function(n){ if(n && n.id && nIds.indexOf(n.id)===-1) nIds.push(n.id); });
  out.notes = nIds.map(function(id){ return nMap[id]; }).filter(Boolean);
  // LINKS：按 id 并集，本机优先
  var lMap = {};
  (inc.links||[]).forEach(function(l){ if(l && l.id) lMap[l.id] = l; });
  (base.links||[]).forEach(function(l){ if(l && l.id) lMap[l.id] = l; });
  var lIds = [];
  (base.links||[]).forEach(function(l){ if(l && l.id) lIds.push(l.id); });
  (inc.links||[]).forEach(function(l){ if(l && l.id && lIds.indexOf(l.id)===-1) lIds.push(l.id); });
  out.links = lIds.map(function(id){ return lMap[id]; }).filter(Boolean);
  // LAYOUT：每板块 token 并集，本机顺序在前、云端独有追加
  var lay = blankLayout();
  SEC_IDS.forEach(function(id){
    var b = (base.layout && Array.isArray(base.layout[id])) ? base.layout[id].map(canonFile) : [];
    var c = (inc.layout && Array.isArray(inc.layout[id])) ? inc.layout[id].map(canonFile) : [];
    var seen={}, arr=[];
    b.concat(c).forEach(function(tk){ if(!seen[tk]){ seen[tk]=1; arr.push(tk); } });
    lay[id] = arr;
  });
  var si={}, ai=[];
  ((base.layout&&base.layout.inbox)||[]).concat((inc.layout&&inc.layout.inbox)||[]).forEach(function(tk){
    tk = canonFile(tk); if(!si[tk]){ si[tk]=1; ai.push(tk); }
  });
  lay.inbox = ai;
  out.layout = lay;
  // sections：以本机为准（板块顺序是用户主动排的，不参与合并）
  out.sections = (Array.isArray(base.sections) && base.sections.length) ? base.sections : (inc.sections || sectionOrder());
  // 折叠状态：键并集（任一设备折叠了某板块，另一设备也跟随折叠），保证多设备一致
  var col = {};
  var bk = (base.collapsed && typeof base.collapsed==='object') ? base.collapsed : {};
  var ck = (inc.collapsed && typeof inc.collapsed==='object') ? inc.collapsed : {};
  Object.keys(bk).forEach(function(k){ col[k]=true; });
  Object.keys(ck).forEach(function(k){ col[k]=true; });
  out.collapsed = col;
  // 自定义板块：按 id 并集，本机顺序在前、云端独有追加（保证多设备板块定义一致）
  var cMap = {};
  (inc.custom||[]).forEach(function(s){ if(s && s.id) cMap[s.id] = s; });
  (base.custom||[]).forEach(function(s){ if(s && s.id) cMap[s.id] = s; });
  var cIds = [];
  (base.custom||[]).forEach(function(s){ if(s && s.id) cIds.push(s.id); });
  (inc.custom||[]).forEach(function(s){ if(s && s.id && cIds.indexOf(s.id)===-1) cIds.push(s.id); });
  out.custom = cIds.map(function(id){ return cMap[id]; }).filter(Boolean);
  // 回收站：按 path 并集，本机顺序在前、云端独有追加（同一文件以较新的 deletedAt 为准）
  var trMap = {};
  (inc.trash||[]).forEach(function(r){ if(r && r.path) trMap[r.path] = r; });
  (base.trash||[]).forEach(function(r){ if(r && r.path) trMap[r.path] = r; });
  var trIds = [];
  (base.trash||[]).forEach(function(r){ if(r && r.path && trIds.indexOf(r.path)===-1) trIds.push(r.path); });
  (inc.trash||[]).forEach(function(r){ if(r && r.path && trIds.indexOf(r.path)===-1) trIds.push(r.path); });
  out.trash = trIds.map(function(p){ return trMap[p]; }).filter(Boolean);
  return out;
}
// 把云端数据 d 与本机内存数据合并（包装 unionMerge），写回内存 + localStorage + 重渲染。
function mergeCloudIntoLocal(d){
  if(!d || typeof d !== 'object') return false;
  var merged = unionMerge({layout:LAYOUT, links:LINKS, notes:NOTES, sections:sectionOrder(), collapsed:COLLAPSED, custom:CUSTOM, trash:TRASH}, d);
  var changed = (JSON.stringify(merged) !== JSON.stringify({layout:LAYOUT, links:LINKS, notes:NOTES, collapsed:COLLAPSED, custom:CUSTOM, trash:TRASH}));
  // 自定义板块先落地并重建 SECTIONS（后续 layout 依赖它）
  CUSTOM = (merged.custom && Array.isArray(merged.custom)) ? merged.custom : [];
  saveCustomSections();
  rebuildSections();
  LAYOUT = canonLayout(merged.layout);
  LINKS = merged.links;
  NOTES = merged.notes;
  // 折叠状态（键并集合并结果），写回本机
  COLLAPSED = (merged.collapsed && typeof merged.collapsed==='object') ? merged.collapsed : {};
  try{ localStorage.setItem(LS_LAYOUT, JSON.stringify(LAYOUT)); }catch(e){}
  try{ localStorage.setItem(LS_LINKS, JSON.stringify(LINKS)); }catch(e){}
  try{ localStorage.setItem(LS_NOTES, JSON.stringify(NOTES)); }catch(e){}
  try{ localStorage.setItem(LS_COLLAPSE, JSON.stringify(COLLAPSED)); }catch(e){}
  // 回收站（合并结果），写回本机，使多设备回收站一致
  TRASH = (Array.isArray(merged.trash)) ? merged.trash : [];
  try{ localStorage.setItem(LS_TRASH, JSON.stringify(TRASH)); }catch(e){}
  if(typeof renderNotes === 'function') renderNotes();
  if(typeof render === 'function') render();
  return changed;
}

// 从云端拉取并覆盖本地（silent=true 时不弹提示，仅静默失败；done 在拉取流程结束后调用）
function syncPull(silent, done){
  var st = document.getElementById('syncStatus');
  fetchCloudData(function(data, why){
    if(data){
      applyData(data);
      renderNotes();
      render();
      diag('已加载云端数据（更新于 ' + (data.updatedAt||'未知') + '）');
      if(!silent && st) st.textContent = '✅ 已从云端同步最新数据（更新于 ' + (data.updatedAt||'未知') + '）';
    } else {
      diag(why === 'notfound' ? '云端暂无同步数据，显示本机内容' : ('云端读取失败：' + why + '，显示本机内容'));
      if(!silent){
        if(why === 'notfound') st.textContent = 'ℹ️ 云端还没有同步数据。点「上传」把本机数据传一次即可。';
        else st.textContent = '⚠️ 拉取失败：' + why;
      } else if(st){
        // 静默模式失败也要给个线索，避免"页面正常但数据没同步"却毫无提示
        if(why === 'notfound') st.textContent = 'ℹ️ 云端暂无同步数据，当前显示本机内容。';
        else st.textContent = '⚠️ 云端数据读取失败（' + why + '），当前显示本机内容。';
      }
    }
    if(done){ try{ done(); }catch(e){} }
  });
}

// 保存到仓库（需要 PAT）
var _pushing = false;   // 并发锁：true 表示有一次推送正在进行
var _needRepull = false; // 推送期间若有新改动，标记为待补推
function syncPush(cb, force){
  var token = getToken();
  var st = document.getElementById('syncStatus');
  if(!token){
    if(cb){ cb(false, 'no-token'); }
    else { st.textContent = '⚠️ 未设置令牌，无法写入。点「☁️ 云同步」粘贴 GitHub PAT。'; }
    return;
  }
  // 内容与上次推送/拉取的一致 → 跳过，避免"无变化也产生新提交"
  // （每次推送都新生成 updatedAt → 新 blob → sha 轮换，是 409 反复出现的根源之一）
  // force=true（手动点"上传"）时忽略该判断，强制回写一次。
  var fp = dataFp();
  if(!force && _lastPushedFp === fp){ if(cb) cb(true, 'nochange'); return; }
  // 已有推送在进行 → 标记待补推，等当前完成后自动再推一次最新数据（避免两个 PUT 抢同一 SHA）
  if(_pushing){ _needRepull = true; if(cb) cb(true, 'queued'); return; }
  _pushing = true;
  if(st) st.textContent = '🔼 正在同步到云端...';
  // 【方案A：推送前乐观锁预检】先拉云端实时内容比对：
  //  若云端指纹 ≠ 本机基线(_lastPushedFp)，说明别的设备已改过 → 先与本机并集合并，再推送合并结果，
  //  从源头避免"拿旧基线直接覆盖云端"。force（手动上传）时跳过预检，尊重用户"以本机为准"的意图。
  function doPush(){
    pushCloudData(token, function(ok, res){
      _pushing = false;
      if(ok){
        _lastPushedFp = dataFp();     // 记录本次成功推送后的内容指纹（合并结果即当前内存状态）
        if(st) st.textContent = '✅ 已同步到云端（' + new Date().toLocaleString('zh-CN') + '），其他设备刷新即可看到。';
        if(cb) cb(true);
      } else {
        var msg = (res && (res.message || res.error)) || '未知错误';
        if(st) st.textContent = '⚠️ 同步失败：' + msg + (msg.indexOf('401')!==-1||msg.indexOf('Bad credentials')!==-1 ? '（令牌无效或已过期，请重新粘贴）' : '');
        if(cb) cb(false, msg);
      }
      // 推送期间累积了新改动 → 补推一次（用最新数据 + 最新 SHA）
      if(_needRepull){ _needRepull = false; setTimeout(function(){ syncPush(); }, 300); }
    });
  }
  if(force){ doPush(); return; }
  // 预检：拉云端（只读，不覆盖本地），比对指纹决定是否先合并
  fetchCloudData(function(data, why){
    if(data && cloudFp(data) !== _lastPushedFp){
      // 云端已被别设备改动 → 先合并到本机，再用合并结果推送（两边改动都保留）
      mergeCloudIntoLocal(data);
      _lastPushedFp = dataFp();   // 更新基线为合并后状态
      diag('检测到云端更新，已合并后再同步');
    }
    doPush();
  });
}

// ===== 云同步弹窗 =====
function openSyncModal(){
  document.getElementById('syncTokenInput').value = getToken();
  document.getElementById('syncModalStatus').textContent = '';
  document.getElementById('syncModal').classList.add('show');
}
function closeSyncModal(){ document.getElementById('syncModal').classList.remove('show'); }
// 保存弹窗中填入的 PAT（若为空则不覆盖已有令牌）。所有仓库操作前调用，保证用最新令牌。
function saveTokenFromModal(){
  var token = document.getElementById('syncTokenInput').value.trim();
  if(token){ setToken(token); return true; }
  return false;
}
// 上传：优先级最高，先存令牌再上传；sha 冲突由 pushCloudData 内部自动重试处理
function cloudUpload(){
  saveTokenFromModal();
  var status = document.getElementById('syncModalStatus');
  if(!getToken()){ status.textContent = '⚠️ 请先填入 GitHub PAT（以 ghp_ 开头）。'; return; }
  status.textContent = '🔼 正在上传到云端...';
  syncPush(function(ok, why){
    status.textContent = ok ? '✅ 上传成功！' : '⚠️ 上传失败：' + why;
  }, true);   // force=true：忽略"内容未变"去重，确保一定写一次
}
// 刷新：先存令牌再从云端拉取最新；若有上传在进行，延迟到上传结束再拉（轮询 _pushing 锁）
function cloudRefresh(){
  saveTokenFromModal();
  var status = document.getElementById('syncModalStatus');
  function doRefresh(){
    status.textContent = '🔄 正在从云端刷新...';
    syncPull(false, function(){
      var st = document.getElementById('syncStatus');
      status.textContent = (st && st.textContent) ? st.textContent : '✅ 已从云端刷新';
    });
  }
  // 有上传在进行 → 轮询等待其结束（最多约 30s），避免拉到上传前的旧数据 / sha 冲突
  if(typeof _pushing !== 'undefined' && _pushing){
    status.textContent = '⏳ 上传进行中，待上传完成后刷新...';
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      if(!(_pushing) || tries > 60){
        clearInterval(timer);
        doRefresh();
      }
    }, 500);
  } else {
    doRefresh();
  }
}

// ===== AI 问答（DeepSeek，经 Cloudflare Worker 代理）=====
var _aiHistory = [];    // 对话历史 [{role,content}]
var _aiBusy = false;    // 是否正在请求中
function aiLoad(){
  try{ var s = JSON.parse(localStorage.getItem(LS_AI_CHAT)); return (s && Array.isArray(s.messages)) ? s.messages : []; }
  catch(e){ return []; }
}
function aiSave(){
  try{ localStorage.setItem(LS_AI_CHAT, JSON.stringify({messages:_aiHistory})); }catch(e){}
}
function openAiChat(){
  _aiHistory = aiLoad();
  document.getElementById('aiStatus').textContent = '';
  document.getElementById('aiModal').classList.add('show');
  aiRender();
  setTimeout(function(){ var inp = document.getElementById('aiInput'); if(inp) inp.focus(); }, 50);
}
function closeAiChat(){ document.getElementById('aiModal').classList.remove('show'); }
function aiClear(){
  _aiHistory = [];
  aiSave();
  aiRender();
  document.getElementById('aiStatus').textContent = '已清空对话。';
}
function aiRender(){
  var box = document.getElementById('aiMessages');
  if(!box) return;
  if(_aiHistory.length === 0){
    box.innerHTML = '<div class="ai-msg bot">你好！我是接入的 AI 助手，可以问我学习、编程、测试等方面的问题。<span class="ai-tip">回答由 DeepSeek 提供，经 Cloudflare Worker 代理转发。</span></div>';
    return;
  }
  var html = '';
  _aiHistory.forEach(function(m){
    var cls = (m.role === 'user') ? 'user' : 'bot';
    html += '<div class="ai-msg '+cls+'">'+esc(m.content)+'</div>';
  });
  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}
// 追加一条消息到历史并重渲染
function aiAppend(role, content){
  _aiHistory.push({role:role, content:content});
  aiSave();
  aiRender();
}
// 输入框自适应高度 + 回车发送
function aiInitInput(){
  var inp = document.getElementById('aiInput');
  if(!inp) return;
  inp.addEventListener('input', function(){
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  inp.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      aiSend();
    }
  });
}
function aiSend(){
  if(_aiBusy){ return; }
  var inp = document.getElementById('aiInput');
  var text = (inp.value || '').trim();
  if(!text){ return; }
  if(!AI_WORKER_URL || AI_WORKER_URL.indexOf('你的worker') !== -1){
    document.getElementById('aiStatus').textContent = '⚠️ 尚未配置 AI 服务地址：请在 index.html 里把 AI_WORKER_URL 改成你部署的 Worker 地址。';
    return;
  }
  aiAppend('user', text);
  inp.value = '';
  inp.style.height = 'auto';
  // 组装发给模型的历史（仅最近 12 条，控制 token）
  var recent = _aiHistory.slice(-12);
  // 根据浏览器能力决定是否流式：不支持 ReadableStream 的老内核用非流式（返回 JSON），避免 SSE 解析报错
  var supportStream = (typeof ReadableStream !== 'undefined');
  var payload = { model: AI_MODEL, messages: recent, stream: supportStream, temperature: 0.7, max_tokens: 1024 };
  if(AI_CLIENT_KEY) payload.clientKey = AI_CLIENT_KEY;
  _aiBusy = true;
  var sendBtn = document.getElementById('aiSendBtn');
  if(sendBtn){ sendBtn.disabled = true; sendBtn.textContent = '…'; }
  document.getElementById('aiStatus').textContent = '';
  // 先放一条空的 bot 消息占位，用于流式逐字填充
  _aiHistory.push({role:'assistant', content:''});
  aiRender();
  aiStream(payload, function(fullText, err){
    _aiBusy = false;
    if(sendBtn){ sendBtn.disabled = false; sendBtn.textContent = '发送'; }
    if(err){
      // 出错：把占位消息标记为错误
      _aiHistory[_aiHistory.length-1] = {role:'assistant', content:'⚠️ '+err};
      aiSave(); aiRender();
      document.getElementById('aiStatus').textContent = '请求失败：'+err;
      return;
    }
    // 成功：把完整文本写回历史（占位消息已更新）
    _aiHistory[_aiHistory.length-1] = {role:'assistant', content:fullText};
    aiSave(); aiRender();
  });
}
// 流式请求 Worker；不支持流式的老内核走非流式（stream:false，返回 JSON）
function aiStream(payload, done){
  var headers = {'Content-Type':'application/json'};
  if(AI_CLIENT_KEY) headers['X-Client-Key'] = AI_CLIENT_KEY;
  var fetchP;
  try{
    fetchP = fetch(AI_WORKER_URL, { method:'POST', headers:headers, body:JSON.stringify(payload) });
  }catch(e){
    done('', '网络请求失败：'+e.message);
    return;
  }
  // 非流式：直接解析 JSON 返回
  if(!payload.stream){
    fetchP.then(function(r){
      if(!r.ok){
        return r.text().then(function(t){ throw new Error(t || ('HTTP '+r.status)); });
      }
      return r.json();
    }).then(function(j){
      var txt = (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
      if(!txt) throw new Error('返回为空');
      aiTypewriter(txt, done);   // 逐字模拟打字机
    }).catch(function(e){ done('', e.message); });
    return;
  }
  // 流式：读 SSE 流（现代内核）
  fetchP.then(function(r){
    if(!r.ok){
      return r.json().then(function(j){
        var m = (j && (j.error || j.message)) || ('HTTP '+r.status);
        throw new Error(m);
      }).catch(function(e){ throw new Error('HTTP '+r.status); });
    }
    var reader = r.body.getReader();
    var decoder = (typeof TextDecoder !== 'undefined') ? new TextDecoder('utf-8') : null;
    var buf = '';
    var full = '';
    function pump(){
      return reader.read().then(function(res){
        if(res.done){
          // 流结束：把剩余 buffer 处理完
          aiParseSSE(buf, function(delta){ full += delta; aiUpdateLast(full); });
          done(full, null);
          return;
        }
        var chunk = decoder ? decoder.decode(res.value, {stream:true}) : res.value;
        buf += chunk;
        // 按行解析 SSE，逐段增量更新
        var lines = buf.split('\n');
        buf = lines.pop();   // 最后一段可能不完整，留到下次
        aiParseSSELines(lines, function(delta){ full += delta; aiUpdateLast(full); });
        return pump();
      });
    }
    return pump();
  }).catch(function(e){
    done('', e.message);
  });
}
// 解析 SSE 行数组，提取 data: 里的增量文本，回调 delta
function aiParseSSELines(lines, onDelta){
  for(var i=0;i<lines.length;i++){
    var line = lines[i];
    if(line.indexOf('data:') !== 0) continue;
    var json = line.slice(5).replace(/^\s+/, '');
    if(json === '[DONE]') continue;
    try{
      var j = JSON.parse(json);
      var delta = (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
      if(delta) onDelta(delta);
    }catch(e){ /* 跳过无法解析的行 */ }
  }
}
// 兼容：整段文本一次性解析（非流式返回时）
function aiParseSSE(buf, onDelta){
  aiParseSSELines(buf.split('\n'), onDelta);
}
// 更新最后一条 bot 消息（流式增量渲染）
function aiUpdateLast(text){
  if(_aiHistory.length > 0){
    _aiHistory[_aiHistory.length-1].content = text;
  }
  aiRender();
}
// 老内核整段返回时的模拟打字机（每 12ms 显示若干字）
function aiTypewriter(full, done){
  var i = 0;
  var step = 3;
  function tick(){
    i += step;
    aiUpdateLast(full.slice(0, i));
    if(i < full.length){
      setTimeout(tick, 12);
    } else {
      done(full, null);
    }
  }
  tick();
}

// ---------- 诗词背景 ----------
// 每个元素为一联（两句），单元内两句整齐工整，单元之间在整页散乱排布
var POEMS = [
  ['已是悬崖百丈冰', '犹有花枝俏'],
  ['钟山风雨起苍黄', '百万雄师过大江'],
  ['雄关漫道真如铁', '而今迈步从头越'],
  ['金沙水拍云崖暖', '大渡桥横铁索寒'],
  ['天若有情天亦老', '人间正道是沧桑'],
  ['萧瑟秋风今又是', '换了人间'],
  ['为有牺牲多壮志', '敢教日月换新天'],
  ['不管风吹浪打', '胜似闲庭信步'],
  ['世上无难事', '只要肯登攀'],
  ['一万年太久', '只争朝夕']
];
function renderPoems(){
  var box = document.getElementById('poemBg');
  if(!box) return;
  // 每两句诗作为“一个部分”排布（10 首 = 10 个单元）：
  // 单元内两句紧密相邻（体现上下句关联），单元与单元之间散得更开。
  var W = window.innerWidth || document.documentElement.clientWidth || 1000;
  var H = window.innerHeight || document.documentElement.clientHeight || 800;
  var n = POEMS.length;
  // 一个单元含两句竖排，宽度约为单句两倍 → 列宽下限取 130px 保证横向不碰，
  // 同时让单元之间天然留出更大间距。
  var MIN_COL_PX = 130;
  var cols = Math.max(1, Math.min(n, Math.floor(W / MIN_COL_PX)));
  var rows = Math.ceil(n / cols);
  // 高度约束：竖排诗句高度是瓶颈。按可用高度算每行能容纳的最大字号，
  // 高度不够时等比缩小字号（列数不变，保证横向不碰），纵向永不重叠。
  // 单句最长约 7 字，竖排高度 ≈ 字数 × 字号 × 行高(1.85)
  var availH = H * 0.92;
  var perRowH = availH / rows;
  var maxFont = Math.floor(perRowH / (7 * 1.85));
  var fontPx = Math.max(9, Math.min(17, maxFont));    // 背景化：字号限制在 9~17px
  var html = '';
  for(var k=0;k<POEMS.length;k++){
    var pair = POEMS[k];
    var c = k % cols;              // 列
    var r = Math.floor(k/cols);    // 行
    // 格子中心坐标（均匀分布）
    var left = ((c + 0.5) / cols * 100).toFixed(2);
    var top  = ((r + 0.5) / rows * 100).toFixed(2);
    // 抖动/旋转幅度随列数收敛：列越密越规整，避免相邻单元挤碰
    var jit = cols >= 5 ? 1.2 : 1.8;
    var jitterX = (Math.random()*jit - jit/2).toFixed(2);
    var jitterY = (Math.random()*jit - jit/2).toFixed(2);
    var rot = (Math.random()*1.6 - 0.8).toFixed(2);    // ±0.8° 轻微旋转
    // 大幅降低透明度：仅作背景，无意间瞥见才能看清
    var opacity = (0.18 + Math.random()*0.14).toFixed(3); // 0.18~0.32
    // 上句、下句各为一个 span，单元内紧密相邻体现关联（不加标点）
    html += '<div class="poem-unit" style="left:'+left+'%;top:'+top+'%;'+
            'transform:translate(calc(-50% + '+jitterX+'%), calc(-50% + '+jitterY+'%)) rotate('+rot+'deg);opacity:'+opacity+'">'+
              '<span class="poem-line" style="font-size:'+fontPx+'px">'+esc(pair[0])+'</span>'+
              '<span class="poem-line poem-line-end" style="font-size:'+fontPx+'px">'+esc(pair[1])+'</span>'+
            '</div>';
  }
  box.innerHTML = html;
}
// 窗口尺寸变化（拉宽/缩小/手机转屏）时防抖重排，避免诗句错位重叠
var _poemResizeTimer = null;
window.addEventListener('resize', function(){
  if(_poemResizeTimer) clearTimeout(_poemResizeTimer);
  _poemResizeTimer = setTimeout(renderPoems, 180);
});

// ---------- 密码门禁 ----------
function gateInit(){
  var cfg = window.SITE_CONFIG || {password:"2026", rememberDays:7};
  var days = (typeof cfg.rememberDays === 'number') ? cfg.rememberDays : 7;

  // 若开启了记住设备，且本地有未过期的通过记录 → 直接放行
  if(days > 0){
    try{
      var ts = parseInt(localStorage.getItem(LS_GATE) || '0', 10);
      if(ts && (Date.now() - ts) < days * 24 * 3600 * 1000){
        gateOpen();
        return;
      }
    }catch(e){}
  }
  // 否则显示门禁
  gateBind(cfg);
}

function gateBind(cfg){
  var gate = document.getElementById('gate');
  var input = document.getElementById('gateInput');
  var dots = document.getElementById('gateDots').children;
  var tip = document.getElementById('gateTip');

  input.addEventListener('input', function(){
    var v = input.value.replace(/\D/g,'').slice(0,4);
    input.value = v;
    for(var i=0;i<dots.length;i++){ dots[i].classList.toggle('on', i < v.length); }
    if(v.length === 4){
      if(v === cfg.password){
        gatePass(cfg);
      } else {
        input.classList.add('err');
        tip.textContent = '密码错误，请重试';
        tip.classList.add('err');
        setTimeout(function(){
          input.value=''; input.classList.remove('err');
          tip.textContent=''; tip.classList.remove('err');
          for(var j=0;j<dots.length;j++){ dots[j].classList.remove('on'); }
          input.focus();
        }, 700);
      }
    }
  });
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ input.blur(); }
  });
  setTimeout(function(){ input.focus(); }, 60);
}

function gatePass(cfg){
  var days = (typeof cfg.rememberDays === 'number') ? cfg.rememberDays : 7;
  if(days > 0){
    try{ localStorage.setItem(LS_GATE, String(Date.now())); }catch(e){}
  }
  gateOpen();
}

function gateOpen(){
  var gate = document.getElementById('gate');
  if(gate){ gate.classList.add('hide'); }
  boot();
}

renderPoems();
gateInit();