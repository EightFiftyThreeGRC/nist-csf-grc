// js/hub.js — Command Center (post-setup home dashboard)

function getSetupProgressSummary() {
  var step = (typeof currentStep !== 'undefined' && currentStep.ciso) ? currentStep.ciso : 1;
  var total = (typeof CISO_WIZARD_STEPS === 'number' && CISO_WIZARD_STEPS > 0) ? CISO_WIZARD_STEPS : 6;
  var pct = Math.round((step / total) * 100);
  var labels = (typeof CISO_STEP_LABELS !== 'undefined' && CISO_STEP_LABELS.length)
    ? CISO_STEP_LABELS
    : ['Organization', 'Category scope', 'Govern outcomes', 'Governance Policy', 'Consolidate', 'Assign Owners'];
  return { step: step, pct: pct, label: labels[step - 1] || 'Organization', total: total };
}

function startProgramSetup() {
  showTab('ciso');
  goToStep('ciso', 1);
}

/** Escape a value for embedding in an HTML onclick single-quoted JS string literal. */
function hubJsStringLiteral(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Signed-in user for Command Center queue filtering (null = admin / show all pending). */
function getHubCurrentUser() {
  if (!state.currentUserId || !(state.users || []).length) return null;
  return state.users.find(function (u) { return u.id === state.currentUserId; }) || null;
}

/** Command Center → open a queued SSP read-only (same path as Reports queue Open). */
function hubOpenQueuedSsp(scopeId, isProcess) {
  if (typeof ensureBuiltinProgramProcesses === 'function') ensureBuiltinProgramProcesses();
  if (typeof aoOpenQueuedSsp === 'function') {
    aoOpenQueuedSsp(scopeId, !!isProcess);
    return;
  }
  if (typeof openSspReadOnlyFromQueue === 'function') {
    openSspReadOnlyFromQueue(scopeId, !!isProcess, 'reports');
    return;
  }
  showToast('Unable to open SSP package.', true);
}

/** One delegated listener for hub cards that use data-hub-action (avoids brittle inline onclick). */
function ensureHubActionDelegation() {
  if (window._hubActionDelegationBound) return;
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-hub-action]') : null;
    if (!btn) return;
    var kind = btn.getAttribute('data-hub-action');
    if (kind === 'ssp-review') {
      ev.preventDefault();
      var scopeId = btn.getAttribute('data-scope-id') || '';
      var isProcess = btn.getAttribute('data-is-process') === '1';
      hubOpenQueuedSsp(scopeId, isProcess);
    }
  });
  window._hubActionDelegationBound = true;
}

function renderHubActionCardHtml(a) {
  var inner = '<span class="hub-action-icon">' + a.icon + '</span>'
    + '<div><div class="hub-action-label">' + escapeHTML(a.label) + '</div>'
    + '<div class="hub-action-desc">' + escapeHTML(a.desc) + '</div></div>'
    + '<span class="hub-action-arrow">→</span>';
  if (a.kind === 'ssp-review') {
    return '<button type="button" class="hub-action-card" data-hub-action="ssp-review" data-scope-id="'
      + escapeHTML(a.scopeId || '') + '" data-is-process="' + (a.isProcess ? '1' : '0') + '">' + inner + '</button>';
  }
  return '<button type="button" class="hub-action-card" onclick="' + a.action + '">' + inner + '</button>';
}

/** Command Center → Reports → Program library page. */
function hubOpenReportsLibrary(page) {
  if (typeof goToReportsLibrary === 'function') goToReportsLibrary(page === 'controls' ? 'controls' : 'policies');
  else if (typeof showTab === 'function') showTab('reports');
}

