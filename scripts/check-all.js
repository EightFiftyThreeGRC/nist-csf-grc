const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jsDir = path.join(__dirname, '..', 'js');
const files = fs.readdirSync(jsDir).filter(function(f) { return f.endsWith('.js'); }).sort();
var failed = 0;

files.forEach(function(f) {
  var fp = path.join(jsDir, f);
  try {
    execSync('node --check "' + fp + '"', { stdio: 'pipe' });
    console.log('OK  js/' + f);
  } catch (e) {
    console.error('FAIL js/' + f);
    failed++;
  }
});

if (failed) process.exit(1);
console.log('All ' + files.length + ' JS modules passed syntax check.');
