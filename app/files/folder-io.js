// ============================================================
// workbench86 Files Folder I/O: reading the bound folder, Ctrl+S,
// rename, and the bytes of a file (see app/files/folder.js)
// ============================================================

// === READ THE FOLDER ===
// Brings My files in line with the folder without losing a text: a file changed only
// in the folder is taken from there, one changed only here stays unsaved, and one
// changed in both keeps the text here and says so (Ctrl+S then asks before replacing).
function folderSync(report) {
  if (!fdDir || fdSyncQueued) return fdQueue;
  fdSyncQueued = true;
  return fdRun(async function() {
    fdSyncQueued = false;
    let dir = fdDir, found;
    if (!dir) return;
    try { found = await fdList(dir); }
    catch (e) { if (dir === fdDir) fdFailed(e); return; }
    if (dir !== fdDir) return;
    let was = fdState;
    fdState = 'ready';
    fdApply(found, report || was !== 'ready');
  });
}

// name -> what fdRead gives, or null for a file that did not change (or cannot be read now).
async function fdList(dir) {
  let found = new Map(), count = 0;
  for await (let [name, h] of dir.entries()) {
    if (h.kind !== 'file' || name[0] === '.' || !FD_TYPES.test(name)) continue;
    if (++count > FD_MAX_FILES) { found.more = true; break; }
    let f = dynamicFiles.find(x => x.disk && x.disk.name === name);
    try {
      let file = await h.getFile();
      if (file.size > FD_MAX_SIZE) { if (f) found.set(name, null); continue; }
      let same = f && f.disk.text !== null && f.disk.mtime === file.lastModified && f.disk.size === file.size;
      found.set(name, same ? null : await fdRead(file));
    } catch (e) {
      if (e.name === 'NotAllowedError') throw e;
      // Open in another program on Windows, or just replaced by an editor's safe save
      // (NotFoundError): the next read sees it. A folder that is gone fails in entries().
      if (f) found.set(name, null);
    }
  }
  return found;
}

function fdApply(found, report) {
  syncActiveTab();
  let notes = [], changed = report;
  dynamicFiles.filter(f => f.disk).forEach(function(f) {
    let d = found.get(f.disk.name);
    if (d === null) return;
    changed = true;
    if (d === undefined) { if (!found.more) fdGone(f, notes); return; }
    if (d.text === f.disk.text) { fdSetDisk(f, d); return; }
    if (f.content === f.disk.text || f.content === d.text) { fdTake(f, d); return; }
    if (fdTold.has(f.disk.name + '@' + d.mtime)) return;
    fdTold.add(f.disk.name + '@' + d.mtime);
    notes.push(f.disk.name + ' changed in the folder and here. The text here is kept; Ctrl+S asks before it replaces the folder\'s copy.');
  });
  found.forEach(function(d, name) {
    if (!d || dynamicFiles.some(f => f.disk && f.disk.name === name)) return;
    let f = {name: fdKey(name), content: d.text, folder: 'disk'};
    fdSetDisk(f, Object.assign({name}, d));
    dynamicFiles.push(f);
    changed = true;
  });
  if (found.more) notes.push('Only the first ' + FD_MAX_FILES + ' files of the folder ' + fdDir.name + ' are listed.');
  if (notes.length) fsNotice(notes.join(' '));
  if (!changed) return;
  // An open rename box would be lost with the rows; the next rebuild shows the changes.
  if (!document.querySelector('#fbTree .fb-inline-input')) buildExDropdown();
  renderTabs();
  if (report) sLog('My files shows the ' + folderFiles().length + ' file(s) of the folder ' + fdDir.name + '.', 0);
}

// Changed only in the folder: the page takes the new text, keeping the cursor where it can.
function fdTake(f, d) {
  fdSetDisk(f, d);
  if (setFileText(f, d.text)) sLog(f.disk.name + ' changed in the folder. The editor shows the new text.', 0);
}

// Deleted or renamed in the folder. With no changes here and no open tab it goes from
// My files too; otherwise it stays, and Ctrl+S writes it there again.
function fdGone(f, notes) {
  if (f.disk.text === null) return;
  if (f.content === f.disk.text && !openTabs.some(t => t.key === f.name)) {
    dynamicFiles = dynamicFiles.filter(x => x !== f);
    return;
  }
  fdSetDisk(f, {text: null, mtime: 0, size: 0});
  notes.push(f.disk.name + ' is no longer in the folder ' + fdDir.name + '. Its text stays here; Ctrl+S writes it there again.');
}

