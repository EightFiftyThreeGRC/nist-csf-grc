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
const COSAIS_PATH = path.join(ROOT, 'scripts', 'cosais-overlay-controls.json');
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

/** Normalize COSAiS-style IDs (AC-06, SA-11(02)) to catalog ids (AC-6, SA-11(2)). */
function normalizeCosaisControlId(raw, catalogIdSet) {
  var id = String(raw || '').trim();
  if (!id) return null;
  if (catalogIdSet.has(id)) return id;
  var upper = id.toUpperCase();
  var m = upper.match(/^([A-Z]{2})-0*(\d+(?:\(\d+\))?)$/);
  if (m) {
    var enh = '';
    var baseNum = m[2];
    var paren = baseNum.match(/^(\d+)\((\d+)\)$/);
    if (paren) {
      baseNum = String(parseInt(paren[1], 10));
      enh = '(' + parseInt(paren[2], 10) + ')';
    }
    var candidate = m[1] + '-' + baseNum + enh;
    if (catalogIdSet.has(candidate)) return candidate;
    for (var cid of catalogIdSet) {
      if (cid.toUpperCase() === candidate) return cid;
    }
  }
  for (var cid2 of catalogIdSet) {
    if (cid2.toUpperCase() === upper) return cid2;
  }
  return null;
}

function resolveCosaisAssetTypes(cosais, row) {
  if (!row) return [];
  if (Array.isArray(row.assetTypes) && row.assetTypes.length) return row.assetTypes.slice();
  if (row.preset && cosais.presets && Array.isArray(cosais.presets[row.preset])) {
    return cosais.presets[row.preset].slice();
  }
  if (Array.isArray(row.useCases) && cosais.meta && cosais.meta.useCaseAssetTypes) {
    var out = [];
    row.useCases.forEach(function (uc) {
      var types = cosais.meta.useCaseAssetTypes[uc];
      if (types) out.push(...types);
    });
    return uniq(out);
  }
  return [];
}

function loadCosaisOverlay(catalogControls) {
  if (!fs.existsSync(COSAIS_PATH)) return { byControl: {}, meta: {}, presets: {} };
  const raw = JSON.parse(fs.readFileSync(COSAIS_PATH, 'utf8'));
  const catalogIdSet = new Set(catalogControls.map(function (c) { return c.id; }));
  const byControl = {};
  var skipped = 0;
  Object.keys(raw.byControl || {}).forEach(function (rawId) {
    const canonical = normalizeCosaisControlId(rawId, catalogIdSet);
    if (!canonical) {
      console.warn('WARN COSAiS control not in catalog:', rawId);
      skipped++;
      return;
    }
    const row = raw.byControl[rawId];
    byControl[canonical] = {
      assetTypes: resolveCosaisAssetTypes(raw, row),
      useCases: row.useCases || [],
      source: row.source || '',
    };
  });
  return {
    meta: raw.meta || {},
    presets: raw.presets || {},
    byControl: mergeCosaisEnhancementsIntoBases(byControl),
    skipped: skipped,
  };
}

/** If an enhancement is in the overlay, merge its AI types onto the base control (e.g. SA-11(2) → SA-11). */
function mergeCosaisEnhancementsIntoBases(byControl) {
  const merged = Object.assign({}, byControl);
  Object.keys(byControl).forEach(function (id) {
    const m = id.match(/^(.+)\(\d+\)$/);
    if (!m) return;
    const baseId = m[1];
    const enh = byControl[id];
    if (!enh || !enh.assetTypes || !enh.assetTypes.length) return;
    if (!merged[baseId]) {
      merged[baseId] = { assetTypes: [], useCases: enh.useCases || [], source: 'merged from ' + id };
    }
    merged[baseId].assetTypes = uniq(merged[baseId].assetTypes.concat(enh.assetTypes));
    merged[baseId].useCases = uniq((merged[baseId].useCases || []).concat(enh.useCases || []));
  });
  return merged;
}

function applyCosaisOverlay(cosais, ctrl, typeKeys) {
  if (!cosais || !cosais.byControl) return typeKeys;
  const row = cosais.byControl[ctrl.id];
  if (!row || !row.assetTypes || !row.assetTypes.length) return typeKeys;
  return uniq(typeKeys.concat(row.assetTypes));
}

function buildDefaultsForControl(rules, cosais, ctrl) {
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

  var merged = uniq(assetKeys.concat(processKeys));
  merged = applyCosaisOverlay(cosais, ctrl, merged);
  return merged;
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
  const cosais = loadCosaisOverlay(controls);
  const baselined = countBaselined(controls.filter(function (c) {
    return (c.bl || []).some(function (b) { return b === 'L' || b === 'M' || b === 'H'; });
  }));

  const byControl = {};
  const cosaisControls = [];
  let missing = 0;
  let withAiDefaults = 0;
  controls.forEach(function (c) {
    const inLmh = (c.bl || []).some(function (b) { return b === 'L' || b === 'M' || b === 'H'; });
    if (!inLmh) return;
    const types = buildDefaultsForControl(rules, cosais, c);
    if (!types.length) {
      missing++;
      console.warn('WARN no defaults for', c.id, '(' + c.f + ')');
    }
    var aiTypes = types.filter(function (k) { return String(k).indexOf('ai_') === 0; });
    if (aiTypes.length) withAiDefaults++;
    if (cosais.byControl[c.id]) cosaisControls.push(c.id);
    byControl[c.id] = {
      types: types,
      family: c.f,
      baselines: (c.bl || []).filter(function (b) { return b === 'L' || b === 'M' || b === 'H'; }),
      cosais: cosais.byControl[c.id] ? { assetTypes: aiTypes, useCases: cosais.byControl[c.id].useCases || [] } : null,
    };
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
      version: 2,
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceRules: 'scripts/control-scope-defaults.rules.json',
      cosaisOverlay: 'scripts/cosais-overlay-controls.json',
      controlCount: Object.keys(byControl).length,
      cosaisControlCount: cosaisControls.length,
      controlsWithAiDefaults: withAiDefaults,
      baselinedCounts: baselined,
      emptyDefaults: missing,
      cosaisSkipped: cosais.skipped || 0,
    },
    cosaisControls: cosaisControls.sort(),
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
  console.log('COSAiS overlay controls mapped:', cosaisControls.length);
  console.log('Controls with AI type defaults:', withAiDefaults);
  console.log('Baselined counts L/M/H:', baselined.L + '/' + baselined.M + '/' + baselined.H);
  if (missing) console.log('Controls with empty defaults:', missing);
  if (cosais.skipped) console.log('COSAiS controls skipped (not in catalog):', cosais.skipped);
}

main();
