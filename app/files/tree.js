// ============================================================
// workbench86 Files Tree: File browser tree, context menus,
// extra files, inline editing
// ============================================================

const EXTRA_FILES = [
  { folder: 'c', name: 'led_blink.c', content: '/* LED blink: workbench86 pseudo-C\n * This is educational pseudo-code.\n * Use "Translate to ASM" to convert to 8086 Assembly.\n */\n#include <workbench86.h>\n\nvoid main() {\n    port_init(PORT2, OUTPUT);\n    unsigned char val = 0x01;\n    while (1) {\n        outport(PORT2, val);\n        delay_ms(500);\n        val = (val << 1) | (val >> 7);\n    }\n}' },
  { folder: 'python', name: 'counter.py', content: '# Binary counter on D0-D7 LEDs\n# workbench86 pseudo-Python, educational\n# Use "Translate to ASM" to convert to 8086 Assembly\nfrom workbench86 import *\n\ndef main():\n    port_init(PORT2, OUTPUT)\n    i = 0\n    while True:\n        outport(PORT2, i)\n        delay_ms(200)\n        i = i + 1' },
  { folder: 'go', name: 'chase.go', content: '// LED chase: rotating light on D0-D7\n// workbench86 pseudo-Go, educational\n// Use "Translate to ASM" to convert to 8086 Assembly\npackage main\n\nimport "workbench86"\n\nfunc main() {\n    portInit(PORT2, OUTPUT)\n    val := 0x01\n    for {\n        outport(PORT2, val)\n        delayMs(300)\n        val = (val << 1) | (val >> 7)\n    }\n}' },
  { folder: 'java', name: 'blink.java', content: '// LED blink on/off cycle\n// workbench86 pseudo-Java, educational\n// Use "Translate to ASM" to convert to 8086 Assembly\nimport workbench86.*;\n\npublic class Blink {\n    public static void main(String[] args) {\n        portInit(PORT2, OUTPUT);\n        while (true) {\n            outport(PORT2, 0xFF);\n            delayMs(500);\n            outport(PORT2, 0x00);\n            delayMs(500);\n        }\n    }\n}' },
  { folder: 'cpp', name: 'counter.cpp', content: '// Binary counter with C++\n// workbench86 pseudo-C++, educational\n// Use "Translate to ASM" to convert to 8086 Assembly\n#include <workbench86.h>\n\nint main() {\n    port_init(PORT2, OUTPUT);\n    for (uint8_t i = 0; ; i++) {\n        outport(PORT2, i);\n        delay_ms(200);\n    }\n}' },
  { folder: 'asm', name: 'led_blink.asm', content: '; LED blink: all D0-D7 LEDs on, delay, off, EXIT\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        ; MUART init\n        MOV     AL,0FFH\n        OUT     UCRREG1,AL\n        OUT     UCRREG2,AL\n        OUT     UCRREG3,AL\n        OUT     UMODEREG,AL\n        OUT     UPORT1CTL,AL\n        ; LEDs on\n        MOV     AL,0FFH\n        OUT     UPORT2,AL\n        ; Delay\n        MOV     CX,0FFFFH\nWAIT1:  NOP\n        LOOP    WAIT1\n        ; LEDs off\n        MOV     AL,00H\n        OUT     UPORT2,AL\n        MOV     AH,EXIT\n        INT     28H' },
  { folder: 'asm', name: 'knight_rider.asm', content: '; LED Knight Rider: bouncing pattern D0-D7-D0 on Port 2\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        ; MUART init\n        MOV     AL,0FFH\n        OUT     UCRREG1,AL\n        OUT     UCRREG2,AL\n        OUT     UCRREG3,AL\n        OUT     UMODEREG,AL\n        OUT     UPORT1CTL,AL\nAGAIN:  ; Shift left D0 to D7\n        MOV     BL,01H\n        MOV     DL,8\nSLEFT:  MOV     AL,BL\n        OUT     UPORT2,AL\n        MOV     CX,0FFFFH\nDLY1:   NOP\n        LOOP    DLY1\n        SHL     BL,1\n        DEC     DL\n        JNZ     SLEFT\n        ; Shift right D7 to D0\n        MOV     BL,80H\n        MOV     DL,8\nSRIGHT: MOV     AL,BL\n        OUT     UPORT2,AL\n        MOV     CX,0FFFFH\nDLY2:   NOP\n        LOOP    DLY2\n        SHR     BL,1\n        DEC     DL\n        JNZ     SRIGHT\n        JMP     AGAIN' },
  { folder: 'asm', name: 'fibonacci.asm', content: '; Calculate first 10 Fibonacci numbers, store at DS:3000H\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        MOV     SI,3000H\n        MOV     CX,10\n        MOV     AL,00H\n        MOV     BL,01H\n        MOV     [SI],AL\n        INC     SI\n        DEC     CX\n        MOV     [SI],BL\n        INC     SI\n        DEC     CX\nNXTFIB: MOV     DL,AL\n        ADD     DL,BL\n        MOV     [SI],DL\n        MOV     AL,BL\n        MOV     BL,DL\n        INC     SI\n        LOOP    NXTFIB\n        MOV     AH,EXIT\n        INT     28H' }
];

