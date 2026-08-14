(function () {
  const COMMANDS = [
    { label: 'Assemble',           key: 'Ctrl+Enter', run: () => { if (!compileIfC()) doAssemble(); } },
    { label: 'Run',                key: '',           run: () => doToggleRun() },
    { label: 'Step',               key: '',           run: () => doStep() },
    { label: 'Step Back',          key: '',           run: () => doStepBack() },
    { label: 'Step Forward',       key: '',           run: () => doStepForward() },
    { label: 'Reset',              key: '',           run: () => doReset() },
    { label: 'Toggle Theme',       key: '',           run: () => toggleTheme() },
    { label: 'Open Ports',         key: '',           run: () => openPorts() },
    { label: 'Export/Import',      key: '',           run: () => openExport() },
    { label: 'ISA Guide',          key: 'F1',         run: () => openGuide() },
    { label: 'Connect Device',     key: '',           run: () => serialConnect() },
    { label: 'Upload Program',     key: '',           run: () => uploadProgram() },
    { label: 'New File',           key: '',           run: () => newEmptyFile() },
    { label: 'Close Tab',          key: '',           run: () => closeTab(activeTabKey) },
    { label: 'Collapse All Panels',key: '',           run: () => document.querySelectorAll('.cd').forEach(el => el.classList.add('collapsed')) },
    { label: 'Expand All Panels',  key: '',           run: () => document.querySelectorAll('.cd').forEach(el => el.classList.remove('collapsed')) },
  ];

  let overlay = null, input = null, list = null, activeIdx = 0, filtered = [];

  function fuzzy(query, str) {
    let qi = 0;
    const q = query.toLowerCase(), s = str.toLowerCase();
    for (let i = 0; i < s.length && qi < q.length; i++) if (s[i] === q[qi]) qi++;
    return qi === q.length;
  }

  function render() {
    const q = input.value.trim();
    filtered = q ? COMMANDS.filter(c => fuzzy(q, c.label)) : COMMANDS.slice();
    activeIdx = 0;
    list.innerHTML = '';
    filtered.forEach((cmd, i) => {
      const item = document.createElement('div');
      item.className = 'cmd-palette-item' + (i === 0 ? ' active' : '');
      item.innerHTML = `<span class="cmd-palette-label">${cmd.label}</span>${cmd.key ? `<span class="cmd-palette-key">${cmd.key}</span>` : ''}`;
      item.addEventListener('mousedown', e => { e.preventDefault(); execute(i); });
      item.addEventListener('mousemove', () => setActive(i));
      list.appendChild(item);
    });
  }

  function setActive(i) {
    const items = list.querySelectorAll('.cmd-palette-item');
    items[activeIdx] && items[activeIdx].classList.remove('active');
    activeIdx = i;
    items[activeIdx] && items[activeIdx].classList.add('active');
    items[activeIdx] && items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function execute(i) {
    const cmd = filtered[i];
    close();
    if (cmd) { try { cmd.run(); } catch (e) { console.warn('[palette]', e); } }
  }

  function open() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'cmd-palette';
    overlay.innerHTML = `
      <div class="cmd-palette-box">
        <input class="cmd-palette-input" type="text" placeholder="Type a command…" autocomplete="off" spellcheck="false">
        <div class="cmd-palette-list"></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('.cmd-palette-input');
    list  = overlay.querySelector('.cmd-palette-list');
    render();
    input.focus();
    input.addEventListener('input', render);
    input.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    injectStyles();
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = input = list = null;
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((activeIdx + 1) % (filtered.length || 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((activeIdx - 1 + (filtered.length || 1)) % (filtered.length || 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); execute(activeIdx); }
  }

  function injectStyles() {
    if (document.getElementById('cmd-palette-styles')) return;
    const s = document.createElement('style');
    s.id = 'cmd-palette-styles';
    s.textContent = `
      .cmd-palette{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:600;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh}
      .cmd-palette-box{width:min(560px,90vw);background:var(--bg2,#1e1e2e);border:1px solid var(--border,#3a3a5c);border-radius:8px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.6)}
      .cmd-palette-input{width:100%;box-sizing:border-box;padding:12px 16px;font-size:15px;border:none;border-bottom:1px solid var(--border,#3a3a5c);background:transparent;color:var(--fg,#cdd6f4);outline:none}
      .cmd-palette-list{max-height:320px;overflow-y:auto}
      .cmd-palette-item{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;cursor:pointer;color:var(--fg,#cdd6f4);font-size:14px;user-select:none}
      .cmd-palette-item.active{background:var(--accent,#3a3a6c)}
      .cmd-palette-key{font-size:11px;padding:2px 6px;border-radius:4px;background:var(--bg3,#2a2a3e);color:var(--fg2,#a6adc8);border:1px solid var(--border,#3a3a5c);white-space:nowrap;margin-left:12px}`;
    document.head.appendChild(s);
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); overlay ? close() : open(); }
  });

  window.openCommandPalette = open;
  window.closeCommandPalette = close;
})();
