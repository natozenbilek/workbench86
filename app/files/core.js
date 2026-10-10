// ============================================================
// workbench86 Files Core: Tabs, file loading, open/close
// ============================================================

let activeFileEl = null;
let openTabs = [];
let activeTabKey = null;

// The editor is the live copy of the active file. The tab's content, and for a file in
// My files its stored content, are refreshed from it here, before anything reads them.
function syncActiveTab() {
  if (!activeTabKey) return;
  let val = document.getElementById('ed').value;
  let cur = openTabs.find(t => t.key === activeTabKey);
  if (cur) cur.content = val;
  let df = dynamicFiles.find(f => f.name === activeTabKey);
  if (df) df.content = val;
}

// Current text of any file: open tab first, then example, user file, built-in sample.
function getFileContent(key) {
  syncActiveTab();
  let tab = openTabs.find(t => t.key === key);
  if (tab) return tab.content;
  if (EX[key] !== undefined) return EX[key];
  let df = dynamicFiles.find(f => f.name === key);
  if (df) return df.content;
  let ef = EXTRA_FILES.find(f => f.name === key);
  return ef ? ef.content : '';
}

// Hook for saving files in the browser. Nothing is stored yet.
function scheduleAutosave() {}

function loadExByKey(key, fileEl) {
  if (!EX[key]) return;
  syncActiveTab();
  let existing = openTabs.find(t => t.key === key);
  if (!existing) {
    openTabs.push({key, content: EX[key]});
  }
  if (typeof hideWelcome === 'function') hideWelcome();
  activeTabKey = key;
  let tab = openTabs.find(t => t.key === key);
  document.getElementById('ed').value = tab.content;
  if (typeof resetEditorHistory === 'function') resetEditorHistory();
  updLn(); updateHighlight(); doReset();
  if (activeFileEl) activeFileEl.classList.remove('active');
  if (fileEl) { fileEl.classList.add('active'); activeFileEl = fileEl; }
  else highlightFileInTree(key);
  renderTabs();
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb(key);
  if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
}

function switchTab(key) {
  syncActiveTab();
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
  if (typeof resetEditorHistory === 'function') resetEditorHistory();
  updLn(); updateHighlight();
  if (activeFileEl) activeFileEl.classList.remove('active');
  highlightFileInTree(key);
  renderTabs();
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb(key);
  if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
}

// Edits to an example or sample live only in its tab. A file in My files keeps them.
function unsavedTabs(keys) {
  return openTabs.filter(t => keys.includes(t.key) && t.dirty && !isUserFile(t.key));
}
function confirmDiscard(tabs) {
  if (!tabs.length) return true;
  let names = tabs.map(t => fileLabel(t.key)).join(', ');
  return confirm(names + (tabs.length > 1 ? ' have' : ' has') + ' edits that are not saved anywhere.\nClose and lose them?\n\n(Cancel, then press Ctrl+S to download.)');
}

