#!/bin/sh
# Run the headless engine tests.
#
#   ./tests/run.sh              run every *.test.js
#   ./tests/run.sh engine       run tests/engine.test.js only
#
# The engine files are concatenated with tests/stubs.js and executed outside a
# browser. node is used when it is available, otherwise osascript falls back to
# JavaScriptCore, which is present on any macOS install. Exits non zero if a
# suite reports a failure.

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Tests that read example files need the repo root, and JavaScriptCore has no
# equivalent of __dirname, so it is injected here.
printf 'var TEST_ROOT = "%s";\n' "$ROOT" > "$TMP/root.js"

# The engine files are named relative to the repo root, and every path is
# quoted, so a space in the path to the repo does not split them.
cd "$ROOT"

if [ -n "$1" ]; then
  set -- "tests/$1.test.js"
else
  set -- tests/*.test.js
fi

STATUS=0
for suite in "$@"; do
  name=$(basename "$suite" .test.js)
  # Load order matters: core.js first, then everything that depends on it.
  cat "$TMP/root.js" tests/stubs.js \
      core/cpu/core.js core/cpu/decode.js core/cpu/alu.js \
      core/io/state.js core/io/ports.js \
      core/cpu/int28.js core/cpu/exec.js \
      core/assembler/parser.js core/assembler/encoder.js \
      "$suite" > "$TMP/$name.js"
  if command -v node >/dev/null 2>&1; then
    out=$(node "$TMP/$name.js")
  else
    out=$(osascript -l JavaScript "$TMP/$name.js")
  fi
  echo "$out"
  case "$out" in
    *'"failed": 0'*) ;;
    *) STATUS=1 ;;
  esac
done

exit $STATUS
