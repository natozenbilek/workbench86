// ============================================================
// workbench86 Files Tree - File browser tree, context menus,
// extra files, inline editing
// ============================================================

const EXTRA_FILES = [
  { folder: 'c', name: 'led_blink.c', content: '/* LED blink \u2014 workbench86 pseudo-C\n * This is educational pseudo-code.\n * Use "Translate to ASM" to convert to 8086 Assembly.\n */\n#include <workbench86.h>\n\nvoid main() {\n    port_init(PORT2, OUTPUT);\n    unsigned char val = 0x01;\n    while (1) {\n        outport(PORT2, val);\n        delay_ms(500);\n        val = (val << 1) | (val >> 7);\n    }\n}' },
  { folder: 'python', name: 'counter.py', content: '# Binary counter on D0-D7 LEDs\n# workbench86 pseudo-Python \u2014 educational\n# Use "Translate to ASM" to convert to 8086 Assembly\nfrom workbench86 import *\n\ndef main():\n    port_init(PORT2, OUTPUT)\n    i = 0\n    while True:\n        outport(PORT2, i)\n        delay_ms(200)\n        i = i + 1' },
  { folder: 'go', name: 'chase.go', content: '// LED chase \u2014 rotating light on D0-D7\n// workbench86 pseudo-Go \u2014 educational\n// Use "Translate to ASM" to convert to 8086 Assembly\npackage main\n\nimport "workbench86"\n\nfunc main() {\n    portInit(PORT2, OUTPUT)\n    val := 0x01\n    for {\n        outport(PORT2, val)\n        delayMs(300)\n        val = (val << 1) | (val >> 7)\n    }\n}' },
  { folder: 'java', name: 'blink.java', content: '// LED blink on/off cycle\n// workbench86 pseudo-Java \u2014 educational\n// Use "Translate to ASM" to convert to 8086 Assembly\nimport workbench86.*;\n\npublic class Blink {\n    public static void main(String[] args) {\n        portInit(PORT2, OUTPUT);\n        while (true) {\n            outport(PORT2, 0xFF);\n            delayMs(500);\n            outport(PORT2, 0x00);\n            delayMs(500);\n        }\n    }\n}' },
  { folder: 'cpp', name: 'counter.cpp', content: '// Binary counter with C++\n// workbench86 pseudo-C++ \u2014 educational\n// Use "Translate to ASM" to convert to 8086 Assembly\n#include <workbench86.h>\n\nint main() {\n    port_init(PORT2, OUTPUT);\n    for (uint8_t i = 0; ; i++) {\n        outport(PORT2, i);\n        delay_ms(200);\n    }\n}' },
  { folder: 'asm', name: 'led_blink.asm', content: '; LED blink \u2014 all D0-D7 LEDs on, delay, off, EXIT\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        ; MUART init\n        MOV     AL,0FFH\n        OUT     UCRREG1,AL\n        OUT     UCRREG2,AL\n        OUT     UCRREG3,AL\n        OUT     UMODEREG,AL\n        OUT     UPORT1CTL,AL\n        ; LEDs on\n        MOV     AL,0FFH\n        OUT     UPORT2,AL\n        ; Delay\n        MOV     CX,0FFFFH\nWAIT1:  NOP\n        LOOP    WAIT1\n        ; LEDs off\n        MOV     AL,00H\n        OUT     UPORT2,AL\n        MOV     AH,EXIT\n        INT     28H' },
  { folder: 'asm', name: 'knight_rider.asm', content: '; LED Knight Rider \u2014 bouncing pattern D0-D7-D0 on Port 2\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        ; MUART init\n        MOV     AL,0FFH\n        OUT     UCRREG1,AL\n        OUT     UCRREG2,AL\n        OUT     UCRREG3,AL\n        OUT     UMODEREG,AL\n        OUT     UPORT1CTL,AL\nAGAIN:  ; Shift left D0 to D7\n        MOV     BL,01H\n        MOV     DL,8\nSLEFT:  MOV     AL,BL\n        OUT     UPORT2,AL\n        MOV     CX,0FFFFH\nDLY1:   NOP\n        LOOP    DLY1\n        SHL     BL,1\n        DEC     DL\n        JNZ     SLEFT\n        ; Shift right D7 to D0\n        MOV     BL,80H\n        MOV     DL,8\nSRIGHT: MOV     AL,BL\n        OUT     UPORT2,AL\n        MOV     CX,0FFFFH\nDLY2:   NOP\n        LOOP    DLY2\n        SHR     BL,1\n        DEC     DL\n        JNZ     SRIGHT\n        JMP     AGAIN' },
  { folder: 'asm', name: 'fibonacci.asm', content: '; Calculate first 10 Fibonacci numbers, store at DS:3000H\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n        MOV     SI,3000H\n        MOV     CX,10\n        MOV     AL,00H\n        MOV     BL,01H\n        MOV     [SI],AL\n        INC     SI\n        DEC     CX\n        MOV     [SI],BL\n        INC     SI\n        DEC     CX\nNXTFIB: MOV     DL,AL\n        ADD     DL,BL\n        MOV     [SI],DL\n        MOV     AL,BL\n        MOV     BL,DL\n        INC     SI\n        LOOP    NXTFIB\n        MOV     AH,EXIT\n        INT     28H' }
];

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

  let folders = [
    { name: 'assignments', keys: [] },
    { name: 'demos', keys: [] },
    { name: 'hardware', keys: [] },
    { name: 'scripts', children: [] }
  ];
  for (let k of Object.keys(EX)) {
    if (k.startsWith('PA')) folders[0].keys.push(k);
    else if (k.startsWith('HW:')) folders[2].keys.push(k);
    else folders[1].keys.push(k);
  }

  for (let lang of Object.keys(langFolders)) {
    folders[3].children.push({ name: lang, extras: langFolders[lang] });
  }

  for (let fn of Object.keys(dynFolders)) {
    folders.push({ name: fn, dynamics: dynFolders[fn] });
  }

  let tree = document.getElementById('fbTree');
  if (!tree) return;
  let openFolders = new Set();
  tree.querySelectorAll('.fb-folder').forEach(f => {
    let items = f.querySelector('.fb-folder-items');
    let nameEl = f.querySelector('.fb-folder-hd span:last-child');
    if (items && !items.classList.contains('collapsed') && nameEl) {
      openFolders.add(nameEl.textContent);
    }
  });
  tree.innerHTML = '';

  function getFileIcon(name) {
    let ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'asm';
    let icons = {asm:'⬡',c:'C',cpp:'C',py:'P',go:'G',java:'J',txt:'T'};
    let classes = {asm:'fb-icon-asm',c:'fb-icon-c',cpp:'fb-icon-cpp',py:'fb-icon-py',go:'fb-icon-go',java:'fb-icon-java',txt:'fb-icon-file'};
    return {icon: icons[ext] || '◇', cls: classes[ext] || 'fb-icon-file'};
  }

  function makeFileEl(key, label, clickFn) {
    let file = document.createElement('div');
    file.className = 'fb-file';
    file.setAttribute('data-key', key);
    file.setAttribute('role', 'treeitem');
    let fi = getFileIcon(label);
    let icon = document.createElement('span');
    icon.className = 'fb-icon ' + fi.cls;
    icon.textContent = fi.icon;
    file.appendChild(icon);
    let span = document.createElement('span');
    span.textContent = label;
    span.title = key;
    file.appendChild(span);
    file.addEventListener('click', function() {
      if (activeFileEl) activeFileEl.classList.remove('active');
      file.classList.add('active'); activeFileEl = file;
      clickFn();
    });
    return file;
  }

  function makeFolder(folder, depth) {
    depth = depth || 0;
    let div = document.createElement('div');
    div.className = 'fb-folder';

    let hd = document.createElement('div');
    hd.className = 'fb-folder-hd';
    if (depth > 0) hd.style.paddingLeft = (6 + depth * 12) + 'px';
    let arrow = document.createElement('span');
    arrow.className = 'fb-arrow';
    arrow.textContent = '\u25B6';
    let folderIcon = document.createElement('span');
    folderIcon.className = 'fb-icon fb-icon-folder';
    folderIcon.textContent = '\u25A0';
    let name = document.createElement('span');
    name.textContent = folder.name;
    hd.appendChild(arrow);
    hd.appendChild(folderIcon);
    hd.appendChild(name);

    let items = document.createElement('div');
    items.className = 'fb-folder-items collapsed';
    div.setAttribute('data-folder', folder.name);

    if (openFolders.has(folder.name)) {
      items.classList.remove('collapsed');
      arrow.classList.add('open');
    }

    hd.addEventListener('click', function() {
      arrow.classList.toggle('open');
      items.classList.toggle('collapsed');
    });

    if (folder.keys) {
      folder.keys.forEach(k => {
        let file = makeFileEl(k, fileLabel(k), function() { loadExByKey(k, file); });
        if (depth > 0) file.style.paddingLeft = (20 + depth * 12) + 'px';
        items.appendChild(file);
      });
    }

    if (folder.extras) {
      folder.extras.forEach(ef => {
        let file = makeFileEl(ef.name, ef.name, function() {
          openFileInTab(ef.name, ef.content, file);
        });
        if (depth > 0) file.style.paddingLeft = (20 + depth * 12) + 'px';
        items.appendChild(file);
      });
    }

    if (folder.dynamics) {
      folder.dynamics.forEach(df => {
        let file = makeFileEl(df.name, df.name, function() {
          openFileInTab(df.name, df.content, file);
        });
        if (depth > 0) file.style.paddingLeft = (20 + depth * 12) + 'px';
        items.appendChild(file);
      });
    }

    if (folder.children) {
      folder.children.forEach(child => {
        items.appendChild(makeFolder(child, depth + 1).el);
      });
    }

    div.appendChild(hd);
    div.appendChild(items);
    return { el: div };
  }

  folders.forEach(f => { let r = makeFolder(f, 0); tree.appendChild(r.el); });

  if (activeTabKey) highlightFileInTree(activeTabKey);
}

