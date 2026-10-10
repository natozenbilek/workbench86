// workbench86 Keyboard Navigation & ARIA: self-initializing IIFE
// The tree and the debug panel take arrow keys and Enter only while they have real
// focus. (After Alt+1, a click into the editor used to leave Enter going to the tree.)
(function () {
  var ITEMS = '.fb-file, .fb-folder-hd';

  function visible(el) { return el.getClientRects().length > 0; }
  function rows() { return Array.prototype.filter.call(document.querySelectorAll(ITEMS), visible); }

  // The tree is one Tab stop: the focused row has tabindex 0 (and its row buttons
  // are reachable with Tab), every other row -1.
  function setTabStop(el, on) {
    el.setAttribute('tabindex', on ? '0' : '-1');
    el.querySelectorAll('.fb-act').forEach(function(b){ b.tabIndex = on ? 0 : -1; });
  }

  function applyAria() {
    var lp = document.querySelector('.lp'), ep = document.querySelector('.ep'), rp = document.querySelector('.rp');
    if (lp) { lp.setAttribute('role','navigation');    lp.setAttribute('aria-label','File browser'); }
    if (ep) { ep.setAttribute('role','main');           ep.setAttribute('aria-label','Editor'); }
    if (rp) { rp.setAttribute('role','complementary'); rp.setAttribute('aria-label','Debug panel'); }
    var tree = document.querySelector('.fb-tree');
    if (tree) tree.setAttribute('role','tree');
    var vis = rows();
    var stop = document.querySelector('.fb-focused');
    if (!stop || !visible(stop)) stop = vis.filter(function(el){ return el.classList.contains('active'); })[0] || vis[0];
    document.querySelectorAll(ITEMS).forEach(function(el){ el.setAttribute('role','treeitem'); setTabStop(el, el === stop); });
    document.querySelectorAll('.fb-folder').forEach(function(el){ el.setAttribute('role','none'); });
    document.querySelectorAll('.fb-folder-items').forEach(function(el){ el.setAttribute('role','group'); });
    document.querySelectorAll('.cd').forEach(function(el){ el.setAttribute('role','region'); });
    document.querySelectorAll('.ch').forEach(function(el){
      el.setAttribute('role','button');
      var sib = el.nextElementSibling;
      el.setAttribute('aria-expanded', sib ? String(sib.style.display !== 'none') : 'false');
    });
  }

  function focusPanel(sel) {
    document.querySelectorAll('.lp,.ep,.rp').forEach(function(p){ p.classList.remove('panel-focused'); });
    var panel = document.querySelector(sel);
    if (!panel) return;
    panel.classList.add('panel-focused');
    if (sel === '.ep') { var ed = document.querySelector('#ed'); if (ed) ed.focus(); }
    else if (sel === '.lp') {
      var cur = document.querySelector('.fb-tree [tabindex="0"].fb-file, .fb-tree [tabindex="0"].fb-folder-hd');
      if (!cur || !visible(cur)) cur = rows()[0];
      if (cur) setFocus(cur);
    }
    else if (sel === '.rp') { panel.setAttribute('tabindex','-1'); panel.focus(); }
  }

  function setFocus(el, fromFocusEvent) {
    document.querySelectorAll('.fb-focused, .fb-kbd').forEach(function(x){ x.classList.remove('fb-focused', 'fb-kbd'); });
    document.querySelectorAll(ITEMS).forEach(function(x){ if (x !== el && x.getAttribute('tabindex') === '0') setTabStop(x, false); });
    if (!el) return;
    el.classList.add('fb-focused');
    if (!fromFocusEvent) el.classList.add('fb-kbd');
    setTabStop(el, true);
    if (!fromFocusEvent) el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest' });
  }

  function fbMove(dir) {
    var items = rows();
    if (!items.length) return;
    var cur = document.querySelector('.fb-focused');
    var idx = cur ? items.indexOf(cur) : -1;
    setFocus(items[Math.max(0, Math.min(items.length - 1, idx + dir))]);
  }

  // Right: open a folder, or go to its first item. Left: close a folder, or go to the parent folder.
  function fbToggle(expand) {
    var cur = document.querySelector('.fb-focused');
    if (!cur) return;
    if (cur.classList.contains('fb-folder-hd')) {
      var isOpen = !cur.nextElementSibling.classList.contains('collapsed');
      if (isOpen !== expand) { cur.click(); return; }
      if (expand) fbMove(+1);
    }
    if (!expand) {
      var group = (cur.classList.contains('fb-folder-hd') ? cur.parentElement : cur).parentElement.closest('.fb-folder-items');
      if (group && group.previousElementSibling) setFocus(group.previousElementSibling);
    }
  }

  // Follow real focus: a click on a row makes it the tree's Tab stop; leaving a panel
  // removes the Alt+1/2/3 highlight.
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    var p = t.closest ? t.closest('.lp, .ep, .rp') : null;
    var marked = document.querySelector('.panel-focused');
    if (marked && marked !== p) marked.classList.remove('panel-focused');
    if (t.matches && t.matches(ITEMS) && !t.classList.contains('fb-focused')) setFocus(t, true);
  });
  document.addEventListener('focusout', function (e) {
    if (e.relatedTarget) return;
    var marked = document.querySelector('.panel-focused');
    if (marked) marked.classList.remove('panel-focused');
  });

  function digit(e, n) { return e.key === n || e.code === 'Digit' + n; }   // Option+1 on a Mac gives another e.key

  document.addEventListener('keydown', function(e) {
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      if (digit(e, '1')){ e.preventDefault(); focusPanel('.lp'); return; }
      if (digit(e, '2')){ e.preventDefault(); focusPanel('.ep'); return; }
      if (digit(e, '3')){ e.preventDefault(); focusPanel('.rp'); return; }
    }
    var t = e.target;
    if (t.matches && t.matches(ITEMS) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key==='ArrowDown') { e.preventDefault(); fbMove(+1); return; }
      if (e.key==='ArrowUp')   { e.preventDefault(); fbMove(-1); return; }
      if (e.key==='Enter')     { e.preventDefault(); t.click(); return; }
      if (e.key==='ArrowRight'){ e.preventDefault(); fbToggle(true);  return; }
      if (e.key==='ArrowLeft') { e.preventDefault(); fbToggle(false); return; }
      var key = t.classList.contains('fb-file') ? t.getAttribute('data-key') : null;
      if (e.key==='F2' && key)     { e.preventDefault(); renameFile(key); return; }
      if (e.key==='Delete' && key) { e.preventDefault(); deleteFile(key); return; }
    }
    var rp = document.querySelector('.rp');
    if (rp && t === rp) {
      if (e.key==='ArrowDown'){ e.preventDefault(); rp.scrollTop+=40; return; }
      if (e.key==='ArrowUp')  { e.preventDefault(); rp.scrollTop-=40; return; }
    }
  });

  function init() {
    applyAria();
    var tree = document.querySelector('.fb-tree');
    if (tree) new MutationObserver(applyAria).observe(tree, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
