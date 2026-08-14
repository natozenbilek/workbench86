// Example corpus regression.
//
// Every program listed in examples/manifest.json must assemble without an
// error and then execute without hitting an unknown opcode or an unimplemented
// path. Programs that end in a deliberate infinite loop (the LED and timer
// sketches) are simply cut off at the step cap, which is not a failure.

var STEP_CAP = 100000;

function readFile(path) {
  if (IS_JXA) {
    ObjC.import('Foundation');
    var s = $.NSString.alloc.initWithContentsOfFile(path);
    return s ? ObjC.unwrap(s) : null;
  }
  try { return require('fs').readFileSync(path, 'utf8'); } catch (e) { return null; }
}

var manifestText = readFile(TEST_ROOT + '/examples/manifest.json');
check('manifest is readable', manifestText !== null, true);

var manifest = manifestText ? JSON.parse(manifestText) : [];
check('manifest is not empty', manifest.length > 0, true);

for (var i = 0; i < manifest.length; i++) {
  var entry = manifest[i];
  var src = readFile(TEST_ROOT + '/examples/' + entry.file);

  if (src === null) { check(entry.file + ' is on disk', false, true); continue; }

  var res = assemble(src);
  if (!res.ok) { check(entry.file + ' assembles', res.log, 'assembled'); continue; }

  var problem = null, steps = 0;
  try {
    while (!halt && steps < STEP_CAP) {
      execOne();
      steps++;
      if (/^\?\?\?/.test(curInstr) || /Unimplemented/.test(curDesc)) {
        problem = curInstr + ' :: ' + curDesc;
        break;
      }
    }
  } catch (e) {
    problem = 'exception: ' + String(e);
  }

  check(entry.file + ' runs clean', problem, null);
}

report('examples');