// === INLINE EDITING ===
function startInlineEdit(el, currentName, callback) {
  let input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'fb-inline-input';
  input.style.cssText = 'font:var(--fs-md) var(--mono);padding:1px 4px;border:1px solid var(--blu);border-radius:var(--r);background:var(--bg);color:var(--text);width:100%;outline:none;box-sizing:border-box';
  el.innerHTML = '';
  el.appendChild(input);
  input.focus();
  input.select();
  function commit() {
    let val = input.value.trim();
    if (val && val !== currentName) callback(val);
    else buildExDropdown();
  }
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); buildExDropdown(); }
  });
  input.addEventListener('blur', commit);
}

function startNewFileInline(tree, callback) {
  let input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'filename.asm';
  input.className = 'fb-inline-input';
  input.style.cssText = 'font-family:var(--mono);font-size:11px;padding:2px 6px;margin:2px 8px;border:1px solid var(--blu);border-radius:2px;background:var(--bg);color:var(--text);width:calc(100% - 16px);outline:none;box-sizing:border-box';
  tree.insertBefore(input, tree.firstChild);
  input.focus();
  function commit() {
    let val = input.value.trim();
    input.remove();
    if (val) callback(val);
  }
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); input.remove(); }
  });
  input.addEventListener('blur', commit);
}