function renderOnboardingHome() {
  var body = document.getElementById('home-body');
  var pageHeader = document.querySelector('#tab-home .page-header');
  if (pageHeader) {
    pageHeader.style.display = '';
    var title = document.getElementById('home-page-title');
    var subtitle = document.getElementById('home-page-subtitle');
    if (title) title.textContent = 'Welcome — let\u2019s set up your program';
    if (subtitle) subtitle.textContent = 'Seven short steps to stand up NIST CSF 2.0. You can return here anytime from Command Center.';
  }
  if (!body) return;

  var progress = getSetupProgressSummary();
  var hasStarted = !!(String(state.orgName || '').trim() || String(state.programOwner || '').trim()
    || (typeof getProgramScopeReady === 'function' && getProgramScopeReady()));

  var steps = (typeof CISO_STEP_LABELS !== 'undefined' && CISO_STEP_LABELS.length)
    ? CISO_STEP_LABELS.map(function(label, i) { return { n: i + 1, label: label }; })
    : [
      { n: 1, label: 'Organization' },
      { n: 2, label: 'Category scope' },
      { n: 3, label: 'Govern outcomes' },
      { n: 4, label: 'Governance Policy' },
      { n: 5, label: 'Consolidate' },
      { n: 6, label: 'Assign owners' }
    ];

  var stepChips = steps.map(function(s) {
    var done = s.n < progress.step;
    var current = s.n === progress.step;
    var cls = 'onboard-step-chip' + (done ? ' done' : '') + (current ? ' current' : '');
    return '<span class="' + cls + '"><span class="onboard-step-num">' + (done ? '✓' : s.n) + '</span>' + escapeHTML(s.label) + '</span>';
  }).join('');

  body.innerHTML = ''
    + '<div class="onboard-hero">'
    + '<p class="onboard-eyebrow">EightFiftyThree GRC</p>'
    + '<h2 class="onboard-title">NIST CSF 2.0.<br>Without the spreadsheet.</h2>'
    + '<p class="onboard-lead">The landing page got you here — now let\'s stand up your program in <strong>six short steps</strong>. One screen at a time, no overwhelm.</p>'
    + '<div class="onboard-step-rail">' + stepChips + '</div>'
    + '<div class="onboard-actions">'
    + '<button type="button" class="btn btn-primary onboard-cta" onclick="startProgramSetup()">' + (hasStarted ? 'Continue setup' : 'Start program setup') + '</button>'
    + '</div>'
    + (hasStarted
      ? '<p class="onboard-resume">You\'re on step ' + progress.step + ' — <strong>' + escapeHTML(progress.label) + '</strong>. Pick up where you left off.</p>'
      : '<p class="onboard-resume">Most teams finish setup in 15–20 minutes.</p>')
    + '</div>'
    + '<div class="onboard-features">'
    + '<div class="onboard-feature"><span>📋</span><div><strong>Policies</strong><p>Build AC, AU, SC, and the rest after setup.</p></div></div>'
    + '<div class="onboard-feature"><span>🔧</span><div><strong>Controls</strong><p>Design obligations and link SharePoint evidence.</p></div></div>'
    + '<div class="onboard-feature"><span>🖥️</span><div><strong>Assets &amp; SSP</strong><p>Inventory systems and submit attestation packages.</p></div></div>'
    + '</div>';
}

/** Policy master units for hub counts — aligned with Assign owners step (CSF category IDs). */
function getHubPolicyMasters() {
  var units = typeof getOwnerAssignmentUnits === 'function'
    ? getOwnerAssignmentUnits()
    : (typeof getMasterPolicyFamilies === 'function' ? getMasterPolicyFamilies() : []);
  var merges = state.policyMerges || {};
  return units.filter(function(u) { return !merges[u]; });
}

function countHubAssignedPolicyDomains() {
  return getHubPolicyMasters().filter(function(fam) {
    return isValidOwnerEmail((state.domainOwners[fam] || {}).email);
  }).length;
}

function hasMeaningfulImplementationProgress() {
  if (countPublishedPolicyItems() > 0) return true;
  if (countImplementedControls() > 0) return true;
  if ((state.assets || []).length > 0) return true;
  if (typeof getCombinedOpenRiskIssueCount === 'function' && getCombinedOpenRiskIssueCount() > 0) return true;
  return false;
}

function isProgramLaunchPhase() {
  return !!state.cisoComplete && !hasMeaningfulImplementationProgress();
}

function getLaunchFoundationSummary() {
  var masters = getHubPolicyMasters();
  var ispStatus = typeof getISPStatus === 'function' ? getISPStatus() : 'Not Started';
  return {
    org: (state.orgName || '').trim() || 'Your organization',
    categoryCount: typeof getActiveCategories === 'function' ? getActiveCategories().length : 0,
    subcategoryCount: typeof getActiveSubcategories === 'function' ? getActiveSubcategories().length : 0,
    domainsAssigned: countHubAssignedPolicyDomains(),
    domainTotal: masters.length,
    ispStatus: ispStatus
  };
}

function hubSortFamiliesByPriority(fams) {
  var tierOrder = { now: 0, soon: 1, later: 2 };
  return fams.slice().sort(function(a, b) {
    var pa = typeof getPriority === 'function' ? getPriority(a) : 'soon';
    var pb = typeof getPriority === 'function' ? getPriority(b) : 'soon';
    return (tierOrder[pa] !== undefined ? tierOrder[pa] : 1) - (tierOrder[pb] !== undefined ? tierOrder[pb] : 1);
  });
}

function getLaunchIspStatusLabel(status) {
  if (status === 'Approved') return 'Approved';
  if (status === 'Under Review') return 'Under review';
  if (status === 'Draft') return 'Draft';
  if (status === 'Returned') return 'Returned';
  return 'Ready';
}