function fdFailed(e) {
  let was = fdState;
  if (e.name === 'NotAllowedError') fdState = 'locked';
  else if (e.name === 'NotFoundError') fdState = 'missing';
  else sLog('Could not read the folder ' + fdDir.name + ': ' + (e.message || e.name), 1);
  if (was !== fdState) buildExDropdown();
}

// === SAVE (Ctrl+S) ===
// The folder's copy is read first: one changed since it was read here, or a file of
// that name the page did not know, is replaced only after a confirm. The browser writes
// a temporary file and swaps it in on close, so a failed save leaves the old file whole.
function folderSave(key) {
  let f = folderEntry(key), dir = fdDir;
  if (!f || !dir) return Promise.resolve();
  syncActiveTab();
  let ready = fdState === 'ready';
  return (ready ? Promise.resolve(true) : fdPermission(true)).then(function(ok) {
    if (dir !== fdDir) return;   // the folder was stopped meanwhile
    if (!ok) { sLog('Not saved: no permission for the folder ' + dir.name + '. The text stays here.', 1); return; }
    if (!ready) folderSync();   // runs before the save, so the save sees the folder as it is
    return fdRun(() => fdWrite(f));
  });
}

// The folder may be stopped, or the file renamed or removed, while a save waits.
function fdStill(dir, f, name) { return dir === fdDir && !!f.disk && f.disk.name === name && dynamicFiles.includes(f); }

async function fdWrite(f) {
  if (!fdDir || !f.disk || !dynamicFiles.includes(f)) return;
  syncActiveTab();
  let dir = fdDir, name = f.disk.name, text = f.content, w = null;
  try {
    let fh = await fdHandle(dir, name);
    let d = fh ? await fdRead(await fh.getFile()) : null;
    if (!fdStill(dir, f, name)) return;
    if (d && d.text === text) { fdSetDisk(f, d); fdSaved(f); return; }
    if (d && d.text !== f.disk.text && !confirm(f.disk.text === null
        ? 'The folder ' + dir.name + ' already has a file named ' + name + '.\nReplace it with the text here?'
        : name + ' was changed in the folder ' + dir.name + ' after it was read here.\nReplace the folder\'s copy with the text here?')) {
      sLog('Not saved. To keep both, use Duplicate: the copy gets its own name.', 1);
      return;
    }
    let how = d || (f.disk.enc ? f.disk : {crlf: /Windows/.test(navigator.userAgent)});
    let bytes = fdEncode(text, how);
    if (!bytes) {
      if (!confirm(name + ' is stored as Windows-1254 (Turkish) text, which cannot hold every character typed here.\nSave it as UTF-8 instead?')) { sLog('Not saved.', 1); return; }
      how = Object.assign({}, how, {enc: 'utf-8', bom: false});
      bytes = fdEncode(text, how);
    }
    fh = fh || await dir.getFileHandle(name, {create: true});
    w = await fh.createWritable();
    await w.write(bytes);
    await w.close();
    w = null;
    let file = await fh.getFile();
    if (!fdStill(dir, f, name)) return;
    fdSetDisk(f, {text, mtime: file.lastModified, size: file.size, crlf: !!how.crlf, bom: !!how.bom, enc: how.enc || 'utf-8'});
    fdSaved(f);
  } catch (e) {
    if (w) w.abort().catch(function() {});
    if (dir !== fdDir) return;
    if (e.name === 'NotAllowedError') fdState = 'locked';
    if (e.name === 'NotFoundError') fdState = 'missing';
    buildExDropdown();
    sLog('Could not save ' + name + ' in the folder ' + dir.name + ' (' + (e.message || e.name) + '). The text stays here.', 1);
  }
}

function fdSaved(f) {
  renderTabs();
  folderMarkRows();
  sLog('Saved ' + f.disk.name + ' in the folder ' + fdDir.name + '.', 0);
}

async function fdHandle(dir, name) {
  try { return await dir.getFileHandle(name); }
  catch (e) { if (e.name === 'NotFoundError') return null; throw e; }
}