// === FILE BROWSER CONTEXT MENU ===
let ctxMenu = null;
function hideCtxMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
document.addEventListener('click', hideCtxMenu);
document.addEventListener('contextmenu', function(e) {
  let tree = document.getElementById('fbTree');
  if (!tree || !tree.contains(e.target)) return;
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
    let isDynamic = dynamicFiles.some(f => f.name === key);
    let isExtra = EXTRA_FILES.some(f => f.name === key);
    let isEX = !!EX[key];

    addItem('Open', function() { fileEl.click(); });
    addItem('Open in New Tab', function() {
      let tab = openTabs.find(t => t.key === key);
      if (!tab) {
        let content = EX[key] || '';
        let ef = EXTRA_FILES.find(f => f.name === key);
        let df = dynamicFiles.find(f => f.name === key);
        if (ef) content = ef.content;
        if (df) content = df.content;
        openTabs.push({key, content});
        renderTabs();
      }
    });
    addSep();
    addItem('Rename', function() {
      startInlineEdit(fileEl, key, function(newName) {
        if (!newName || newName === key) return;
        if (isDynamic) {
          let df = dynamicFiles.find(f => f.name === key);
          if (df) df.name = newName;
        }
        let tab = openTabs.find(t => t.key === key);
        if (tab) tab.key = newName;
        if (activeTabKey === key) activeTabKey = newName;
        buildExDropdown(); renderTabs();
      });
    }, isEX);
    addItem('Duplicate', function() {
      let content = '';
      let ef = EXTRA_FILES.find(f => f.name === key);
      let df = dynamicFiles.find(f => f.name === key);
      if (EX[key]) content = EX[key];
      else if (ef) content = ef.content;
      else if (df) content = df.content;
      let tab = openTabs.find(t => t.key === key);
      if (tab) content = tab.content;
      let copyName = 'copy_' + (key.includes('.') ? key : key + '.asm');
      addDynamicFile(copyName, content, 'local');
      openFileInTab(copyName, content);
    });
    addItem('Delete', function() {
      if (!confirm('Delete "' + key + '"?')) return;
      dynamicFiles = dynamicFiles.filter(f => f.name !== key);
      closeTab(key);
      buildExDropdown();
    }, isEX || isExtra);
    addSep();
    addItem('Copy Content', function() {
      let content = '';
      let tab = openTabs.find(t => t.key === key);
      if (tab) content = tab.content;
      else if (EX[key]) content = EX[key];
      else { let ef = EXTRA_FILES.find(f => f.name === key); if (ef) content = ef.content; }
      navigator.clipboard.writeText(content).then(() => sLog('Copied: ' + key, 0));
    });
    addItem('Download', function() {
      let content = '';
      let tab = openTabs.find(t => t.key === key);
      if (tab) content = tab.content;
      else if (EX[key]) content = EX[key];
      else { let ef = EXTRA_FILES.find(f => f.name === key); if (ef) content = ef.content; }
      let blob = new Blob([content], {type: 'text/plain'});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = key.includes('.') ? key : key + '.asm';
      a.click();
    });
  } else {
    addItem('New File', function() {
      startNewFileInline(tree, function(name) {
        if (!name) return;
        addDynamicFile(name, '; ' + name + '\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n\n', 'local');
        openFileInTab(name, dynamicFiles.find(f => f.name === name).content);
      });
    });
    addItem('New Folder', function() {
      sLog('Folders are auto-created from file extensions', 0);
    }, true);
    addSep();
    addItem('Collapse All', function() {
      document.querySelectorAll('.fb-folder-items').forEach(el => el.classList.add('collapsed'));
      document.querySelectorAll('.fb-arrow').forEach(el => el.classList.remove('open'));
    });
    addItem('Expand All', function() {
      document.querySelectorAll('.fb-folder-items').forEach(el => el.classList.remove('collapsed'));
      document.querySelectorAll('.fb-arrow').forEach(el => el.classList.add('open'));
    });
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
    addDynamicFile(name, '; ' + name + '\n        ORG     0100H\n        INCLUDE PATCALLS.INC\n\n', 'local');
    openFileInTab(name, dynamicFiles.find(f => f.name === name).content);
  });
}
