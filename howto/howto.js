// ============================================================
// workbench86 How to use: navigation, language, theme, figures
// Vanilla, no build step. The page works without this file too:
// the cards are plain HTML and the figures show placeholders.
// ============================================================
(function () {
  'use strict';

  var html = document.documentElement;
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var total = slides.length;
  var cur = 0;
  var lockUntil = 0;
  var wasFull = false;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THEME_KEY = 'workbench86_theme';      // the app's own key (app/main/editor.js)
  var LANG_KEY = 'workbench86_howto_lang';

  var TEXT = {
    tr: {
      title: 'workbench86 Nasıl kullanılır',
      desc: 'workbench86 kullanım kılavuzu: tarayıcıda 8086 simülatörü ve DIGIAC 2000 kartına yükleme, adım adım.',
      nav: 'Sayfa bağlantıları',
      theme: 'Temayı değiştir',
      present: 'Sunum modu (F)',
      lang: 'Dil'
    },
    en: {
      title: 'workbench86 How to use',
      desc: 'How to use workbench86: the 8086 simulator in the browser and uploading to the DIGIAC 2000 board, step by step.',
      nav: 'Page links',
      theme: 'Toggle theme',
      present: 'Presentation mode (F)',
      lang: 'Language'
    }
  };

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage blocked */ } }
  function lang() { return html.lang === 'tr' ? 'tr' : 'en'; }
  function isPresent() { return html.classList.contains('present'); }

  // ---------------------------------------------------------------- figures
  var cache = {};
  var uidN = 0;

  function fetchOnce(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) return { missing: true };
      return r.text().then(function (t) { return { text: t }; });
    }, function () { return { offline: true }; });
  }
  // A failed fetch is tried once more after a short wait, and a failure is never cached,
  // so a later language switch tries again.
  function fetchText(url) {
    if (!cache[url]) {
      cache[url] = fetchOnce(url).then(function (r) {
        if (r.text || location.protocol === 'file:') return r;
        return new Promise(function (res) { setTimeout(res, 700); }).then(function () { return fetchOnce(url); });
      }).then(function (r) {
        if (!r.text) delete cache[url];
        return r;
      });
    }
    return cache[url];
  }

  // Keep a figure's own <style> inside the figure: prefix every selector with the figure's id.
  // A selector whose first part names the figure's root (svg, its class, its attributes)
  // is pinned to the root; anything else becomes a descendant of it.
  function scopeSel(s, scope, root) {
    var m = s.match(/^(:root|html)((?:\[[^\]]*\])*)\s*(.*)$/);
    if (m) {
      var rest = m[3].replace(/^svg\b/, '').trim();
      return (m[2] ? ':root' + m[2] + ' ' : '') + scope + (rest ? ' ' + rest : '');
    }
    m = s.match(/^([^\s>+~]+)(.*)$/);
    if (!m) return scope + ' ' + s;
    var first = m[1], base = first.replace(/\[[^\]]*\]/g, '').replace(/::?[\w-]+(\([^)]*\))?/g, '');
    var isRoot = /^svg$/i.test(base) || (base === '' && first.charAt(0) === '[');
    if (!isRoot && base && base.charAt(0) !== '#') { try { isRoot = root.matches(base.replace(/^svg/i, '') || 'svg'); } catch (e) { isRoot = false; } }
    if (isRoot) return scope + first.replace(/^svg/i, '') + m[2];
    return scope + ' ' + s;
  }
  function scopeCss(css, scope, root) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    var out = '', i = 0;
    while (i < css.length) {
      var open = css.indexOf('{', i);
      if (open < 0) break;
      var sel = css.slice(i, open).trim();
      var depth = 1, j = open + 1;
      while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      var inner = css.slice(open + 1, j - 1);
      if (/^@(media|supports|container|layer)/.test(sel)) out += sel + '{' + scopeCss(inner, scope, root) + '}';
      else if (sel.charAt(0) === '@') out += sel + '{' + inner + '}';
      else if (sel) out += sel.split(',').map(function (x) { return scopeSel(x.trim(), scope, root); }).join(',') + '{' + inner + '}';
      i = j;
    }
    return out;
  }

  function inlineSvg(box, text) {
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    var svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return false;
    var uid = 'fg' + (++uidN);
    Array.prototype.forEach.call(svg.querySelectorAll('script, foreignObject'), function (e) { e.parentNode.removeChild(e); });
    var ids = {};
    if (svg.id) { ids[svg.id] = uid; }
    Array.prototype.forEach.call(svg.querySelectorAll('[id]'), function (el) {
      var n = uid + '-' + el.id; ids[el.id] = n; el.id = n;
    });
    var all = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll('*')));
    all.forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name)) { el.removeAttribute(a.name); return; }
        var v = a.value;
        if (v.indexOf('#') < 0) return;
        var nv = v.replace(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g, function (m0, id) { return ids[id] ? 'url(#' + ids[id] + ')' : m0; });
        if ((a.name === 'href' || a.name === 'xlink:href') && nv.charAt(0) === '#' && ids[nv.slice(1)]) nv = '#' + ids[nv.slice(1)];
        if (nv !== v) el.setAttribute(a.name, nv);
      });
    });
    svg.id = uid;
    Array.prototype.forEach.call(svg.querySelectorAll('style'), function (st) {
      var css = st.textContent.replace(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g, function (m0, id) { return ids[id] ? 'url(#' + ids[id] + ')' : m0; });
      st.textContent = scopeCss(css, '#' + uid, svg);
    });
    if (!svg.getAttribute('viewBox')) {
      var w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
      if (w && h) svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (box.dataset.focus) svg.setAttribute('data-focus', box.dataset.focus);
    box.textContent = '';
    box.appendChild(document.importNode(svg, true));
    return true;
  }

  // A figure that could not load leaves a plain empty box (its description stays in aria-label).
  // The state is cleared, so the next loadFigures call, for example a language switch, tries again.
  function placeholder(box) {
    box.textContent = '';
    var ph = document.createElement('div');
    ph.className = 'ph';
    ph.setAttribute('aria-hidden', 'true');
    box.appendChild(ph);
    delete box.dataset.state;
  }

  function asImage(box) {
    var img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.onload = function () { box.dataset.state = 'img'; };
    img.onerror = function () { placeholder(box); };
    img.src = box.dataset.src;
    box.textContent = '';
    box.appendChild(img);
  }

  function loadFigures(l) {
    var boxes = document.querySelectorAll('.sl[data-l="' + l + '"] .fx-svg:not([data-state])');
    Array.prototype.forEach.call(boxes, function (box) {
      box.dataset.state = 'loading';
      fetchText(box.dataset.src).then(function (r) {
        if (r.text && inlineSvg(box, r.text)) box.dataset.state = 'inline';
        else if (r.offline && location.protocol === 'file:') asImage(box);   // file:// pages cannot fetch; an <img> can
        else placeholder(box);
        markScroll();
      });
    });
  }

  // ---------------------------------------------------------------- sideways scroll cue (phones)
  var markT = 0;
  function markScroll() {
    clearTimeout(markT);
    markT = setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.fig'), function (f) {
        var over = f.scrollWidth > f.clientWidth + 4;
        f.classList.toggle('fig-scroll', over);
        f.classList.toggle('at-end', over && f.scrollLeft + f.clientWidth >= f.scrollWidth - 4);
        if (over && !f.dataset.cue) {
          f.dataset.cue = '1';
          f.addEventListener('scroll', function () {
            f.classList.toggle('at-end', f.scrollLeft + f.clientWidth >= f.scrollWidth - 4);
          }, { passive: true });
        }
      });
    }, 120);
  }

  // ---------------------------------------------------------------- scale
  function rescale() {
    var k;
    if (isPresent()) {
      k = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    } else {
      var f = slides[0] && slides[0].querySelector('.frame');
      if (!f) return;
      var w = f.getBoundingClientRect().width;
      k = w / 1280;
      html.style.setProperty('--fw', w + 'px');
    }
    html.style.setProperty('--k', String(k));
  }

  // ---------------------------------------------------------------- current slide
  var countEl = document.getElementById('count');
  var progEl = document.getElementById('prog');

  // keepUrl: on first load the address stays as it is; a #1 written then would make the
  // browser jump to the first card at the end of loading and hide the page header.
  function setCur(i, keepUrl) {
    cur = i;
    if (countEl) countEl.textContent = (i + 1) + ' / ' + total;
    if (progEl) progEl.style.width = ((i + 1) / total * 100) + '%';
    var h = '#' + (i + 1);
    if (!keepUrl && location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
    if (isPresent()) {
      slides.forEach(function (s, k) { s.classList.toggle('cur', k === i); });
    }
  }

  function goTo(i, instant) {
    i = Math.max(0, Math.min(total - 1, i));
    setCur(i);
    if (isPresent()) return;
    // the lock keeps the counter still while a smooth scroll passes other cards; it ends with
    // the scroll ('scrollend'), with a time limit for browsers without that event
    lockUntil = Date.now() + (instant || reduce ? 150 : 3000);
    scrollTarget = i;
    var how = instant || reduce ? 'auto' : 'smooth';
    if (i === 0) window.scrollTo({ top: 0, behavior: how });
    else slides[i].scrollIntoView({ block: 'start', behavior: how });
  }

  function detectCur() {
    if (isPresent() || Date.now() < lockUntil) return;
    var y = window.innerHeight * 0.4, best = 0;
    for (var i = 0; i < total; i++) {
      if (slides[i].getBoundingClientRect().top <= y) best = i; else break;
    }
    var doc = document.scrollingElement || html;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) best = total - 1;
    if (best !== cur) setCur(best, best === 0 && !location.hash);
  }

  var scrollTarget = -1;
  window.addEventListener('scrollend', function () {
    if (Date.now() >= lockUntil) return;
    lockUntil = 0;
    if (scrollTarget >= 0 && scrollTarget !== cur) setCur(scrollTarget);
    scrollTarget = -1;
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; detectCur(); });
  }, { passive: true });

  function fromHash() {
    var m = /^#(\d+)$/.exec(location.hash);
    return m ? parseInt(m[1], 10) - 1 : null;
  }
  window.addEventListener('hashchange', function () {
    var i = fromHash();
    if (i !== null && i !== cur) goTo(i, true);
  });

  // ---------------------------------------------------------------- presentation mode
  function enterPresent() {
    html.classList.add('present');
    rescale();
    setCur(cur);
    var el = html;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(function () { /* stays a full-window view */ });
    }
  }
  function exitPresent() {
    html.classList.remove('present');
    wasFull = false;
    slides.forEach(function (s) { s.classList.remove('cur'); });
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    rescale();
    goTo(cur, true);
  }
  document.addEventListener('fullscreenchange', function () {
    if (document.fullscreenElement) { wasFull = true; rescale(); return; }
    if (wasFull && isPresent()) exitPresent();
  });
  var btnPresent = document.getElementById('btnPresent');
  if (btnPresent) btnPresent.addEventListener('click', function () { if (isPresent()) exitPresent(); else enterPresent(); });
  var btnExit = document.getElementById('btnExit');
  if (btnExit) btnExit.addEventListener('click', function () { if (isPresent()) exitPresent(); });
  // In presentation mode a tap on the right two thirds goes on, on the left third goes back;
  // a sideways swipe does the same.
  var touchX = null, touchY = null;
  var deckEl = document.getElementById('deck');
  if (deckEl) {
    deckEl.addEventListener('touchstart', function (e) {
      if (!isPresent() || e.touches.length !== 1) return;
      touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
    }, { passive: true });
    deckEl.addEventListener('touchend', function (e) {
      if (!isPresent() || touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); goTo(cur + (dx < 0 ? 1 : -1)); }
    });
    deckEl.addEventListener('click', function (e) {
      if (!isPresent() || (e.target.closest && e.target.closest('a, button'))) return;
      goTo(cur + (e.clientX < window.innerWidth / 3 ? -1 : 1));
    });
  }

  // ---------------------------------------------------------------- keys
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    var onControl = t && t.closest && t.closest('button, a');
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onControl)) {
      e.preventDefault(); goTo(cur + 1);
    } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onControl)) {
      e.preventDefault(); goTo(cur - 1);
    } else if (k === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (k === 'End') {
      e.preventDefault(); goTo(total - 1);
    } else if (k === 'f' || k === 'F') {
      e.preventDefault();
      if (isPresent()) exitPresent(); else enterPresent();
    } else if (k === 'Escape' && isPresent() && !document.fullscreenElement) {
      exitPresent();
    }
  });

  // ---------------------------------------------------------------- language
  function setLang(l, save) {
    html.lang = l;
    var T = TEXT[l];
    document.title = T.title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', T.desc);
    var nav = document.getElementById('hwNav');
    if (nav) nav.setAttribute('aria-label', T.nav);
    var tb = document.getElementById('btnTheme');
    if (tb) tb.setAttribute('aria-label', T.theme), tb.title = T.theme;
    if (btnPresent) btnPresent.title = T.present;
    var lg = document.getElementById('langGroup');
    if (lg) lg.setAttribute('aria-label', T.lang);
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.setLang === l ? 'true' : 'false');
    });
    if (save) {
      store(LANG_KEY, l);
      // a ?lang= in the address would win on the next load, so it follows the switch too
      var q = location.search.replace(/([?&]lang=)[^&]*/, '$1' + l);
      if (q !== location.search) history.replaceState(null, '', location.pathname + q + location.hash);
    }
    loadFigures(l);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.setLang === lang()) return;
      var keep = cur;
      setLang(b.dataset.setLang, true);
      rescale();
      goTo(keep, true);
    });
  });

  // ---------------------------------------------------------------- theme
  var btnTheme = document.getElementById('btnTheme');
  if (btnTheme) btnTheme.addEventListener('click', function () {
    var light = html.getAttribute('data-theme') !== 'light';
    if (light) html.setAttribute('data-theme', 'light'); else html.removeAttribute('data-theme');
    store(THEME_KEY, light ? 'light' : 'dark');
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== THEME_KEY) return;
    if (e.newValue === 'light') html.setAttribute('data-theme', 'light'); else html.removeAttribute('data-theme');
  });

  // ---------------------------------------------------------------- start
  try { if (new URLSearchParams(location.search).has('notes')) document.body.classList.add('show-notes'); } catch (e) {}
  setLang(lang(), false);
  rescale();
  var start = fromHash();
  if (start !== null && start >= 0 && start < total) goTo(start, true);
  else setCur(0, true);

  // Scaled cards change height with the window width, so the current card is put back in view.
  // Phones fire resize when the address bar hides; there the width stays and nothing moves.
  var rt = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    rescale();
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(function () { if (!isPresent() && cur) goTo(cur, true); markScroll(); }, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!isPresent() && cur) goTo(cur, true); });
})();
