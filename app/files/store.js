// ============================================================
// workbench86 Files Store: brings back My files, the generated
// folder and the open tabs kept in this browser (IndexedDB).
// Writing them is in app/files/save.js, a second tab in
// app/files/sync.js.
// ============================================================

// The origin (natozenbilek.github.io) is shared with other sites, so the database, the
// channel and the localStorage key are all named workbench86. Stores: files (one record
// per file in dynamicFiles, keyed by name) and state ('tabs': open tabs, active tab,
// cursor; 'persistAsked'; 'folder': the folder My files is bound to, app/files/folder.js).
const FS_DB = 'workbench86';
const FS_PENDING = 'workbench86_pending';   // changes the page had not written yet when it closed
const FS_SAVE_DELAY = 300;      // ms without a change before it is written
const FS_MAX_WAIT = 2000;       // steady typing is still written every two seconds or so
const FS_OPEN_TIMEOUT = 3000;   // the page starts without the saved files then; they follow when they come

let fsDb = null;                // the open database while files are kept
let fsKept = false;             // saved files are restored and writing works
let fsWritten = new Map();      // file name -> {sig, stamp} of its record, as this tab last wrote or read it
let fsOrder = new WeakMap();    // file -> its place in the tree; a rename keeps it
let fsNextOrder = 0;
let fsPersistAsked = false;
let fsFolderRec = null;         // the saved 'folder' record, for folderRestore (app/files/folder.js)
let fsDomReady = new Promise(function(resolve) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resolve, {once: true});
  else resolve();
});

// True while edits are saved in this browser. Otherwise the page works as before v19:
// files live in memory only and edits to an example stay in its tab.
function filesKept() { return fsKept; }

// === OPEN AND READ ===
// Resolves to {db, saved}, or to {error} when this browser gives the page no database
// (site data blocked, some private windows, file:// in some browsers) or a newer build
// has it. It may also never resolve; restoreSavedFiles waits FS_OPEN_TIMEOUT at most.
function fsLoad() {
  return new Promise(function(resolve) {
    try {
      let req = indexedDB.open(FS_DB, 1);
      req.onupgradeneeded = function() {
        let db = req.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', {keyPath: 'name'});
        if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      };
      req.onsuccess = function() {
        let db = req.result;
        fsReadAll(db).then(saved => resolve({db, saved}), e => { db.close(); resolve({error: e}); });
      };
      req.onerror = function(e) { e.preventDefault(); resolve({error: req.error}); };
    } catch (e) { resolve({error: e}); }
  });
}

function fsReadAll(db) {
  return new Promise(function(resolve, reject) {
    let out = {}, tx = db.transaction(['files', 'state'], 'readonly'), st = tx.objectStore('state');
    tx.objectStore('files').getAll().onsuccess = function(e) { out.files = e.target.result; };
    ['tabs', 'persistAsked', 'folder'].forEach(function(k) {
      st.get(k).onsuccess = function(e) { out[k] = e.target.result; };
    });
    tx.oncomplete = function() { resolve(out); };
    tx.onabort = function() { reject(tx.error); };
  });
}

// === RESTORE ON LOAD ===
// Called once from the init in app/main/editor.js with the examples' load promise. The
// welcome screen waits for this: it shows only when no tab comes back. The editor takes
// no typing meanwhile, because the saved tabs replace its text. Never rejects.
async function restoreSavedFiles(examplesReady) {
  ed.readOnly = true;
  try {
    let load = fsLoad();
    let r = await Promise.race([load, new Promise(function(res) { setTimeout(res, FS_OPEN_TIMEOUT, null); })]);
    await fsDomReady;
    let tabs = r && r.saved && r.saved.tabs;
    if (!(tabs && Array.isArray(tabs.open) && tabs.open.length) && !openTabs.length && typeof showWelcome === 'function') showWelcome();
    await examplesReady;
    if (r) { fsStart(r); return; }
    // A slow disk on the first visit of the day, say: the page starts without them.
    fsNotice('Your saved files have not loaded yet. They appear in My files when they do; until then, nothing new is kept.', 'load');
    load.then(function(late) { fsStart(late, true); });
  } catch (e) {
    console.error('workbench86: restoring saved files failed:', e);
  } finally {
    ed.readOnly = false;
  }
}

