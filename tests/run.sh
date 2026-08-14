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

# Load order matters: core.js first, then everything that depends on it.
ENGINE="$TMP/root.js
$ROOT/tests/stubs.js
$ROOT/core/cpu/core.js
$ROOT/core/cpu/decode.js
$ROOT/core/cpu/alu.js
$ROOT/core/io/state.js
$ROOT/core/io/ports.js
$ROOT/core/cpu/int28.js
$ROOT/core/cpu/exec.js
$ROOT/core/assembler/parser.js
$ROOT/core/assembler/encoder.js"

if [ -n "$1" ]; then
  SUITES="$ROOT/tests/$1.test.js"
else
  SUITES=$(ls "$ROOT"/tests/*.test.js)
fi

STATUS=0
for suite in $SUITES; do
  name=$(basename "$suite" .test.js)
  # shellcheck disable=SC2086
  cat $ENGINE "$suite" > "$TMP/$name.js"
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
