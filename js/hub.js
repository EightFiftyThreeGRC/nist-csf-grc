// js/hub.js — Command Center (post-setup home dashboard)

function getNextActions() {
  var actions = [];
  var today = new Date().toISOString().slice(0, 10);

  if (!state.cisoComplete) {
    actions.push({ priority: 1, icon: '🏛️', label: 'Finish program setup', desc: 'Complete baseline, ISP, and owner assignment.', action: "showTab('ciso');goToStep('ciso',1);" });
    return actions;
  }

  var polReview = (state.policyStatus || {});
  Object.keys(polReview).forEach(function(fam) {
    var st = (polReview[fam] || {}).status;
    if (st === 'Submitted' || st === 'In Review') {
      actions.push({ priority: 2, icon: '📋', label: 'Review policy: ' + fam, desc: 'Domain policy awaiting CISO approval.', action: "openCISOReview('" + fam.replace(/'/g, "\\'") + "');" });
    }
  });

  (state.controlReviewQueue || []).slice(0, 5).forEach(function(r) {
    if (!r || !r.controlId) return;
    actions.push({ priority: 3, icon: '🔧', label: 'Review control: ' + r.controlId, desc: (r.status || 'Pending review'), action: "state._selectedCtrl='" + r.controlId.replace(/'/g, "\\'") + "';showTab('control');goToStep('control',2);" });
  });

  (state.poamItems || []).forEach(function(p) {
    if (p.dueDate && p.dueDate < today && p.status !== 'Closed' && p.status !== 'Mitigated') {
      actions.push({ priority: 0, icon: '⚠️', label: 'Overdue POA&M', desc: p.finding.slice(0, 60), action: "showTab('poam');" });
    }
  });

  (state.assets || []).forEach(function(a) {
    var signoff = (state.sspSignoffs || {})[a.id] || {};
    if (signoff.status === 'Submitted') {
      actions.push({ priority: 4, icon: '🖥️', label: 'SSP submitted: ' + a.name, desc: 'Review asset package on Reports.', action: "showTab('reports');" });
    }
  });

  actions.sort(function(a, b) { return a.priority - b.priority; });
  return actions.slice(0, 8);
}

function renderHomeTab() {
  var body = document.getElementById('home-body');
  if (!body) return;
  var org = escapeHTML(state.orgName || 'Your organization');
  var baseline = state.baseline ? (state.baseline === 'L' ? 'Low' : state.baseline === 'M' ? 'Moderate' : 'High') : '—';
  var ctrlTotal = typeof getActiveControls === 'function' ? getActiveControls().length : 0;
  var implemented = 0;
  if (typeof getActiveControls === 'function') {
    getActiveControls().forEach(function(c) {
      var st = (state.controlStatus || {})[c.id];
      if (st && (st.status === 'Implemented' || st.status === 'Inherited')) implemented++;
    });
  }
  var implPct = ctrlTotal ? Math.round((implemented / ctrlTotal) * 100) : 0;
  var polDone = Object.keys(state.domainOwners || {}).filter(function(f) {
    return (state.domainOwners[f] || {}).name;
  }).length;
  var actions = getNextActions();

  var actionHtml = actions.length
    ? actions.map(function(a) {
      return '<button type="button" class="hub-action-card" onclick="' + a.action + '">'
        + '<span class="hub-action-icon">' + a.icon + '</span>'
        + '<div><div class="hub-action-label">' + escapeHTML(a.label) + '</div>'
        + '<div class="hub-action-desc">' + escapeHTML(a.desc) + '</div></div>'
        + '<span class="hub-action-arrow">→</span></button>';
    }).join('')
    : '<div class="hub-empty-actions">You\'re caught up — explore the dashboard or libraries.</div>';

  var quickLinks = [
    { icon: '📋', label: 'Domain policies', fn: 'goToPoliciesHome()' },
    { icon: '🔧', label: 'Controls', fn: 'goToControlWorkspace()' },
    { icon: '🖥️', label: 'Assets & SSP', fn: 'goToAssetWorkspace()' },
    { icon: '◇', label: 'Frameworks', fn: "showTab('frameworks')" },
    { icon: '📝', label: 'POA&M', fn: "showTab('poam')" },
    { icon: '📊', label: 'Reports', fn: "showTab('reports')" }
  ];

  body.innerHTML = ''
    + '<div class="hub-hero">'
    + '<h2 class="hub-greeting">Command Center</h2>'
    + '<p class="hub-org">' + org + ' · ' + baseline + ' baseline' + (state.cisoComplete ? '' : ' · <em>Setup in progress</em>') + '</p>'
    + '</div>'
    + '<div class="hub-kpi-grid">'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + implPct + '%</div><div class="hub-kpi-label">Controls implemented</div><div class="hub-kpi-sub">' + implemented + ' / ' + ctrlTotal + '</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + polDone + '</div><div class="hub-kpi-label">Policy owners assigned</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + (state.assets || []).length + '</div><div class="hub-kpi-label">Assets in inventory</div></div>'
    + '<div class="hub-kpi"><div class="hub-kpi-val">' + getPoamOpenCount() + '</div><div class="hub-kpi-label">Open POA&M items</div></div>'
    + '</div>'
    + (typeof renderFrameworkDashboardStripHtml === 'function' ? renderFrameworkDashboardStripHtml() : '')
    + (typeof renderPoamSummaryHtml === 'function' ? renderPoamSummaryHtml() : '')
    + '<div class="hub-section"><h3 class="hub-section-title">Your next actions</h3><div class="hub-actions">' + actionHtml + '</div></div>'
    + '<div class="hub-section"><h3 class="hub-section-title">Quick links</h3><div class="hub-quick-grid">'
    + quickLinks.map(function(l) {
      return '<button type="button" class="hub-quick-card" onclick="' + l.fn + '"><span>' + l.icon + '</span>' + escapeHTML(l.label) + '</button>';
    }).join('')
    + '</div></div>';
}
