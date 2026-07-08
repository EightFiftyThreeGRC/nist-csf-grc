// js/ciso-csf-wizard.js — CSF 2.0 CISO wizard step overrides (loads after program.js)

var CISO_WIZARD_STEPS = 6;
var CISO_STEP_LABELS = ['Organization', 'Category scope', 'Govern outcomes', 'Governance Policy', 'Consolidate', 'Assign Owners'];

function ensureSelectedCategoriesSeeded() {
  if (!state.selectedCategories) {
    state.selectedCategories = typeof getDefaultSelectedCategories === 'function'
      ? getDefaultSelectedCategories() : {};
  }
}

function toggleCategoryScope(catId) {
  ensureSelectedCategoriesSeeded();
  state.selectedCategories[catId] = !state.selectedCategories[catId];
  markDirty();
  renderCISOStep2CategoryScope();
  renderSidebarBadges();
}

function selectAllCategories(val) {
  ensureSelectedCategoriesSeeded();
  CATEGORIES.forEach(function(c) { state.selectedCategories[c.id] = !!val; });
  markDirty();
  renderCISOStep2CategoryScope();
  renderSidebarBadges();
}

function renderCISOStep2CategoryScope() {
  var body = document.getElementById('ciso-step-2-body');
  if (!body) return;
  ensureSelectedCategoriesSeeded();
  var activeCount = getActiveCategories().length;
  var subCount = getActiveSubcategories().length;
  var fnOrder = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];
  var blocks = fnOrder.map(function(fn) {
    var cats = getCategoriesForFunction(fn);
    var fnDesc = (typeof FUNCTION_DESC !== 'undefined' && FUNCTION_DESC[fn]) ? FUNCTION_DESC[fn] : '';
    var rows = cats.map(function(c) {
      var on = !!state.selectedCategories[c.id];
      var subs = getSubcategoriesForCategory(c.id).length;
      var catDesc = (typeof CATEGORY_DESC !== 'undefined' && CATEGORY_DESC[c.id]) ? CATEGORY_DESC[c.id] : '';
      return '<label class="csf-scope-cat-card' + (on ? ' csf-scope-cat-card--on' : '') + '">'
        + '<input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="toggleCategoryScope(\'' + escapeHTML(c.id).replace(/'/g, "\\'") + '\')">'
        + '<div class="csf-scope-cat-body">'
        + '<div class="csf-scope-cat-title">' + escapeHTML(c.id) + ' — ' + escapeHTML(c.name) + '</div>'
        + (catDesc ? '<div class="csf-scope-cat-desc">' + escapeHTML(catDesc) + '</div>' : '')
        + '<div class="csf-scope-cat-meta">' + subs + ' subcategor' + (subs === 1 ? 'y' : 'ies') + '</div>'
        + '</div></label>';
    }).join('');
    return '<section class="csf-scope-fn-block">'
      + '<div class="csf-scope-fn-header">' + escapeHTML(fn) + ' — ' + escapeHTML(FUNCTIONS[fn] || fn) + '</div>'
      + (fnDesc ? '<p class="csf-scope-fn-desc">' + escapeHTML(fnDesc) + '</p>' : '')
      + '<div class="csf-scope-cat-grid">' + rows + '</div></section>';
  }).join('');

  body.innerHTML = cisoStepProgressHtml(2, 'Category scope')
    + '<div class="section-title">Select CSF categories in scope</div>'
    + '<div class="csf-scope-helper">'
    + '<p>Selecting all CSF categories is typical for a comprehensive cybersecurity program. You can tailor the list below to match your organization\u2019s scope and priorities.</p>'
    + '<p>Function and category policy owners will refine scope further during policy design by selecting or deselecting subcategories within their assigned areas.</p>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px;">'
    + '<button class="btn btn-secondary btn-sm" type="button" onclick="selectAllCategories(true)">Select all</button>'
    + '<button class="btn btn-secondary btn-sm" type="button" onclick="selectAllCategories(false)">Clear all</button>'
    + '</div>'
    + blocks
    + '<div class="summary-box" style="margin-top:16px;"><h3>Program scope</h3>'
    + '<div class="summary-kv"><span class="sk">Categories in scope:</span><span class="sv">' + activeCount + ' of ' + CATEGORIES.length + '</span></div>'
    + '<div class="summary-kv"><span class="sk">Subcategories in scope:</span><span class="sv">' + subCount + '</span></div></div>';
}

function renderCISOStep2Baseline() {
  renderCISOStep2CategoryScope();
}

function ensureGvSubcategoriesSeeded() {
  if (!state.gvSubcategories || !Object.keys(state.gvSubcategories).length) {
    state.gvSubcategories = typeof getDefaultGvSubcategories === 'function'
      ? getDefaultGvSubcategories() : {};
  }
}