// === ICONS ===
// 16px inline SVG, so they look the same on every OS (no font glyphs). 1px strokes on
// .5 coordinates land on whole pixels at 96 DPI.
const FB_ICONS = {
  chevron: '<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  folder: '<path d="M1.5 3.5h4.5l1.5 1.5h7v8.5h-13z" fill="currentColor" fill-opacity=".3" stroke="currentColor"/>',
  folderOpen: '<path d="M1.5 13.5v-10h4.5l1.5 1.5h5.5v2" fill="none" stroke="currentColor"/><path d="M1.5 13.5l2.5-6h11l-2.5 6z" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-linejoin="round"/>',
  asm: '<rect x="4.5" y="4.5" width="7" height="7" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><path d="M6.5 2v2M9.5 2v2M6.5 12v2M9.5 12v2M2 6.5h2M2 9.5h2M12 6.5h2M12 9.5h2" stroke="currentColor"/>',
  code: '<path d="M3.5 1.5h6l3 3v10h-9z" fill="none" stroke="currentColor"/><path d="M7 8l-1.5 1.5L7 11M9 8l1.5 1.5L9 11" fill="none" stroke="currentColor"/>',
  text: '<path d="M3.5 1.5h6l3 3v10h-9z" fill="none" stroke="currentColor"/><path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" stroke="currentColor"/>',
  newFile: '<path d="M3.5 1.5h6l3 3v10h-9z" fill="none" stroke="currentColor"/><path d="M8.5 7v5M6 9.5h5" stroke="currentColor"/>',
  download: '<path d="M8 1.5V10M4.5 7L8 10.5 11.5 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 11v2.5h11V11" fill="none" stroke="currentColor"/>',
  rename: '<path d="M10.5 2.5l3 3-7.5 7.5H2.5v-3.5z" fill="none" stroke="currentColor" stroke-linejoin="round"/>',
  trash: '<path d="M2.5 4.5h11M6.5 4.5v-2h3v2M4.5 4.5l.5 9h6l.5-9" fill="none" stroke="currentColor" stroke-linejoin="round"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" fill="none" stroke="currentColor"/><path d="M3.5 10.5h-1v-8h8v1" fill="none" stroke="currentColor"/>'
};
function svgIcon(name) {
  return '<svg class="ico" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' + (FB_ICONS[name] || FB_ICONS.text) + '</svg>';
}
// Icon placeholders in index.html (Explorer toolbar, welcome screen)
document.querySelectorAll('[data-icon]').forEach(function(el) { el.outerHTML = svgIcon(el.getAttribute('data-icon')); });

// Row to give keyboard focus to after the next rebuild (a renamed file's new name)
let fbRefocusKey = null;

