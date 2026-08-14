// Headless stubs for running the workbench86 engine outside a browser.
//
// The engine files are plain scripts that share one global scope and touch a
// handful of browser and UI globals. This file supplies just enough of them
// that core/ can be concatenated and executed by a bare JavaScript runtime.
// It declares only names that are NOT declared anywhere in core/, so the
// concatenation never hits a redeclaration error.

var window = {};
var performance = { now: function () { return 0; } };
var __ed = { value: '' };
var __log = [];

var document = {
  getElementById: function (id) {
    if (id === 'ed') return __ed;
    return {
      value: '', textContent: '', style: {},
      classList: { add: function () {}, remove: function () {}, toggle: function () {} },
      addEventListener: function () {}, appendChild: function () {}, setAttribute: function () {}
    };
  },
  addEventListener: function () {},
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return { style: {}, classList: { add: function () {}, remove: function () {} }, appendChild: function () {} };
  },
  activeElement: null,
  body: { appendChild: function () {} }
};

// UI hooks the engine calls. They live in app/ in the browser.
function sLog(msg, lvl) { __log.push((lvl ? 'ERR: ' : '') + String(msg)); }
function setSt(s) {}
function renderAll() {}
function scrollToLine(n) {}
function updLn() { return 0; }
function currentFileType() { return 'asm'; }

// Serial bridge hooks. Never connected in a headless run.
var serialConnected = false;
var HW_PORTS = { has: function () { return false; } };
function serialWritePort() {}
function serialReadPort() { return { then: function () {} }; }

// --- test helpers -----------------------------------------------------------

var IS_JXA = (typeof ObjC !== 'undefined');

// Assemble a source string. Returns {ok, log}. Never throws.
function assemble(src) {
  __log = [];
  __ed.value = src;
  try { doAssemble(); } catch (e) { return { ok: false, log: 'exception: ' + String(e) }; }
  return {
    ok: __log.some(function (m) { return String(m).indexOf('Assembled') === 0; }),
    log: __log.join(' | ')
  };
}

// Execute until HLT or the step cap. Returns the number of steps taken.
function step(maxSteps) {
  var n = 0, cap = maxSteps || 5000;
  while (!halt && n < cap) { execOne(); n++; }
  return n;
}

// Read a byte through a segment and offset.
function peek(seg, off) { return mem[(((seg << 4) + off)) & 0xFFFFF]; }

function flags() {
  return { CF: FLAGS & 1, PF: (FLAGS >> 2) & 1, AF: (FLAGS >> 4) & 1,
           ZF: (FLAGS >> 6) & 1, SF: (FLAGS >> 7) & 1, OF: (FLAGS >> 11) & 1 };
}

// Collected assertions.
var CHECKS = [];
function check(name, actual, expected) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  CHECKS.push({ name: name, pass: a === e, actual: actual, expected: expected });
}

// Print a result. Under osascript the last expression of the file is printed,
// so every test file ends with a call to this.
function report(title) {
  var failed = CHECKS.filter(function (c) { return !c.pass; });
  var out = {
    suite: title,
    total: CHECKS.length,
    failed: failed.length,
    failures: failed
  };
  var s = JSON.stringify(out, null, 1);
  if (!IS_JXA && typeof console !== 'undefined' && console.log) console.log(s);
  return s;
}
