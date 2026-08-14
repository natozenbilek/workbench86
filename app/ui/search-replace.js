(function () {
  'use strict';

  let matches = [], idx = 0, caseSensitive = false;
  let bar, searchInput, replaceInput, countEl;

  function buildBar() {
    bar = document.createElement('div');
    bar.className = 'search-bar';
    bar.hidden = true;
    bar.innerHTML = `
      <input class="search-input" id="srSearch" placeholder="Search…" autocomplete="off" spellcheck="false">
      <span class="search-count" id="srCount"></span>
      <button class="search-btn" id="srPrev" title="Previous (Shift+Enter)">▲</button>
      <button class="search-btn" id="srNext" title="Next (Enter)">▼</button>
      <button class="search-btn" id="srCase" title="Case sensitive">Aa</button>
      <input class="search-input" id="srReplace" placeholder="Replace…" autocomplete="off" spellcheck="false">
      <button class="search-btn" id="srReplaceOne">Replace</button>
      <button class="search-btn" id="srReplaceAll">Replace All</button>
      <button class="search-btn" id="srClose" title="Close (Esc)">✕</button>
    `;
    const tabBarWrap = document.querySelector('.ep .tab-bar-wrap');
    tabBarWrap.insertAdjacentElement('afterend', bar);

    searchInput  = document.getElementById('srSearch');
    replaceInput = document.getElementById('srReplace');
    countEl      = document.getElementById('srCount');

    searchInput.addEventListener('input', runSearch);
    document.getElementById('srPrev').addEventListener('click', goPrev);
    document.getElementById('srNext').addEventListener('click', goNext);
    document.getElementById('srCase').addEventListener('click', toggleCase);
    document.getElementById('srReplaceOne').addEventListener('click', replaceOne);
    document.getElementById('srReplaceAll').addEventListener('click', replaceAll);
    document.getElementById('srClose').addEventListener('click', closeBar);

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext(); }
      if (e.key === 'Escape') closeBar();
    });
    replaceInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeBar();
    });
  }

  function openBar() {
    if (!bar) buildBar();
    bar.hidden = false;
    const ed = document.getElementById('ed');
    const sel = ed.value.substring(ed.selectionStart, ed.selectionEnd);
    if (sel && !sel.includes('\n')) searchInput.value = sel;
    searchInput.focus();
    searchInput.select();
    runSearch();
  }

  function closeBar() {
    if (bar) bar.hidden = true;
    document.getElementById('ed').focus();
  }

  function runSearch() {
    const q = searchInput.value;
    matches = [];
    idx = 0;
    if (!q) { countEl.textContent = ''; return; }
    const text = document.getElementById('ed').value;
    const flags = caseSensitive ? 'g' : 'gi';
    let re;
    try { re = new RegExp(escapeRegex(q), flags); } catch (e) { return; }
    let m;
    while ((m = re.exec(text)) !== null) matches.push(m.index);
    updateCount();
    if (matches.length) selectMatch(0);
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function selectMatch(i) {
    idx = i;
    const ed = document.getElementById('ed');
    const start = matches[i];
    const end = start + searchInput.value.length;
    ed.focus();
    ed.setSelectionRange(start, end);
    updateCount();
    // Scroll textarea to show match
    const lh = parseInt(getComputedStyle(ed).lineHeight) || 18;
    const line = ed.value.substring(0, start).split('\n').length - 1;
    ed.scrollTop = Math.max(0, line * lh - ed.clientHeight / 2);
  }

  function goNext() { if (!matches.length) return; selectMatch((idx + 1) % matches.length); }
  function goPrev() { if (!matches.length) return; selectMatch((idx - 1 + matches.length) % matches.length); }

  function updateCount() {
    countEl.textContent = matches.length ? `${idx + 1} of ${matches.length}` : (searchInput.value ? '0 results' : '');
  }

  function toggleCase() {
    caseSensitive = !caseSensitive;
    document.getElementById('srCase').style.opacity = caseSensitive ? '1' : '0.45';
    runSearch();
  }

  function replaceOne() {
    if (!matches.length) return;
    const ed = document.getElementById('ed');
    const start = matches[idx];
    const end = start + searchInput.value.length;
    if (ed.selectionStart !== start || ed.selectionEnd !== end) { selectMatch(idx); return; }
    const val = ed.value;
    ed.value = val.substring(0, start) + replaceInput.value + val.substring(end);
    ed.dispatchEvent(new Event('input'));
    runSearch();
  }

  function replaceAll() {
    if (!matches.length) return;
    const ed = document.getElementById('ed');
    const flags = caseSensitive ? 'g' : 'gi';
    const re = new RegExp(escapeRegex(searchInput.value), flags);
    ed.value = ed.value.replace(re, replaceInput.value);
    ed.dispatchEvent(new Event('input'));
    runSearch();
  }

  // Global Ctrl+F
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); openBar(); }
    if (e.key === 'Escape' && bar && !bar.hidden) closeBar();
  });
})();