function buildExDropdown() {
  let langFolders = {};
  for (let ef of EXTRA_FILES) {
    if (!langFolders[ef.folder]) langFolders[ef.folder] = [];
    langFolders[ef.folder].push(ef);
  }

  let dynFolders = {};
  for (let df of dynamicFiles) {
    if (!dynFolders[df.folder]) dynFolders[df.folder] = [];
    dynFolders[df.folder].push(df);
  }

  // My files first, then the examples by manifest category and order, then the
  // pseudo-language samples and generated files. While My files is a folder on this
  // computer (app/files/folder.js), the files kept in this browser follow it.
  let bound = folderBound();
  let folders = [
    { name: 'My files', dynamics: bound ? folderFiles() : (dynFolders.local || []), user: true },
    { name: 'assignments', keys: [] },
    { name: 'demos', keys: [] },
    { name: 'hardware', keys: [] },
    { name: 'scripts', keys: [] },
    { name: 'languages', children: [] }
  ];
  let meta = typeof EX_META !== 'undefined' ? EX_META : {};
  let byCat = { assignments: folders[1], demos: folders[2], hardware: folders[3], scripts: folders[4] };
  let order = Object.keys(meta).length ? Object.keys(meta) : Object.keys(EX);
  for (let k of order) {
    if (EX[k] === undefined) continue;
    let cat = meta[k] ? meta[k].category : (k.startsWith('PA') ? 'assignments' : k.startsWith('HW:') ? 'hardware' : 'demos');
    (byCat[cat] || folders[2]).keys.push(k);
  }

  for (let lang of Object.keys(langFolders)) {
    folders[5].children.push({ name: lang, extras: langFolders[lang] });
  }

  for (let fn of Object.keys(dynFolders)) {
    if (fn !== 'local' && fn !== 'disk') folders.push({ name: fn, dynamics: dynFolders[fn] });
  }
  if (bound && dynFolders.local) folders.splice(1, 0, { name: FD_BROWSER, dynamics: dynFolders.local });

  let tree = document.getElementById('fbTree');
  if (!tree) return;
  // Keep open folders, and keyboard focus, across the rebuild. My files starts open.
  let openFolders = new Set();
  if (!tree.querySelector('.fb-folder')) openFolders.add('My files');
  tree.querySelectorAll('.fb-folder').forEach(f => {
    let items = f.querySelector('.fb-folder-items');
    if (items && !items.classList.contains('collapsed')) openFolders.add(f.getAttribute('data-folder'));
  });
  let focusRow = tree.contains(document.activeElement) ? document.activeElement.closest('.fb-file, .fb-folder-hd') : null;
  let refocus = fbRefocusKey || (focusRow && (focusRow.getAttribute('data-key') || focusRow.parentElement.getAttribute('data-folder')));
  let hadFocus = fbRefocusKey !== null || tree.contains(document.activeElement);
  fbRefocusKey = null;
  tree.innerHTML = '';

  function getFileIcon(name) {
    let ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'asm';
    let icon = ({asm:'asm', inc:'asm', c:'code', cpp:'code', py:'code', java:'code', go:'code'})[ext] || 'text';
    let classes = {asm:'fb-icon-asm',inc:'fb-icon-asm',c:'fb-icon-c',cpp:'fb-icon-cpp',py:'fb-icon-py',go:'fb-icon-go',java:'fb-icon-java',txt:'fb-icon-file'};
    return {icon, cls: classes[ext] || 'fb-icon-file'};
  }

  function makeFileEl(key, label, clickFn, user) {
    let file = document.createElement('div');
    file.className = 'fb-file';
    file.setAttribute('data-key', key);
    file.setAttribute('role', 'treeitem');
    file.tabIndex = -1;
    file.title = key === label ? label : key + '  (' + label + ')';
    let fi = getFileIcon(label);
    let icon = document.createElement('span');
    icon.className = 'fb-icon ' + fi.cls;
    icon.innerHTML = svgIcon(fi.icon);
    file.appendChild(icon);
    let span = document.createElement('span');
    span.className = 'fb-name';
    span.textContent = label;
    file.appendChild(span);
    // Row buttons: shown on hover and keyboard focus. Tab reaches them from the focused row.
    let acts = document.createElement('span');
    acts.className = 'fb-acts';
    function act(ic, tip, fn) {
      let b = document.createElement('button');
      b.type = 'button'; b.className = 'fb-act'; b.tabIndex = -1;
      b.title = tip; b.setAttribute('aria-label', tip + ': ' + label);
      b.innerHTML = svgIcon(ic);
      b.addEventListener('click', function(e) { e.stopPropagation(); fn(); });
      acts.appendChild(b);
    }
    if (user) {
      act('rename', 'Rename (F2)', function() { renameFile(key); });
      if (!folderOnDisk(key)) act('trash', 'Delete (Del)', function() { deleteFile(key); });
    } else {
      act('copy', 'Make an editable copy in My files', function() { duplicateFile(key); });
    }
    act('download', 'Download to this computer', function() { downloadFile(key); });
    file.appendChild(acts);
    file.addEventListener('click', function() {
      if (activeFileEl) activeFileEl.classList.remove('active');
      file.classList.add('active'); activeFileEl = file;
      clickFn();
    });
    return file;
  }

  function makeFolder(folder, depth, parentPath) {
    depth = depth || 0;
    let path = parentPath ? parentPath + '/' + folder.name : folder.name;
    let div = document.createElement('div');
    div.className = 'fb-folder';
    div.setAttribute('data-folder', path);

    let hd = document.createElement('div');
    hd.className = 'fb-folder-hd';
    hd.setAttribute('role', 'treeitem');
    hd.tabIndex = -1;
    hd.style.paddingLeft = (6 + depth * 16) + 'px';
    let arrow = document.createElement('span');
    arrow.className = 'fb-arrow';
    arrow.innerHTML = svgIcon('chevron');
    let folderIcon = document.createElement('span');
    folderIcon.className = 'fb-icon fb-icon-folder';
    let name = document.createElement('span');
    name.className = 'fb-name';
    name.textContent = folder.name;
    hd.appendChild(arrow);
    hd.appendChild(folderIcon);
    hd.appendChild(name);

    let items = document.createElement('div');
    items.className = 'fb-folder-items';

    function setOpen(open) {
      items.classList.toggle('collapsed', !open);
      arrow.classList.toggle('open', open);
      folderIcon.innerHTML = svgIcon(open ? 'folderOpen' : 'folder');
      hd.setAttribute('aria-expanded', String(open));
    }
    setOpen(openFolders.has(path));
    hd.addEventListener('click', function() { setOpen(items.classList.contains('collapsed')); });

    let filePad = (26 + depth * 16) + 'px';
    if (folder.keys) {
      folder.keys.forEach(k => {
        let file = makeFileEl(k, fileLabel(k), function() { loadExByKey(k, file); });
        file.style.paddingLeft = filePad;
        items.appendChild(file);
      });
    }

    if (folder.extras) {
      folder.extras.forEach(ef => {
        let file = makeFileEl(ef.name, ef.name, function() {
          openFileInTab(ef.name, ef.content, file);
        });
        file.style.paddingLeft = filePad;
        items.appendChild(file);
      });
    }

    if (folder.dynamics) {
      folder.dynamics.forEach(df => {
        let file = makeFileEl(df.name, df.disk ? df.disk.name : df.name, function() {
          openFileInTab(df.name, df.content, file);
        }, true);
        file.style.paddingLeft = filePad;
        items.appendChild(file);
      });
      if (folder.user && !folder.dynamics.length) {
        let empty = document.createElement('div');
        empty.className = 'fb-empty';
        empty.textContent = 'Your files go here. Use New or Open above.';
        items.appendChild(empty);
      }
    }

    if (folder.children) {
      folder.children.forEach(child => {
        items.appendChild(makeFolder(child, depth + 1, path).el);
      });
    }

    div.appendChild(hd);
    div.appendChild(items);
    return { el: div };
  }

  folders.forEach(f => { let r = makeFolder(f, 0); tree.appendChild(r.el); });
  folderDecorate(tree);

  if (activeTabKey) highlightFileInTree(activeTabKey);
  if (hadFocus && refocus) {
    let el = tree.querySelector('.fb-file[data-key="' + CSS.escape(refocus) + '"]') ||
             tree.querySelector('.fb-folder[data-folder="' + CSS.escape(refocus) + '"] > .fb-folder-hd');
    if (el && el.getClientRects().length) el.focus({ preventScroll: true });
  }
}

