// ============================================================
// workbench86 Files Zip: Download all as zip, Load from zip
// ============================================================

// The zip that is downloaded stores its files as they are (no compression): lab files
// are small, and storing needs no compressor in the page. Loading reads stored and
// deflated files. Deflated ones need DecompressionStream('deflate-raw') (Chrome and
// Edge 103, Firefox 113, Safari 16.4); an older browser loads only the stored ones.
const ZIP_NAME = 'workbench86-files.zip';
const ZIP_MAX_SIZE = 64 * 1024 * 1024;   // a larger zip is not read at all
// Code page 857 (Turkish DOS) from 0x80. Windows Explorer writes file names in the DOS
// code page of its language unless the zip marks them as UTF-8.
const ZIP_CP857 = 'ÇüéâäàåçêëèïîıÄÅÉæÆôöòûùİÖÜø£ØŞşáíóúñÑĞğ¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ºªÊËÈ_ÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµ_×ÚÛÙìÿ¯´\u00AD±_¾¶§÷¸°¨·¹³²■\u00A0';
let zipCrcTable = null;

FB_ICONS.zip = '<path d="M1.5 2.5h13v3h-13z" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><path d="M2.5 5.5v8h11v-8M6 8.5h4" fill="none" stroke="currentColor"/>';

// === CRC-32, DOS TIME, NAMES ===
function zipCrc32(b) {
  if (!zipCrcTable) {
    zipCrcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      zipCrcTable[n] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = zipCrcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Local time in two-second steps. The format starts in 1980.
function zipDosTime(d) {
  let y = d.getFullYear();
  if (y < 1980) return {time: 0, date: (1 << 5) | 1};
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

// A name every file manager takes: no \ / : * ? " < > | or control characters, not . or ..
function zipSafe(name) {
  return name.replace(/[\\/:*?"<>|\x00-\x1F]+/g, '_').replace(/^\.+$/, '_');
}

function zipCount(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

function zipList(names) {
  return names.slice(0, 3).join(', ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '');
}

// === DOWNLOAD ALL AS ZIP ===
// Every file of yours under its Explorer folder: My files (a bound folder's files under
// that folder's name, the others under In this browser), generated, and edits to an
// example that has no copy in My files (only while files are not kept, see copyOnEdit).
function zipUserFiles() {
  syncActiveTab();
  let out = [], used = new Set();
  function add(folder, name, text) {
    folder = zipSafe(folder);
    let base = uniqueName(zipSafe(name), n => used.has((folder + '/' + n).toLowerCase()));
    used.add((folder + '/' + base).toLowerCase());
    // Notepad before Windows 10 1809 shows a file with bare LF line ends on one line.
    if (/Windows/.test(navigator.userAgent)) text = text.replace(/\r?\n/g, '\r\n');
    out.push({path: folder + '/' + base, text});
  }
  dynamicFiles.forEach(f => add(folderLabel(f), f.disk ? f.disk.name : f.name, f.content));
  openTabs.forEach(function(t) {
    if (!isUserFile(t.key) && t.content !== fsSource(t.key)) add('edited examples', fileLabel(t.key), t.content);
  });
  return out;
}

// Stored entries with UTF-8 text. Bit 11 marks a name that is not plain ASCII as UTF-8.
function zipBuild(files, when) {
  let enc = new TextEncoder(), t = zipDosTime(when || new Date()), size = 22;
  let items = files.map(function(f) {
    let name = enc.encode(f.path), data = enc.encode(f.text);
    size += 30 + 46 + 2 * name.length + data.length;
    return {name, data, crc: zipCrc32(data), flags: /[^\x00-\x7F]/.test(f.path) ? 0x0800 : 0};
  });
  let out = new Uint8Array(size), v = new DataView(out.buffer), p = 0;
  function u16(x) { v.setUint16(p, x, true); p += 2; }
  function u32(x) { v.setUint32(p, x, true); p += 4; }
  function bytes(b) { out.set(b, p); p += b.length; }
  // From "version needed" to "extra field length": the same in both headers.
  function common(it) {
    u16(20); u16(it.flags); u16(0); u16(t.time); u16(t.date);
    u32(it.crc); u32(it.data.length); u32(it.data.length); u16(it.name.length); u16(0);
  }
  items.forEach(function(it) {
    it.offset = p;
    u32(0x04034B50); common(it); bytes(it.name); bytes(it.data);
  });
  let cd = p;
  items.forEach(function(it) {
    u32(0x02014B50); u16(20); common(it);
    u16(0); u16(0); u16(0); u32(0); u32(it.offset);   // comment, disk, attributes, offset
    bytes(it.name);
  });
  let cdSize = p - cd;
  u32(0x06054B50); u16(0); u16(0); u16(items.length); u16(items.length); u32(cdSize); u32(cd); u16(0);
  return out;
}

function downloadAllZip() {
  let files = zipUserFiles();
  if (!files.length) { sLog('Nothing to download yet: My files is empty.', 1); return; }
  let a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([zipBuild(files)], {type: 'application/zip'}));
  a.download = ZIP_NAME;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 2000);
  // As after Download: the dot shows changes since. For a file of a bound folder it
  // means "not saved in the folder", which a zip does not change.
  openTabs.forEach(function(t) { if (!isFolderFile(t.key)) t.dirty = false; });
  renderTabs();
  sLog('Downloaded ' + ZIP_NAME + ' with ' + zipCount(files.length, 'file') + ' (see your browser downloads).', 0);
}

// === LOAD FROM ZIP ===
function loadZipFile(input) {
  let file = input.files[0];
  input.value = '';
  if (file) zipImport(file);
}

async function zipImport(file) {
  if (file.size > ZIP_MAX_SIZE) { sLog(file.name + ' is too large to load here (over 64 MB).', 1); return; }
  let r;
  try { r = await zipRead(new Uint8Array(await file.arrayBuffer())); }
  catch (e) { sLog(file.name + ' cannot be read: it is not a zip file, or it is damaged.', 1); return; }
  zipAdd(r, file.name);
}

// The text files the editor opens, and what was left out: other files (skipped), damaged,
// encrypted or too large ones (unreadable), deflated ones this browser cannot unpack.
async function zipRead(b) {
  let r = {files: [], skipped: [], unreadable: [], packed: 0, more: false};
  let inflate = zipCanInflate();
  for (let x of zipEntries(b)) {
    let path = x.name.replace(/\\/g, '/'), base = path.slice(path.lastIndexOf('/') + 1);
    // Folders, and what macOS and Windows add by themselves (__MACOSX/, .DS_Store, ._name)
    if (!base || base[0] === '.' || /(^|\/)__MACOSX\//.test(path)) continue;
    if (!FD_TYPES.test(base)) { r.skipped.push(base); continue; }
    if ((x.flags & 1) || (x.method !== 0 && x.method !== 8) || x.size > FD_MAX_SIZE) { r.unreadable.push(base); continue; }
    if (x.method === 8 && !inflate) { r.packed++; continue; }
    if (r.files.length >= FD_MAX_FILES) { r.more = true; continue; }
    let data = await zipData(b, x);
    if (!data) r.unreadable.push(base);
    else if (data.includes(0)) r.skipped.push(base);   // a binary file with a text file's name
    else r.files.push({name: zipSafe(base), text: fdDecode(data).text});
  }
  return r;
}

function zipCanInflate() {
  try { new DecompressionStream('deflate-raw'); return true; } catch (e) { return false; }
}

// The central directory at the end of the file (zip64 included) lists every entry.
function zipEntries(b) {
  let v = new DataView(b.buffer, b.byteOffset, b.byteLength), u64 = p => v.getUint32(p, true) + v.getUint32(p + 4, true) * 0x100000000;
  let e = b.length - 22, stop = Math.max(0, e - 0xFFFF);   // the zip comment is at most 64 KB
  while (e >= stop && v.getUint32(e, true) !== 0x06054B50) e--;
  if (e < stop) throw new Error('no end of central directory');
  let count = v.getUint16(e + 10, true), at = v.getUint32(e + 16, true);
  if ((count === 0xFFFF || at === 0xFFFFFFFF) && e >= 20 && v.getUint32(e - 20, true) === 0x07064B50) {
    let z = u64(e - 12);
    if (v.getUint32(z, true) !== 0x06064B50) throw new Error('damaged zip64 record');
    count = u64(z + 32); at = u64(z + 48);
  }
  let list = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > b.length || v.getUint32(at, true) !== 0x02014B50) throw new Error('damaged central directory');
    let nl = v.getUint16(at + 28, true), xl = v.getUint16(at + 30, true), cl = v.getUint16(at + 32, true);
    let x = {flags: v.getUint16(at + 8, true), method: v.getUint16(at + 10, true), crc: v.getUint32(at + 16, true),
      csize: v.getUint32(at + 20, true), size: v.getUint32(at + 24, true), offset: v.getUint32(at + 42, true),
      name: zipName(b.subarray(at + 46, at + 46 + nl))};
    // Zip64 extra field: the 64-bit values, in this order, of the fields set to 0xFFFFFFFF.
    for (let p = at + 46 + nl, end = p + xl; p + 4 <= end; p += 4 + v.getUint16(p + 2, true)) {
      if (v.getUint16(p, true) !== 1) continue;
      let q = p + 4;
      ['size', 'csize', 'offset'].forEach(function(k) { if (x[k] === 0xFFFFFFFF && q + 8 <= end) { x[k] = u64(q); q += 8; } });
    }
    list.push(x);
    at += 46 + nl + xl + cl;
  }
  return list;
}

// UTF-8 when the bytes are UTF-8, otherwise code page 857. macOS writes names decomposed.
function zipName(raw) {
  let s;
  try { s = new TextDecoder('utf-8', {fatal: true}).decode(raw); }
  catch (e) { s = Array.from(raw, c => c < 0x80 ? String.fromCharCode(c) : ZIP_CP857[c - 0x80]).join(''); }
  return s.normalize('NFC');
}

// The bytes of an entry, or null when they do not match its size and CRC-32.
async function zipData(b, x) {
  let v = new DataView(b.buffer, b.byteOffset, b.byteLength), p = x.offset;
  if (p + 30 > b.length || v.getUint32(p, true) !== 0x04034B50) return null;
  p += 30 + v.getUint16(p + 26, true) + v.getUint16(p + 28, true);   // its own name and extra field
  if (p + x.csize > b.length) return null;
  let raw = b.subarray(p, p + x.csize);
  let data = x.method === 0 ? raw : await zipInflate(raw, FD_MAX_SIZE);
  return data && data.length === x.size && zipCrc32(data) === x.crc ? data : null;
}

// Stops at `max` bytes, so a file that unpacks to gigabytes costs nothing.
async function zipInflate(raw, max) {
  let reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  let parts = [], n = 0;
  try {
    for (;;) {
      let c = await reader.read();
      if (c.done) break;
      n += c.value.length;
      if (n > max) { reader.cancel().catch(function() {}); return null; }
      parts.push(c.value);
    }
  } catch (e) { return null; }
  let out = new Uint8Array(n), p = 0;
  parts.forEach(function(c) { out.set(c, p); p += c.length; });
  return out;
}

// Into My files, as New would put them (in a bound folder they wait for Ctrl+S there).
// A file My files already has with the same name and text is not added again.
function zipAdd(r, zipFile) {
  syncActiveTab();
  let bound = folderBound();
  let mine = bound ? folderFiles() : dynamicFiles.filter(f => f.folder === 'local');
  let added = [], renamed = [], same = 0;
  r.files.forEach(function(z) {
    if (mine.some(f => (f.disk ? f.disk.name : f.name) === z.name && f.content === z.text)) { same++; return; }
    let f = {name: uniqueName(z.name, fsNameTaken), content: z.text, folder: 'local'};
    folderAdopt(f);   // what addDynamicFile does, without rebuilding the tree for each file
    dynamicFiles.push(f); mine.push(f); added.push(f);
    if (f.name !== z.name) renamed.push(f.name);
  });
  let left = [], skip = r.skipped.length, bad = r.unreadable.length;
  if (skip) left.push(zipCount(skip, 'file') + (skip === 1 ? ' that is not a text file' : ' that are not text files') +
    ' the editor opens (' + zipList(r.skipped) + ')');
  if (bad) left.push(zipCount(bad, 'file') + (bad === 1 ? ' that is' : ' that are') + ' damaged, encrypted or too large (' + zipList(r.unreadable) + ')');
  if (r.packed) left.push(zipCount(r.packed, 'compressed file') + ': this browser cannot unpack ' + (r.packed === 1 ? 'it' : 'them') +
    '. Chrome, Edge, Firefox and Safari 16.4 or newer can');
  let note = ((left.length ? 'Left out of ' + zipFile + ': ' + left.join('; ') + '.' : '') +
    (r.more ? ' Only the first ' + FD_MAX_FILES + ' files were loaded.' : '')).trim();
  if (!added.length) {
    if (same && !note) sLog('Nothing new in ' + zipFile + ': My files already has ' + (same === 1 ? 'its file.' : 'all ' + same + ' of its files.'), 0);
    else sLog((same ? zipFile + ' has nothing new for My files. ' : 'No file loaded from ' + zipFile + '. ') +
      (note || 'It holds no file the editor opens.'), 1);
    return;
  }
  buildExDropdown(); scheduleAutosave();
  openFileInTab(added[0].name, added[0].content);
  if (note) fsNotice(note);
  sLog('Loaded ' + zipCount(added.length, 'file') + ' from ' + zipFile + ' into My files' +
    (bound ? ' (Ctrl+S saves each one in the folder ' + fdDir.name + ')' : '') + '.' +
    (renamed.length ? ' New names where the name was taken: ' + zipList(renamed) + '.' : '') +
    (same ? ' ' + zipCount(same, 'file') + (same === 1 ? ' was' : ' were') + ' already there.' : '') +
    (note ? ' Some were left out, see the note above the editor.' : ''), 0);
}

// === EXPLORER ===
// From folderDecorate (app/files/folder.js), on the My files row in every browser: one
// button for both, so the row keeps room for the name of a bound folder and its buttons.
function zipActs(act) {
  act('zip', 'Download all as zip, or load files from a zip', zipMenu);
}

// The two actions in a menu under that button.
function zipMenu(e) {
  let r = e.currentTarget.getBoundingClientRect();
  hideCtxMenu();
  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  zipMenuItems(function(label, fn) {
    let item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = label;
    item.addEventListener('click', function() { hideCtxMenu(); fn(); });
    ctxMenu.appendChild(item);
  });
  document.body.appendChild(ctxMenu);
  ctxMenu.style.left = Math.max(4, Math.min(r.left, window.innerWidth - ctxMenu.offsetWidth - 4)) + 'px';
  ctxMenu.style.top = (r.bottom + 2) + 'px';
}

// Also from the Explorer's context menu (app/files/tree.js).
function zipMenuItems(addItem) {
  addItem('Download all as zip', downloadAllZip);
  addItem('Load files from a zip...', function() { document.getElementById('openZip').click(); });
}