// With the database open and read: the saved files and tabs come back and saving starts.
// `late`: the page has already started without them (above).
function fsStart(r, late) {
  if (!r.db) {
    fsNotice(r.error && r.error.name === 'VersionError'
      ? 'Your files were saved by a newer workbench86. Reload this page to get it; until then, nothing here is kept.'
      : 'Files cannot be kept in this browser: its site storage is blocked or unavailable. Download what you want to keep.', 'load');
    return;
  }
  fsDb = r.db;
  let pending = fsReadPending();
  try {
    fsPersistAsked = r.saved.persistAsked === true;
    fsFolderRec = r.saved.folder || null;
    let renamed = fsRestoreFiles(Array.isArray(r.saved.files) ? r.saved.files : [], pending);
    fsRestoreTabs(r.saved.tabs, renamed);
  } catch (e) {
    // Saving now could delete the files that did not come back, so this tab does not save.
    console.error('workbench86: restoring saved files failed:', e);
    fsDb.close(); fsDb = null;
    fsNotice('Your saved files could not all be restored, so this tab does not save. Reload to try again.', 'load');
    return;
  }
  if (pending.length) try { localStorage.removeItem(FS_PENDING); } catch (e) {}
  fsDb.onversionchange = function() { fsStop('A newer workbench86 opened in another tab keeps the files now. Reload this page to keep saving yours.'); };
  fsDb.onclose = function() { fsStop(); };
  fsKept = true;
  fsWatchOtherTabs();
  scheduleAutosave();
  if (!late) return;
  fsNotice('Your saved files are back in My files.', 'load');
  folderRestore().then(function() { buildExDropdown(); renderTabs(); });
}

// Records come back as files. A pending change (fsReadPending) goes in when the database
// still has a record it replaced; when another tab wrote that file since, it comes
// back as a copy. A saved file whose name the page took meanwhile (New or Open while
// the files were loading) gets the next free name. Returns old name -> new name.
function fsRestoreFiles(records, pending) {
  let saved = new Map(), copies = [], renamed = new Map(), restored = [];
  records.forEach(function(r) {
    if (!r || typeof r.name !== 'string' || typeof r.content !== 'string') return;
    saved.set(r.name, r);
    fsWritten.set(r.name, {sig: fsSig(r), stamp: r.stamp});
  });
  pending.forEach(function(p) {
    if (!p || typeof p.name !== 'string' || typeof p.content !== 'string') return;
    let r = saved.get(p.name), now = r && r.stamp || null;
    if (now === (p.stamp || null)) return;   // the database got it after all
    if ((Array.isArray(p.prevs) ? p.prevs : [null]).some(x => (x || null) === now)) saved.set(p.name, p);
    else copies.push(p);
  });
  let taken = n => fsNameTaken(n) || saved.has(n) || restored.some(f => f.name === n);
  copies.forEach(function(p) {
    let name = uniqueName(fileLabel(p.name), taken);
    saved.set(name, {name, content: p.content, folder: 'local', order: p.order});
  });
  Array.from(saved.values()).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(function(r) {
    let order = typeof r.order === 'number' ? r.order : 0;
    let f = {name: r.name, content: r.content, folder: r.folder || 'local'};
    if (r.disk) f.disk = r.disk;   // a file of the bound folder (app/files/folder.js)
    if (isUserFile(f.name)) { f.name = uniqueName(f.name, taken); renamed.set(r.name, f.name); }
    fsNextOrder = Math.max(fsNextOrder, order + 1);
    fsOrder.set(f, order);
    restored.push(f);
  });
  dynamicFiles = restored.concat(dynamicFiles);
  return renamed;
}

