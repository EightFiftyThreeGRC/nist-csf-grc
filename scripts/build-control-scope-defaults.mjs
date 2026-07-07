/**
 * Generate js/control-scope-defaults.js — default asset & process type coverage per NIST control.
 *
 * Edit scripts/control-scope-defaults.rules.json (family rules + per-control overrides), then:
 *   npm run build:control-scope-defaults
 *
 * Output is loaded by the app before controls.js; defaults apply when a control owner opens
 * a control whose scope has not been customized yet.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORE_PATH = path.join(ROOT, 'js', 'core.js');
const RULES_PATH = path.join(ROOT, 'scripts', 'control-scope-defaults.rules.json');
const OUT_PATH = path.join(ROOT, 'js', 'control-scope-defaults.js');

const BASELINE_COUNTS = { L: 149, M: 287, H: 370 };

function loadControlsCatalog() {
  const src = fs.readFileSync(CORE_PATH, 'utf8');
  const m = src.match(/const CONTROLS = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('Could not parse CONTROLS from js/core.js');
  return Function('return ' + m[1])();
}

function uniq(arr) {
  const out = [];
  const seen = {};
  (arr || []).forEach(function (k) {
    if (!k || seen[k]) return;
    seen[k] = true;
    out.push(k);
  });
  return out;
}

function expandAssetGroups(rules, groupNames, flatKeys) {
  const out = (flatKeys || []).slice();
  (groupNames || []).forEach(function (name) {
    const g = rules.assetTypeGroups[name];
    if (Array.isArray(g)) out.push(...g);
    else if (typeof g === 'string') out.push(g);
  });
  return uniq(out);
}

function resolveProcesses(rules, processNames) {
  const map = rules.processTypes || {};
  return uniq((processNames || []).map(function (n) { return map[n]; }).filter(Boolean));
}

function isPolicyProceduresControl(id) {
  return /^[A-Z]{2}-1$/.test(String(id || '').trim());
}

function parentFamily(id) {
  return String(id || '').replace(/-\d.*/, '').replace(/\(.*/, '');
}

function buildDefaultsForControl(rules, ctrl) {
  const overrides = (rules.controlOverrides || {})[ctrl.id] || {};
  let assetKeys = [];
  let processKeys = [];

  if (isPolicyProceduresControl(ctrl.id)) {
    processKeys = resolveProcesses(rules, (rules.policyProceduresRule || {}).processes || ['governance']);
  } else {
    const famRule = (rules.familyRules || {})[ctrl.f] || { assetGroups: ['appsCore'], processes: ['config'] };
    assetKeys = expandAssetGroups(rules, famRule.assetGroups, famRule.assetTypes);
    processKeys = resolveProcesses(rules, famRule.processes);
  }

  if (overrides.replaceAssetGroups) {
    assetKeys = expandAssetGroups(rules, overrides.replaceAssetGroups, overrides.replaceAssetTypes);
  } else {
    assetKeys = uniq(assetKeys.concat(expandAssetGroups(rules, overrides.addAssetGroups, overrides.addAssetTypes)));
  }

  if (overrides.replaceProcesses) {
    processKeys = resolveProcesses(rules, overrides.replaceProcesses);
  } else {
    processKeys = uniq(processKeys.concat(resolveProcesses(rules, overrides.addProcesses)));
  }

  if (overrides.removeTypes) {
    const remove = {};
    (overrides.removeTypes || []).forEach(function (k) { remove[k] = true; });
    assetKeys = assetKeys.filter(function (k) { return !remove[k]; });
    processKeys = processKeys.filter(function (k) { return !remove[k]; });
  }

  return uniq(assetKeys.concat(processKeys));
}

function countBaselined(controls) {
  const counts = { L: 0, M: 0, H: 0 };
  controls.forEach(function (c) {
    (c.bl || []).forEach(function (b) {
      if (counts[b] != null) counts[b]++;
    });
  });
  return counts;
}

function main() {
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
  const controls = loadControlsCatalog();
  const baselined = countBaselined(controls.filter(function (c) {
    return (c.bl || []).some(function (b) { return b === 'L' || b === 'M' || b === 'H'; });
  }));

  const byControl = {};
  let missing = 0;
  controls.forEach(function (c) {
    const inLmh = (c.bl || []).some(function (b) { return b === 'L' || b === 'M' || b === 'H'; });
    if (!inLmh) return;
    const types = buildDefaultsForControl(rules, c);
    if (!types.length) {
      missing++;
      console.warn('WARN no defaults for', c.id, '(' + c.f + ')');
    }
    byControl[c.id] = { types: types, family: c.f, baselines: (c.bl || []).filter(function (b) { return b === 'L' || b === 'M' || b === 'H'; }) };
  });

  Object.keys(BASELINE_COUNTS).forEach(function (b) {
    const expected = BASELINE_COUNTS[b];
    const actual = baselined[b];
    if (actual !== expected) {
      console.warn('WARN baseline ' + b + ' count: catalog=' + actual + ' expected=' + expected + ' (update BASELINE_COUNTS or catalog if intentional)');
    }
  });

  const payload = {
    meta: {
      version: 1,
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceRules: 'scripts/control-scope-defaults.rules.json',
      controlCount: Object.keys(byControl).length,
      baselinedCounts: baselined,
      emptyDefaults: missing,
    },
    byControl: byControl,
  };

  const js = ''
    + '// Auto-generated by npm run build:control-scope-defaults — do not edit by hand.\n'
    + '// Regenerate after editing scripts/control-scope-defaults.rules.json\n'
    + 'var CONTROL_SCOPE_DEFAULTS = '
    + JSON.stringify(payload, null, 2)
    + ';\n';

  fs.writeFileSync(OUT_PATH, js, 'utf8');
  console.log('Wrote ' + OUT_PATH);
  console.log('Controls with defaults:', Object.keys(byControl).length);
  console.log('Baselined counts L/M/H:', baselined.L + '/' + baselined.M + '/' + baselined.H);
  if (missing) console.log('Controls with empty defaults:', missing);
}

main();
