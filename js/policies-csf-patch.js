// js/policies-csf-patch.js — CSF adaptations for domain policies wizard

function getDomainPolicySelectableControls(allFams) {
  if (state.policyStructure === 'function') {
    return getActiveSubcategories().filter(function(s) {
      return allFams.indexOf(s.fn) !== -1;
    }).map(function(s) {
      return { id: s.id, f: s.fn, cat: s.cat, n: s.n };
    });
  }
  return getActiveSubcategories().filter(function(s) {
    return allFams.indexOf(s.cat) !== -1;
  }).map(function(s) {
    return { id: s.id, f: s.fn, cat: s.cat, n: s.n };
  });
}

function getPolicyAllFamilies(fam) {
  return getPolicyAllUnits(fam);
}

function policyUnitDefaultTitle(unit) {
  if (state.policyStructure === 'function') {
    return (FUNCTIONS && FUNCTIONS[unit]) ? FUNCTIONS[unit] + ' Policy' : unit + ' Policy';
  }
  var cat = typeof getCategoryById === 'function' ? getCategoryById(unit) : null;
  return cat ? cat.name + ' Policy' : unit + ' Policy';
}

function getCategoryLabel(unit) {
  if (!unit) return '';
  if (state.policyStructure === 'function') {
    return (FUNCTIONS && FUNCTIONS[unit]) || unit;
  }
  var cat = typeof getCategoryById === 'function' ? getCategoryById(unit) : null;
  return cat ? cat.name : unit;
}

function getPolicyUnitBadgeTitle(unit) {
  var label = getCategoryLabel(unit);
  var desc = (typeof CATEGORY_DESC !== 'undefined' && CATEGORY_DESC[unit]) || '';
  if (label && desc) return label + ' — ' + desc;
  return label || unit;
}

function getPolicyUnitScopeSummary(fam) {
  fam = fam || state._policyDomain;
  var units = typeof getPolicyAllFamilies === 'function' ? getPolicyAllFamilies(fam) : [fam];
  return units.map(function(u) { return getCategoryLabel(u); }).filter(Boolean).join(' · ');
}

function getPolicyUnitScopeDescription(fam) {
  fam = fam || state._policyDomain;
  var units = typeof getPolicyAllFamilies === 'function' ? getPolicyAllFamilies(fam) : [fam];
  var parts = units.map(function(u) {
    var desc = (typeof CATEGORY_DESC !== 'undefined' && CATEGORY_DESC[u]) || '';
    if (!desc) return '';
    return desc.length > 140 ? desc.slice(0, 137) + '…' : desc;
  }).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return parts.join(' ');
}

function getPolicyDefaultTitle(fam) {
  var merges = state.policyMerges || {};
  var slaves = Object.keys(merges).filter(function(k) { return merges[k] === fam; });
  if (slaves.length) {
    var preset = (typeof COMMON_CATEGORY_MERGES !== 'undefined' ? COMMON_CATEGORY_MERGES : []).find(function(m) {
      return m.master === fam && m.slaves && m.slaves.length === slaves.length && m.slaves.every(function(s) { return slaves.indexOf(s) !== -1; });
    });
    if (preset) return preset.label.indexOf(' Policy') === preset.label.length - 7 ? preset.label : preset.label + ' Policy';
    var names = [fam].concat(slaves).map(function(u) { return getCategoryLabel(u); }).filter(Boolean);
    return names.join(' & ') + ' Policy';
  }
  return policyUnitDefaultTitle(fam);
}

function getPolicyMergedTitle(fam) {
  if (state.domainCustomNames && state.domainCustomNames[fam]) return state.domainCustomNames[fam];
  var merges = state.policyMerges || {};
  var slaves = Object.keys(merges).filter(function(k) { return merges[k] === fam; });
  if (slaves.length) {
    var preset = (typeof COMMON_CATEGORY_MERGES !== 'undefined' ? COMMON_CATEGORY_MERGES : []).find(function(m) {
      return m.master === fam && m.slaves && m.slaves.length === slaves.length && m.slaves.every(function(s) { return slaves.indexOf(s) !== -1; });
    });
    if (preset) return preset.label.indexOf(' Policy') === preset.label.length - 7 ? preset.label : preset.label + ' Policy';
    var names = [fam].concat(slaves).map(function(u) { return getCategoryLabel(u); }).filter(Boolean);
    return names.join(' & ') + ' Policy';
  }
  return policyUnitDefaultTitle(fam);
}