function setAllFolders(open) {
  document.querySelectorAll('#fbTree .fb-folder-hd').forEach(hd => {
    let isOpen = !hd.nextElementSibling.classList.contains('collapsed');
    if (isOpen !== open) hd.click();
  });
}

// === INLINE EDITING ===
function startInlineEdit(el, currentName, callback) {
  let input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'fb-inline-input';
  input.setAttribute('aria-label', 'New name for ' + currentName);
  input.style.cssText = 'font:var(--fs-md) var(--mono);padding:1px 4px;border:1px solid var(--blu);border-radius:var(--r);background:var(--bg);color:var(--text);width:100%;outline:none;box-sizing:border-box';
  let row = el.closest('.fb-file');
  if (row) row.classList.add('fb-editing');
  el.textContent = '';
  el.appendChild(input);
  input.focus();
  let dot = currentName.lastIndexOf('.');
  if (dot > 0) input.setSelectionRange(0, dot); else input.select();
  // Enter removes the box, which can also fire blur; commit only once.
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    let val = input.value.trim();
    if (val && val !== currentName) callback(val);
    else buildExDropdown();
  }
  input.addEventListener('click', function(e) { e.stopPropagation(); });
  input.addEventListener('keydown', function(e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); done = true; buildExDropdown(); }
  });
  input.addEventListener('blur', commit);
}

