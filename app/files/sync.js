// ============================================================
// workbench86 Files Sync: two workbench86 tabs keep the same
// files (app/files/store.js) without either losing a text
// ============================================================

// Every tab of this page reads and writes the same records. A record carries the stamp
// of its last write. A tab writes a file only while the record still has the stamp it
// last saw; otherwise another tab got there first, and both texts are kept (fsWrite).
// After each write the other tabs hear the names and take the files they have not
// changed themselves (fsPull), so they mostly show the same files.
let fsChannel = null;
let fsOtherTabs = false;        // another workbench86 tab answered
let fsOtherTabWarned = false;
let fsInFlight = new Map();     // file name -> writes of it not finished yet; fsPull leaves those alone

// No other tab can write: the closing page then writes without reading first.
function fsAlone() { return fsChannel !== null && !fsOtherTabs; }

// === WRITE ===
// The writes of fsFlush (app/files/save.js). Each record is read first, in the same
// transaction, so no other tab writes in between. `blind`: the page is closing and no
// other tab is open, so the records are written without the reads, which need the page
// to live on until they answer.
function fsWrite(tx, puts, dels, blind) {
  let files = tx.objectStore('files');
  let names = puts.map(p => p.rec.name).concat(dels.map(d => d.name)), told = names.slice();
  names.forEach(n => fsInFlight.set(n, (fsInFlight.get(n) || 0) + 1));
  function done(ok) {
    names.forEach(n => { let k = fsInFlight.get(n) - 1; if (k > 0) fsInFlight.set(n, k); else fsInFlight.delete(n); });
    fsWriteDone(puts, ok);
  }
  tx.oncomplete = function() {
    done(true);
    if (fsChannel && told.length) try { fsChannel.postMessage({workbench86: 'saved', names: told}); } catch (e) {}
  };
  tx.addEventListener('abort', function() { done(false); });
  if (blind) {
    puts.forEach(p => files.put(p.rec));
    dels.forEach(d => files.delete(d.name));
    if (tx.commit) tx.commit();
    return;
  }
  let cur = new Map();
  names.forEach(function(n) { files.get(n).onsuccess = function(e) { cur.set(n, e.target.result); }; });
  // Requests answer in order, so every record above is read when the keys arrive.
  files.getAllKeys().onsuccess = function(e) {
    let keys = new Set(e.target.result), notes = [], changed = false;
    let taken = n => keys.has(n) || fsNameTaken(n);
    syncActiveTab();
    puts.forEach(function(p) {
      let name = p.rec.name, c = cur.get(name), f = p.f;
      if (!c || (p.known && (c.stamp || null) === (p.known.stamp || null))) { files.put(p.rec); return; }
      // Renamed or deleted here since: the delete of this name meets the other tab's record
      // and leaves it, and the file's own next write has its text.
      if (f.name !== name || !dynamicFiles.includes(f)) return;
      changed = true;
      // The text here is safe elsewhere (the same text, or the folder's copy) and was not
      // changed since: the other tab's record is taken.
      let safe = c.content === p.rec.content || (f.disk && f.disk.text === p.rec.content);
      if (safe && f.content === p.rec.content) { fsAdopt(c); return; }
      // Both changed it, or both made a file of that name: this tab's text moves to a new name.
      let to = uniqueName(fileLabel(name), taken);
      fsRename(f, to);
      keys.add(to); told.push(to);
      let rec = Object.assign({}, p.rec, {name: to});
      if (f.disk) rec.disk = f.disk;
      files.put(rec);
      fsWritten.set(to, {sig: fsSig(rec), stamp: rec.stamp});
      fsAdopt(c);
      notes.push(p.known
        ? name + ' was also changed in another workbench86 tab. Both are kept: that tab\'s text as ' + name + ', yours as ' + to + '.'
        : 'Another workbench86 tab also made a file named ' + name + '. Yours is kept as ' + to + '.');
    });
    dels.forEach(function(d) {
      let c = cur.get(d.name);
      if (!c) return;
      if ((c.stamp || null) === (d.known.stamp || null)) { files.delete(d.name); return; }
      // Changed in another tab since: it stays. A file made here under that name meanwhile
      // meets it at its own write.
      if (dynamicFiles.some(f => f.name === d.name)) return;
      fsAdopt(c);
      changed = true;
      notes.push(d.name + ' was changed in another workbench86 tab, so it stays in My files.');
    });
    if (tx.commit) tx.commit();
    if (!changed) return;
    notes.forEach(n => fsNotice(n));
    fsRefresh();
  };
}

