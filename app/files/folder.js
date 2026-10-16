// ============================================================
// workbench86 Files Folder: My files in a folder on this computer
// (File System Access API, Chrome and Edge only): bind, reconnect,
// stop, and the Explorer controls. Reading and writing the folder
// is in app/files/folder-io.js.
// ============================================================

// A file of the folder is in dynamicFiles with folder 'disk' and a `disk` record:
//   name   its name in the folder. The key is the same name, unless the page already
//          uses that one (a sample, a file kept in this browser); then it is folder/name.
//   text   the folder's copy when it was last read or written, with \n line ends; null
//          while the folder does not have the file (new here, or deleted there while it
//          had changes here)
//   mtime, size   of that copy, so an unchanged file is not read again
//   crlf, bom, enc   how the file is stored; a save keeps them
//   rev    counts changes to the record, so app/files/save.js knows to write it
// Edits stay in the page and in the database until Ctrl+S writes them to the folder.
// Nothing else writes there, except Rename. Deleting a file there is left to the file
// manager: this API has no recycle bin.
const FD_TYPES = /\.(asm|inc|c|cpp|py|java|go|txt)$/i;   // what Open accepts
const FD_MAX_SIZE = 1024 * 1024;
const FD_MAX_FILES = 300;
const FD_BROWSER = 'In this browser';   // where My files of this browser show meanwhile

let fdDir = null;                  // the folder's handle while My files shows it
let fdState = 'off';               // 'ready', 'locked' (permission to ask again), 'missing'
let fdQueue = Promise.resolve();   // reads and writes of the folder run one at a time
let fdSyncQueued = false, fdPicking = false;
let fdTold = new Set();            // changes in both places already reported (name@date)
let fdCp1254 = null;

FB_ICONS.folderLink = '<path d="M1.5 3.5h4.5l1.5 1.5h7v8.5h-13z" fill="none" stroke="currentColor"/><path d="M5 9.5h5.5M8.5 7.5l2 2-2 2" fill="none" stroke="currentColor"/>';
FB_ICONS.refresh = '<path d="M13 8a5 5 0 1 1-1.5-3.5" fill="none" stroke="currentColor"/><path d="M12.5 1.5v3.5H9" fill="none" stroke="currentColor"/>';
FB_ICONS.eject = '<path d="M8 2.5l5 6H3z" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-linejoin="round"/><path d="M3 12.5h10" stroke="currentColor"/>';

// === STATE ===
// Offered only where the files are kept: the handle and the safety copies of the
// folder's files live in the workbench86 database.
function folderCanBind() { return typeof window.showDirectoryPicker === 'function' && filesKept(); }
function folderBound() { return fdDir !== null; }
function folderEntry(key) { return key ? dynamicFiles.find(f => f.disk && f.name === key) : undefined; }
function isFolderFile(key) { return !!folderEntry(key); }
function folderOnDisk(key) { let f = folderEntry(key); return !!fdDir && !!f && f.disk.text !== null; }
// A file of the folder is named so, whatever its key. Windows and macOS ignore case.
function folderHas(name) { return dynamicFiles.some(f => f.disk && f.disk.name.toLowerCase() === name.toLowerCase()); }

// The text here differs from the folder's copy: the dot on its tab and its row.
function folderUnsaved(key) {
  let f = folderEntry(key);
  if (!f) return false;
  return f.disk.text === null || (key === activeTabKey ? ed.value : f.content) !== f.disk.text;
}

// My files while a folder is used: its files by name, as a file manager lists them.
function folderFiles() {
  return dynamicFiles.filter(f => f.disk).sort(function(a, b) {
    return a.disk.name.localeCompare(b.disk.name, undefined, {numeric: true, sensitivity: 'base'});
  });
}

// The Explorer folder a file shows under, for the breadcrumb.
function folderLabel(f) {
  if (f.disk) return fdDir ? fdDir.name : 'My files';
  if (f.folder === 'local') return fdDir ? FD_BROWSER : 'My files';
  return f.folder;
}

// From addDynamicFile: while a folder is used, a new file for My files (New, Open,
// a copy) belongs to it. Ctrl+S writes it there.
function folderAdopt(f) {
  if (!fdDir || f.folder !== 'local') return;
  f.folder = 'disk';
  fdSetDisk(f, {name: f.name, text: null});
}

function fdSetDisk(f, changes) {
  f.disk = Object.assign({}, f.disk, changes, {rev: ((f.disk && f.disk.rev) || 0) + 1});
}

function fdKey(name, self) {
  let taken = n => (n !== self && isUserFile(n)) || fsSource(n) !== undefined;
  return taken(name) ? uniqueName(fdDir.name + '/' + name, taken) : name;
}