function startNewFileInline(tree, callback) {
  let input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'filename.asm';
  input.className = 'fb-inline-input';
  input.setAttribute('aria-label', 'Name of the new file');
  input.style.cssText = 'font:var(--fs-md) var(--mono);padding:2px 6px;margin:2px 8px 2px 26px;border:1px solid var(--blu);border-radius:var(--r);background:var(--bg);color:var(--text);width:calc(100% - 34px);outline:none;box-sizing:border-box';
  // The box goes where the file will be: at the top of My files.
  let mine = tree.querySelector('.fb-folder[data-folder="My files"]');
  let items = mine && mine.querySelector('.fb-folder-items');
  if (items) {
    if (items.classList.contains('collapsed')) items.previousElementSibling.click();
    items.insertBefore(input, items.firstChild);
  } else {
    tree.insertBefore(input, tree.firstChild);
  }
  input.scrollIntoView({block: 'nearest'});
  input.focus();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    let val = input.value.trim();
    input.remove();
    if (val) callback(val);
  }
  input.addEventListener('click', function(e) { e.stopPropagation(); });
  input.addEventListener('keydown', function(e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); done = true; input.remove(); }
  });
  input.addEventListener('blur', commit);
}

// === FILE BROWSER CONTEXT MENU ===
let ctxMenu = null;
function hideCtxMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
document.addEventListener('click', hideCtxMenu);
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') hideCtxMenu(); });
document.addEventListener('contextmenu', function(e) {
  let tree = document.getElementById('fbTree');
  if (!tree || !tree.contains(e.target)) return;
  if (e.target.closest('.fb-inline-input')) return;
  e.preventDefault();
  hideCtxMenu();

  let fileEl = e.target.closest('.fb-file');

  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';

  function addItem(label, fn, disabled) {
    let item = document.createElement('div');
    item.className = 'ctx-item' + (disabled ? ' disabled' : '');
    item.textContent = label;
    if (!disabled) item.addEventListener('click', function() { hideCtxMenu(); fn(); });
    ctxMenu.appendChild(item);
  }
  function addSep() { let s = document.createElement('div'); s.className = 'ctx-sep'; ctxMenu.appendChild(s); }

  if (fileEl) {
    let key = fileEl.getAttribute('data-key');
    let user = isUserFile(key);
    addItem('Open', function() { fileEl.click(); });
    addItem('Download', function() { downloadFile(key); });
    addSep();
    addItem(user ? 'Duplicate' : 'Make an editable copy', function() { duplicateFile(key); });
    if (user) {
      addItem('Rename (F2)', function() { renameFile(key); });
      if (!folderOnDisk(key)) addItem('Delete (Del)', function() { deleteFile(key); });
    }
    addSep();
    addItem('Copy content', function() {
      navigator.clipboard.writeText(getFileContent(key))
        .then(() => sLog('Copied: ' + fileLabel(key), 0))
        .catch(() => sLog('Copy failed.', 1));
    });
  } else {
    addItem('New file', newEmptyFile);
    addItem('Open file from this computer...', function() { document.getElementById('openFile').click(); });
    zipMenuItems(addItem);
    folderMenuItems(addItem);
    addSep();
    addItem('Collapse All', function() { setAllFolders(false); });
    addItem('Expand All', function() { setAllFolders(true); });
  }

  document.body.appendChild(ctxMenu);
  let rect = ctxMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) ctxMenu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) ctxMenu.style.top = (window.innerHeight - rect.height - 4) + 'px';
});