// A record another tab wrote: into the file of that name here, or as a new file.
function fsAdopt(c) {
  let f = dynamicFiles.find(x => x.name === c.name);
  if (!f) { f = {name: c.name, content: c.content}; dynamicFiles.push(f); }
  f.folder = c.folder || 'local';
  if (c.disk) f.disk = c.disk; else delete f.disk;
  fsOrder.set(f, c.order || 0);
  fsNextOrder = Math.max(fsNextOrder, (c.order || 0) + 1);
  setFileText(f, c.content);
  fsWritten.set(c.name, {sig: fsSig(c), stamp: c.stamp});
}

// This tab's file under a new name; a file of the bound folder becomes a new one there,
// written with Ctrl+S.
function fsRename(f, to) {
  let old = f.name;
  f.name = to;
  if (f.disk) fdSetDisk(f, {name: to, text: null, mtime: 0, size: 0});
  openTabs.forEach(t => { if (t.key === old) t.key = to; });
  if (activeTabKey === old) activeTabKey = to;
}

// New text for a file from elsewhere (another tab, its folder): the open tab follows, and
// in the editor the cursor stays where it can. True when the editor changed.
function setFileText(f, text) {
  f.content = text;
  let tab = openTabs.find(t => t.key === f.name);
  if (tab) tab.content = text;
  if (f.name !== activeTabKey || ed.value === text) return false;
  let a = ed.selectionStart, b = ed.selectionEnd, top = ed.scrollTop;
  ed.value = text;
  ed.setSelectionRange(Math.min(a, text.length), Math.min(b, text.length));
  ed.scrollTop = top;
  resetEditorHistory(); updLn(); updateHighlight();
  return true;
}

function fsRefresh() {
  // An open rename box would be lost with the rows; the next rebuild shows the changes.
  if (!document.querySelector('#fbTree .fb-inline-input')) buildExDropdown();
  renderTabs();
  if (activeTabKey && typeof updateBreadcrumb === 'function') { updateBreadcrumb(activeTabKey); updateStatusBarFileType(); }
}

// === TAKE WHAT ANOTHER TAB WROTE ===
// Only files this tab has not changed since it last wrote or read them. A file changed
// here too is sorted out by this tab's next write (fsWrite above).
function fsPull(names) {
  let tx;
  try { tx = fsDb.transaction('files'); } catch (e) { return; }
  let st = tx.objectStore('files'), got = new Map();
  names.forEach(function(n) { st.get(n).onsuccess = function(e) { got.set(n, e.target.result); }; });
  tx.oncomplete = function() {
    if (!fsKept) return;
    syncActiveTab();
    let changed = false;
    got.forEach(function(c, name) {
      if (fsInFlight.has(name)) return;   // its write reads the record again (fsWrite)
      let known = fsWritten.get(name), f = dynamicFiles.find(x => x.name === name);
      if (c && known && (c.stamp || null) === (known.stamp || null)) return;   // this tab has it
      if (f ? !known || fsSig(fsRecord(f)) !== known.sig : known) return;      // changed here
      if (c) { fsAdopt(c); changed = true; return; }
      if (!f) return;
      // Deleted there. An open tab keeps it, and a change here writes it back.
      if (openTabs.some(t => t.key === name)) { fsWritten.set(name, {sig: known.sig, stamp: null}); return; }
      dynamicFiles = dynamicFiles.filter(x => x !== f);
      fsWritten.delete(name);
      changed = true;
    });
    if (changed) fsRefresh();
  };
}

// === OTHER TABS ===
// A new tab says hello, the open ones answer, and each shows the notice once.
function fsWatchOtherTabs() {
  try { fsChannel = new BroadcastChannel(FS_DB); } catch (e) { return; }
  fsChannel.onmessage = function(e) {
    let m = e.data && e.data.workbench86;
    if (m === 'saved' && fsKept && Array.isArray(e.data.names)) { fsOtherTabs = true; fsPull(e.data.names); }
    if (m === 'hello') fsChannel.postMessage({workbench86: 'here'});
    if (m !== 'hello' && m !== 'here') return;
    fsOtherTabs = true;
    if (!fsKept || fsOtherTabWarned) return;
    fsOtherTabWarned = true;
    fsNotice('workbench86 is open in another tab too. Both tabs keep the same files: a change in one shows in the other, and when both change a file at once, both texts are kept.');
  };
  fsChannel.postMessage({workbench86: 'hello'});
}