function closeTab(key, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  syncActiveTab();
  let idx = openTabs.findIndex(t => t.key === key);
  if (idx < 0) return;
  if (!confirmDiscard(unsavedTabs([key]))) return;
  openTabs.splice(idx, 1);
  if (activeTabKey === key) {
    if (openTabs.length > 0) {
      let newIdx = Math.min(idx, openTabs.length - 1);
      switchTab(openTabs[newIdx].key);
    } else {
      activeTabKey = null;
      document.getElementById('ed').value = '';
      if (typeof resetEditorHistory === 'function') resetEditorHistory();
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
  syncActiveTab();
  if (!confirmDiscard(unsavedTabs(openTabs.map(t => t.key)))) return;
  openTabs = [];
  activeTabKey = null;
  document.getElementById('ed').value = '';
  if (typeof resetEditorHistory === 'function') resetEditorHistory();
  document.getElementById('edHL').innerHTML = '';
  document.getElementById('lns').innerHTML = '';
  if (activeFileEl) { activeFileEl.classList.remove('active'); activeFileEl = null; }
  renderTabs();
  if (typeof showWelcome === 'function') showWelcome();
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb(null);
  sLog('Ready.', 0);
}

function fileLabel(key) {
  if (typeof EX_META !== 'undefined' && EX_META[key]) return EX_META[key].file;
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
    tab.className = 'tab' + (t.key === activeTabKey ? ' active' : '') + (t.dirty ? ' dirty' : '');
    let label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = fileLabel(t.key);
    label.title = t.dirty ? t.key + ' (changed since it was opened or downloaded)' : t.key;
    let close = document.createElement('button');
    close.type = 'button';
    close.className = 'tab-close';
    close.setAttribute('aria-label', 'Close ' + fileLabel(t.key));
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
  let dl = document.getElementById('fbDownloadBtn');
  if (dl) dl.disabled = !activeTabKey;
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
    syncActiveTab();
    if (!confirmDiscard(unsavedTabs(openTabs.map(t => t.key).filter(k => k !== key)))) return;
    let keep = openTabs.find(t => t.key === key);
    openTabs = keep ? [keep] : [];
    activeTabKey = key;
    if (keep) {
      document.getElementById('ed').value = keep.content;
      if (typeof resetEditorHistory === 'function') resetEditorHistory();
      updLn(); updateHighlight();
      highlightFileInTree(key);
      if (typeof updateBreadcrumb === 'function') updateBreadcrumb(key);
      if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
    }
    renderTabs();
  });
  addItem('Close All', function() { closeAllTabs(); });
  addSep();
  addItem('Copy Path', function() {
    navigator.clipboard.writeText(key).then(() => sLog('Copied: ' + key, 0));
  });
  addItem('Download (Ctrl+S)', function() { downloadFile(key); });
  addItem(isUserFile(key) ? 'Duplicate' : 'Make an editable copy', function() { duplicateFile(key); });

  document.body.appendChild(ctxMenu);
  let rect = ctxMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
}

function highlightFileInTree(key) {
  if (activeFileEl) activeFileEl.classList.remove('active');
  let el = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
  if (!el) return;
  el.classList.add('active'); activeFileEl = el;
  // Open the folders around it (through their own click handler) and bring it into view.
  for (let it = el.closest('.fb-folder-items'); it; it = it.parentElement.closest('.fb-folder-items'))
    if (it.classList.contains('collapsed') && it.previousElementSibling) it.previousElementSibling.click();
  el.scrollIntoView({block: 'nearest'});
}

function loadEx() {
  let s = document.getElementById('ex').value;
  if (EX[s]) loadExByKey(s, null);
}

// An open tab keeps its text. Only `replace` (Open from PC, Translate to ASM) overwrites it.
function openFileInTab(key, content, fileEl, replace) {
  syncActiveTab();
  let existing = openTabs.find(t => t.key === key);
  if (!existing) { existing = {key, content}; openTabs.push(existing); }
  else if (replace) {
    existing.content = content; existing.dirty = false;
    let df = dynamicFiles.find(f => f.name === key);
    if (df) df.content = content;
  }
  if (typeof hideWelcome === 'function') hideWelcome();
  activeTabKey = key;
  document.getElementById('ed').value = existing.content;
  if (typeof resetEditorHistory === 'function') resetEditorHistory();
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
  scheduleAutosave();
}

// Files made in this page (New, Open from PC, copies, Translate to ASM). They can be
// renamed and deleted; examples and the built-in samples cannot.
function isUserFile(key) { return dynamicFiles.some(f => f.name === key); }

// === DOWNLOAD ===
function downloadFile(key) {
  if (!key) { sLog('Open a file first, then download it.', 1); return; }
  let text = getFileContent(key);
  // Notepad before Windows 10 1809 shows a file with bare LF line ends on one line.
  if (/Windows/.test(navigator.userAgent)) text = text.replace(/\r?\n/g, '\r\n');
  let name = fileLabel(key).replace(/[\\/:*?"<>|]+/g, '_');
  let a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type: 'text/plain'}));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 2000);
  let tab = openTabs.find(t => t.key === key);
  if (tab && tab.dirty) { tab.dirty = false; renderTabs(); }
  sLog('Downloaded ' + name + ' (see your browser downloads).', 0);
}
function downloadCurrent() { downloadFile(activeTabKey); }

// Ctrl+S (Cmd+S) downloads the open file instead of saving the whole web page.
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    downloadCurrent();
  }
});

// Typing marks the open tab as changed (dot on the tab) until it is downloaded.
document.getElementById('ed').addEventListener('input', function() {
  let t = openTabs.find(x => x.key === activeTabKey);
  if (t && !t.dirty) { t.dirty = true; renderTabs(); }
  scheduleAutosave();
});
