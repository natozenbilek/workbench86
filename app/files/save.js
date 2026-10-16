// ============================================================
// workbench86 Files Save: writes My files, the generated folder
// and the open tabs to this browser (app/files/store.js), copy on
// edit, Download and Ctrl+S
// ============================================================

let fsTimer = null, fsFirstChange = 0;
let fsTabsWritten = '';         // the tab state last written, as JSON
let fsStampCount = 0;
let fsUnwritten = new Map();    // stamp -> a change whose write has not finished yet
const FS_TAB_ID = Math.random().toString(36).slice(2, 10);   // this page, in the stamps of its records

// Every record written carries a new stamp. A tab writes over a record only while it still
// has the stamp this tab last saw (fsWrite, app/files/sync.js).
function fsStamp() { return FS_TAB_ID + '.' + (++fsStampCount); }

// Open tabs, the active tab and its cursor. A tab's text is stored only when it is an
// example or sample with edits; a file's text is in the files store.
function fsTabState() {
  syncActiveTab();
  return {
    open: openTabs.map(function(t) {
      let o = {key: t.key};
      if (t.dirty) o.dirty = true;
      if (!isUserFile(t.key) && t.content !== fsSource(t.key)) o.content = t.content;
      return o;
    }),
    active: activeTabKey,
    sel: activeTabKey ? [ed.selectionStart, ed.selectionEnd] : null,
    top: activeTabKey ? Math.round(ed.scrollTop) : 0
  };
}

// === SAVE ===
// Called after every change to the files, the tabs or the editor text.
function scheduleAutosave() {
  if (!fsKept) return;
  if (!fsPersistAsked && dynamicFiles.length) fsAskPersist();
  let now = Date.now();
  if (!fsTimer) fsFirstChange = now;
  else if (now - fsFirstChange > FS_MAX_WAIT) return;
  clearTimeout(fsTimer);
  fsTimer = setTimeout(fsFlush, FS_SAVE_DELAY);
}

// Writes what changed since the last write: changed and new files, removed or renamed
// ones, and the tab state. `closing`: from pagehide (below).
function fsFlush(closing) {
  clearTimeout(fsTimer); fsTimer = null;
  if (!fsKept || !fsDb) return;
  let tabs = fsTabState(), tabsJson = JSON.stringify(tabs);
  let puts = [], dels = [], seen = new Set();
  dynamicFiles.forEach(function(f) {
    let rec = fsRecord(f), sig = fsSig(rec), known = fsWritten.get(f.name);
    seen.add(f.name);
    if (known && known.sig === sig) return;
    rec.stamp = fsStamp();
    puts.push({f, rec, sig, known});
  });
  fsWritten.forEach(function(w, name) { if (!seen.has(name)) dels.push({name, known: w}); });
  if (!puts.length && !dels.length && tabsJson === fsTabsWritten) return;
  puts.forEach(p => fsUnwritten.set(p.rec.stamp, p));
  try {
    let tx = fsDb.transaction(['files', 'state'], 'readwrite');
    // Counted as written now, so the next flush does not repeat them. fsWrite corrects
    // this where another tab got there first.
    puts.forEach(p => fsWritten.set(p.rec.name, {sig: p.sig, stamp: p.rec.stamp}));
    dels.forEach(d => fsWritten.delete(d.name));
    if (tabsJson !== fsTabsWritten) { tx.objectStore('state').put(tabs, 'tabs'); fsTabsWritten = tabsJson; }
    tx.onabort = function() { fsStop(); };
    fsWrite(tx, puts, dels, closing === true && fsAlone());
  } catch (e) { fsStop(); }
}

// A reload, a closed tab or a switch to another window writes at once.
window.addEventListener('pagehide', function() {
  fsFlush(true);
  if (fsUnwritten.size) fsSavePending(Array.from(fsUnwritten.values()));
});
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') fsFlush();
});

// From pagehide: the browser may end the page before the database has the last changes,
// so they also go to localStorage, which keeps them at once. The next start takes them
// (fsRestoreFiles, app/files/store.js) where the record still has a stamp from before
// them (`prevs`); a write that completes takes them out again.
let fsPendingSaved = false;
function fsSavePending(puts) {
  try {
    let old = JSON.parse(localStorage.getItem(FS_PENDING) || 'null'), by = new Map();
    if (old && Array.isArray(old.files)) old.files.forEach(x => by.set(x.name, x));
    puts.forEach(function(p) {
      let was = by.get(p.rec.name), prevs = [p.known ? p.known.stamp || null : null];
      if (was && was.stamp === prevs[0] && Array.isArray(was.prevs)) prevs = prevs.concat(was.prevs);
      by.set(p.rec.name, Object.assign({prevs}, p.rec));
    });
    localStorage.setItem(FS_PENDING, JSON.stringify({files: Array.from(by.values())}));
    fsPendingSaved = true;
  } catch (e) {}
}

// A write finished (ok) or failed: its changes are no longer waiting.
function fsWriteDone(puts, ok) {
  puts.forEach(p => fsUnwritten.delete(p.rec.stamp));
  if (!ok || !fsPendingSaved) return;
  try {
    let p = JSON.parse(localStorage.getItem(FS_PENDING) || 'null'), done = new Set(puts.map(x => x.rec.stamp));
    let files = p && Array.isArray(p.files) ? p.files.filter(x => !done.has(x.stamp)) : [];
    if (files.length) localStorage.setItem(FS_PENDING, JSON.stringify({files}));
    else localStorage.removeItem(FS_PENDING);
  } catch (e) {}
}

// Storage failed after the page started (disk or quota full, site data cleared). The
// page goes on as before v19; files already in My files stay until the page closes.
function fsStop(msg) {
  if (!fsKept) return;
  fsKept = false;
  clearTimeout(fsTimer); fsTimer = null;
  try { fsDb.close(); } catch (e) {}
  fsDb = null;
  fsNotice(msg || 'Files can no longer be kept in this browser (its storage failed or is full). Download what you want to keep.', 'load');
}

// Asked once, when the first file is made, so the browser is less likely to clear the
// files under storage pressure. Chrome and Safari decide silently; Firefox may ask.
function fsAskPersist() {
  fsPersistAsked = true;
  try { fsDb.transaction('state', 'readwrite').objectStore('state').put(true, 'persistAsked'); } catch (e) {}
  try { navigator.storage.persist().catch(function() {}); } catch (e) {}
}

// === COPY ON EDIT ===
// The first change to an example or a built-in sample (from editorChanged in
// app/files/core.js) turns its tab into a file in My files with the same file name,
// -2, -3 ... added if that is taken. The edit, the cursor and undo stay; the example
// does not change. Only while files are kept.
function copyOnEdit() {
  let tab = openTabs.find(t => t.key === activeTabKey);
  if (!tab) return;
  let name = uniqueName(fileLabel(tab.key), fsNameTaken);
  tab.key = name;
  tab.content = ed.value;
  tab.dirty = true;
  activeTabKey = name;
  addDynamicFile(name, tab.content, 'local');   // rebuilds the tree around the new file
  renderTabs();
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb(name);
  if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
  // An assembler error stays in its banner while the copy is fixed.
  sLog('Copied to My files as ' + name + '. The original stays unchanged.', 0, true);
}

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

// Ctrl+S (Cmd+S) downloads the open file instead of saving the whole web page. A file of
// a folder bound to My files is written to that folder instead.
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (folderBound() && isFolderFile(activeTabKey)) folderSave(activeTabKey);
    else downloadCurrent();
  }
});
