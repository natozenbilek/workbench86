// ============================================================
// workbench86 Transpiler Bridge: UI integration for transpiler
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

  // Generate the .asm file in the tree, open it in its tab and assemble it there.
  // doAssemble only works while an .asm tab is active, and Upload and Run sends what
  // that tab assembles. On assembler errors doAssemble's message stays in the log.
  // replace: a second translation must overwrite the .asm tab that is already open.
  addDynamicFile(asmKey, asmCode, 'generated');
  openFileInTab(asmKey, asmCode, null, true);
  if (doAssemble() === true) sLog('Translated \u2192 ' + asmKey + ' & assembled', 0);
  return true;
}
