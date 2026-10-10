// ============================================================
// workbench86 Example Loader: Fetches .asm files from examples/
// ============================================================

const EX = {};
// Per example: its file name (shown in the tree and tabs, used for downloads) and its
// manifest category (the Explorer folder). Filled in manifest order.
const EX_META = {};
let examplesLoaded = false;

async function loadExamples() {
  try {
    const resp = await fetch('examples/manifest.json');
    const manifest = await resp.json();
    manifest.forEach(e => { EX_META[e.name] = { file: e.file.split('/').pop(), category: e.category }; });
    const fetches = manifest.map(async (entry) => {
      const r = await fetch('examples/' + entry.file);
      if (r.ok) EX[entry.name] = await r.text();
    });
    await Promise.all(fetches);
    examplesLoaded = true;
  } catch (e) {
    console.error('Failed to load examples:', e);
  }
}