// === RENAME ===
// From renameFile (app/files/tree.js). A file the folder has is renamed there too:
// with move() where the browser has it, otherwise by writing the same bytes under the
// new name and then removing the old file.
function folderRename(key, n) {
  let f = folderEntry(key), dir = fdDir;
  if (!f || !dir || n === f.disk.name) { buildExDropdown(); return; }
  let bad = /[\\/:*?"<>|]/.test(n) ? n + ' cannot be a file name (no \\ / : * ? " < > |).'
    : dynamicFiles.some(x => x.disk && x !== f && x.disk.name.toLowerCase() === n.toLowerCase()) ? 'The folder already has a file named ' + n + '.' : '';
  if (bad) { sLog(bad, 1); buildExDropdown(); return; }
  let onDisk = f.disk.text !== null, ready = !onDisk || fdState === 'ready';
  (ready ? Promise.resolve(true) : fdPermission(true)).then(function(ok) {
    if (dir !== fdDir) return;
    if (!ok) { sLog('Not renamed: no permission for the folder ' + dir.name + '.', 1); buildExDropdown(); return; }
    if (onDisk) fdState = 'ready';
    fdRun(async function() {
      let old = f.disk && f.disk.name;
      if (!fdStill(dir, f, old)) return;
      if (onDisk) {
        try { await fdMove(dir, old, n); }
        catch (e) {
          if (dir !== fdDir) return;
          if (e.name === 'NotAllowedError') fdState = 'locked';
          if (e.name === 'NotFoundError') fdState = 'missing';
          sLog('Could not rename ' + old + ' in the folder: ' + (e.message || e.name), 1);
          buildExDropdown();
          return;
        }
        // Renamed there even if the folder was stopped meanwhile; the page follows if it can.
        if (!fdStill(dir, f, old)) return;
      }
      fdSetDisk(f, {name: n});
      fdRekey(f, fdKey(n, f.name));
      fbRefocusKey = f.name;
      buildExDropdown(); renderTabs();
      if (activeTabKey === f.name && typeof updateBreadcrumb === 'function') { updateBreadcrumb(f.name); updateStatusBarFileType(); }
      sLog('Renamed ' + old + ' to ' + n + '.', 0);
    });
  });
}

async function fdMove(dir, from, to) {
  if (from === to) return;
  if (from.toLowerCase() !== to.toLowerCase()) {
    if (await fdHandle(dir, to)) throw new Error('the folder already has a file named ' + to);
    return fdMoveOne(dir, from, to);
  }
  // Only the case changes. Windows and macOS see one file under both names, so it goes
  // by a temporary name, and back if the second step fails.
  let tmp = '~' + Date.now().toString(36) + '-' + to;
  await fdMoveOne(dir, from, tmp);
  try { await fdMoveOne(dir, tmp, to); }
  catch (e) { await fdMoveOne(dir, tmp, from).catch(function() {}); throw e; }
}

async function fdMoveOne(dir, from, to) {
  let fh = await dir.getFileHandle(from);
  if (typeof fh.move === 'function') {
    try { await fh.move(to); return; }
    catch (e) { if (e.name === 'NotAllowedError' || e.name === 'NotFoundError') throw e; }
  }
  let th = await dir.getFileHandle(to, {create: true});
  // The same file under another spelling: removing the old name would delete it.
  if (await th.isSameEntry(fh)) throw new Error('this browser cannot rename ' + from + ' to ' + to);
  let bytes = await (await fh.getFile()).arrayBuffer();
  let w = await th.createWritable();
  await w.write(bytes);
  await w.close();
  await dir.removeEntry(from);
}

// === TEXT AND BYTES ===
async function fdRead(file) {
  let d = fdDecode(new Uint8Array(await file.arrayBuffer()));
  d.mtime = file.lastModified; d.size = file.size;
  return d;
}

// UTF-8 when the bytes are valid UTF-8, otherwise Windows-1254 (Turkish Windows; old
// lab files and Notepad before Windows 10). Each byte has its own character there, so
// such a file is written back byte for byte where it was not edited. Also for the
// files of a zip (app/files/zip.js).
function fdDecode(b) {
  let bom = b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF, enc = 'utf-8', text;
  try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bom ? b.subarray(3) : b); }
  catch (e) { text = new TextDecoder('windows-1254').decode(b); enc = 'windows-1254'; bom = false; }
  return {text: text.replace(/\r\n?/g, '\n'), crlf: text.includes('\r\n'), bom, enc};
}

// null when Windows-1254 cannot hold a character of the text.
function fdEncode(text, how) {
  if (how.crlf) text = text.replace(/\n/g, '\r\n');
  if (how.enc === 'windows-1254') {
    if (!fdCp1254) {
      let all = new TextDecoder('windows-1254').decode(Uint8Array.from({length: 256}, (_, i) => i));
      fdCp1254 = new Map(Array.from(all, (c, i) => [c, i]));
    }
    let out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      let v = fdCp1254.get(text[i]);
      if (v === undefined) return null;
      out[i] = v;
    }
    return out;
  }
  let u = new TextEncoder().encode(text);
  if (!how.bom) return u;
  let out = new Uint8Array(u.length + 3);
  out.set([0xEF, 0xBB, 0xBF]);
  out.set(u, 3);
  return out;
}