function getProgramLaunchActions() {
  if (!isProgramLaunchPhase()) return [];
  var actions = [];
  var user = getHubSessionUser();
  var tabs = getHubVisibleTabIds();
  var isProgramOwner = typeof isSessionProgramOwnerActor === 'function' && isSessionProgramOwnerActor();
  var roles = user ? getHubPersonRoles(user) : [];
  var isCiso = !user || roles.indexOf('ciso') !== -1 || roles.indexOf('issm') !== -1 || isProgramOwner;

  if (isCiso && typeof getISPStatus === 'function') {
    var ispSt = getISPStatus();
    if (ispSt !== 'Approved') {
      var ispTitle = ((state.infoSecPolicy && state.infoSecPolicy.title) ? String(state.infoSecPolicy.title).trim() : '')
        || (typeof getDefaultISPTitle === 'function' ? getDefaultISPTitle() : 'Governance policy');
      actions.push({
        priority: 1,
        icon: '\ud83d\udcdc',
        label: 'Finalize governance policy',
        desc: 'Review and route ' + ispTitle + ' for approval.',
        action: "typeof goToCISOPolicyEditor === 'function' ? goToCISOPolicyEditor() : showTab('reports');"
      });
    }
  }

  var masters = getHubPolicyMasters();
  var sorted = hubSortFamiliesByPriority(masters);

  if (isCiso) {
    var firstUnstarted = null;
    for (var i = 0; i < sorted.length; i++) {
      var fam = sorted[i];
      var st = ((state.policyStatus || {})[fam] || {}).status || 'Not Started';
      if (st === 'Not Started') { firstUnstarted = fam; break; }
    }
    if (firstUnstarted) {
      var policyTitle = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(firstUnstarted) : firstUnstarted;
      var tier = typeof getPriority === 'function' ? getPriority(firstUnstarted) : 'now';
      var tierLabel = tier === 'now' ? 'Now' : (tier === 'soon' ? 'Soon' : 'Later');
      actions.push({
        priority: 2,
        icon: '\ud83d\udccb',
        label: 'Start domain policy: ' + policyTitle,
        desc: 'Highest-priority policy domain (' + tierLabel + ').',
        action: "typeof enterPolicyWizard === 'function' ? enterPolicyWizard('" + firstUnstarted.replace(/'/g, "\\'") + "') : goToPoliciesHome();"
      });
    }
  } else if (user) {
    var families = [];
    (state._currentPersonIds || [user.id]).forEach(function(pid) {
      var rec = (state.users || []).find(function(u) { return u.id === pid; });
      if (!rec) return;
      (rec.families || []).forEach(function(f) {
        if (families.indexOf(f) === -1) families.push(f);
      });
    });
    hubSortFamiliesByPriority(families).slice(0, 2).forEach(function(fam) {
      var pst = ((state.policyStatus || {})[fam] || {}).status || 'Not Started';
      if (pst !== 'Not Started') return;
      var pTitle = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(fam) : fam;
      actions.push({
        priority: 2,
        icon: '\ud83d\udccb',
        label: 'Draft your policy: ' + pTitle,
        desc: 'Begin the domain policy assigned to you.',
        action: "typeof enterPolicyWizard === 'function' ? enterPolicyWizard('" + fam.replace(/'/g, "\\'") + "') : goToPoliciesHome();"
      });
    });
  }

  if (tabs.indexOf('reports') !== -1) {
    actions.push({
      priority: 3,
      icon: '\ud83d\udcca',
      label: 'Review program structure',
      desc: 'See your scope, owners, and readiness on the dashboard.',
      action: "showTab('reports');"
    });
  }

  return actions.slice(0, 5);
}

function getNextActions() {
  var actions = [];
  var today = new Date().toISOString().slice(0, 10);

  if (!state.cisoComplete) {
    var p = getSetupProgressSummary();
    actions.push({ priority: 1, icon: '🏛️', label: 'Continue program setup', desc: 'Step ' + p.step + ' of ' + (p.total || 6) + ' — ' + p.label + '.', action: "startProgramSetup();" });
    return actions;
  }

  var polReview = (state.policyStatus || {});
  Object.keys(polReview).forEach(function(fam) {
    if (fam === 'ISP') return;
    var st = (polReview[fam] || {}).status;
    if (st === 'Under Review' && typeof canSessionApproveDomainPolicy === 'function' && canSessionApproveDomainPolicy(fam)) {
      var title = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(fam) : fam;
      actions.push({
        priority: 2,
        icon: '📋',
        label: 'Approve policy: ' + title,
        desc: 'Domain policy awaiting your sign-off.',
        action: "openCISOReview('" + fam.replace(/'/g, "\\'") + "');"
      });
    }
  });

  var hubUser = typeof getHubCurrentUser === 'function' ? getHubCurrentUser() : null;
  if (typeof getSspReviewQueueItemsForUser === 'function') {
    getSspReviewQueueItemsForUser(hubUser).slice(0, 5).forEach(function(r) {
      var isProc = !!r.isProcessSsp;
      actions.push({
        priority: 1,
        icon: '📋',
        label: 'Review SSP: ' + (r.assetName || 'Package'),
        desc: 'Submitted by ' + (r.submittedBy || 'owner') + (r.date ? ' on ' + r.date : ''),
        kind: 'ssp-review',
        scopeId: String(r.assetId || ''),
        isProcess: isProc,
      });
    });
  }

  if (typeof getSspPackagesAwaitingReviewByOthers === 'function') {
    getSspPackagesAwaitingReviewByOthers().slice(0, 3).forEach(function(pkg) {
      actions.push({
        priority: 2,
        icon: '⏳',
        label: 'SSP awaiting review: ' + (pkg.name || 'Package'),
        desc: 'Submitted — with ' + (pkg.reviewerLabel || 'designated reviewer'),
        action: "showTab('reports');"
      });
    });
  }

  (state.controlReviewQueue || []).slice(0, 5).forEach(function(r) {
    if (!r || !r.controlId || r.type === 'ssp') return;
    var cs = (state.controlStatus || {})[r.controlId] || {};
    var isReturn = r.type === 'control-return' || r.status === 'Returned to Policy Owner' || !!cs.returnedToPolicyOwner;
    var escId = r.controlId.replace(/'/g, "\\'");
    var action = isReturn
      ? "openControlReassignmentModal('" + escId + "');"
      : "state._selectedCtrl='" + escId + "';showTab('control');goToStep('control',2);";
    actions.push({ priority: 3, icon: isReturn ? '↩' : '🔧', label: (isReturn ? 'Reassign control: ' : 'Review control: ') + r.controlId, desc: (r.status || 'Pending review'), action: action });
  });

  if (typeof getRiskHubNextActions === 'function') {
    getRiskHubNextActions().forEach(function(a) { actions.push(a); });
  }

  if (typeof getISPStatus === 'function' && getISPStatus() === 'Under Review') {
    var ispTitle = ((state.infoSecPolicy && state.infoSecPolicy.title) ? String(state.infoSecPolicy.title).trim() : '')
      || (typeof getDefaultISPTitle === 'function' ? getDefaultISPTitle() : 'Information Security Policy');
    var ispCanApprove = typeof canSessionApproveISP === 'function' && canSessionApproveISP();
    var ispIsApproverRole = false;
    if (state.currentUserId && state.users) {
      (state._currentPersonIds || [state.currentUserId]).forEach(function(pid) {
        var rec = state.users.find(function(u) { return u.id === pid; });
        if (rec && rec.role === 'approver') ispIsApproverRole = true;
      });
    }
    if (ispCanApprove || ispIsApproverRole) {
      actions.push({
        priority: 0,
        icon: '✅',
        label: 'Approve ISP: ' + ispTitle,
        desc: 'Tier 1 Information Security Policy is awaiting your sign-off.',
        action: "showTab('reports');goToCISOPolicyEditor();"
      });
    }
  }

  if (typeof canSessionReviseReturnedISP === 'function' && canSessionReviseReturnedISP()) {
    var returnedIspTitle = ((state.infoSecPolicy && state.infoSecPolicy.title) ? String(state.infoSecPolicy.title).trim() : '')
      || (typeof getDefaultISPTitle === 'function' ? getDefaultISPTitle() : 'Information Security Policy');
    var returnedNotes = String(((state.policyStatus || {}).ISP || {}).notes || '').trim();
    var returnedDesc = returnedNotes
      ? 'Returned with comments: ' + returnedNotes.slice(0, 80) + (returnedNotes.length > 80 ? '\u2026' : '')
      : 'Tier 1 Information Security Policy was returned for your revision.';
    actions.push({
      priority: 0,
      icon: '\u21A9',
      label: 'Revise ISP: ' + returnedIspTitle,
      desc: returnedDesc,
      action: 'openISPForRevision();'
    });
  }

  var returnedDomainFams = typeof getSessionReturnedDomainPolicyFamilies === 'function'
    ? getSessionReturnedDomainPolicyFamilies() : [];
  returnedDomainFams.forEach(function(fam) {
    var title = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(fam) : fam;
    var domainNotes = String(((state.policyStatus || {})[fam] || {}).notes || '').trim();
    var domainDesc = domainNotes
      ? 'Returned with comments: ' + domainNotes.slice(0, 80) + (domainNotes.length > 80 ? '\u2026' : '')
      : 'Domain policy was returned for your revision and resubmission.';
    actions.push({
      priority: 0,
      icon: '\u21A9',
      label: 'Revise policy: ' + title,
      desc: domainDesc,
      action: "typeof openReturnedDomainPolicyRevision === 'function' ? openReturnedDomainPolicyRevision('" + fam.replace(/'/g, "\\'") + "') : showTab('policy');"
    });
  });

  var returnedNeedOwner = typeof getSessionReturnedDomainPoliciesNeedingOwner === 'function'
    ? getSessionReturnedDomainPoliciesNeedingOwner() : [];
  returnedNeedOwner.forEach(function(fam) {
    var title = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(fam) : fam;
    var domainNotes = String(((state.policyStatus || {})[fam] || {}).notes || '').trim();
    var domainDesc = domainNotes
      ? 'Returned — assign an owner before revision: ' + domainNotes.slice(0, 60) + (domainNotes.length > 60 ? '\u2026' : '')
      : 'Returned domain policy has no owner assigned yet.';
    actions.push({
      priority: 0,
      icon: '\ud83d\udc64',
      label: 'Assign policy owner: ' + title,
      desc: domainDesc,
      action: "typeof openAssignDomainPolicyOwnerModal === 'function' ? openAssignDomainPolicyOwnerModal('" + fam.replace(/'/g, "\\'") + "') : showTab('policy');"
    });
  });

  if (typeof isSessionProgramOwnerActor === 'function' && isSessionProgramOwnerActor()) {
    Object.keys(state.policyStatus || {}).forEach(function(fam) {
      if (fam === 'ISP') return;
      var ps = state.policyStatus[fam] || {};
      if (ps.status !== 'Returned' || !ps.returnedForReassignment) return;
      if (typeof returnedDomainPolicyNeedsOwnerAssignment === 'function'
          && returnedDomainPolicyNeedsOwnerAssignment(fam)) return;
      var title = typeof getPolicyMergedTitle === 'function' ? getPolicyMergedTitle(fam) : fam;
      actions.push({
        priority: 1,
        icon: '\u21A9',
        label: 'Reassign policy: ' + title,
        desc: 'A domain owner returned this policy for reassignment.',
        action: "typeof openAssignDomainPolicyOwnerModal === 'function' ? openAssignDomainPolicyOwnerModal('" + fam.replace(/'/g, "\\'") + "') : startProgramSetup();"
      });
    });
  }

  (state.assets || []).forEach(function(a) {
    var signoff = (state.sspSignoffs || {})[a.id] || {};
    if (signoff.status === 'Submitted') {
      actions.push({ priority: 4, icon: '🖥️', label: 'SSP submitted: ' + a.name, desc: 'Review asset package on Reports.', action: "showTab('reports');" });
    }
  });

  actions.sort(function(a, b) { return a.priority - b.priority; });
  var result = actions.slice(0, 8);
  if (!result.length && isProgramLaunchPhase()) {
    return getProgramLaunchActions().slice(0, 8);
  }
  return result;
}

function getHubSessionUser() {
  if (!state.currentUserId || !state.users) return null;
  return state.users.find(function(u) { return u.id === state.currentUserId; }) || null;
}

function getHubVisibleTabIds() {
  var user = getHubSessionUser();
  if (!user) return typeof TAB_IDS !== 'undefined' ? TAB_IDS.slice() : ['home', 'reports'];
  return typeof getPersonVisibleTabIds === 'function' ? getPersonVisibleTabIds(user) : ['reports'];
}

function getHubPersonRoles(user) {
  var roles = [];
  if (!user) return roles;
  (state._currentPersonIds || [user.id]).forEach(function(pid) {
    var rec = (state.users || []).find(function(u) { return u.id === pid; });
    if (!rec) return;
    (rec.roles && rec.roles.length ? rec.roles : [rec.role]).forEach(function(r) {
      if (roles.indexOf(r) === -1) roles.push(r);
    });
  });
  return roles;
}

function countPublishedPolicyItems() {
  var n = 0;
  if (typeof getISPStatus === 'function' && getISPStatus() === 'Approved') n++;
  var families = typeof getMasterPolicyFamilies === 'function' ? getMasterPolicyFamilies() : [];
  families.forEach(function(fam) {
    if (((state.policyStatus || {})[fam] || {}).status === 'Approved') n++;
  });
  return n;
}

function countImplementedControls() {
  var n = 0;
  (typeof getActiveControls === 'function' ? getActiveControls() : []).forEach(function(c) {
    var st = (state.controlStatus || {})[c.id];
    if (st && (st.status === 'Implemented' || st.status === 'Inherited')) n++;
  });
  return n;
}

function userHasPolicyDraftWork(user) {
  if (typeof canSessionReviseReturnedISP === 'function' && canSessionReviseReturnedISP()) return true;
  if (typeof getSessionReturnedDomainPoliciesNeedingOwner === 'function' && getSessionReturnedDomainPoliciesNeedingOwner().length) return true;
  if (!user) {
    if (typeof getISPStatus === 'function' && getISPStatus() !== 'Approved') return true;
    var allFams = typeof getMasterPolicyFamilies === 'function' ? getMasterPolicyFamilies() : [];
    return allFams.some(function(fam) {
      var st = ((state.policyStatus || {})[fam] || {}).status || 'Not Started';
      return st !== 'Approved';
    });
  }
  var families = [];
  (state._currentPersonIds || [user.id]).forEach(function(pid) {
    var rec = (state.users || []).find(function(u) { return u.id === pid; });
    if (!rec) return;
    var recRoles = rec.roles && rec.roles.length ? rec.roles : [rec.role];
    if (recRoles.indexOf('issm') !== -1 || recRoles.indexOf('custodian') !== -1 || recRoles.indexOf('ciso') !== -1) {
      (rec.families || []).forEach(function(f) {
        if (families.indexOf(f) === -1) families.push(f);
      });
    }
  });
  if (!families.length) return false;
  return families.some(function(fam) {
    var st = ((state.policyStatus || {})[fam] || {}).status || 'Not Started';
    return st !== 'Approved';
  });
}

function userHasControlDraftWork(user) {
  var scoped = typeof getScopedControls === 'function' ? getScopedControls() : [];
  if (!scoped.length) return false;
  return scoped.some(function(c) {
    var st = (state.controlStatus || {})[c.id];
    var status = st ? st.status : 'Not Started';
    return status !== 'Implemented' && status !== 'Inherited';
  });
}

function getScopedRiskIssueOpenCount(user) {
  if (typeof getScopedIssueOpenCount === 'function') return getScopedIssueOpenCount(user);
  return typeof getCombinedOpenRiskIssueCount === 'function' ? getCombinedOpenRiskIssueCount() : 0;
}

function userHasAssetWorkspaceContent(user) {
  var tabs = getHubVisibleTabIds();
  if (tabs.indexOf('asset') === -1) return false;
  var assetIds = typeof getCurrentPersonAssetIds === 'function' ? getCurrentPersonAssetIds() : null;
  if (assetIds && assetIds.length) return true;
  if (!user || !state.currentUserId) return (state.assets || []).length > 0;
  var roles = getHubPersonRoles(user);
  if (roles.indexOf('ao') !== -1 || roles.indexOf('ciso') !== -1 || roles.indexOf('assessor') !== -1) {
    return (state.assets || []).length > 0;
  }
  return false;
}

/** Command Center workspace tiles — only surfaces areas with content for this viewer. */
function getHubWorkspaces() {
  var user = getHubSessionUser();
  var tabs = getHubVisibleTabIds();
  var workspaces = [];
  var publishedPolicies = countPublishedPolicyItems();
  var policyDraft = userHasPolicyDraftWork(user);
  var implementedControls = countImplementedControls();
  var controlDraft = userHasControlDraftWork(user);

  if (publishedPolicies > 0 || policyDraft) {
    var policyFn = (policyDraft && tabs.indexOf('policy') !== -1) ? 'goToPoliciesHome()' : 'goToPolicyLibrary()';
    var policyDesc = policyDraft && tabs.indexOf('policy') !== -1
      ? (publishedPolicies > 0 ? 'Your drafts & approved catalog' : 'Domain policy drafts & ISP')
      : (publishedPolicies > 0 ? publishedPolicies + ' approved polic' + (publishedPolicies === 1 ? 'y' : 'ies') + ' in catalog' : 'Policy catalog');
    workspaces.push({ icon: '📋', label: 'Policies', desc: policyDesc, fn: policyFn, group: 'design' });
  }

  if (implementedControls > 0 || controlDraft) {
    var ctrlFn = (controlDraft && tabs.indexOf('control') !== -1) ? 'goToControlWorkspace()' : 'goToControlLibrary()';
    var ctrlDesc = controlDraft && tabs.indexOf('control') !== -1
      ? (implementedControls > 0 ? 'Draft designs & ' + implementedControls + ' live controls' : 'Control implementation drafts')
      : (implementedControls > 0 ? implementedControls + ' implemented control' + (implementedControls === 1 ? '' : 's') + ' in catalog' : 'Control catalog');
    workspaces.push({ icon: '🔧', label: 'Controls', desc: ctrlDesc, fn: ctrlFn, group: 'design' });
  }

  if (userHasAssetWorkspaceContent(user)) {
    workspaces.push({ icon: '🖥️', label: 'Assets & SSP', desc: 'Inventory & attestations', fn: 'goToAssetWorkspace()', group: 'compliance' });
  }

  if (tabs.indexOf('reports') !== -1) {
    workspaces.push({ icon: '📊', label: 'Reports', desc: 'Program dashboard', fn: "showTab('reports')", group: 'program' });
    if (typeof userHasReportsLibraryAccess === 'function' && userHasReportsLibraryAccess(user)) {
      workspaces.push({
        icon: '📚',
        label: 'Program library',
        desc: 'Published policies & control requirements',
        fn: "goToReportsLibrary('policies')",
        group: 'program'
      });
    }
  }

  var riskOpen = getScopedRiskIssueOpenCount(user);
  if (tabs.indexOf('risk') !== -1 && riskOpen > 0) {
    var riskLabel = typeof hasPm4PoamControl === 'function' && hasPm4PoamControl() ? 'POA&M & risks' : 'Risks & issues';
    workspaces.push({ icon: '⚡', label: 'Risks & Issues', desc: riskOpen + ' open ' + riskLabel, fn: "showTab('risk')", group: 'program' });
  }

  return workspaces;
}

function renderHubWorkspaceGroupHtml(title, items) {
  if (!items || !items.length) return '';
  return '<div class="hub-workspace-group">'
    + '<div class="hub-workspace-group-label">' + escapeHTML(title) + '</div>'
    + '<div class="hub-workspace-grid">' + items.map(function(w) {
      return '<button type="button" class="hub-workspace-card" onclick="' + w.fn + '">'
        + '<span class="hub-workspace-icon">' + w.icon + '</span>'
        + '<span class="hub-workspace-label">' + escapeHTML(w.label) + '</span>'
        + '<span class="hub-workspace-desc">' + escapeHTML(w.desc) + '</span></button>';
    }).join('') + '</div></div>';
}

function shouldShowHubRiskStrip() {
  var tabs = getHubVisibleTabIds();
  if (tabs.indexOf('risk') === -1) return false;
  return (typeof getCombinedOpenRiskIssueCount === 'function' && getCombinedOpenRiskIssueCount() > 0)
    || (typeof getTriagePendingCount === 'function' && getTriagePendingCount() > 0);
}

function updateCommandCenterPageHeader() {
  if (!state.cisoComplete) return;
  var title = document.getElementById('home-page-title');
  var subtitle = document.getElementById('home-page-subtitle');
  if (!title && !subtitle) return;
  var org = (state.orgName || '').trim() || 'Your organization';
  var baseline = getProgramScopeReady() && typeof getProgramBaselineLabel === 'function'
    ? getProgramBaselineLabel() : '\u2014';
  if (isProgramLaunchPhase()) {
    if (title) title.textContent = org !== 'Your organization' ? org + ' is live' : 'Program is live';
    if (subtitle) subtitle.textContent = org + ' \u00b7 ' + baseline + ' \u00b7 your launch checklist';
  } else {
    if (title) title.textContent = 'Your program at a glance';
    if (subtitle) subtitle.textContent = org + ' \u00b7 ' + baseline + ' \u00b7 posture and next actions';
  }
}

function renderHubActionsAndWorkspacesHtml(actions) {
  var actionHtml = actions.length
    ? actions.map(function(a) { return renderHubActionCardHtml(a); }).join('')
    : '<div class="hub-empty-actions">You\'re caught up \u2014 open a workspace from the sidebar or the cards below.</div>';

  var workspaces = getHubWorkspaces();
  var designWorkspaces = workspaces.filter(function(w) { return w.group === 'design'; });
  var complianceWorkspaces = workspaces.filter(function(w) { return w.group === 'compliance'; });
  var programWorkspaces = workspaces.filter(function(w) { return w.group === 'program'; });

  var workspaceHtml = workspaces.length
    ? renderHubWorkspaceGroupHtml('Policy & control design', designWorkspaces)
      + renderHubWorkspaceGroupHtml('Asset & process compliance', complianceWorkspaces)
      + (programWorkspaces.length ? renderHubWorkspaceGroupHtml('Program', programWorkspaces) : '')
    : '<div class="hub-empty-actions">No workspaces with content for your role right now.</div>';

  return ''
    + '<div class="hub-lower-grid">'
    + '<div class="hub-section hub-section-card"><h3 class="hub-section-title">Your next actions</h3><div class="hub-actions">' + actionHtml + '</div></div>'
    + '<div class="hub-section hub-section-card"><h3 class="hub-section-title">Workspaces</h3><div class="hub-workspace-grid">'
    + workspaceHtml
    + '</div></div>'
    + '</div>';
}

function renderHubLaunchDashboardHtml(summary) {
  var ispLabel = getLaunchIspStatusLabel(summary.ispStatus);
  var domainVal = summary.domainsAssigned + '<span class="hub-kpi-val-fraction">/' + summary.domainTotal + '</span>';
  return ''
    + '<div class="hub-launch-hero">'
    + '<div class="hub-launch-hero-icon" aria-hidden="true">\u2713</div>'
    + '<div>'
    + '<h2 class="hub-launch-hero-title">Program setup complete \u2014 you\'re ready to build</h2>'
    + '<p class="hub-launch-hero-lead">Your governance structure, policy domains, and owners are in place. Start with your governance policy or your highest-priority domain policies.</p>'
    + '</div>'
    + '</div>'
    + '<div class="hub-kpi-grid">'
    + '<div class="hub-kpi hub-kpi--foundation"><div class="hub-kpi-val hub-kpi-val--check">\u2713</div><div class="hub-kpi-label">Phase 1 foundation</div><div class="hub-kpi-sub">Program structure ready</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + summary.categoryCount + '</div><div class="hub-kpi-label">Categories in scope</div><div class="hub-kpi-sub">CSF coverage selected</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + domainVal + '</div><div class="hub-kpi-label">Policy domains staffed</div><div class="hub-kpi-sub">Owners assigned</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val hub-kpi-val--text">' + escapeHTML(ispLabel) + '</div><div class="hub-kpi-label">Governance policy</div><div class="hub-kpi-sub">' + summary.subcategoryCount + ' subcategor' + (summary.subcategoryCount === 1 ? 'y' : 'ies') + ' ready</div></div>'
    + '</div>';
}

function renderHubOperationalDashboardHtml() {
  var ctrlTotal = typeof getActiveControls === 'function' ? getActiveControls().length : 0;
  var implemented = countImplementedControls();
  var implPct = ctrlTotal ? Math.round((implemented / ctrlTotal) * 100) : 0;
  var ownerCount = countUniquePolicyOwnerEmails();
  var domainsAssigned = countHubAssignedPolicyDomains();
  var domainTotal = getHubPolicyMasters().length;
  return ''
    + '<div class="hub-kpi-grid">'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + implPct + '%</div><div class="hub-kpi-label">Controls implemented</div><div class="hub-kpi-sub">' + implemented + ' / ' + ctrlTotal + '</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + ownerCount + '</div><div class="hub-kpi-label">Policy owners</div><div class="hub-kpi-sub">' + domainsAssigned + ' / ' + domainTotal + ' domains rostered</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + (state.assets || []).length + '</div><div class="hub-kpi-label">Assets in inventory</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + (typeof getCombinedOpenRiskIssueCount === 'function' ? getCombinedOpenRiskIssueCount() : 0) + '</div><div class="hub-kpi-label">Open risks &amp; issues</div></div>'
    + '</div>';
}

function renderHomeTab() {
  var body = document.getElementById('home-body');
  if (!body) return;

  if (!state.cisoComplete) {
    renderOnboardingHome();
    return;
  }

  var pageHeader = document.querySelector('#tab-home .page-header');
  if (pageHeader) pageHeader.style.display = '';
  updateCommandCenterPageHeader();

  var actions = getNextActions();
  ensureHubActionDelegation();

  var topHtml = isProgramLaunchPhase()
    ? renderHubLaunchDashboardHtml(getLaunchFoundationSummary())
    : renderHubOperationalDashboardHtml();

  body.innerHTML = ''
    + '<div class="hub-dashboard">'
    + topHtml
    + renderHubActionsAndWorkspacesHtml(actions)
    + (shouldShowHubRiskStrip() && typeof renderRiskSummaryHtml === 'function' ? renderRiskSummaryHtml() : '')
    + '</div>';
}

function getActiveTabIdFromDom() {
  var el = document.querySelector('.tab-panel.active');
  return el && el.id ? el.id.replace(/^tab-/, '') : 'home';
}

/** Top-of-app program lifecycle roadmap (Phase 1–3). */
function renderProgramPhaseBar() {
  var bar = document.getElementById('program-phase-bar');
  if (!bar) return;

  var phase1Complete = !!state.cisoComplete;
  var tab = getActiveTabIdFromDom();
  var phase1Tabs = { ciso: 1, policy: 1, control: 1, asset: 1 };
  var focusPhase = !phase1Complete ? 1 : (tab === 'risk' ? 2 : (phase1Tabs[tab] ? 1 : 2));

  var phases = [
    {
      n: 1,
      label: 'Phase 1',
      title: 'Set up program governance',
      desc: 'ISP, domain policies, controls, assets & SSP attestation',
      state: phase1Complete ? 'complete' : 'active',
      focused: focusPhase === 1,
      action: "showTab('ciso')",
      status: phase1Complete ? 'Complete' : 'In progress'
    },
    {
      n: 2,
      label: 'Phase 2',
      title: 'Record issues & risks',
      desc: 'Triage gaps, risk register, and POA&M-compatible remediation',
      state: !phase1Complete ? 'locked' : 'active',
      focused: focusPhase === 2 && phase1Complete,
      action: "state._riskView='triage';showTab('risk');",
      status: !phase1Complete ? 'After Phase 1' : 'Active'
    },
    {
      n: 3,
      label: 'Phase 3',
      title: 'Continuous monitoring',
      desc: 'In-production control testing, process audits, and high-risk area reviews',
      state: 'planned',
      focused: false,
      action: '',
      status: 'Coming soon'
    }
  ];

  var html = '<div class="program-phase-track">';
  phases.forEach(function(p, idx) {
    if (idx > 0) {
      html += '<div class="program-phase-connector' + (phases[idx - 1].state === 'complete' ? ' program-phase-connector--done' : '') + '" aria-hidden="true"></div>';
    }
    var cls = 'program-phase-step program-phase-step--' + p.state + (p.focused ? ' program-phase-step--active' : '');
    var inner = '<span class="program-phase-eyebrow">' + escapeHTML(p.label) + '</span>'
      + '<span class="program-phase-title">' + escapeHTML(p.title) + '</span>'
      + '<span class="program-phase-desc">' + escapeHTML(p.desc) + '</span>'
      + '<span class="program-phase-status">' + escapeHTML(p.status) + '</span>';
    if (p.action && p.state !== 'locked' && p.state !== 'planned') {
      html += '<button type="button" class="' + cls + '" onclick="' + p.action + '">' + inner + '</button>';
    } else {
      html += '<div class="' + cls + '" title="' + (p.state === 'planned' ? 'Planned: ongoing assessment and internal audit workflows' : 'Complete Phase 1 first') + '">' + inner + '</div>';
    }
  });
  html += '</div>';
  bar.innerHTML = html;
}

try {
  window.renderProgramPhaseBar = renderProgramPhaseBar;
  window.getHubCurrentUser = getHubCurrentUser;
  window.hubOpenQueuedSsp = hubOpenQueuedSsp;
  window.ensureHubActionDelegation = ensureHubActionDelegation;
} catch (e) {}