function fdRekey(f, key) {
  let old = f.name;
  if (key === old) return;
  f.name = key;
  openTabs.forEach(t => { if (t.key === old) t.key = key; });
  if (activeTabKey === old) activeTabKey = key;
}

// Back to a file kept in this browser, under its own name (-2, -3 ... if that is taken).
function fdToBrowser(f) {
  dynamicFiles = dynamicFiles.filter(x => x !== f);
  let key = uniqueName(f.disk.name);
  f.folder = 'local';
  delete f.disk;
  dynamicFiles.push(f);
  fdRekey(f, key);
}

function fdRun(task) {
  fdQueue = fdQueue.then(task).catch(function(e) { console.error('workbench86 folder:', e); });
  return fdQueue;
}

// Asking needs a click or a key press just before (Chrome shows its prompt then).
function fdPermission(ask) {
  let opts = {mode: 'readwrite'};
  try {
    return (ask ? fdDir.requestPermission(opts) : fdDir.queryPermission(opts)).then(p => p === 'granted', () => false);
  } catch (e) { return Promise.resolve(false); }
}

function fdStateText() {
  let n = fdDir.name;
  if (fdState === 'locked') return 'workbench86 needs your permission again to use the folder ' + n + '.';
  if (fdState === 'missing') return 'The folder ' + n + ' cannot be found. Is its drive plugged in?';
  return 'My files is the folder ' + n + ' on this computer. Ctrl+S saves the open file there.';
}

// === BIND, RECONNECT, STOP ===
async function folderPick() {
  if (fdDir || fdPicking || !folderCanBind()) return;
  let dir;
  fdPicking = true;   // a second picker while one is open would only fail
  try { dir = await window.showDirectoryPicker({id: 'workbench86', mode: 'readwrite'}); }
  catch (e) {
    if (e.name !== 'AbortError') sLog('That folder cannot be used: ' + (e.message || e.name), 1);
    return;
  } finally { fdPicking = false; }
  if (fdDir) return;
  fdDir = dir;
  fdState = (await fdPermission(false)) ? 'ready' : 'locked';
  fdStoreHandle();
  buildExDropdown();
  await folderSync();
  if (fdDir === dir && fdState === 'ready') sLog(fdStateText(), 0);
}

async function folderReconnect() {
  if (!fdDir) return;
  if (!(await fdPermission(true))) { sLog('No permission for the folder ' + fdDir.name + '. Its files here stay as they are.', 1); return; }
  fdState = 'ready';
  await folderSync(true);
  if (fdDir && fdState === 'missing') sLog(fdStateText(), 1);
}

function folderRefresh() { return fdState === 'ready' ? folderSync(true) : folderReconnect(); }

// The folder's files go from My files; the folder itself is not touched. Text not saved
// there, or every file when the folder cannot be reached, stays as files in this browser.
// The folder is read first: a USB stick may have gone since the window got the focus.
async function folderDisconnect() {
  if (!fdDir) return;
  let dir = fdDir;
  if (fdState === 'ready') await folderSync();
  if (dir !== fdDir) return;
  syncActiveTab();
  let name = fdDir.name, files = dynamicFiles.filter(f => f.disk);
  let reach = fdState === 'ready', keep = reach ? files.filter(f => folderUnsaved(f.name)) : files;
  let msg = 'Stop using the folder ' + name + '?\nThe folder and its files stay as they are. My files shows the files kept in this browser again.';
  if (keep.length) msg += reach
    ? '\n\nNot saved in the folder: ' + keep.map(f => f.disk.name).join(', ') + '. They stay in My files, in this browser.'
    : '\n\nThe folder cannot be reached now, so its ' + keep.length + ' file(s) stay in My files, in this browser.';
  if (!confirm(msg)) return;
  files.forEach(f => { if (!keep.includes(f)) closeTab(f.name); });   // the folder has their text
  dynamicFiles = dynamicFiles.filter(f => !f.disk || keep.includes(f));
  keep.forEach(fdToBrowser);
  fdDir = null; fdState = 'off';
  fdStoreHandle();
  buildExDropdown(); renderTabs();
  if (activeTabKey && typeof updateBreadcrumb === 'function') updateBreadcrumb(activeTabKey);
  sLog('My files shows the files kept in this browser again.', 0);
}

function fdStoreHandle() {
  try {
    let st = fsDb.transaction('state', 'readwrite').objectStore('state');
    if (fdDir) st.put({handle: fdDir}, 'folder'); else st.delete('folder');
  } catch (e) { console.error('workbench86: the folder is not remembered:', e); }
}