function ctrlShortDesc(ctrlOrId) {
  var ctrlId = typeof ctrlOrId === 'string'
    ? ctrlOrId
    : (ctrlOrId && ctrlOrId.id ? ctrlOrId.id : '');
  if (!ctrlId) return '';
  var t = (typeof CSF_SUBCATEGORY_TEXT !== 'undefined' && CSF_SUBCATEGORY_TEXT[ctrlId]) || '';
  if (t) return t.length > 200 ? t.slice(0, 197) + '…' : t;
  var sub = typeof getSubcategoryById === 'function' ? getSubcategoryById(ctrlId) : null;
  if (sub && sub.n) return sub.n;
  if (ctrlOrId && typeof ctrlOrId === 'object' && ctrlOrId.n) return ctrlOrId.n;
  return ctrlId;
}

function generateDomainPolicyObjective(fam, cids) {
  var sorted = (cids || []).slice().filter(Boolean);
  if (!sorted.length) {
    return 'Write a short policy-level control objective in plain language. Map one or more CSF outcomes from this category using the tags above.';
  }
  // Prefer primary subcategory outcome statement from CSF 2.0 text
  var primaryId = sorted[0];
  var primaryText = (typeof CSF_SUBCATEGORY_TEXT !== 'undefined' && CSF_SUBCATEGORY_TEXT[primaryId]) || '';
  if (!primaryText) {
    var sub = typeof getSubcategoryById === 'function' ? getSubcategoryById(primaryId) : null;
    primaryText = sub && sub.n ? sub.n : ctrlShortDesc(primaryId);
  }
  var out = primaryText.replace(/\s+$/, '');
  if (out && !/[.!?]$/.test(out)) out += '.';
  if (sorted.length > 1) {
    out += ' Related outcomes ' + sorted.slice(1).join(', ')
      + ' are mapped to the same objective and must still be satisfied in control design.';
  }
  return out || ('Achieve CSF outcomes for ' + (fam || 'this category') + ': ' + sorted.join(', ') + '.');
}

// Extend DOMAIN_DEFAULTS lookup for CSF units
var _origDomainDefaultsLookup = function(fam) {
  return DOMAIN_DEFAULTS[fam] || DOMAIN_DEFAULT_GENERIC;
};

function getDomainDefaultsForUnit(fam) {
  var title = getPolicyMergedTitle(fam);
  var fn = state.policyStructure === 'function' ? fam : (fam.split('.')[0] || fam);
  var desc = (FUNCTION_DESC && FUNCTION_DESC[fn]) || (CATEGORY_DESC && CATEGORY_DESC[fam]) || '';
  return {
    title: title,
    purpose: 'This policy defines how ' + (state.orgName || 'the organization') + ' achieves CSF outcomes for ' + title + '.',
    scope: desc || 'All systems, personnel, and third parties within the scope of this policy unit.'
  };
}

function isControlInProgramBaseline(c) {
  if (!c) return false;
  if (!state.baseline || !c.bl || !c.bl.length) return true;
  return c.bl.includes(state.baseline) || (state.privacyOverlay && c.bl.includes('P'));
}

function getPolicyDefaultSelectedControls(allFamControls) {
  if (!allFamControls || !allFamControls.length) return [];
  if (state.baseline && allFamControls[0].bl && allFamControls[0].bl.length) {
    return allFamControls.filter(function(c) {
      return c.bl.includes(state.baseline) || (state.privacyOverlay && c.bl.includes('P'));
    });
  }
  return allFamControls;
}

function policyScopeCountLabel(count) {
  if (state.baseline) return count + ' control' + (count === 1 ? '' : 's') + ' in baseline';
  return count + ' subcategor' + (count === 1 ? 'y' : 'ies') + ' in scope';
}

function policyScopeMetaLine(count) {
  if (state.baseline) {
    var bl = state.baseline === 'L' ? 'Low' : (state.baseline === 'M' ? 'Moderate' : 'High');
    return count + ' controls \u00b7 ' + bl + ' baseline';
  }
  if (typeof getProgramBaselineLabel === 'function' && typeof getProgramScopeReady === 'function' && getProgramScopeReady()) {
    return count + ' subcategories \u00b7 ' + getProgramBaselineLabel();
  }
  return count + ' subcategories in scope';
}

// Patch initDomainPolicy to use CSF defaults when DOMAIN_DEFAULTS lacks fam key
if (typeof initDomainPolicy === 'function') {
  var _origInitDomainPolicy = initDomainPolicy;
  initDomainPolicy = function(fam) {
    if (!DOMAIN_DEFAULTS[fam]) {
      var dd = getDomainDefaultsForUnit(fam);
      DOMAIN_DEFAULTS[fam] = dd;
    }
    return _origInitDomainPolicy(fam);
  };
}