function toggleGvSubcategory(subId) {
  ensureGvSubcategoriesSeeded();
  state.gvSubcategories[subId] = !state.gvSubcategories[subId];
  markDirty();
  renderCISOStep4Govern();
}

function selectAllGvSubcategories(val) {
  ensureGvSubcategoriesSeeded();
  SUBCATEGORIES.filter(function(s) { return s.fn === 'GV'; }).forEach(function(s) {
    state.gvSubcategories[s.id] = !!val;
  });
  markDirty();
  renderCISOStep4Govern();
}

function renderCISOStep4Govern() {
  var body = document.getElementById('ciso-step-3-body');
  if (!body) return;
  ensureGvSubcategoriesSeeded();
  var gvSubs = SUBCATEGORIES.filter(function(s) { return s.fn === 'GV'; });
  GV_CORE_SUBCATEGORIES.forEach(function(id) {
    if (state.gvSubcategories[id] === undefined) state.gvSubcategories[id] = true;
  });
  var rows = gvSubs.map(function(s) {
    var isCore = GV_CORE_SUBCATEGORIES.indexOf(s.id) !== -1;
    var text = (CSF_SUBCATEGORY_TEXT && CSF_SUBCATEGORY_TEXT[s.id]) || s.n;
    return '<tr' + (isCore ? ' style="background:rgba(13,148,136,0.04);"' : '') + '><td style="vertical-align:top;padding-top:12px;">'
      + '<label class="cb-label"><input type="checkbox" ' + (state.gvSubcategories[s.id] ? 'checked' : '')
      + ' onchange="state.gvSubcategories[\'' + escapeHTML(s.id).replace(/'/g, "\\'") + '\']=this.checked;markDirty();renderCISOStep4Govern();" style="accent-color:var(--teal);">'
      + '<span class="control-id">' + escapeHTML(s.id) + '</span>'
      + (isCore ? ' <span style="font-size:10px;background:var(--teal);color:white;padding:1px 5px;border-radius:8px;font-weight:700;">CORE</span>' : '')
      + '</label></td><td><div style="font-weight:600;font-size:13px;">' + escapeHTML(s.n) + '</div>'
      + '<div style="font-size:12px;color:var(--text-muted);margin-top:2px;line-height:1.4;">' + escapeHTML(text) + '</div></td></tr>';
  }).join('');
  var sel = Object.keys(state.gvSubcategories).filter(function(k) { return state.gvSubcategories[k]; }).length;
  body.innerHTML = cisoStepProgressHtml(3, 'Govern outcomes')
    + '<div class="section-title">Select Govern (GV) outcomes</div>'
    + '<div class="section-subtitle">These outcomes drive your Governance Policy. Core GV subcategories are pre-selected.</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
    + '<button class="btn btn-secondary btn-sm" type="button" onclick="selectAllGvSubcategories(true)">Select all GV</button>'
    + '<button class="btn btn-secondary btn-sm" type="button" onclick="selectAllGvSubcategories(false)">Clear all</button></div>'
    + '<div class="table-scroll"><table class="control-table"><thead><tr><th style="width:140px;">Subcategory</th><th>Outcome</th></tr></thead><tbody>'
    + rows + '</tbody></table></div>'
    + '<div class="summary-box" style="margin-top:16px;"><h3>Govern summary</h3>'
    + '<div class="summary-kv"><span class="sk">GV subcategories selected:</span><span class="sv">' + sel + ' of ' + gvSubs.length + '</span></div></div>';
}

function renderCISOStep2() {
  renderCISOStep4Govern();
}

function getDefaultISPTitle() {
  return 'Cybersecurity Governance Policy';
}

function setPolicyStructure(mode) {
  if (mode !== 'function' && mode !== 'category') return;
  if (state.policyStructure === mode) return;
  if (state.domainOwners && Object.keys(state.domainOwners).some(function(k) {
    var o = state.domainOwners[k];
    return o && (o.email || o.name);
  })) {
    if (!confirm('Changing policy architecture will reset domain owner assignments and merge settings. Continue?')) return;
    state.domainOwners = {};
    state.policyMerges = {};
    state.categoryMerges = {};
    state.domainPolicies = null;
    state.policySelectedControls = null;
  }
  state.policyStructure = mode;
  syncCategoryMergesToPolicyMerges();
  markDirty();
  if (typeof renderCISOStep3 === 'function') renderCISOStep3();
}

function renderPolicyArchitectureCard() {
  var ps = state.policyStructure || 'category';
  return '<div class="summary-box" style="margin:16px 0;border:2px solid var(--teal);">'
    + '<h3>Policy architecture</h3>'
    + '<div class="section-subtitle" style="margin-bottom:12px;">Choose how function or category policies are organized for the rest of the program.</div>'
    + '<label style="display:block;margin-bottom:8px;cursor:pointer;"><input type="radio" name="policyStructure" value="function" '
    + (ps === 'function' ? 'checked' : '') + ' onchange="setPolicyStructure(\'function\')" style="margin-right:8px;">'
    + '<strong>One policy per function</strong> — up to 6 policies (GV, ID, PR, DE, RS, RC)</label>'
    + '<label style="display:block;cursor:pointer;"><input type="radio" name="policyStructure" value="category" '
    + (ps === 'category' ? 'checked' : '') + ' onchange="setPolicyStructure(\'category\')" style="margin-right:8px;">'
    + '<strong>One policy per category</strong> — up to 22 policies (e.g. GV.OC, PR.AA)</label></div>';
}

var _origRenderCISOStep3 = typeof renderCISOStep3 === 'function' ? renderCISOStep3 : null;

/** Consolidated Govern-policy requirement groups — each maps multiple CSF GV subcategories. */
var GV_GOVERN_REQUIREMENT_GROUPS = [
  {
    subcategories: ['GV.OC-01', 'GV.OC-04', 'GV.OC-05'],
    text: '{org} shall maintain understanding of its mission, critical objectives, and dependencies on services and capabilities it relies on or that stakeholders expect, and shall use that context to inform cybersecurity risk management.'
  },
  {
    subcategories: ['GV.OC-02', 'GV.OC-03'],
    text: '{org} shall identify internal and external stakeholders, understand their cybersecurity expectations, and manage applicable legal, regulatory, contractual, and privacy obligations.'
  },
  {
    subcategories: ['GV.RM-01', 'GV.RM-02', 'GV.RM-04'],
    text: '{org} shall establish cybersecurity risk management objectives, risk appetite and tolerance statements, and strategic direction for risk response options, and shall communicate these to organizational stakeholders.'
  },
  {
    subcategories: ['GV.RM-03', 'GV.RM-07'],
    text: '{org} shall integrate cybersecurity risk management into enterprise risk management processes and include characterization of strategic opportunities (positive risks) in cybersecurity risk discussions.'
  },
  {
    subcategories: ['GV.RM-05', 'GV.RM-06'],
    text: '{org} shall establish lines of communication for cybersecurity risks across the organization—including supplier and third-party risks—and maintain a standardized method to calculate, document, categorize, and prioritize cybersecurity risks.'
  },
  {
    subcategories: ['GV.RR-01', 'GV.RR-02'],
    text: '{org} shall assign leadership accountability for cybersecurity risk, foster a risk-aware and continually improving culture, and establish roles, responsibilities, and authorities that are communicated, understood, and enforced.'
  },
  {
    subcategories: ['GV.RR-03', 'GV.RR-04'],
    text: '{org} shall allocate resources commensurate with its cybersecurity risk strategy and include cybersecurity in human resources practices.'
  },
  {
    subcategories: ['GV.PO-01', 'GV.PO-02'],
    text: '{org} shall establish, communicate, and enforce policy for managing cybersecurity risks based on organizational context and strategy, and shall review and update that policy to reflect changes in requirements, threats, technology, and mission.'
  },
  {
    subcategories: ['GV.OV-01', 'GV.OV-02', 'GV.OV-03'],
    text: '{org} shall periodically review cybersecurity risk management strategy outcomes, organizational risk coverage, and program performance, adjusting strategy and direction as needed.'
  },
  {
    subcategories: ['GV.SC-01', 'GV.SC-03', 'GV.SC-09'],
    text: '{org} shall establish a cybersecurity supply chain risk management program integrated with enterprise and cybersecurity risk management, and shall monitor supplier security practices throughout the technology life cycle.'
  },
  {
    subcategories: ['GV.SC-02', 'GV.SC-08'],
    text: '{org} shall define and coordinate cybersecurity roles and responsibilities with suppliers, customers, and partners, and include relevant third parties in incident planning, response, and recovery activities.'
  },
  {
    subcategories: ['GV.SC-04', 'GV.SC-06', 'GV.SC-10'],
    text: '{org} shall identify and prioritize suppliers by criticality, perform due diligence before entering supplier relationships, and plan for supply chain risk activities after partnerships or service agreements end.'
  },
  {
    subcategories: ['GV.SC-05', 'GV.SC-07'],
    text: '{org} shall establish contractual requirements to address supply chain cybersecurity risks and shall assess, respond to, and monitor supplier-related risks throughout each relationship.'
  }
];

function getActiveGvSubcategoryIds() {
  ensureGvSubcategoriesSeeded();
  return Object.keys(state.gvSubcategories || {}).filter(function(k) { return state.gvSubcategories[k]; });
}

function buildConsolidatedGvRequirements(activeGvIds, orgNameVal) {
  orgNameVal = orgNameVal || 'the organization';
  var activeSet = {};
  (activeGvIds || []).forEach(function(id) { activeSet[id] = true; });
  var reqs = [];
  GV_GOVERN_REQUIREMENT_GROUPS.forEach(function(group) {
    var activeInGroup = group.subcategories.filter(function(id) { return activeSet[id]; });
    if (!activeInGroup.length) return;
    var text = group.text.replace(/\{org\}/g, orgNameVal);
    var refs = activeInGroup.join(', ');
    reqs.push({
      id: 'GV-REQ-' + (reqs.length + 1),
      text: text + ' [NIST CSF 2.0: ' + refs + ']',
      subcategories: activeInGroup.slice(),
      controls: activeInGroup.slice()
    });
  });
  return reqs;
}

function isVerbatimGvRequirement(req) {
  var ids = (req.controls || []).concat(req.subcategories || []);
  if (ids.length !== 1) return false;
  var subId = ids[0];
  if (!/^GV\./.test(String(subId))) return false;
  var verbatim = CSF_SUBCATEGORY_TEXT && CSF_SUBCATEGORY_TEXT[subId];
  return !!(verbatim && String(req.text || '').trim() === String(verbatim).trim());
}

function migrateVerbatimGvRequirementsIfNeeded() {
  var isp = state.infoSecPolicy;
  if (!isp || !isp.requirements || isp._gvRequirementsConsolidated) return false;
  var gvOnly = isp.requirements.filter(function(r) {
    var ids = (r.controls || []).concat(r.subcategories || []);
    return ids.length && ids.every(function(id) { return /^GV\./.test(String(id)); });
  });
  if (gvOnly.length < 3) return false;
  var verbatimCount = gvOnly.filter(isVerbatimGvRequirement).length;
  if (verbatimCount < Math.ceil(gvOnly.length * 0.75)) return false;
  var otherReqs = isp.requirements.filter(function(r) {
    var ids = (r.controls || []).concat(r.subcategories || []);
    return !ids.length || !ids.every(function(id) { return /^GV\./.test(String(id)); });
  });
  isp.requirements = otherReqs.concat(buildConsolidatedGvRequirements(getActiveGvSubcategoryIds(), state.orgName || 'the organization'));
  isp._gvRequirementsConsolidated = true;
  if (typeof renumberReqs === 'function') renumberReqs();
  if (typeof markDirty === 'function') markDirty();
  return true;
}

function draftUnmappedGvRequirements(rerender) {
  var isp = state.infoSecPolicy;
  if (!isp || !isp.requirements) return 0;
  migrateVerbatimGvRequirementsIfNeeded();
  var allActive = getActiveGvSubcategoryIds();
  var mapped = isp.requirements.flatMap(function(r) { return (r.controls || []).concat(r.subcategories || []); });
  var unmapped = allActive.filter(function(id) { return mapped.indexOf(id) < 0; });
  if (!unmapped.length) return 0;
  var orgNameVal = state.orgName || 'the organization';
  var unmappedSet = {};
  unmapped.forEach(function(id) { unmappedSet[id] = true; });
  var added = 0;
  GV_GOVERN_REQUIREMENT_GROUPS.forEach(function(group) {
    var unmappedInGroup = group.subcategories.filter(function(id) { return unmappedSet[id]; });
    if (!unmappedInGroup.length) return;
    var activeInGroup = group.subcategories.filter(function(id) { return allActive.indexOf(id) >= 0; });
    var existing = isp.requirements.find(function(r) {
      var ids = (r.controls || []).concat(r.subcategories || []);
      return group.subcategories.some(function(id) { return ids.indexOf(id) >= 0; });
    });
    if (existing) {
      unmappedInGroup.forEach(function(id) {
        if (!existing.controls) existing.controls = [];
        if (existing.controls.indexOf(id) < 0) {
          existing.controls.push(id);
          added++;
        }
        if (!existing.subcategories) existing.subcategories = [];
        if (existing.subcategories.indexOf(id) < 0) existing.subcategories.push(id);
      });
      return;
    }
    var text = group.text.replace(/\{org\}/g, orgNameVal);
    var refs = activeInGroup.join(', ');
    isp.requirements.push({
      id: 'GV-REQ-' + (isp.requirements.length + 1),
      text: text + ' [NIST CSF 2.0: ' + refs + ']',
      subcategories: activeInGroup.slice(),
      controls: activeInGroup.slice()
    });
    added += unmappedInGroup.length;
  });
  if (typeof renumberReqs === 'function') renumberReqs();
  markDirty();
  if (rerender !== false && typeof renderCISOStep3 === 'function') renderCISOStep3();
  return added;
}

function buildDefaultCsfInfoSecPolicy() {
  var orgNameVal = state.orgName || 'the organization';
  var ownerTitle = (state.programOwnerTitle || '').trim() || getDefaultProgramOwnerTitle();
  ensureGvSubcategoriesSeeded();
  var gvIds = getActiveGvSubcategoryIds();
  if (!gvIds.length && typeof GV_CORE_SUBCATEGORIES !== 'undefined') {
    gvIds = GV_CORE_SUBCATEGORIES.slice();
  }
  var reqs = buildConsolidatedGvRequirements(gvIds, orgNameVal);
  return {
    title: getDefaultISPTitle(),
    custodian: { name: '', role: '', email: '' },
    sections: [
      { type: 'purpose', title: 'Purpose', content: 'This policy establishes ' + orgNameVal + '\'s cybersecurity governance framework aligned to NIST CSF 2.0 Govern outcomes.' },
      { type: 'scope', title: 'Scope', content: 'Applies to all personnel, contractors, and systems involved in ' + orgNameVal + ' cybersecurity risk management.' },
      { type: 'roles', title: 'Roles & Responsibilities' },
      { type: 'requirements', title: 'Govern Policy Requirements' },
      { type: 'enforcement', title: 'Enforcement & Violations', content: typeof getDefaultISPEnforcementContent === 'function' ? getDefaultISPEnforcementContent(orgNameVal) : '' },
      { type: 'exceptions', title: 'Exceptions & Waivers', content: typeof getDefaultISPExceptionsContent === 'function' ? getDefaultISPExceptionsContent(orgNameVal) : '' },
      { type: 'documents', title: 'Related Documents & Standards' },
      { type: 'revision-history', title: 'Revision History' }
    ],
    roles: buildDefaultISPRoles(ownerTitle),
    requirements: reqs,
    documents: [
      { title: 'NIST Cybersecurity Framework 2.0', desc: 'Framework for managing and reducing cybersecurity risk.', url: 'https://www.nist.gov/cyberframework' }
    ]
  };
}

function buildDefaultISPRoles(ownerTitle) {
  return [
    { name: 'Executive Leadership', responsibilities: ['Approve cybersecurity governance policy', 'Allocate resources for the cybersecurity program', 'Accept enterprise-level cyber risk within delegated authority'] },
    { name: ownerTitle, responsibilities: ['Establish and maintain the organization\'s governance policy aligned to CSF Govern outcomes', 'Lead cybersecurity risk management strategy and oversight', 'Report program effectiveness to executive leadership'] },
    { name: 'Policy Owners', responsibilities: ['Develop and maintain function or category policies', 'Assign subcategory implementation owners', 'Submit policies for review and approval'] },
    { name: 'All Personnel', responsibilities: ['Comply with cybersecurity policies applicable to their role', 'Complete security awareness training', 'Report suspected incidents and policy violations'] }
  ];
}

function sanitizeCsfSetupPolicyCopy() {
  var isp = state.infoSecPolicy;
  if (!isp) return;
  if (isp.sections) {
    isp.sections.forEach(function(sec) {
      if (sec.type === 'purpose' && sec.content) {
        sec.content = sec.content
          .replace(/\s+and Tier 2 policy architecture\.?/gi, '.')
          .replace(/Tier 2 policy architecture\s+and\s+/gi, '');
      }
    });
  }
  if (isp.roles) {
    isp.roles.forEach(function(r) {
      if (!r.responsibilities) return;
      r.responsibilities = r.responsibilities.map(function(line) {
        return line
          .replace(/Tier 1 governance policy/gi, 'governance policy')
          .replace(/Tier 2 function or category policies/gi, 'function or category policies')
          .replace(/Establish and maintain Tier 1 governance policy/gi, 'Establish and maintain the organization\'s governance policy');
      });
    });
  }
}

function togglePrivacy() {}
function selectBaseline() {}
function toggleProgramFismaMode() {}
function resetPrivacyPMDefaults() {}
function getPrivacyPMDefaults() { return []; }

function selectAllPM(val) {
  ensureGvSubcategoriesSeeded();
  SUBCATEGORIES.filter(function(s) { return s.fn === 'GV'; }).forEach(function(s) {
    state.gvSubcategories[s.id] = !!val;
  });
  renderCISOStep4Govern();
}

// Patch cisoNext step 2 validation
(function patchCisoNext() {
  var orig = cisoNext;
  cisoNext = function(fromStep) {
    if (fromStep === 2) {
      ensureSelectedCategoriesSeeded();
      if (!getActiveCategories().length) {
        showToast('Select at least one CSF category before continuing.', true);
        return;
      }
    }
    if (fromStep === 3) {
      ensureGvSubcategoriesSeeded();
      var gvSel = Object.keys(state.gvSubcategories).filter(function(k) { return state.gvSubcategories[k]; }).length;
      if (!gvSel) {
        showToast('Select at least one Govern (GV) subcategory before continuing.', true);
        return;
      }
    }
    return orig(fromStep);
  };
})();

// Wrap renderCISOStep3 to inject policy architecture card
(function patchRenderCISOStep3() {
  if (!_origRenderCISOStep3) return;
  renderCISOStep3 = function() {
    sanitizeCsfSetupPolicyCopy();
    migrateVerbatimGvRequirementsIfNeeded();
    _origRenderCISOStep3();
    var body = document.getElementById('ciso-step-4-body');
    if (!body) return;
    var card = document.getElementById('csf-policy-architecture-card');
    if (!card) {
      var wrap = document.createElement('div');
      wrap.id = 'csf-policy-architecture-card';
      wrap.innerHTML = renderPolicyArchitectureCard();
      var first = body.querySelector('.section-title');
      if (first && first.parentNode) first.parentNode.insertBefore(wrap, first.nextSibling);
      else body.insertAdjacentHTML('afterbegin', renderPolicyArchitectureCard());
    } else {
      card.innerHTML = renderPolicyArchitectureCard();
    }
  };
})();

if (typeof renderRequirementsSection === 'function') {
  var _origRenderRequirementsSection = renderRequirementsSection;
  renderRequirementsSection = function(unmappedPM) {
    var html = _origRenderRequirementsSection(unmappedPM);
    return html.replace(
      'Each requirement is a control objective mapped to specific NIST 800-53 controls.',
      'Each requirement is a governance objective mapped to one or more NIST CSF 2.0 Govern subcategories.'
    );
  };
}

/** Domain-level policy units — Govern (GV) is covered by the governance policy (ISP), not domain policies. */
function getDomainPolicyUnits() {
  if (state.policyStructure === 'function') {
    return getActiveFunctions().filter(function(fn) { return fn !== 'GV'; });
  }
  return getActiveCategories().filter(function(catId) { return catId.indexOf('GV.') !== 0; });
}

getCisoWizardUnits = getDomainPolicyUnits;

function migrateGvOutOfDomainPolicies() {
  var merges = state.policyMerges || {};
  var changed = false;
  Object.keys(merges).forEach(function(k) {
    if (k.indexOf('GV.') === 0 || String(merges[k] || '').indexOf('GV.') === 0) {
      delete merges[k];
      changed = true;
    }
  });
  if (state.categoryMerges) {
    Object.keys(state.categoryMerges).forEach(function(k) {
      if (k.indexOf('GV.') === 0 || String(state.categoryMerges[k] || '').indexOf('GV.') === 0) {
        delete state.categoryMerges[k];
        changed = true;
      }
    });
  }
  Object.keys(state.domainOwners || {}).forEach(function(k) {
    if (k.indexOf('GV.') === 0) {
      delete state.domainOwners[k];
      changed = true;
    }
  });
  if (changed && typeof markDirty === 'function') markDirty();
}

var CSF_FUNCTION_PRIORITY_DEFAULTS = { ID: 'now', PR: 'now', DE: 'soon', RS: 'now', RC: 'later' };
var CSF_CATEGORY_PRIORITY_DEFAULTS = {
  'ID.AM': 'now', 'ID.RA': 'now', 'ID.IM': 'soon',
  'PR.AA': 'now', 'PR.AT': 'later', 'PR.DS': 'now', 'PR.PS': 'soon', 'PR.IR': 'soon',
  'DE.CM': 'soon', 'DE.AE': 'soon',
  'RS.MA': 'now', 'RS.AN': 'now', 'RS.CO': 'now', 'RS.MI': 'now',
  'RC.RP': 'later', 'RC.CO': 'later'
};

function getCsfCategoryPriorityDefault(unit) {
  if (state.policyStructure === 'function') return CSF_FUNCTION_PRIORITY_DEFAULTS[unit] || null;
  return CSF_CATEGORY_PRIORITY_DEFAULTS[unit] || null;
}

(function patchGetPriority() {
  if (typeof getPriority !== 'function') return;
  var _origGetPriority = getPriority;
  getPriority = function(fam) {
    if (state.policyPriorities && state.policyPriorities[fam]) return state.policyPriorities[fam];
    var csfDefault = getCsfCategoryPriorityDefault(fam);
    if (csfDefault) return csfDefault;
    return _origGetPriority(fam);
  };
})();

function csfPolicyFunctionKey(unit) {
  return unit.indexOf('.') >= 0 ? unit.split('.')[0] : unit;
}

function renderCisoMergeSuggestionsGrouped(families, merges) {
  var fnOrder = ['ID', 'PR', 'DE', 'RS', 'RC'];
  var mergeList = (typeof COMMON_MERGES !== 'undefined' ? COMMON_MERGES : []).filter(function(mg) {
    return mg.families.every(function(f) { return families.indexOf(f) >= 0 && f.indexOf('GV.') !== 0; });
  });
  var byFn = {};
  mergeList.forEach(function(mg) {
    var fn = csfPolicyFunctionKey(mg.families[0]);
    if (!byFn[fn]) byFn[fn] = [];
    byFn[fn].push(mg);
  });
  var groups = fnOrder.filter(function(fn) { return byFn[fn] && byFn[fn].length; }).map(function(fn) {
    var rows = byFn[fn].map(function(mg) {
      var alreadyMerged = mg.families.slice(1).every(function(f) { return merges[f] === mg.families[0]; });
      if (alreadyMerged) return '';
      var masterFam = mg.families[0];
      var slaveFams = mg.families.slice(1);
      return '<div style="display:flex;align-items:center;gap:10px;background:white;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:6px;">'
        + '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;">'
        + mg.families.map(function(f, i) {
          return (i ? '<span style="font-size:11px;color:#93c5fd;font-weight:700;">+</span>' : '')
            + '<span class="family-badge" style="font-size:11px;">' + escapeHTML(f) + '</span>';
        }).join('')
        + '</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<span style="font-size:12px;font-weight:700;color:#1e40af;">' + escapeHTML(mg.label) + '</span>'
        + '<span style="font-size:11px;color:#3b82f6;margin-left:6px;">' + escapeHTML(mg.reason || 'Suggested category merge.') + '</span>'
        + '</div>'
        + '<button type="button" data-ciso-merge-apply data-master="' + escapeHTML(masterFam) + '" data-slaves="' + escapeHTML(slaveFams.join(',')) + '" style="font-size:11px;font-weight:700;color:#1e40af;background:#dbeafe;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;white-space:nowrap;">Apply merge</button>'
        + '</div>';
    }).filter(Boolean).join('');
    if (!rows) return '';
    return '<div style="margin-bottom:14px;">'
      + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:#475569;margin-bottom:8px;">'
      + escapeHTML(fn) + ' — ' + escapeHTML((typeof FUNCTIONS !== 'undefined' && FUNCTIONS[fn]) || fn)
      + '</div>'
      + rows
      + '</div>';
  }).filter(Boolean).join('');
  return groups;
}

function renderCisoConsolidateTableRows(masters, families, merges, showMerges) {
  var fnOrder = ['ID', 'PR', 'DE', 'RS', 'RC'];
  var byFn = {};
  masters.forEach(function(fam) {
    var fn = csfPolicyFunctionKey(fam);
    if (!byFn[fn]) byFn[fn] = [];
    byFn[fn].push(fam);
  });
  return fnOrder.filter(function(fn) { return byFn[fn] && byFn[fn].length; }).map(function(fn) {
    var header = '<tr class="csf-consolidate-fn-row"><td colspan="3" style="background:#f1f5f9;padding:10px 12px;border-bottom:2px solid #e2e8f0;">'
      + '<span style="font-size:12px;font-weight:800;color:var(--navy);">' + escapeHTML(fn) + ' — ' + escapeHTML((typeof FUNCTIONS !== 'undefined' && FUNCTIONS[fn]) || fn) + '</span>'
      + '<span style="font-size:11px;color:#64748b;margin-left:8px;">' + byFn[fn].length + ' polic' + (byFn[fn].length === 1 ? 'y' : 'ies') + '</span>'
      + '</td></tr>';
    var rows = byFn[fn].map(function(fam) {
      var merged = families.filter(function(f) { return merges[f] === fam; });
      var allUnits = [fam].concat(merged);
      var subCount = countSubcategoriesForPolicyUnit(fam, merges, families);
      var mergeOptions = showMerges ? families.filter(function(f) { return f !== fam && merges[f] !== fam && !merges[f]; }) : [];
      var tier = getPriority(fam);
      var m = PRIORITY_META[tier];
      var isDefault = typeof getCsfCategoryPriorityDefault === 'function' ? !!getCsfCategoryPriorityDefault(fam) : !!(PRIORITY_DEFAULTS[fam]);
      var mergedTitle = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(fam) : fam;
      var suggestedMerge = showMerges && !merged.length ? (typeof COMMON_MERGES !== 'undefined' ? COMMON_MERGES : []).find(function(mg) {
        return mg.families[0] === fam && mg.families.slice(1).every(function(f) { return families.indexOf(f) >= 0 && !merges[f]; });
      }) : null;
      return ''
        + '<tr' + (merged.length ? ' style="background:rgba(13,148,136,0.03);"' : '') + '>'
        + '<td>'
        + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">'
        + allUnits.map(function(uid, idx) {
          if (idx === 0) {
            return '<span class="family-badge">' + escapeHTML(uid) + '</span>';
          }
          return '<span style="font-size:11px;color:#93c5fd;font-weight:700;">+</span>'
            + '<span class="family-badge" style="font-size:11px;background:#e0f2f1;color:var(--teal);border-color:rgba(13,148,136,0.3);">'
            + escapeHTML(uid)
            + ' <span role="button" tabindex="0" style="cursor:pointer;" data-ciso-unmerge="' + escapeHTML(uid) + '" title="Unmerge">✕</span></span>';
        }).join('')
        + (merged.length ? '<span style="font-size:10px;font-weight:700;color:var(--teal);background:rgba(13,148,136,0.1);padding:2px 8px;border-radius:10px;">Merged policy</span>' : '')
        + '</div>'
        + '<input class="form-input" style="font-size:12px;font-weight:600;margin-bottom:3px;' + (state.domainCustomNames[fam] ? 'border-color:#6366f1;background:rgba(99,102,241,0.04);' : '') + '" placeholder="' + escapeHTML(mergedTitle) + '" value="' + escapeHTML(state.domainCustomNames[fam] || '') + '" oninput="setDomainCustomName(\'' + escapeHTML(fam).replace(/'/g, "\\'") + '\',this.value);this.style.borderColor=this.value?\'#6366f1\':\'\';this.style.background=this.value?\'rgba(99,102,241,0.04)\':\'\';">'
        + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">' + subCount + ' subcategor' + (subCount === 1 ? 'y' : 'ies')
        + (state.domainCustomNames[fam] ? ' · <span style="color:#6366f1;">✏ custom name</span>' : '') + '</div>'
        + (FAMILY_DESC[fam] ? '<div style="font-size:11px;color:#64748b;line-height:1.4;">' + escapeHTML(FAMILY_DESC[fam] || unitDisplayName(fam)) + '</div>' : '')
        + (suggestedMerge
          ? '<div style="margin-top:8px;"><button type="button" data-ciso-merge-apply data-master="' + escapeHTML(fam) + '" data-slaves="' + escapeHTML(suggestedMerge.families.slice(1).join(',')) + '" style="font-size:11px;font-weight:700;color:#1e40af;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:4px 10px;cursor:pointer;">Apply suggested merge: ' + escapeHTML(suggestedMerge.label) + '</button></div>'
          : '')
        + '</td>'
        + '<td><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + Object.entries(PRIORITY_META).map(function(entry) {
          var t = entry[0]; var pm = entry[1];
          return '<button onclick="setPolicyPriority(\'' + escapeHTML(fam).replace(/'/g, "\\'") + '\',\'' + t + '\')" style="padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:2px solid ' + (tier === t ? pm.bar : '#e2e8f0') + ';background:' + (tier === t ? pm.bg : 'white') + ';color:' + (tier === t ? pm.fg : '#94a3b8') + ';transition:all 0.15s;">' + pm.label + '</button>';
        }).join('')
        + (isDefault ? '<span style="font-size:10px;color:var(--text-muted);margin-left:2px;">suggested</span>' : '')
        + '</div></td>'
        + '<td>'
        + (mergeOptions.length > 0
          ? '<div class="ciso-merge-dropdown-wrap" style="display:flex;flex-direction:column;gap:6px;align-items:stretch;max-width:220px;">'
            + '<select class="form-select" style="font-size:11px;padding:4px 6px;" data-ciso-merge-master="' + escapeHTML(fam) + '" aria-label="Merge another category into ' + escapeHTML(fam) + '">'
            + '<option value="">+ Merge…</option>'
            + mergeOptions.map(function(f) { return '<option value="' + escapeHTML(f) + '">' + escapeHTML(unitDisplayName(f)) + '</option>'; }).join('')
            + '</select>'
            + '<button type="button" data-ciso-merge-dropdown-apply data-master="' + escapeHTML(fam) + '" style="display:none;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;border:1px solid #1e40af;background:#dbeafe;color:#1e40af;cursor:pointer;white-space:nowrap;">Apply merge</button>'
            + '</div>'
          : (merged.length
            ? '<button type="button" data-ciso-unmerge-slaves="' + escapeHTML(merged.join(',')) + '" style="font-size:11px;font-weight:700;color:#991b1b;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:4px 10px;cursor:pointer;white-space:nowrap;">Unmerge all</button>'
            : '<span style="font-size:11px;color:var(--text-muted);">—</span>'))
        + '</td></tr>';
    }).join('');
    return header + rows;
  }).join('');
}

function renderCISOStep3Integrations() {
  /* Reg mapping removed — CSF program has no ISO/SOC 2/HIPAA crosswalk UI. */
}

function renderCISOStep(step) {
  if (step === 1) renderCISOStep1();
  else if (step === 2) renderCISOStep2Baseline();
  else if (step === 3) renderCISOStep2();
  else if (step === 4) renderCISOStep3();
  else if (step === 5) renderCISOStep4a();
  else if (step === 6) renderCISOStep4b();
  updateCisoSetupProgress(step);
}

function renderActiveCisoSetupStep() {
  if (currentStep.ciso === 6) renderCISOStep4b();
  else if (currentStep.ciso === 5) renderCISOStep4a();
}
