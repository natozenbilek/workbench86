// ============================================================
// workbench86 Files Core - Tabs, file loading, open/close
// ============================================================

let activeFileEl = null;
let openTabs = [];
let activeTabKey = null;

function loadExByKey(key, fileEl) {
  if (!EX[key]) return;
  if (activeTabKey) {
    let cur = openTabs.find(t => t.key === activeTabKey);
    if (cur) cur.content = document.getElementById('ed').value;
  }
  let existing = openTabs.find(t => t.key === key);
  if (!existing) {
    openTabs.push({key, content: EX[key]});
  }
  if (typeof hideWelcome === 'function') hideWelcome();
  activeTabKey = key;
  let tab = openTabs.find(t => t.key === key);
  document.getElementById('ed').value = tab.content;
  updLn(); updateHighlight(); doReset();
  if (activeFileEl) activeFileEl.classList.remove('active');
  if (fileEl) { fileEl.classList.add('active'); activeFileEl = fileEl; }
  else highlightFileInTree(key);
  renderTabs();
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb(key);
  if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
}

function switchTab(key) {
  if (activeTabKey) {
    let cur = openTabs.find(t => t.key === activeTabKey);
    if (cur) cur.content = document.getElementById('ed').value;
  }
  let tab = openTabs.find(t => t.key === key);
  if (!tab) return;
  if (EX[key]) {
    let fileEl = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
    loadExByKey(key, fileEl);
    return;
  }
  if (typeof hideWelcome === 'function') hideWelcome();
  activeTabKey = key;
  document.getElementById('ed').value = tab.content;
  updLn(); updateHighlight();
  if (activeFileEl) activeFileEl.classList.remove('active');
  highlightFileInTree(key);
  renderTabs();
}

function closeTab(key, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  let idx = openTabs.findIndex(t => t.key === key);
  if (idx < 0) return;
  openTabs.splice(idx, 1);
  if (activeTabKey === key) {
    if (openTabs.length > 0) {
      let newIdx = Math.min(idx, openTabs.length - 1);
      switchTab(openTabs[newIdx].key);
    } else {
      activeTabKey = null;
      document.getElementById('ed').value = '';
      document.getElementById('edHL').innerHTML = '';
      document.getElementById('lns').innerHTML = '';
      if (activeFileEl) { activeFileEl.classList.remove('active'); activeFileEl = null; }
      if (typeof showWelcome === 'function') showWelcome();
      if (typeof updateBreadcrumb === 'function') updateBreadcrumb(null);
    }
  }
  renderTabs();
}

function closeAllTabs() {
  openTabs = [];
  activeTabKey = null;
  document.getElementById('ed').value = '';
  document.getElementById('edHL').innerHTML = '';
  document.getElementById('lns').innerHTML = '';
  if (activeFileEl) { activeFileEl.classList.remove('active'); activeFileEl = null; }
  renderTabs();
  if (typeof showWelcome === 'function') showWelcome();
  sLog('Ready.', 0);
}

function fileLabel(key) {
  if (key.includes('.')) return key;
  let short = key.replace(/^PA(\d+):\s*/, 'pa$1_').replace(/^HW:\s*/, 'hw_');
  short = short.replace(/\s+/g, '_').toLowerCase();
  return short + '.asm';
}

function updateAsmBtnLabel() {
  let btn = document.getElementById('asmBtn');
  if (!btn) return;
  let hl = isHighLevelFile();
  btn.innerHTML = hl ? '&#9654; Translate to ASM' : '&#9654; Assemble';
  btn.className = hl ? 'b b-blu' : 'b bp';
}

function renderTabs() {
  let bar = document.getElementById('tabBar');
  if (!bar) return;
  bar.innerHTML = '';
  updateAsmBtnLabel();
  openTabs.forEach(t => {
    let tab = document.createElement('div');
    tab.className = 'tab' + (t.key === activeTabKey ? ' active' : '');
    let label = document.createElement('span');
    label.textContent = fileLabel(t.key);
    label.title = t.key;
    let close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '\u00D7';
    close.addEventListener('click', function(e) { closeTab(t.key, e); });
    tab.appendChild(label);
    tab.appendChild(close);
    tab.addEventListener('click', function() { switchTab(t.key); });
    tab.addEventListener('contextmenu', function(e) {
      e.preventDefault(); e.stopPropagation();
      showTabContextMenu(e, t.key);
    });
    bar.appendChild(tab);
  });
}

function showTabContextMenu(e, key) {
  hideCtxMenu();
  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';

  function addItem(label, fn) {
    let item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = label;
    item.addEventListener('click', function() { hideCtxMenu(); fn(); });
    ctxMenu.appendChild(item);
  }
  function addSep() { let s = document.createElement('div'); s.className = 'ctx-sep'; ctxMenu.appendChild(s); }

  addItem('Close', function() { closeTab(key); });
  addItem('Close Others', function() {
    let keep = openTabs.find(t => t.key === key);
    openTabs = keep ? [keep] : [];
    activeTabKey = key;
    if (keep) {
      document.getElementById('ed').value = keep.content;
      updLn(); updateHighlight();
    }
    renderTabs();
  });
  addItem('Close All', function() { closeAllTabs(); });
  addSep();
  addItem('Copy Path', function() {
    navigator.clipboard.writeText(key).then(() => sLog('Copied: ' + key, 0));
  });
  addItem('Duplicate', function() {
    let tab = openTabs.find(t => t.key === key);
    if (!tab) return;
    let copyName = 'copy_' + key;
    addDynamicFile(copyName, tab.content, 'local');
    openFileInTab(copyName, tab.content);
  });

  document.body.appendChild(ctxMenu);
  let rect = ctxMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
}

function highlightFileInTree(key) {
  if (activeFileEl) activeFileEl.classList.remove('active');
  let el = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
  if (el) { el.classList.add('active'); activeFileEl = el; }
}

function loadEx() {
  let s = document.getElementById('ex').value;
  if (EX[s]) loadExByKey(s, null);
}

function openFileInTab(key, content, fileEl) {
  if (activeTabKey) {
    let cur = openTabs.find(t => t.key === activeTabKey);
    if (cur) cur.content = document.getElementById('ed').value;
  }
  let existing = openTabs.find(t => t.key === key);
  if (existing) { existing.content = content; }
  else { openTabs.push({key, content}); }
  if (typeof hideWelcome === 'function') hideWelcome();
  activeTabKey = key;
  document.getElementById('ed').value = content;
  updLn(); updateHighlight();
  if (activeFileEl) activeFileEl.classList.remove('active');
  if (fileEl) { fileEl.classList.add('active'); activeFileEl = fileEl; }
  else highlightFileInTree(key);
  renderTabs();
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb(key);
  if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
}

// Dynamic files
let dynamicFiles = [];

function addDynamicFile(name, content, folder) {
  let existing = dynamicFiles.find(f => f.name === name);
  if (existing) { existing.content = content; }
  else { dynamicFiles.push({name, content, folder: folder || 'generated'}); }
  buildExDropdown();
}
