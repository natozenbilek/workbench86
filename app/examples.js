// ============================================================
// workbench86 Example Loader - Fetches .asm files from examples/
// ============================================================

const EX = {};
let examplesLoaded = false;

async function loadExamples() {
  try {
    const resp = await fetch('examples/manifest.json');
    const manifest = await resp.json();
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
