(function () {
  const COMMANDS = [
    { label: 'Assemble',           key: 'Ctrl+Enter', run: () => { if (!compileIfC()) doAssemble(); } },
    { label: 'Run',                key: '',           run: () => doToggleRun() },
    { label: 'Step',               key: '',           run: () => doStep() },
    { label: 'Step Back',          key: '',           run: () => doStepBack() },
    { label: 'Step Forward',       key: '',           run: () => doStepForward() },
    { label: 'Reset',              key: '',           run: () => (typeof simLocked === 'function' && simLocked()) ? simLockedNotice() : doReset() },
    { label: 'Toggle Theme',       key: '',           run: () => toggleTheme() },
    { label: 'Open Ports',         key: '',           run: () => openPorts() },
    { label: 'Export/Import',      key: '',           run: () => openExport() },
    { label: 'ISA Guide',          key: 'F1',         run: () => openGuide() },
    { label: 'Connect Device',     key: '',           run: () => serialConnect() },
    { label: 'Upload Program',     key: '',           run: () => uploadProgram() },
    { label: 'New File',           key: '',           run: () => newEmptyFile() },
    { label: 'Open File from Computer', key: '',      run: () => document.getElementById('openFile').click() },
    { label: 'Download Current File',   key: 'Ctrl+S', run: () => downloadCurrent() },
    { label: 'Download All as Zip',     key: '',       run: () => downloadAllZip() },
    { label: 'Load Files from Zip',     key: '',       run: () => document.getElementById('openZip').click() },
    { label: 'Make a Copy of Current File', key: '',  run: () => activeTabKey ? duplicateFile(activeTabKey) : sLog('Open a file first.', 1) },
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

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); overlay ? close() : open(); }
  });

  window.openCommandPalette = open;
  window.closeCommandPalette = close;
})();