// At startup, after restoreSavedFiles (app/main/editor.js), which read the folder's
// record; again if the saved files came late. Never rejects. Chrome may still allow the
// folder ("Allow on every visit"); otherwise My files shows the copies kept here and a
// Reconnect button.
async function folderRestore() {
  let rec = fsFolderRec;
  if (fdDir) return;
  if (rec && rec.handle && typeof window.showDirectoryPicker === 'function') {
    fdDir = rec.handle;
    fdState = (await fdPermission(false)) ? 'ready' : 'locked';
    if (fdState === 'ready') folderSync();
  } else {
    dynamicFiles.filter(f => f.disk).forEach(fdToBrowser);   // a folder not remembered: its files stay here
  }
  renderTabs();
  if (activeTabKey && typeof updateBreadcrumb === 'function') updateBreadcrumb(activeTabKey);
}

// Coming back from another program: it may have changed the folder.
window.addEventListener('focus', function() { if (fdDir && fdState === 'ready') folderSync(); });

// === EXPLORER ===
// From buildExDropdown (app/files/tree.js): on the My files row, the zip button
// (app/files/zip.js), the folder's name and buttons (all shown on hover and keyboard
// focus, so the default layout does not change); Reconnect when permission must be
// asked again; dots on files not saved in the folder.
function folderDecorate(tree) {
  let mine = tree.querySelector('.fb-folder[data-folder="My files"]');
  if (!mine) return;
  let hd = mine.firstElementChild, items = mine.lastElementChild;
  let acts = document.createElement('span');
  acts.className = 'fb-acts';
  function act(ic, tip, fn) {
    let b = document.createElement('button');
    b.type = 'button'; b.className = 'fb-act'; b.tabIndex = -1;
    b.title = tip; b.setAttribute('aria-label', tip);
    b.innerHTML = svgIcon(ic);
    b.addEventListener('click', function(e) { e.stopPropagation(); fn(e); });
    acts.appendChild(b);
  }
  zipActs(act);
  if (!fdDir) {
    if (folderCanBind()) act('folderLink', 'Use a folder on this computer for My files', folderPick);
  } else {
    let src = document.createElement('span');
    src.className = 'fb-src' + (fdState === 'ready' ? '' : ' fb-src-off');
    src.textContent = fdDir.name;
    src.title = fdStateText();
    hd.appendChild(src);
    act('refresh', 'Read the folder again', folderRefresh);
    act('eject', 'Stop using this folder', folderDisconnect);
    let empty = items.querySelector('.fb-empty');
    if (empty) empty.textContent = 'No file here that the editor opens. Use New or Open above.';
    if (fdState !== 'ready') items.insertBefore(fdReconnectRow(), items.firstChild);
  }
  hd.appendChild(acts);
  folderMarkRows();
}

function fdReconnectRow() {
  let row = document.createElement('div');
  row.className = 'fb-reconnect';
  let text = document.createElement('span');
  text.textContent = fdStateText();
  let b = document.createElement('button');
  b.type = 'button'; b.className = 'b b-out';
  b.textContent = fdState === 'missing' ? 'Try again' : 'Reconnect';
  b.addEventListener('click', function(e) { e.stopPropagation(); folderReconnect(); });
  row.appendChild(text);
  row.appendChild(b);
  return row;
}

function folderMarkRows() {
  dynamicFiles.forEach(function(f) {
    if (!f.disk) return;
    let row = document.querySelector('#fbTree .fb-file[data-key="' + CSS.escape(f.name) + '"]');
    if (row) row.classList.toggle('fb-unsaved', folderUnsaved(f.name));
  });
}

// From editorChanged (app/files/core.js): typing back to the saved text clears the dots.
function folderEdited() {
  if (!isFolderFile(activeTabKey)) return;
  let u = folderUnsaved(activeTabKey);
  let tab = document.querySelector('#tabBar .tab.active');
  if (tab) tab.classList.toggle('dirty', u);
  let row = document.querySelector('#fbTree .fb-file[data-key="' + CSS.escape(activeTabKey) + '"]');
  if (row) row.classList.toggle('fb-unsaved', u);
}

// From the Explorer's context menu (app/files/tree.js).
function folderMenuItems(addItem) {
  if (fdDir) {
    if (fdState !== 'ready') addItem('Reconnect to the folder ' + fdDir.name, folderReconnect);
    else addItem('Read the folder ' + fdDir.name + ' again', folderRefresh);
    addItem('Stop using the folder ' + fdDir.name, folderDisconnect);
  } else if (folderCanBind()) {
    addItem('Use a folder on this computer...', folderPick);
  }
}
