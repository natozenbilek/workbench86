// ============================================================
// workbench86 Transpiler Bridge - UI integration for transpiler
// ============================================================

function compileIfC() {
  if (!isHighLevelFile()) return false;
  let cSrc = document.getElementById('ed').value;
  let asmCode = compileCtoASM(cSrc);
  let sourceKey = activeTabKey;
  let baseName = (sourceKey || 'output').replace(/\.(c|cpp|py|java|go)$/, '');
  let asmKey = baseName + '.asm';

  // Save current source tab content
  if (sourceKey) {
    let cur = openTabs.find(t => t.key === sourceKey);
    if (cur) cur.content = cSrc;
  }

  // Generate .asm file in tree (don't switch tabs)
  let existing = openTabs.find(t => t.key === asmKey);
  if (existing) { existing.content = asmCode; }
  else { openTabs.push({key: asmKey, content: asmCode}); }
  addDynamicFile(asmKey, asmCode, 'generated');

  // Temporarily switch to .asm to assemble, then switch back
  let savedEditor = document.getElementById('ed').value;
  document.getElementById('ed').value = asmCode;
  doAssemble();
  document.getElementById('ed').value = savedEditor;
  updLn(); updateHighlight();
  renderTabs();
  sLog('Translated \u2192 ' + asmKey + ' & assembled', 0);
  return true;
}
