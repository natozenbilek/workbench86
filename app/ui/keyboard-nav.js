// workbench86 Keyboard Navigation & ARIA - self-initializing IIFE
(function () {
  var ITEMS = '.fb-file, .fb-folder-hd';
  var active = null;

  function applyAria() {
    var lp = document.querySelector('.lp'), ep = document.querySelector('.ep'), rp = document.querySelector('.rp');
    if (lp) { lp.setAttribute('role','navigation');    lp.setAttribute('aria-label','File browser'); }
    if (ep) { ep.setAttribute('role','main');           ep.setAttribute('aria-label','Editor'); }
    if (rp) { rp.setAttribute('role','complementary'); rp.setAttribute('aria-label','Debug panel'); }
    var tree = document.querySelector('.fb-tree');
    if (tree) tree.setAttribute('role','tree');
    document.querySelectorAll('.fb-file').forEach(function(el){ el.setAttribute('role','treeitem'); el.setAttribute('tabindex','-1'); });
    document.querySelectorAll('.fb-folder').forEach(function(el){ el.setAttribute('role','group'); });
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
    active = sel;
    if (sel === '.ep') { var ed = document.querySelector('#ed'); if (ed) ed.focus(); }
    else if (sel === '.lp') { var items = document.querySelectorAll(ITEMS); var cur = document.querySelector('.fb-focused'); if (!cur && items.length) setFocus(items[0]); }
    else if (sel === '.rp') { panel.setAttribute('tabindex','-1'); panel.focus(); }
  }

  function setFocus(el) {
    document.querySelectorAll('.fb-focused').forEach(function(x){ x.classList.remove('fb-focused'); });
    if (!el) return;
    el.classList.add('fb-focused');
    el.scrollIntoView({ block: 'nearest' });
  }

  function fbMove(dir) {
    var items = Array.from(document.querySelectorAll(ITEMS));
    if (!items.length) return;
    var cur = document.querySelector('.fb-focused');
    var idx = cur ? items.indexOf(cur) : -1;
    setFocus(items[Math.max(0, Math.min(items.length - 1, idx + dir))]);
  }

  function fbToggle(expand) {
    var cur = document.querySelector('.fb-focused');
    if (!cur || !cur.classList.contains('fb-folder-hd')) return;
    var arrow = cur.querySelector('.fb-arrow,.arrow,.toggle');
    if (arrow) arrow.click(); else cur.click();
  }

  document.addEventListener('keydown', function(e) {
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      if (e.key==='1'){ e.preventDefault(); focusPanel('.lp'); return; }
      if (e.key==='2'){ e.preventDefault(); focusPanel('.ep'); return; }
      if (e.key==='3'){ e.preventDefault(); focusPanel('.rp'); return; }
    }
    if (active === '.lp') {
      if (e.key==='ArrowDown') { e.preventDefault(); fbMove(+1); return; }
      if (e.key==='ArrowUp')   { e.preventDefault(); fbMove(-1); return; }
      if (e.key==='Enter')     { e.preventDefault(); var c=document.querySelector('.fb-focused'); if(c) c.click(); return; }
      if (e.key==='ArrowRight'){ e.preventDefault(); fbToggle(true);  return; }
      if (e.key==='ArrowLeft') { e.preventDefault(); fbToggle(false); return; }
    }
    if (active === '.rp') {
      var rp = document.querySelector('.rp');
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