function fsRestoreTabs(st, renamed) {
  if (!st || !Array.isArray(st.open)) return;
  st.open.forEach(function(t) {
    if (!t || typeof t.key !== 'string') return;
    let key = renamed.get(t.key) || t.key;
    if (openTabs.some(o => o.key === key)) return;
    let df = dynamicFiles.find(f => f.name === key);
    let src = df ? df.content : fsSource(key);
    let text = !df && typeof t.content === 'string' ? t.content : src;
    if (text === undefined) return;   // an example that no longer exists, with no edits
    if (src === undefined) {
      // Edits to an example that is gone: they become a file in My files.
      let name = uniqueName(fileLabel(key));
      addDynamicFile(name, text, 'local');
      openTabs.push({key: name, content: text, dirty: true});
      return;
    }
    openTabs.push({key, content: text, dirty: !!t.dirty || text !== src});
  });
  if (activeTabKey || !openTabs.length) { renderTabs(); return; }
  let want = renamed.get(st.active) || st.active;
  let active = openTabs.find(t => t.key === want) || openTabs[0];
  switchTab(active.key);
  if (active.key === want && Array.isArray(st.sel)) {
    ed.setSelectionRange(st.sel[0], st.sel[1]);
    ed.scrollTop = st.top || 0;
    syncScroll();
    if (typeof updateStatusBarPos === 'function') updateStatusBarPos();
  }
}

// What pagehide put in localStorage (fsSavePending, app/files/save.js). It is removed
// once the restore has taken it.
function fsReadPending() {
  try {
    let p = JSON.parse(localStorage.getItem(FS_PENDING) || 'null');
    return p && Array.isArray(p.files) ? p.files : [];
  } catch (e) { return []; }
}

// Text of an example or a built-in sample as shipped, undefined for any other key.
function fsSource(key) {
  if (EX[key] !== undefined) return EX[key];
  let ef = EXTRA_FILES.find(f => f.name === key);
  return ef ? ef.content : undefined;
}

// For a copy of an example (copyOnEdit) or a file from a zip (app/files/zip.js): a name
// is taken by a file of yours, the bound folder or a sample. Examples are keyed by their
// titles, so their file names stay free and a copy keeps the example's name.
function fsNameTaken(n) { return isUserFile(n) || folderHas(n) || fsSource(n) !== undefined; }

// What is stored for a file, and its signature: a file is written when that changes. A
// file of the bound folder also carries its `disk` record, whose rev changes with it.
function fsRecord(f) {
  if (!fsOrder.has(f)) fsOrder.set(f, fsNextOrder++);
  let rec = {name: f.name, content: f.content, folder: f.folder, order: fsOrder.get(f)};
  if (f.disk) rec.disk = f.disk;
  return rec;
}
function fsSig(r) { return (r.folder || 'local') + '\n' + (r.order || 0) + '\n' + (r.disk ? r.disk.rev : '') + '\n' + r.content; }

// === NOTICE ===
// Lines above the editor, until they are dismissed. For news about the files only;
// assembler errors keep the red banner below it. A line with a `key` replaces the
// earlier line with that key; the same text is not shown twice.
function fsNotice(msg, key) {
  let el = document.getElementById('fileNotice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fileNotice';
    el.className = 'file-notice';
    el.setAttribute('role', 'status');
    let text = document.createElement('span');
    text.className = 'file-notice-msg';
    let close = document.createElement('button');
    close.type = 'button';
    close.className = 'file-notice-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', function() { el.hidden = true; });
    el.appendChild(text);
    el.appendChild(close);
    let banner = document.getElementById('errorBanner');
    if (banner) banner.parentNode.insertBefore(el, banner);
    else document.body.appendChild(el);
  }
  let box = el.querySelector('.file-notice-msg');
  if (el.hidden) box.textContent = '';   // a dismissed notice starts afresh
  let lines = Array.from(box.children);
  let line = key && lines.find(l => l.dataset.key === key);
  if (!line) {
    if (lines.some(l => l.textContent === msg)) { el.hidden = false; return; }
    line = document.createElement('span');
    line.className = 'file-notice-line';
    if (key) line.dataset.key = key;
    box.appendChild(line);
  }
  line.textContent = msg;
  el.hidden = false;
}
