// ============================================================
// workbench86 Highlighter Render - Syntax highlighting functions
// ============================================================

function currentFileType() {
  if (!activeTabKey) return 'asm';
  if (activeTabKey.endsWith('.c') || activeTabKey.endsWith('.cpp')) return 'c';
  if (activeTabKey.endsWith('.py')) return 'py';
  if (activeTabKey.endsWith('.java')) return 'java';
  if (activeTabKey.endsWith('.go')) return 'go';
  return 'asm';
}
function isHighLevelFile() { return currentFileType() !== 'asm'; }

function highlightLineC(line) {
  let trimmed = line.trimStart();
  if (trimmed.startsWith('//')) return esc(line.substring(0, line.length - trimmed.length)) + `<span class="hl-c">${esc(trimmed)}</span>`;
  if (trimmed.startsWith('/*')) return `<span class="hl-c">${esc(line)}</span>`;
  if (trimmed.startsWith('*') || trimmed.startsWith('*/')) return `<span class="hl-c">${esc(line)}</span>`;
  if (trimmed.startsWith('#')) return `<span class="hl-d">${esc(line)}</span>`;

  let result = line.replace(/("[^"]*"|'[^']*')|(0[xX][0-9A-Fa-f]+|\b[0-9]+\b)|(\b[A-Za-z_]\w*\b)(\s*\()?|(->|<<|>>|&&|\|\||[!=<>]=)/g,
    function(m, str, num, word, paren, op) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (op) return `<span class="hl-p">${esc(op)}</span>`;
      if (word) {
        if (C_KEYWORDS.has(word)) return `<span class="hl-k">${esc(word)}</span>` + (paren || '');
        if (C_TYPES.has(word)) return `<span class="hl-d">${esc(word)}</span>` + (paren || '');
        if (paren) return `<span class="hl-d">${esc(word)}</span>` + paren;
        return esc(word);
      }
      return esc(m);
    }
  );
  return result;
}

function highlightLineGeneric(line, keywords, commentStr, blockComment, builtins) {
  let trimmed = line.trimStart();
  if (trimmed.startsWith(commentStr)) return esc(line.substring(0, line.length - trimmed.length)) + `<span class="hl-c">${esc(trimmed)}</span>`;
  if (blockComment && (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/'))) return `<span class="hl-c">${esc(line)}</span>`;
  if (trimmed.startsWith('@')) return `<span class="hl-d">${esc(line)}</span>`;

  let result = line.replace(/("[^"]*"|'[^']*'|`[^`]*`)|(0[xX][0-9A-Fa-f]+|\b[0-9]+\.?[0-9]*\b)|(\b[A-Za-z_]\w*\b)(\s*\()?|(:=|->|<<|>>|&&|\|\||[!=<>]=)/g,
    function(m, str, num, word, paren, op) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (op) return `<span class="hl-p">${esc(op)}</span>`;
      if (word) {
        if (keywords.has(word)) return `<span class="hl-k">${esc(word)}</span>` + (paren || '');
        if (builtins && builtins.has(word)) return `<span class="hl-d">${esc(word)}</span>` + (paren || '');
        if (paren) return `<span class="hl-d">${esc(word)}</span>` + paren;
        if (/^[A-Z]/.test(word)) return `<span class="hl-l">${esc(word)}</span>`;
        return esc(word);
      }
      return esc(m);
    }
  );
  return result;
}

function highlightLine(line) {
  let ft = currentFileType();
  if (ft === 'c') return highlightLineC(line);
  if (ft === 'py') return highlightLineGeneric(line, PY_KEYWORDS, '#', false, PY_BUILTINS);
  if (ft === 'java') return highlightLineGeneric(line, JAVA_KEYWORDS, '//', true, JAVA_TYPES);
  if (ft === 'go') return highlightLineGeneric(line, GO_KEYWORDS, '//', false, GO_BUILTINS);

  // ASM highlighting
  let ci = -1;
  let inStr = false, strCh = '';
  for (let i = 0; i < line.length; i++) {
    let c = line[i];
    if (inStr) { if (c === strCh) inStr = false; }
    else if (c === "'" || c === '"') { inStr = true; strCh = c; }
    else if (c === ';') { ci = i; break; }
  }
  let code = ci >= 0 ? line.substring(0, ci) : line;
  let comment = ci >= 0 ? line.substring(ci) : '';

  let result = code.replace(/('[^']*'|"[^"]*")|(\$)|(\b[0-9][0-9A-Fa-f]*[Hh]\b|\b0[Xx][0-9A-Fa-f]+\b|\b[0-9]+[Bb]\b|\b[0-9]+\b)|(\.[A-Za-z_]\w*)|(\b[A-Za-z_]\w*\b)/g,
    function(m, str, dollar, num, dotword, word) {
      if (str) return `<span class="hl-s">${esc(str)}</span>`;
      if (dollar) return `<span class="hl-n">$</span>`;
      if (num) return `<span class="hl-n">${esc(num)}</span>`;
      if (dotword) return `<span class="hl-l">${esc(dotword)}</span>`;
      if (word) {
        let u = word.toUpperCase();
        if (HL_KEYWORDS.has(u)) return `<span class="hl-k">${esc(word)}</span>`;
        if (HL_REGS.has(u)) return `<span class="hl-r">${esc(word)}</span>`;
        if (HL_DIRS.has(u)) return `<span class="hl-d">${esc(word)}</span>`;
        let occCls = (window._highlightedSymbol && u === window._highlightedSymbol) ? ' hl-occ' : '';
        return `<span class="hl-l${occCls}">${esc(word)}</span>`;
      }
      return esc(m);
    }
  );

  if (comment) result += `<span class="hl-c">${esc(comment)}</span>`;
  return result;
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function updateHighlight() {
  let lines = ed.value.split('\n');
  edHL.innerHTML = lines.map(l => highlightLine(l)).join('\n') + '\n';
}

function syncScroll() {
  lns.scrollTop = ed.scrollTop;
  edHL.scrollTop = ed.scrollTop;
  edHL.scrollLeft = ed.scrollLeft;
}
