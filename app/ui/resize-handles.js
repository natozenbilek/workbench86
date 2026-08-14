// ============================================================
// workbench86 Panel Resize Handles
// Drag handles between .lp / .ep / .rp columns inside .mn
// ============================================================

(function () {
  var STORAGE_KEY = 'workbench86_panel_sizes';
  var MIN_LEFT   = 150;
  var MIN_EDITOR = 200;
  var MIN_RIGHT  = 200;
  var DEF_LEFT   = 200;

  // ── helpers ────────────────────────────────────────────────

  function getContainer() { return document.querySelector('.mn'); }

  function parseSizes(mn) {
    var cols = getComputedStyle(mn).gridTemplateColumns.split(' ');
    // cols[0] = left, cols[1] = handle1, cols[2] = editor,
    // cols[3] = handle2, cols[4] = right  (after handles injected)
    // Before handles are injected: cols[0]=left, cols[1]=editor, cols[2]=right
    return cols.map(function (c) { return parseFloat(c); });
  }

  function applyGrid(mn, left, editor, right) {
    mn.style.gridTemplateColumns =
      left + 'px 5px ' + editor + 'px 5px ' + right + 'px';
  }

  function saveToStorage(left, editor, right) {
    try {
      localStorage.setItem(STORAGE_KEY,
        JSON.stringify({ left: left, editor: editor, right: right }));
    } catch (_) {}
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function currentSizes(mn) {
    // After grid is set by us the template is always:
    // left 5px editor 5px right
    var tpl = mn.style.gridTemplateColumns ||
              getComputedStyle(mn).gridTemplateColumns;
    var parts = tpl.split(' ').map(function (s) { return parseFloat(s); });
    // parts = [left, 5, editor, 5, right]
    return {
      left:   parts[0]  || DEF_LEFT,
      editor: parts[2]  || MIN_EDITOR,
      right:  parts[4]  || MIN_RIGHT
    };
  }

  // Size the three columns so they always add up to the container width.
  // `pref` is an optional {left, editor, right} whose proportions are kept;
  // without it the editor and the debug panel split the leftover space evenly.
  // Measuring the container directly is deliberate: reading the computed grid
  // template before layout has settled yields "none", which used to collapse
  // every column onto its minimum and leave the right of the window empty.
  function fitToContainer(mn, pref) {
    var totalW = mn.getBoundingClientRect().width - 10; // subtract 2 handles
    if (!(totalW > 0)) return false;
    if (totalW < MIN_LEFT + MIN_EDITOR + MIN_RIGHT) return false; // narrow layout, CSS takes over

    var left, editor;
    if (pref && pref.left > 0 && pref.editor > 0 && pref.right > 0) {
      var prefTotal = pref.left + pref.editor + pref.right;
      left   = Math.round(totalW * (pref.left   / prefTotal));
      editor = Math.round(totalW * (pref.editor / prefTotal));
    } else {
      left   = DEF_LEFT;
      editor = Math.round((totalW - DEF_LEFT) / 2);
    }

    left   = Math.max(MIN_LEFT,   Math.min(left,   totalW - MIN_EDITOR - MIN_RIGHT));
    editor = Math.max(MIN_EDITOR, Math.min(editor, totalW - left - MIN_RIGHT));
    applyGrid(mn, left, editor, totalW - left - editor);
    return true;
  }

  function resetToDefaults() {
    var mn = getContainer();
    if (!mn) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    fitToContainer(mn, null);
  }

  // ── handle creation ────────────────────────────────────────

  function createHandle(id) {
    var h = document.createElement('div');
    h.className = 'resize-handle';
    h.dataset.handleId = id;
    return h;
  }

  function injectHandles(mn) {
    var lp = mn.querySelector('.lp');
    var ep = mn.querySelector('.ep');
    var rp = mn.querySelector('.rp');
    if (!lp || !ep || !rp) return false;

    var h1 = createHandle('h1');
    var h2 = createHandle('h2');

    // Insert h1 between lp and ep, h2 between ep and rp
    mn.insertBefore(h1, ep);
    mn.insertBefore(h2, rp);
    return true;
  }

  // ── drag logic ─────────────────────────────────────────────

  function startDrag(e, handle) {
    if (e.button !== 0) return;
    var mn = getContainer();
    if (!mn) return;

    e.preventDefault();

    var sizes   = currentSizes(mn);
    var startX  = e.clientX;
    var which   = handle.dataset.handleId; // 'h1' or 'h2'
    var origLeft   = sizes.left;
    var origEditor = sizes.editor;
    var origRight  = sizes.right;

    handle.classList.add('dragging');
    document.body.classList.add('resizing');

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var left, editor, right;

      if (which === 'h1') {
        // Moving left ↔ editor boundary
        left   = Math.max(MIN_LEFT, origLeft + dx);
        var maxLeft = origLeft + origEditor - MIN_EDITOR;
        left   = Math.min(left, maxLeft);
        editor = origEditor - (left - origLeft);
        right  = origRight;
      } else {
        // Moving editor ↔ right boundary
        left   = origLeft;
        editor = Math.max(MIN_EDITOR, origEditor + dx);
        var maxEditor = origEditor + origRight - MIN_RIGHT;
        editor = Math.min(editor, maxEditor);
        right  = origRight - (editor - origEditor);
      }

      applyGrid(mn, left, editor, right);
    }

    function onUp() {
      handle.classList.remove('dragging');
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);

      var s = currentSizes(mn);
      saveToStorage(s.left, s.editor, s.right);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

  // ── init ───────────────────────────────────────────────────

  function init() {
    var mn = getContainer();
    if (!mn) return;

    // Inject handles into DOM
    if (!injectHandles(mn)) return;

    // Set the 5-column grid (left | h1 | editor | h2 | right), keeping the
    // proportions the user last dragged to but always filling the window.
    // A page opened in a background tab has zero width at this point, so if
    // the first attempt cannot size anything, wait until the container is
    // actually laid out and size it then.
    if (!fitToContainer(mn, loadFromStorage()) && typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(function () {
        if (fitToContainer(mn, loadFromStorage())) ro.disconnect();
      });
      ro.observe(mn);
    }

    // Refit on window resize so the layout never leaves dead space next to it.
    var refitPending = false;
    window.addEventListener('resize', function () {
      if (refitPending) return;
      refitPending = true;
      requestAnimationFrame(function () {
        refitPending = false;
        fitToContainer(mn, currentSizes(mn));
      });
    });

    // Attach events to both handles
    mn.querySelectorAll('.resize-handle').forEach(function (handle) {
      handle.addEventListener('mousedown', function (e) {
        startDrag(e, handle);
      });

      handle.addEventListener('dblclick', function () {
        resetToDefaults();
        saveToStorage.apply(null, (function () {
          var s = currentSizes(mn);
          return [s.left, s.editor, s.right];
        })());
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