function newEmptyFile() {
  let tree = document.getElementById('fbTree');
  startNewFileInline(tree, function(name) {
    if (!name) return;
    if (!name.includes('.')) name += '.asm';
    if (nameTaken(name)) { sLog(name + ' already exists. Choose another name.', 1); return; }
    let content = '; ' + name + '\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n\n';
    addDynamicFile(name, content, 'local');
    openFileInTab(name, content);
    ed.focus();
    ed.selectionStart = ed.selectionEnd = ed.value.length;
  });
}

// === FILE ACTIONS (row buttons, context menu, keyboard) ===
function nameTaken(n) {
  return isUserFile(n) || folderHas(n) || EXTRA_FILES.some(f => f.name === n) || Object.keys(EX).some(k => k === n || fileLabel(k) === n);
}
// `taken` replaces nameTaken where a looser rule applies (copy on edit, app/files/save.js).
function uniqueName(name, taken) {
  taken = taken || nameTaken;
  if (!taken(name)) return name;
  let d = name.lastIndexOf('.'), base = d > 0 ? name.slice(0, d) : name, ext = d > 0 ? name.slice(d) : '';
  for (let i = 2; ; i++) if (!taken(base + '-' + i + ext)) return base + '-' + i + ext;
}

function duplicateFile(key) {
  let user = isUserFile(key);
  let name = uniqueName(user ? (isFolderFile(key) ? fileLabel(key) : key) : 'my-' + fileLabel(key));
  let content = getFileContent(key);
  addDynamicFile(name, content, 'local');
  openFileInTab(name, content);
  sLog('Copied to My files as ' + name + '.' + (user ? '' : ' The example itself stays unchanged.'), 0);
}

function renameFile(key) {
  if (!isUserFile(key)) { sLog('Examples cannot be renamed. Make an editable copy first.', 1); return; }
  let row = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
  if (!row) return;
  let inFolder = isFolderFile(key);
  startInlineEdit(row.querySelector('.fb-name'), inFolder ? fileLabel(key) : key, function(n) {
    if (!n.includes('.')) n += '.asm';
    if (inFolder) { folderRename(key, n); return; }   // renamed in the folder too
    if (n === key) { buildExDropdown(); return; }
    if (nameTaken(n)) { sLog('A file named ' + n + ' already exists.', 1); buildExDropdown(); return; }
    syncActiveTab();
    dynamicFiles.find(f => f.name === key).name = n;
    let tab = openTabs.find(t => t.key === key);
    if (tab) tab.key = n;
    if (activeTabKey === key) activeTabKey = n;
    fbRefocusKey = n;
    buildExDropdown(); renderTabs(); scheduleAutosave();
    if (activeTabKey === n) {
      if (typeof updateBreadcrumb === 'function') updateBreadcrumb(n);
      if (typeof updateStatusBarFileType === 'function') updateStatusBarFileType();
    }
    sLog('Renamed ' + key + ' to ' + n + '.', 0);
  });
}

function deleteFile(key) {
  if (!isUserFile(key)) { sLog('Examples cannot be deleted.', 1); return; }
  if (folderOnDisk(key)) { sLog(fileLabel(key) + ' is in the folder ' + fdDir.name + ' on this computer. Delete it there, in Explorer or Finder; My files follows.', 1); return; }
  if (!confirm('Delete ' + key + ' from My files?\nThis cannot be undone. Download it first if you need it.')) return;
  // Keyboard focus moves to the next row (or the folder) instead of being lost
  let row = document.querySelector('.fb-file[data-key="' + CSS.escape(key) + '"]');
  if (row && row.contains(document.activeElement)) {
    let near = row.nextElementSibling || row.previousElementSibling;
    fbRefocusKey = near && near.classList.contains('fb-file') ? near.getAttribute('data-key') : 'My files';
  }
  closeTab(key);   // before removing the file, so closing does not ask about unsaved edits
  dynamicFiles = dynamicFiles.filter(f => f.name !== key);
  buildExDropdown(); scheduleAutosave();
  sLog('Deleted ' + key + '.', 0);
}
