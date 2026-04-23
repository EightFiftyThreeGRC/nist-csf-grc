// js/app.js — application logic (load after js/core.js, js/program.js, and js/policies.js).

/** Render HTML list for the audit trail panel; filterCat null = all categories. */
function renderAuditTrail(filterCat) {
  var entries = (state.auditTrail || []).slice().reverse();
  if (filterCat) {
    entries = entries.filter(function(e) { return (e.cat || e.category) === filterCat; });
  }
  if (!entries.length) {
    return '<div style="font-size:12px;color:var(--text-muted);padding:12px;">No activity logged yet.</div>';
  }
  return entries.slice(0, 200).map(function(e) {
    var cat = escapeHTML(e.cat || e.category || 'program');
    var msg = escapeHTML(e.msg || e.message || '');
    var t = (e.t || e.at || '').toString().slice(0, 19).replace('T', ' ');
    return '<div style="font-size:12px;border-bottom:1px solid #f1f5f9;padding:8px 0;">'
      + '<span style="color:var(--text-muted);font-size:11px;">' + escapeHTML(t) + '</span> '
      + '<span style="font-weight:600;color:var(--navy);">' + cat + '</span> '
      + '<span style="color:var(--text);">' + msg + '</span></div>';
  }).join('');
}

function trimDisplay(val, max) {
  max = max || 120;
  var s;
  try { s = typeof val === 'string' ? val : JSON.stringify(val); } catch (e2) { s = String(val); }
  if (s.length > max) return s.slice(0, max) + '…';
  return s;
}

function renderChangeLogTableHtml() {
  var userQ = (state._changeLogUserFilter || '').toLowerCase();
  var dateQ = (state._changeLogDateFilter || '').trim();
  var rows = (state.changeLog || []).slice().reverse().filter(function(e) {
    if (userQ && String(e.u || '').toLowerCase().indexOf(userQ) === -1) return false;
    if (dateQ && String(e.t || '').indexOf(dateQ) === -1) return false;
    return true;
  }).slice(0, 500);
  if (!rows.length) {
    return '<div style="font-size:12px;color:var(--text-muted);padding:12px;">No field-level changes match these filters (or none logged yet).</div>';
  }
  var head = '<table class="control-table" style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f8fafc;">'
    + '<th style="padding:8px;text-align:left;width:150px;">Time</th>'
    + '<th style="padding:8px;text-align:left;width:120px;">User</th>'
    + '<th style="padding:8px;text-align:left;">Path</th>'
    + '<th style="padding:8px;text-align:left;width:28%;">Before</th>'
    + '<th style="padding:8px;text-align:left;width:28%;">After</th>'
    + '</tr></thead><tbody>';
  var body = rows.map(function(e) {
    var t = (e.t || '').toString().slice(0, 19).replace('T', ' ');
    var o = trimDisplay(e.o, 80);
    var n = trimDisplay(e.n, 80);
    return '<tr style="border-bottom:1px solid #f1f5f9;">'
      + '<td style="padding:8px;vertical-align:top;color:var(--text-muted);">' + escapeHTML(t) + '</td>'
      + '<td style="padding:8px;vertical-align:top;font-weight:600;">' + escapeHTML(String(e.u || '')) + '</td>'
      + '<td style="padding:8px;vertical-align:top;font-family:monospace;font-size:10px;word-break:break-all;">' + escapeHTML(String(e.p || '')) + '</td>'
      + '<td style="padding:8px;vertical-align:top;color:#991b1b;word-break:break-word;" title="' + escapeHTML(trimDisplay(e.o, 400)) + '">' + escapeHTML(o) + '</td>'
      + '<td style="padding:8px;vertical-align:top;color:#166534;word-break:break-word;" title="' + escapeHTML(trimDisplay(e.n, 400)) + '">' + escapeHTML(n) + '</td>'
      + '</tr>';
  }).join('');
  return head + body + '</tbody></table>';
}

function syncAuditTrailPanelContent() {
  var el = document.getElementById('auditTrailContent');
  if (!el) return;
  if (state._auditTrailUiMode === 'fields') {
    el.innerHTML = renderChangeLogTableHtml();
  } else {
    var cat = state._auditTrailEventCatFilter === 'all' ? null : state._auditTrailEventCatFilter;
    el.innerHTML = renderAuditTrail(cat);
  }
}

function setAuditTrailUiMode(mode) {
  state._auditTrailUiMode = mode === 'fields' ? 'fields' : 'events';
  renderAuditTrailPanel();
}

function setChangeLogUserFilter(val) {
  state._changeLogUserFilter = val;
  syncAuditTrailPanelContent();
}

function setChangeLogDateFilter(val) {
  state._changeLogDateFilter = val;
  syncAuditTrailPanelContent();
}


// ============================================================
// HELPERS
// ============================================================

// NIST SP 800-53B Rev. 5 authoritative baseline counts (verified against official Excel)
// Source: sp800-53b-control-baselines.xlsx  |  PT family excluded from this tool's scope

// Evidence guidance per control family (for Control Owner step 2 help panel)
const CTRL_STATEMENTS = {
  'AC-1': 'Develop, document, and disseminate access control policies and procedures that address purpose, scope, roles, responsibilities, management commitment, coordination, and compliance.',
  'AC-2': 'Manage information system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts; and notifying account managers of changes.',
  'AC-3': 'Enforce approved authorizations for logical access to information and system resources in accordance with applicable access control policies.',
  'AC-17': 'Establish usage restrictions, configuration/connection requirements, and implementation guidance for remote access; and authorize remote access prior to allowing connections.',
  'AU-2': 'Determine the types of events that the system is capable of logging in support of the audit function and coordinate the event logging function with other organizations.',
  'AU-11': 'Retain audit records for a defined period to provide support for after-the-fact investigations of security incidents.',
  'CA-7': 'Develop a system-level continuous monitoring strategy and implement a continuous monitoring program.',
  'CM-2': 'Develop, document, and maintain a current baseline configuration of the information system.',
  'CM-6': 'Establish and document configuration settings for information technology products that reflect the most restrictive mode consistent with operational requirements.',
  'CM-7': 'Configure the system to provide only essential capabilities; prohibit or restrict the use of functions, ports, protocols, and services not required.',
  'CP-9': 'Conduct backups of user-level and system-level information contained in the information system and protect the confidentiality, integrity, and availability of backup information.',
  'IA-2': 'Uniquely identify and authenticate organizational users and associate that unique identification with processes acting on behalf of those users.',
  'IA-5': 'Manage information system authenticators (e.g., passwords, tokens, biometrics) by verifying identity of individuals prior to distribution, establishing initial authenticator content, and protecting content from unauthorized disclosure.',
  'IR-4': 'Implement an incident handling capability for security incidents including preparation, detection, analysis, containment, eradication, and recovery.',
  'MP-6': 'Sanitize information system media, both digital and non-digital, prior to disposal, release out of organizational control, or release for reuse.',
  'PE-2': 'Develop, approve, and maintain a list of individuals with authorized access to the facility where the information system resides.',
  'PL-2': 'Develop a security plan for the information system that describes the security requirements for the system and the security controls in place or planned for meeting those requirements.',
  'PS-3': 'Screen individuals prior to authorizing access to organizational information and information systems.',
  'RA-3': 'Conduct assessments of the risk to organizational operations, assets, individuals, and other organizations, resulting from the operation of information systems.',
  'RA-5': 'Scan for vulnerabilities in the information system and hosted applications periodically and when new vulnerabilities potentially affecting the system are identified.',
  'SA-9': 'Require external information system service providers to comply with organizational information security requirements and employ security controls in accordance with applicable laws, directives, regulations, standards, guidelines, and organizational mission/business requirements.',
  'SC-28': 'Implement cryptographic mechanisms to prevent unauthorized disclosure and modification of information at rest on digital media.',
  'SC-8': 'Implement cryptographic mechanisms to prevent unauthorized disclosure of information during transmission unless otherwise protected by alternative physical safeguards.',
  'SI-2': 'Identify, report, and correct information system flaws; test software and firmware updates related to flaw remediation for effectiveness and potential side effects before installation.',
  'SI-3': 'Employ malicious code protection mechanisms at information system entry and exit points to detect and eradicate malicious code.',
};
const FAMILY_EVIDENCE_GUIDANCE = {
  AC: { label:'Access Control', type:'Preventive / Administrative', evidence:['Policy Document: Access control policy & procedures','Configuration: IAM system screenshots (AD, Okta, Azure AD)','Report: Quarterly user access review records','Configuration: Role/permission matrix','Log: Privileged access audit log excerpts'] },
  AT: { label:'Awareness & Training', type:'Preventive / Administrative', evidence:['Report: Security awareness training completion records','Policy Document: Training curriculum & acceptable use policy','Report: Phishing simulation results with metrics','Log: LMS training completion attestations','Interview notes: Evidence of training delivery & assessment'] },
  AU: { label:'Audit & Accountability', type:'Detective / Technical', evidence:['Configuration: SIEM configuration screenshots','Log: Audit log samples (anonymized)','Policy Document: Log retention & protection policy','Configuration: Alerting rules & monitoring thresholds','Report: Log integrity check results'] },
  CA: { label:'Assessment, Authorization & Monitoring', type:'Detective / Administrative', evidence:['Policy Document: System Security Plan (SSP)','Report: Authorization to Operate (ATO) letter','Policy Document: Continuous monitoring strategy','Report: Vulnerability assessment reports (within 12 months)','Report: POA&M tracking & remediation status'] },
  CM: { label:'Configuration Management', type:'Preventive / Technical', evidence:['Policy Document: Configuration management policy & baseline standards','Configuration: Baseline configuration documentation','Report: Change management ticket samples (last 90 days)','Configuration: CMDB / asset inventory snapshot','Report: Configuration compliance scan results'] },
  CP: { label:'Contingency Planning', type:'Corrective / Administrative', evidence:['Policy Document: Business Continuity & Disaster Recovery plans','Report: DR/BC test results with after-action review','Log: Backup verification & integrity check logs','Policy Document: RTO/RPO requirements & SLA documentation','Interview notes: Evidence of plan maintenance & stakeholder testing'] },
  IA: { label:'Identification & Authentication', type:'Preventive / Technical', evidence:['Configuration: MFA enrollment & settings screenshot','Policy Document: Password & authentication policy','Configuration: Identity provider (LDAP/SAML) configuration','Report: Privileged account inventory & periodic attestation','Log: Authentication log samples'] },
  IR: { label:'Incident Response', type:'Corrective / Administrative', evidence:['Policy Document: Incident Response Plan & procedures','Report: Incident handling records (redacted, last 12 months)','Report: IR tabletop exercise or simulation results','Policy Document: Escalation procedures & contact list','Interview notes: Evidence of IR team training & drills'] },
  MA: { label:'Maintenance', type:'Preventive / Administrative', evidence:['Policy Document: System maintenance & vendor management policy','Log: Maintenance work orders & activity logs','Policy Document: Remote access authorization & monitoring controls','Report: Approved vendor list & security assessments','Configuration: Maintenance window scheduling & change control records'] },
  MP: { label:'Media Protection', type:'Preventive / Physical', evidence:['Policy Document: Media handling, classification & sanitization policy','Report: Certificates of Destruction (CoD) or sanitization records','Configuration: Encryption configuration for data at rest','Procedure: Media destruction procedures & vendor contracts','Interview notes: Evidence of media labeling & tracking'] },
  PE: { label:'Physical & Environmental Protection', type:'Preventive / Physical', evidence:['Log: Facility access log excerpts (last 90 days)','Configuration: Badge reader configuration & access list','Log: Visitor log samples','Configuration: CCTV / environmental monitoring records','Policy Document: Physical security policy & procedures'] },
  PL: { label:'Planning', type:'Administrative', evidence:['Policy Document: System Security Plan (SSP)','Report: Privacy Impact Assessment (if applicable)','Policy Document: Rules of Behavior (signed acknowledgments)','Procedure: Security architecture & data flow diagrams','Report: System boundary documentation'] },
  PM: { label:'Program Management', type:'Administrative', evidence:['Policy Document: Information security program charter & policy framework','Report: Risk management strategy & annual risk assessment','Report: Enterprise architecture & security program roadmap','Report: Security program status reports (quarterly or annual)','Interview notes: Steering committee meeting minutes & governance records'] },
  PS: { label:'Personnel Security', type:'Preventive / Administrative', evidence:['Policy Document: Background check & personnel security policy','Report: Background check authorization records','Procedure: Termination/separation security procedures','Policy Document: NDA & acceptable use agreements (signed samples)','Report: Annual personnel security training completion records'] },
  PT: { label:'PII Processing & Transparency', type:'Preventive / Administrative', evidence:['Policy Document: Privacy notice, policy & PII handling procedures','Report: Consent management records (if applicable)','Report: PII inventory & data map documentation','Report: Privacy Threshold Analysis (PTA) or equivalent','Log: Individual rights request log (redacted samples)'] },
  RA: { label:'Risk Assessment', type:'Detective / Administrative', evidence:['Report: Current risk assessment report (annual or per-system)','Report: Vulnerability scan reports with remediation tracking','Report: Threat modeling documentation or results','Report: Risk register with identified risks & mitigation plans','Report: Risk acceptance memos for residual risks'] },
  SA: { label:'System & Services Acquisition', type:'Preventive / Administrative', evidence:['Policy Document: Software acquisition & vendor selection policy','Report: Vendor security assessments or compliance checks','Report: Secure SDLC documentation (if software developed in-house)','Report: License management & compliance audit records','Policy Document: Third-party contract security clauses & SLAs'] },
  SC: { label:'System & Communications Protection', type:'Preventive / Technical', evidence:['Procedure: Network architecture & segmentation diagram','Configuration: Firewall rule review & validation records','Configuration: Encryption-in-transit configuration (TLS/IPSec)','Report: TLS certificate inventory & validation status','Report: Network/port scan results (validated configuration)'] },
  SI: { label:'System & Information Integrity', type:'Detective / Technical', evidence:['Report: Patch management policy & monthly patch deployment reports','Configuration: Anti-malware deployment & threat definition status','Log: File Integrity Monitoring (FIM) log samples & alerts','Report: Vulnerability management metrics & remediation records','Configuration: Intrusion Detection/Prevention system configuration & alerts'] },
  SR: { label:'Supply Chain Risk Management', type:'Preventive / Administrative', evidence:['Report: Vendor risk assessment records & periodic reviews','Policy Document: Supply chain risk management policy & procedures','Report: Approved supplier/vendor list with security ratings','Report: Software Bill of Materials (SBOM) for acquired software','Report: Third-party audit reports (SOC 2, ISO 27001, FedRAMP)'] },
};

function baselineCount(bl) {
  return BASELINE_COUNTS[bl] || 0;
}

function pillsHTML(bl) {
  return bl.map(b => {
    const cls = b==='L'?'pill-l':b==='M'?'pill-m':b==='H'?'pill-h':'pill-p';
    const lbl = b==='L'?'Low':b==='M'?'Mod':b==='H'?'High':'Privacy';
    return `<span class="baseline-pill ${cls}">${lbl}</span>`;
  }).join('');
}

// Returns a single pill for the minimum baseline where a control is first required.
// bl=[] = catalog control, not assigned to any baseline.
function minBaselinePill(bl) {
  if (!bl || bl.length === 0) return '<span class="baseline-pill" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;" title="NIST 800-53 catalog — not assigned to any baseline">CATALOG</span>';
  if (bl.includes('L')) return '<span class="baseline-pill pill-l" title="Required in Low, Moderate, and High baselines">LOW+</span>';
  if (bl.includes('M')) return '<span class="baseline-pill pill-m" title="Required in Moderate and High baselines">MOD+</span>';
  if (bl.includes('H')) return '<span class="baseline-pill pill-h" title="Required in High baseline only">HIGH</span>';
  if (bl.includes('P')) return '<span class="baseline-pill pill-p" title="Privacy baseline">PRIVACY</span>';
  return '<span class="baseline-pill" style="background:#f1f5f9;color:#64748b;">CATALOG</span>';
}

function chipHTML(status) {
  const map = {
    'Implemented': 'chip-green', 'Planned': 'chip-amber',
    'Not Started': 'chip-red', 'Not Applicable': 'chip-gray',
    'In Progress': 'chip-blue', 'In Review': 'chip-blue', 'Live': 'chip-green',
    'Pass': 'chip-green', 'Fail': 'chip-red', 'Partial': 'chip-amber',
    'Draft': 'chip-blue', 'Approved': 'chip-green', 'Under Review': 'chip-amber',
    'Attested': 'chip-green', 'Pending': 'chip-amber',
    'Returned': 'chip-red'
  };
  return `<span class="chip ${map[status]||'chip-gray'}">${status||'—'}</span>`;
}

// ============================================================
// POLICY REVIEW CYCLE TRACKING
// ============================================================
// Returns { status:'current'|'approaching'|'overdue'|'unset', color, bg, border, label, daysUntil }
function getReviewStatus(policyKey) {
  var rc = (state.policyReviewCycle || {})[policyKey];
  if (!rc || !rc.nextReviewDue) return { status:'unset', color:'#64748b', bg:'rgba(100,116,139,0.06)', border:'rgba(100,116,139,0.2)', label:'No review date set', daysUntil: null };
  var today = new Date(); today.setHours(0,0,0,0);
  var due = new Date(rc.nextReviewDue + 'T00:00:00');
  var diff = Math.ceil((due - today) / 86400000);
  if (diff < 0) return { status:'overdue', color:'#dc2626', bg:'rgba(220,38,38,0.06)', border:'rgba(220,38,38,0.3)', label:'Overdue by ' + Math.abs(diff) + ' day' + (Math.abs(diff)===1?'':'s'), daysUntil: diff };
  if (diff <= 60) return { status:'approaching', color:'#d97706', bg:'rgba(217,119,6,0.06)', border:'rgba(217,119,6,0.3)', label:'Due in ' + diff + ' day' + (diff===1?'':'s'), daysUntil: diff };
  return { status:'current', color:'#16a34a', bg:'rgba(22,163,74,0.06)', border:'rgba(22,163,74,0.3)', label:'Current — due in ' + diff + ' days', daysUntil: diff };
}

function reviewStatusDot(policyKey) {
  var rs = getReviewStatus(policyKey);
  var dotColor = rs.status === 'current' ? '#16a34a' : rs.status === 'approaching' ? '#d97706' : rs.status === 'overdue' ? '#dc2626' : '#94a3b8';
  return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dotColor + ';margin-right:6px;" title="' + rs.label + '"></span>';
}

// Toggle custom approver visibility — no innerHTML swap, just show/hide a pre-rendered div.
// This avoids ALL onchange/DOM timing issues: the custom fields are always in the DOM,
// the checkbox just controls their display:none/block.
function toggleCustomApprover(policyKey, checkbox) {
  if (!state.policyReviewCycle) state.policyReviewCycle = {};
  if (!state.policyReviewCycle[policyKey]) state.policyReviewCycle[policyKey] = {};
  var rc = state.policyReviewCycle[policyKey];
  var isCustom = checkbox.checked;
  rc._customApprover = isCustom;
  if (!isCustom) {
    // Domain policies are drafted by the ISSM but formally approved by the program owner (CISO) unless "Different approver" is used.
    rc.approvedBy = (state.programOwner || '').trim();
  } else {
    if (!rc.approvedBy) rc.approvedBy = '';
  }
  var customDiv = document.getElementById('custom-approver-' + policyKey);
  if (customDiv) customDiv.style.display = isCustom ? 'block' : 'none';
  window.markDirty && window.markDirty();
}

function renderReviewCycleCard(policyKey, label) {
  if (!state.policyReviewCycle) state.policyReviewCycle = {};
  if (!state.policyReviewCycle[policyKey]) state.policyReviewCycle[policyKey] = {};
  var rc = state.policyReviewCycle[policyKey];

  // Auto-populate sensible defaults the first time this card is rendered
  var today = new Date().toISOString().slice(0, 10);
  if (!rc.lastReviewed)   { rc.lastReviewed  = today; }
  if (!rc.nextReviewDue)  { var d = new Date(rc.lastReviewed + 'T00:00:00'); d.setFullYear(d.getFullYear() + 1); rc.nextReviewDue = d.toISOString().slice(0, 10); }
  if (!rc.approvalDate)   { rc.approvalDate  = today; }

  // Initialize default approver if not set (always program owner unless "Different approver")
  if (!rc.approvedBy && !rc._customApprover) {
    rc.approvedBy = (state.programOwner || '').trim();
  }

  // Legacy: domain cards used ISSM name as "Approved By" while the badge said Program Owner — realign to program owner when still the old mistaken value.
  if (policyKey !== 'ISP' && !rc._customApprover) {
    var domOwnNm = ((state.domainOwners || {})[policyKey] || {}).name;
    domOwnNm = domOwnNm ? String(domOwnNm).trim() : '';
    var poNm = (state.programOwner || '').trim();
    if (domOwnNm && poNm && (rc.approvedBy || '').trim() === domOwnNm && (rc.approvedBy || '').trim() !== poNm) {
      rc.approvedBy = poNm;
    }
  }

  // Default approver name shown in the badge (same as ISP: program owner / CISO)
  var defaultApproverName = (state.programOwner || '').trim();

  var rs = getReviewStatus(policyKey);
  var escKey = policyKey.replace(/'/g, "\\'");

  // Always render both the default badge and the custom fields — the checkbox
  // toggles display:none/block on the custom div. No innerHTML swap needed.
  var isCustom = !!rc._customApprover;
  var approverHTML = '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.2);border-radius:8px;font-size:12px;font-weight:600;color:var(--navy);">'
    + escapeHTML(defaultApproverName || 'CISO') + ' <span style="font-size:10px;color:#6366f1;font-weight:400;">(Program Owner)</span>'
    + '</div>'
    + '<label style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;font-size:11px;color:var(--text-muted);">'
    + '<input type="checkbox" ' + (isCustom ? 'checked' : '') + ' style="accent-color:#6366f1;cursor:pointer;" onclick="toggleCustomApprover(\'' + escKey + '\', this)"> Different approver</label>'
    + '<div id="custom-approver-' + policyKey + '" style="display:' + (isCustom ? 'block' : 'none') + ';margin-top:8px;">'
    + '<div style="display:flex;gap:4px;">'
    + '<input class="form-input" style="font-size:12px;width:33%;" placeholder="Approver name" autocomplete="off" value="' + escapeHTML(rc.approvedBy||'') + '" oninput="state.policyReviewCycle[\'' + escKey + '\'].approvedBy=this.value; window.markDirty();">'
    + '<input class="form-input" style="font-size:12px;width:33%;" placeholder="Role (e.g. CIO)" autocomplete="off" value="' + escapeHTML(rc.approverRole||'') + '" oninput="state.policyReviewCycle[\'' + escKey + '\'].approverRole=this.value; window.markDirty();">'
    + '<input class="form-input" style="font-size:12px;width:33%;" placeholder="Email" autocomplete="off" value="' + escapeHTML(rc.approverEmail||'') + '" oninput="state.policyReviewCycle[\'' + escKey + '\'].approverEmail=this.value; window.markDirty();"></div>'
    + '</div>';

  return '<div style="border:1px solid ' + rs.border + ';border-radius:10px;padding:16px 18px;margin-bottom:16px;background:' + rs.bg + ';">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--navy);display:flex;align-items:center;">' + reviewStatusDot(policyKey) + ' Policy Review Status — ' + label + '</div>'
    + '<span style="font-size:11px;font-weight:600;color:' + rs.color + ';background:white;border:1px solid ' + rs.border + ';padding:2px 10px;border-radius:12px;">' + rs.label + '</span>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
    + '<div class="form-group" style="margin-bottom:0;">'
    + '<label class="form-label" style="font-size:11px;">Last Reviewed</label>'
    + '<input class="form-input" type="date" style="font-size:12px;" value="' + (rc.lastReviewed||'') + '" oninput="state.policyReviewCycle[\'' + escKey + '\'].lastReviewed=this.value; autoSetNextReview(\'' + escKey + '\');; window.markDirty();">'
    + '</div>'
    + '<div class="form-group" style="margin-bottom:0;">'
    + '<label class="form-label" style="font-size:11px;">Next Review Due</label>'
    + '<input class="form-input" type="date" style="font-size:12px;border-color:' + rs.color + ';" value="' + (rc.nextReviewDue||'') + '" oninput="state.policyReviewCycle[\'' + escKey + '\'].nextReviewDue=this.value;; window.markDirty();">'
    + '</div>'
    + '<div class="form-group" style="margin-bottom:0;">'
    + '<label class="form-label" style="font-size:11px;">Approved By</label>'
    + approverHTML
    + '</div>'
    + '<div class="form-group" style="margin-bottom:0;">'
    + '<label class="form-label" style="font-size:11px;">Approval Date</label>'
    + '<input class="form-input" type="date" style="font-size:12px;" value="' + (rc.approvalDate||'') + '" oninput="state.policyReviewCycle[\'' + escKey + '\'].approvalDate=this.value;; window.markDirty();">'
    + '</div>'
    + '</div>'
    + '<div style="font-size:10px;color:var(--text-muted);margin-top:10px;">NIST 800-53 requires policies be reviewed at least annually. Auditors will ask: &ldquo;When was this last reviewed and by whom?&rdquo;</div>'
    + '</div>';
}

function autoSetNextReview(policyKey) {
  var rc = state.policyReviewCycle[policyKey];
  if (rc && rc.lastReviewed && !rc.nextReviewDue) {
    // Default: 1 year from last review
    var d = new Date(rc.lastReviewed + 'T00:00:00');
    d.setFullYear(d.getFullYear() + 1);
    rc.nextReviewDue = d.toISOString().slice(0, 10);
  }
}

// ============================================================
// NEW FEATURE HELPERS: Deadlines, Versioning, Workflow, etc
// ============================================================

// Role-based view filtering
function getRoleView(userId) {
  if (!userId || userId === 'admin') return { role: 'admin', scope: 'all' };
  const user = state.users && state.users.find(u => u.id === userId);
  if (!user) return { role: 'admin', scope: 'all' };
  return { role: user.role, scope: { families: user.families || [], controls: user.controls || [], assets: user.assets || [] } };
}

function getMyControls(userId) {
  if (!userId || userId === 'admin') return getActiveControls();
  const user = state.users && state.users.find(u => u.id === userId);
  if (!user || !user.controls) return [];
  return getActiveControls().filter(c => user.controls.includes(c.id));
}

// Returns the right control list for the current session:
// - Control owners see only their assigned controls
// - Admins and CISOs see all controls
function getScopedControls() {
  if (!state.currentUserId) return getActiveControls();
  // Collect all records for this person (handles dual roles)
  var primaryUser = (state.users||[]).find(u => u.id === state.currentUserId);
  if (!primaryUser) return getActiveControls();
  var nameKey = (primaryUser.name || '').trim().toLowerCase();
  var allRecords = (state.users||[]).filter(function(u){ return u.name && u.name.trim().toLowerCase() === nameKey; });

  // Aggregate roles and families/controls across all records.
  // Include rec.roles[] (merged array from upsertUser) in addition to rec.role (primary).
  var roles = [];
  var allFamilies = [];
  var allControls = [];
  allRecords.forEach(function(u){
    var recRoles = (u.roles && u.roles.length) ? u.roles : [u.role];
    recRoles.forEach(function(r){ if (!roles.includes(r)) roles.push(r); });
    (u.families||[]).forEach(function(f){ if (!allFamilies.includes(f)) allFamilies.push(f); });
    (u.controls||[]).forEach(function(c){ if (!allControls.includes(c)) allControls.push(c); });
  });

  if (roles.includes('control-owner')) {
    // Control owner: filter by assigned controls list
    var byList = allControls.length
      ? getActiveControls().filter(c => allControls.includes(c.id))
      : [];
    if (byList.length) return byList;
    // Secondary match: controls where this user is named as owner
    return getActiveControls().filter(c => (state.controlOwners||{})[c.id]?.name === primaryUser.name);
  }
  if (roles.includes('issm') || roles.includes('custodian')) {
    // ISSM/custodian: filter by assigned families
    if (allFamilies.length) return getActiveControls().filter(c => allFamilies.includes(c.f));
  }
  return getActiveControls();
}

function getMyAssets(userId) {
  if (!userId || userId === 'admin') return state.assets || [];
  const user = state.users && state.users.find(u => u.id === userId);
  if (!user || !user.assets) return [];
  return (state.assets || []).filter(a => user.assets.includes(a.id));
}

function getCurrentPersonAssetIds() {
  if (!state.currentUserId) return null; // admin/full view
  var currentUser = (state.users || []).find(function(u){ return u.id === state.currentUserId; });
  if (!currentUser) return [];
  var personIds = (state._currentPersonIds && state._currentPersonIds.length) ? state._currentPersonIds : [currentUser.id];
  var isAssetOwner = false;
  var ids = [];
  personIds.forEach(function(pid) {
    var rec = (state.users || []).find(function(u){ return u.id === pid; });
    if (!rec) return;
    var roles = (rec.roles && rec.roles.length) ? rec.roles : [rec.role];
    if (roles.indexOf('asset-owner') !== -1) {
      isAssetOwner = true;
      (rec.assets || []).forEach(function(aid) {
        var sid = String(aid);
        if (ids.indexOf(sid) === -1) ids.push(sid);
      });
    }
  });
  return isAssetOwner ? ids : null;
}

// Get controls that affect a specific asset
function getControlsForAsset(assetId) {
  if (!state.assetMappings) return [];
  const controlIds = Object.keys(state.assetMappings).filter(cid =>
    (state.assetMappings[cid] || []).includes(assetId)
  );
  return getActiveControls().filter(c => controlIds.includes(c.id));
}

// Deadline tracking
function daysOverdue(deadline) {
  if (!deadline) return 0;
  const due = new Date(deadline);
  const now = new Date();
  const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function getOverdueControls() {
  const overdueCtrl = [];
  getActiveControls().forEach(c => {
    const deadline = state.controlDeadlines && state.controlDeadlines[c.id];
    if (deadline && daysOverdue(deadline) > 0) {
      overdueCtrl.push({ ...c, daysOverdue: daysOverdue(deadline) });
    }
  });
  return overdueCtrl.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// Workflow state
function transitionControlWorkflow(controlId, newState) {
  if (!state.controlWorkflowState) state.controlWorkflowState = {};
  const validStates = ['draft', 'in-progress', 'awaiting-review', 'approved'];
  if (!validStates.includes(newState)) return false;
  state.controlWorkflowState[controlId] = newState;
  if (newState === 'awaiting-review') {
    if (!state.controlReviewQueue) state.controlReviewQueue = [];
    if (!state.controlReviewQueue.find(r => r.controlId === controlId)) {
      state.controlReviewQueue.push({ controlId, submittedAt: new Date().toISOString() });
    }
  }
  markDirty();
  return true;
}

function approveControl(controlId) {
  transitionControlWorkflow(controlId, 'approved');
  if (state.controlReviewQueue) {
    state.controlReviewQueue = state.controlReviewQueue.filter(r => r.controlId !== controlId);
  }
  markDirty();
}

// Policy versioning
function incrementPolicyVersion(family) {
  if (!state.policyVersions) state.policyVersions = {};
  if (!state.policyVersions[family]) {
    state.policyVersions[family] = [{ version: '1.0', approvedAt: new Date().toISOString(), approved: true }];
  } else {
    const current = state.policyVersions[family];
    const lastVer = current[current.length - 1];
    const parts = lastVer.version.split('.').map(p => parseInt(p, 10));
    parts[1] = (parts[1] || 0) + 1;
    const nextVer = parts.join('.');
    current.push({ version: nextVer, approvedAt: new Date().toISOString(), approved: false });
  }
  markDirty();
}

function getPolicyVersion(family) {
  if (!state.policyVersions || !state.policyVersions[family]) return '1.0';
  const versions = state.policyVersions[family];
  return versions[versions.length - 1].version;
}

// Program health statistics
function getProgramHealth() {
  const allControls = getActiveControls();
  const implemented = allControls.filter(c => {
    const status = state.controlStatus && state.controlStatus[c.id];
    return status && status.status === 'Implemented';
  }).length;
  const inProgress = allControls.filter(c => {
    const status = state.controlStatus && state.controlStatus[c.id];
    return status && status.status === 'In Progress';
  }).length;
  const planned = allControls.filter(c => {
    const status = state.controlStatus && state.controlStatus[c.id];
    return status && status.status === 'Planned';
  }).length;
  const notStarted = allControls.length - implemented - inProgress - planned;

  const allPolicies = getActiveFamilies().length;
  const completedPolicies = getActiveFamilies().filter(f => {
    const status = state.policyStatus && state.policyStatus[f];
    return status && status.status === 'Approved';
  }).length;

  const overdue = getOverdueControls().length;
  const inReview = (state.controlReviewQueue || []).length;

  return {
    totalControls: allControls.length,
    implemented,
    inProgress,
    planned,
    notStarted,
    implementedPercent: Math.round((implemented / (allControls.length || 1)) * 100),
    totalPolicies: allPolicies,
    completedPolicies,
    totalAssets: (state.assets || []).length,
    overdue,
    inReview,
  };
}

// ============================================================
// NAVIGATION
// ============================================================
// RESET
// ============================================================
function confirmReset() {
  const overlay = document.createElement('div');
  overlay.id = 'resetModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div style="background:white;border-radius:16px;padding:32px;width:420px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);">'
    + '<div style="font-size:22px;margin-bottom:8px;">↺</div>'
    + '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:8px;">Reset Program?</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:24px;line-height:1.6;">This will clear all data — baseline selection, domain owners, policies, control assignments, and test results. The app will return to its initial state.</div>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end;">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'resetModalOverlay\').remove()">Cancel</button>'
    + '<button class="btn" style="background:var(--red);color:white;border:none;" onclick="resetApp()">Reset Everything</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

function resetApp() {
  document.getElementById('resetModalOverlay')?.remove();
  clearScopedUndoStack('reset');
  // Reset all persisted state keys from a single default schema source.
  // This avoids stale fields when new keys are added over time.
  resetStateToDefaults();
  delete state._cisoAutoOwnerName;
  // Reset step counters
  Object.keys(currentStep).forEach(function(k){ currentStep[k] = 1; });
  // Return to admin view and update profile button
  applyRoleView('admin');
  // Re-lock role tabs
  renderSidebarBadges();
  // Navigate to CISO tab step 1
  showTab('ciso');
  goToStep('ciso', 1);
  // Clear localStorage so users/roles don't reload on next page load
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_KEY + '-ts'); } catch(e) {}
  showToast('\u21BA Program reset. Starting fresh.');
}

// ============================================================
// TAB ROUTING & APP SHELL
// Tab IDs, showTab, role-view routing, CISO wizard shell
// (step dispatch, toast, cisoFinish, sidebar badges).
// ============================================================
const TAB_IDS = ['ciso','policy','control','asset','tester','reports','users'];


function showProgramOverviewTab() {
  if (!state.cisoComplete || !state.currentUserId) {
    showTab('ciso');
    return;
  }
  showTab('reports');
}

/** Merged nav tab IDs for a logged-in person (all records with same name). Omits CISO setup tab after program setup is complete. */
function getPersonVisibleTabIds(user) {
  if (!user) return TAB_IDS.slice();
  var nameKey = (user.name || '').trim().toLowerCase();
  var allRecords = (state.users || []).filter(function(u) {
    return u.name && u.name.trim().toLowerCase() === nameKey;
  });
  var visible = [];
  allRecords.forEach(function(rec) {
    var recRoles = (rec.roles && rec.roles.length) ? rec.roles : [rec.role];
    recRoles.forEach(function(r) {
      var tabs = ROLE_TABS[r] || ['reports'];
      tabs.forEach(function(t) {
        if (visible.indexOf(t) === -1) visible.push(t);
      });
    });
  });
  if (!visible.length) {
    var roles = (user.roles && user.roles.length) ? user.roles : [user.role];
    roles.forEach(function(r) {
      var tabs = ROLE_TABS[r] || ['reports'];
      tabs.forEach(function(t) {
        if (visible.indexOf(t) === -1) visible.push(t);
      });
    });
  }
  if (state.cisoComplete) {
    visible = visible.filter(function(t) { return t !== 'ciso'; });
  }
  return visible.length ? visible : ['reports'];
}

function goToProgramSetupOrDashboard() {
  if (state.cisoComplete) showTab('reports');
  else showTab('ciso');
}

/** From dashboard: open domain-owner step in CISO wizard (admin), or explain when PO no longer has that workspace. */
function goToDomainOwnersFromDashboard() {
  if (!state.currentUserId) {
    showTab('ciso');
    goToStep('ciso', 5);
    return;
  }
  if (state.cisoComplete) {
    showToast('Domain owners are edited in Program Setup. Sign out and open Admin (🔑), or ask your administrator.', true);
    return;
  }
  showTab('ciso');
  goToStep('ciso', 5);
}

function showTab(tabId) {
  if (state.currentUserId && state.users) {
    var cu = state.users.find(function(u) { return u.id === state.currentUserId; });
    if (cu) {
      var vis = getPersonVisibleTabIds(cu);
      var allowLibraryTab =
        (tabId === 'policy' && state._policyLibraryMode) ||
        (tabId === 'control' && state._controlLibraryMode) ||
        (tabId === 'asset' && (state._assetTypeLibraryMode || state._assetLibraryMode));
      if (vis.length && vis.indexOf(tabId) === -1 && !allowLibraryTab) {
        tabId = vis.indexOf('reports') !== -1 ? 'reports' : vis[0];
      }
    }
  }
  TAB_IDS.forEach(function(id) {
    var tabEl = document.getElementById('tab-' + id);
    var navEl = document.getElementById('nav-' + id);
    if (tabEl) tabEl.classList.remove('active');
    if (navEl) navEl.classList.remove('active');
  });
  ['nav-policy-library','nav-control-library','nav-asset-library','nav-asset-type-library'].forEach(function(id) {
    var navEl = document.getElementById(id);
    if (navEl) navEl.classList.remove('active');
  });
  var targetTab = document.getElementById('tab-' + tabId);
  var targetNav = document.getElementById('nav-' + tabId);
  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
  if (tabId === 'ciso')     renderCISOTab();
  if (tabId === 'policy')   renderPolicyTab();
  if (tabId === 'control')  renderControlTab();
  if (tabId === 'asset')    renderAssetTab();
  if (tabId === 'tester')     renderTesterTab();
  if (tabId === 'reports')    renderReports();
  if (tabId === 'users')    renderUsersTab();
  updateNotificationBadges();
  enhanceKeyboardAccessibility();
}


function enhanceKeyboardAccessibility() {
  document.querySelectorAll('.sidebar-item, .step-item').forEach(function(el) {
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
  if (window._keyboardA11yBound) return;
  document.addEventListener('keydown', function(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var t = ev.target;
    if (!t || !t.matches || !t.matches('.sidebar-item, .step-item')) return;
    ev.preventDefault();
    t.click();
  });
  window._keyboardA11yBound = true;
}



const currentStep = { ciso:1, policy:1, control:1, asset:1, tester:1 };

function goToStep(tabId, step) {
  const maxSteps = { ciso:5, policy:4, control:4, asset:3, tester:4 };
  const max = maxSteps[tabId] || 4;
  if (step < 1 || step > max) return;
  if (tabId === 'asset') {
    var hasAsset = !!(state._selectedAssetId && (state.assets || []).find(function(a){ return String(a.id) === String(state._selectedAssetId); }));
    var hasProc = !!(state._selectedProcessId && (state.processes || []).find(function(p){ return String(p.id) === String(state._selectedProcessId); }));
    if (!hasAsset && !hasProc) step = 1;
  }
  // Validate CISO step progression
  if (tabId === 'ciso' && step > 1) {
    if (!state.baseline) { showToast('Please select a baseline impact level first.', true); return; }
    if (!state.orgName || !state.orgName.trim()) { showToast('Please enter your Organization / Agency Name before continuing.', true); document.getElementById('orgNameInput')?.focus(); return; }
    if (!state.programOwner || !state.programOwner.trim()) { showToast('Please enter the Security Program Owner name before continuing.', true); document.getElementById('programOwnerInput')?.focus(); return; }
    if (!state.programOwnerTitle || !state.programOwnerTitle.trim()) { showToast('Please enter the Program Owner title before continuing.', true); document.getElementById('programOwnerTitleInput')?.focus(); return; }
  }
  // Hide all steps
  for (let i = 1; i <= max; i++) {
    const s = document.getElementById(`${tabId}-step-${i}`);
    if (s) s.classList.remove('active');
  }
  // Show target
  const target = document.getElementById(`${tabId}-step-${step}`);
  if (target) target.classList.add('active');
  currentStep[tabId] = step;
  // Update step nav circles
  for (let i = 1; i <= max; i++) {
    const circle = document.getElementById(`${tabId}-circle-${i}`);
    const item = document.getElementById(`${tabId}-step-item-${i}`);
    const conn = document.getElementById(`${tabId}-conn-${i}`);
    if (!circle) continue;
    circle.className = 'step-circle ' + (i < step ? 'done' : i === step ? 'active' : 'pending');
    circle.textContent = i < step ? '✓' : i;
    if (item) { item.classList.toggle('active', i===step); }
    if (conn) { conn.classList.toggle('done', i < step); }
  }
  // Re-render step bodies when navigating
  if (tabId==='ciso') renderCISOStep(step);
  if (tabId==='policy') { renderPolicyWizardChrome(step); renderPolicyStep(step); }
  if (tabId==='control') renderControlStep(step);
  if (tabId==='asset') { renderAssetWizardChrome(); renderAssetStep(step); }
  if (tabId==='tester') renderTesterStep(step);
}



// ============================================================
// CONTROL OWNER TAB
// ============================================================
function renderControlTab() {
  var workspace = document.getElementById('control-workspace-panel');
  var library = document.getElementById('control-library-panel');
  var controlNav = document.getElementById('nav-control');
  var controlLibNav = document.getElementById('nav-control-library');
  if (controlNav) controlNav.classList.toggle('active', !state._controlLibraryMode);
  if (controlLibNav) controlLibNav.classList.toggle('active', !!state._controlLibraryMode);
  if (state._controlLibraryMode) {
    if (workspace) workspace.style.display = 'none';
    if (library) library.style.display = '';
    renderControlLibraryView();
    return;
  }
  if (library) library.style.display = 'none';
  if (workspace) workspace.style.display = '';
  renderControlStep(currentStep.control);
}

function getControlComplianceSummary(controlId) {
  var totalTargets = 0;
  var answered = 0;
  var complies = 0;
  var statuses = {};
  (state.assets || []).forEach(function(a) {
    var controls = getAssetSSPControls(a) || [];
    if (!controls.some(function(c) { return c.id === controlId; })) return;
    totalTargets++;
    var att = ((state.sspAttestations || {})[a.id] || {})[controlId] || {};
    if (att.status) {
      answered++;
      statuses[att.status] = (statuses[att.status] || 0) + 1;
      if (att.status === 'Complies') complies++;
    }
  });
  (state.processes || []).forEach(function(p) {
    var controls = getProcessSSPControls(p) || [];
    if (!controls.some(function(c) { return c.id === controlId; })) return;
    totalTargets++;
    var att = ((state.sspAttestations || {})[p.id] || {})[controlId] || {};
    if (att.status) {
      answered++;
      statuses[att.status] = (statuses[att.status] || 0) + 1;
      if (att.status === 'Complies') complies++;
    }
  });
  var pct = answered ? Math.round((complies / answered) * 100) : null;
  return { totalTargets: totalTargets, answered: answered, complies: complies, pct: pct, statuses: statuses };
}

function getControlDeselectLifecycle(ctrlId) {
  var cs = state.controlStatus[ctrlId] || {};
  var proposed = !!cs.recommendedDeselect;
  var decision = cs.deselectDecision || '';
  var status = 'Not Proposed';
  if (proposed && !decision) status = 'Proposed';
  if (decision === 'Approved') status = 'Approved';
  if (decision === 'Rejected') status = 'Rejected';
  return {
    status: status,
    proposed: proposed,
    reason: cs.deselectReason || '',
    proposedAt: cs.deselectProposedAt || '',
    proposedBy: cs.deselectProposedBy || '',
    decidedAt: cs.deselectDecidedAt || '',
    decidedBy: cs.deselectDecidedBy || '',
    decisionReason: cs.deselectDecisionReason || ''
  };
}

function renderControlLibraryView() {
  var body = document.getElementById('control-library-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = '<div class="empty-state"><div class="es-icon">🏛️</div><div class="es-title">CISO Setup Required</div><p>Complete baseline selection to generate the control catalog.</p></div>';
    return;
  }
  var controls = getActiveControls();
  var families = Array.from(new Set(controls.map(function(c) { return c.f; }))).sort();
  var allTypeLabels = [];
  ASSET_TYPES.forEach(function(cat) { cat.types.forEach(function(t) { allTypeLabels.push(t.label); }); });
  (state.customAssetTypes || []).forEach(function(t) { if (t && !allTypeLabels.includes(t)) allTypeLabels.push(t); });
  var familyFilter = state._controlLibraryFamilyFilter || '';
  var statusFilter = state._controlLibraryStatusFilter || '';
  var assetTypeFilter = state._controlLibraryAssetTypeFilter || '';
  var q = (state._controlLibrarySearch || '').toLowerCase();
  function inActiveBaseline(c) {
    return c.bl && (c.bl.indexOf(state.baseline) !== -1 || (state.privacyOverlay && c.bl.indexOf('P') !== -1));
  }
  var deselectBaselineCount = controls.filter(function(c) {
    var cs = state.controlStatus[c.id] || {};
    return cs.deselectDecision === 'Approved' && inActiveBaseline(c);
  }).length;
  var rows = controls.filter(function(c) {
    var cs = state.controlStatus[c.id] || {};
    var status = cs.status || 'Not Started';
    var cov = getCtrlCoveredAssetTypes(c.id).map(function(t) { return t.label; });
    var typeMatch = !assetTypeFilter || cov.includes(assetTypeFilter);
    var qMatch = !q || c.id.toLowerCase().includes(q) || c.n.toLowerCase().includes(q);
    var deselBaseline = cs.deselectDecision === 'Approved' && inActiveBaseline(c);
    if (statusFilter === '__deselected__' && !deselBaseline) return false;
    return (!familyFilter || c.f === familyFilter) && (!statusFilter || statusFilter === '__deselected__' || status === statusFilter) && typeMatch && qMatch;
  });
  var selectedTypeCount = rows.filter(function(c) { return getCtrlCoveredAssetTypes(c.id).length > 0; }).length;
  var designedCount = rows.filter(function(c) { return isControlDesigned(c.id); }).length;
  body.innerHTML = (deselectBaselineCount ? '<div class="callout-deselected-baseline" style="border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:12px;color:#92400e;"><strong>Baseline de-selections:</strong> ' + deselectBaselineCount + ' control(s) are formally de-selected from the active baseline but remain visible here for traceability. Use the status filter <em>De-selected (baseline)</em> to list them.</div>' : '')
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">'
    + '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#1d4ed8;text-transform:uppercase;">Controls</div><div style="font-size:24px;font-weight:800;color:#1d4ed8;">' + rows.length + '</div></div>'
    + '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Designed</div><div style="font-size:24px;font-weight:800;color:#166534;">' + designedCount + '</div></div>'
    + '<div style="background:#faf5ff;border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;">With Asset Applicability</div><div style="font-size:24px;font-weight:800;color:#6366f1;">' + selectedTypeCount + '</div></div>'
    + '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;">De-select Proposed</div><div style="font-size:24px;font-weight:800;color:#92400e;">' + rows.filter(function(c){ return (state.controlStatus[c.id]||{}).recommendedDeselect; }).length + '</div></div>'
    + '</div>'
    + '<div class="filter-bar" style="margin-bottom:12px;">'
    + '<input class="form-input" value="' + escapeHTML(state._controlLibrarySearch || '') + '" placeholder="Search control ID or name..." oninput="state._controlLibrarySearch=this.value;renderControlLibraryView()">'
    + '<select class="form-select" onchange="state._controlLibraryFamilyFilter=this.value;renderControlLibraryView()"><option value="">All families</option>'
    + families.map(function(f){ return '<option value="' + f + '"' + (familyFilter===f?' selected':'') + '>' + f + ' — ' + (FAMILIES[f]||f) + '</option>'; }).join('')
    + '</select>'
    + '<select class="form-select" onchange="state._controlLibraryStatusFilter=this.value;renderControlLibraryView()"><option value="">All statuses</option>'
    + ['Not Started','Planned','In Progress','Implemented','Not Applicable','Inherited'].map(function(s){ return '<option' + (statusFilter===s?' selected':'') + '>' + s + '</option>'; }).join('')
    + '<option value="__deselected__"' + (statusFilter==='__deselected__'?' selected':'') + '>De-selected (baseline)</option>'
    + '</select>'
    + '<select class="form-select" onchange="state._controlLibraryAssetTypeFilter=this.value;renderControlLibraryView()"><option value="">All asset types</option>'
    + allTypeLabels.map(function(t){ return '<option value="' + escapeHTML(t) + '"' + (assetTypeFilter===t?' selected':'') + '>' + escapeHTML(t) + '</option>'; }).join('')
    + '</select>'
    + '</div>'
    + '<div class="table-scroll"><table class="control-table"><thead><tr><th style="width:92px;">Control</th><th>Name</th><th style="width:150px;">Owner</th><th style="width:120px;">Implementation</th><th style="width:220px;">Asset Applicability</th><th style="width:90px;">Req Targets</th><th style="width:110px;">Compliance</th><th style="width:140px;">De-select Lifecycle</th></tr></thead><tbody>'
    + rows.map(function(c) {
      var cs = state.controlStatus[c.id] || {};
      var owner = (state.controlOwners || {})[c.id] || {};
      var cov = getCtrlCoveredAssetTypes(c.id).map(function(t) { return t.label; });
      var linksCount = (cs.linkedAssets || []).length + (cs.linkedProcesses || []).length;
      var compliance = getControlComplianceSummary(c.id);
      var lifecycle = getControlDeselectLifecycle(c.id);
      var lcColor = lifecycle.status === 'Approved' ? '#166534' : lifecycle.status === 'Rejected' ? '#b45309' : lifecycle.status === 'Proposed' ? '#92400e' : '#64748b';
      var deselBaseline = cs.deselectDecision === 'Approved' && inActiveBaseline(c);
      return '<tr class="' + (deselBaseline ? 'tr-deselected-baseline ' : '') + 'control-lib-row" style="cursor:pointer;" onclick="openControlFromLibrary(\'' + c.id.replace(/'/g,"\\'") + '\')">'
        + '<td><span class="control-id">' + c.id + '</span></td>'
        + '<td style="font-size:12px;color:var(--navy);">' + escapeHTML(c.n) + '</td>'
        + '<td style="font-size:12px;color:var(--text-muted);">' + escapeHTML(owner.name || 'Unassigned') + '</td>'
        + '<td>' + chipHTML(cs.status || 'Not Started') + '</td>'
        + '<td style="font-size:11px;color:var(--text-muted);">' + (cov.length ? escapeHTML(cov.slice(0, 2).join(' · ')) + (cov.length > 2 ? ' +' + (cov.length - 2) : '') : 'Not scoped') + '</td>'
        + '<td style="font-size:12px;color:var(--navy);">' + linksCount + '</td>'
        + '<td style="font-size:11px;color:var(--text-muted);">' + (compliance.pct === null ? 'Pending' : compliance.pct + '%') + (compliance.totalTargets ? '<div style="font-size:10px;">' + compliance.answered + '/' + compliance.totalTargets + ' attested</div>' : '<div style="font-size:10px;">No targets yet</div>') + '</td>'
        + '<td style="font-size:11px;color:' + lcColor + ';font-weight:700;">' + lifecycle.status + (lifecycle.reason ? '<div style="font-size:10px;color:var(--text-muted);font-weight:400;">' + escapeHTML(lifecycle.reason.slice(0, 56)) + (lifecycle.reason.length > 56 ? '…' : '') + '</div>' : '') + '</td>'
        + '</tr>';
    }).join('')
    + '</tbody></table></div>';
}

function renderControlStep(step) {
  if (step===1) renderControlStep1();
  if (step===2) renderControlStep2();
  if (step===3) renderControlStep3();
  if (step===4) renderControlStep4();
}

// ── STEP 1: MY CONTROLS ──────────────────────────────────────────────────────
function renderControlStep1() {
  const body = document.getElementById('control-step-1-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">🏛️</div><div class="es-title">CISO Setup Required</div><p>The CISO must complete program setup to select controls and assign owners.</p><button class="btn btn-primary" onclick="goToProgramSetupOrDashboard()" style="margin-top:16px;">${state.cisoComplete ? 'Go to Dashboard →' : 'Go to CISO Setup →'}</button></div>`;
    return;
  }
  const allControls = getScopedControls();
  const controls    = allControls.filter(c => !(state.controlStatus[c.id]||{}).returnedToPolicyOwner && !(state.controlStatus[c.id]||{}).recommendedDeselect);
  const returnedControls = allControls.filter(c => (state.controlStatus[c.id]||{}).returnedToPolicyOwner);
  const deselectControls = allControls.filter(c => (state.controlStatus[c.id]||{}).recommendedDeselect);
  const families = [...new Set(controls.map(c => c.f).filter(Boolean))];

  if (allControls.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><div class="es-title">No Controls Assigned</div><p>The CISO must assign controls to you before you can document implementation.</p><button class="btn btn-primary" onclick="goToProgramSetupOrDashboard()" style="margin-top:16px;">${state.cisoComplete ? 'Go to Dashboard →' : 'View CISO Setup →'}</button></div>`;
    return;
  }
  const now  = new Date();
  const soon = new Date(now.getTime() + 30*24*60*60*1000);

  const totalDesigned = controls.filter(c => {
    const cs = state.controlStatus[c.id]||{};
    return cs.designSource || (cs.approach && cs.approach.trim()) || (cs.designParts && Object.values(cs.designParts).some(v => v && v.trim()));
  }).length;
  const totalInProg = controls.filter(c => ['In Progress','Planned'].includes((state.controlStatus[c.id]||{}).status)).length;
  const totalNA     = controls.filter(c => (state.controlStatus[c.id]||{}).status === 'Not Applicable').length;
  const pctDesigned = controls.length ? Math.round((totalDesigned / controls.length) * 100) : 0;

  const dueSoon = controls.filter(c => {
    const dd = (state.controlOwners||{})[c.id]?.dueDate;
    if (!dd) return false;
    const d = new Date(dd);
    return d >= now && d <= soon && (state.controlStatus[c.id]||{}).status !== 'Implemented';
  }).length;

  body.innerHTML = `
    <div class="section-title">${state.currentUserId ? 'My Controls' : 'Control Library'}</div>
    <div class="section-subtitle">${controls.length} controls in your design queue — ${state.baseline==='L'?'Low':state.baseline==='M'?'Moderate':'High'} baseline${state.privacyOverlay?' + Privacy Overlay':''}</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
      ${[
        ['Designed',    totalDesigned,                                          '#166534','#dcfce7','✅'],
        ['In Progress', totalInProg,                                            '#92400e','#fef3c7','🔄'],
        ['Not Started', controls.length - totalDesigned - totalInProg - totalNA,'#1e3a5f','#eff6ff','⏳'],
        ['N / A',       totalNA,                                                '#64748b','#f1f5f9','—'],
      ].map(([label,count,color,bg,icon]) => `
        <div style="background:${bg};border:1px solid ${color}22;border-radius:10px;padding:14px 16px;border-left:3px solid ${color};">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};">${label}</div>
            <div style="font-size:18px;">${icon}</div>
          </div>
          <div style="font-size:28px;font-weight:800;color:${color};line-height:1.1;margin-top:4px;">${count}</div>
          <div style="font-size:10px;color:${color};opacity:0.7;margin-top:2px;">of ${controls.length} controls</div>
        </div>`).join('')}
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600;color:var(--navy);">Design Progress</div>
        <div style="font-size:13px;font-weight:700;color:var(--teal);">${pctDesigned}% designed</div>
      </div>
      <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
        <div style="background:var(--teal);height:100%;width:${pctDesigned}%;border-radius:99px;transition:width 0.3s;"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">A control is "designed" when you've documented the implementation approach in Step 2.</div>
    </div>

    ${dueSoon > 0 ? `<div class="info-alert" style="border-color:#f59e0b;background:#fffbeb;margin-bottom:16px;">
      <div class="ia-icon">⚠️</div>
      <div class="ia-text"><strong>${dueSoon} control${dueSoon>1?'s have':' has'} a due date within 30 days</strong> and ${dueSoon>1?'are':'is'} not yet designed. Head to Step 2 to document these first.</div>
    </div>` : ''}

    <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#1e40af;">
      <strong>💡 Tip:</strong> Use <strong>↩ Return</strong> if a control was assigned to you in error. Use <strong>✗ Propose De-select</strong> if you believe a control should not be in scope — both go back to the policy owner for action.
    </div>

    <div class="filter-bar">
      <input type="text" id="ctrlSearch" placeholder="🔍  Search by ID or name…" oninput="filterControlList()">
      <select id="ctrlFamilyFilter" onchange="filterControlList()">
        <option value="">All Families</option>
        ${families.map(f=>`<option value="${f}">${f} — ${FAMILIES[f]||f}</option>`).join('')}
      </select>
      <select id="ctrlStatusFilter" onchange="filterControlList()">
        <option value="">All Statuses</option>
        <option>Not Started</option><option>Planned</option><option>In Progress</option><option>Implemented</option><option>Not Applicable</option>
      </select>
      <select id="ctrlDeselectFilter" onchange="filterControlList()" title="Filter by baseline de-selection status">
        <option value="">All scope states</option>
        <option value="deselected">De-selected (baseline) only</option>
      </select>
    </div>

    <div class="table-scroll">
      <table class="control-table" id="controlInventoryTable">
        <thead>
          <tr>
            <th style="width:80px;">Control</th>
            <th>Name</th>
            <th style="width:70px;">Family</th>
            <th style="width:90px;">Baselines</th>
            <th style="width:90px;">Policy Req.</th>
            <th style="width:140px;">Owner</th>
            <th style="width:95px;">Due Date</th>
            <th style="width:120px;">Status</th>
            <th style="width:150px;">Actions</th>
          </tr>
        </thead>
        <tbody id="ctrlMainTbody">
          ${controls.map(c => {
            const cs  = state.controlStatus[c.id] || {};
            const co  = (state.controlOwners||{})[c.id] || {};
            const st  = cs.status || 'Not Started';
            const dd  = co.dueDate;
            const isDueSoon = dd && new Date(dd)>=now && new Date(dd)<=soon && st!=='Implemented';
            const ddStr = dd ? new Date(dd).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}) : '—';
            const pReqs = getControlPolicyReqs(c.id);
            const pReqCell = pReqs.length
              ? `<span title="${pReqs.map(r=>r.reqId).join(', ')}" style="font-family:monospace;font-size:10px;font-weight:700;background:rgba(99,102,241,0.1);color:#6366f1;padding:2px 6px;border-radius:4px;cursor:default;">${pReqs.length} req${pReqs.length>1?'s':''}</span>`
              : `<span style="font-size:11px;color:var(--text-muted);font-style:italic;">—</span>`;
            const cid = c.id.replace(/'/g,"\\'");
            const deselBaseline = cs.deselectDecision === 'Approved' && c.bl && (c.bl.includes(state.baseline) || (state.privacyOverlay && c.bl.includes('P')));
            return `<tr data-id="${c.id}" data-family="${c.f}" data-status="${st}" data-deselected="${deselBaseline?'1':'0'}" class="${deselBaseline?'tr-deselected-baseline':''}" style="cursor:pointer;" onmouseover="this.style.background='rgba(13,148,136,0.04)'" onmouseout="this.style.background=''" onclick="goToControlDetail('${cid}')">
              <td><span class="control-id">${c.id}</span></td>
              <td style="font-size:13px;">${c.n}</td>
              <td><span class="family-badge">${c.f}</span></td>
              <td>${pillsHTML(c.bl)}</td>
              <td>${pReqCell}</td>
              <td style="font-size:12px;color:${co.name?'var(--navy)':'var(--text-muted)'};font-style:${co.name?'normal':'italic'};">${co.name||'Unassigned'}</td>
              <td style="font-size:12px;font-weight:${isDueSoon?'700':'400'};color:${isDueSoon?'#d97706':'var(--text-muted)'};">${ddStr}${isDueSoon?' ⚠️':''}</td>
              <td>${chipHTML(st)}</td>
              <td onclick="event.stopPropagation();" style="white-space:nowrap;">
                <button class="btn btn-sm" style="font-size:10px;padding:3px 7px;background:white;border:1px solid rgba(220,38,38,0.35);color:#dc2626;margin-right:3px;" onclick="returnControlToPolicyOwner('${cid}')" title="Return to policy owner — assigned in error">↩ Return</button>
                <button class="btn btn-sm" style="font-size:10px;padding:3px 7px;background:white;border:1px solid rgba(245,158,11,0.4);color:#d97706;" onclick="recommendControlDeselect('${cid}')" title="Propose this control be removed from scope">✗ De-select?</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${returnedControls.length > 0 ? `
    <div style="margin-top:20px;">
      <div style="font-size:12px;font-weight:700;color:#991b1b;padding:6px 0;border-bottom:1px solid #fca5a5;margin-bottom:8px;">↩ Returned to Policy Owner (${returnedControls.length})</div>
      ${returnedControls.map(c => {
        const cs  = state.controlStatus[c.id]||{};
        const cid = c.id.replace(/'/g,"\\'");
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;margin-bottom:6px;">
          <span class="control-id" style="opacity:0.7;">${c.id}</span>
          <span style="font-size:12px;color:var(--text-muted);">${c.n}</span>
          ${cs.returnReason ? `<span style="font-size:11px;color:#b91c1c;font-style:italic;">Reason: ${escapeHTML(cs.returnReason)}</span>` : ''}
          <button class="btn btn-sm" style="font-size:10px;padding:2px 7px;background:white;border:1px solid var(--border);color:var(--navy);margin-left:auto;" onclick="unreturnControl('${cid}')">Undo Return</button>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${deselectControls.length > 0 ? `
    <div style="margin-top:20px;">
      <div style="font-size:12px;font-weight:700;color:#92400e;padding:6px 0;border-bottom:1px solid #fcd34d;margin-bottom:6px;">✗ Proposed for De-selection (${deselectControls.length})</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">These controls are flagged as "Recommended for De-selection" and will appear in the policy owner's queue for decision.</div>
      ${deselectControls.map(c => {
        const cs  = state.controlStatus[c.id]||{};
        const cid = c.id.replace(/'/g,"\\'");
        const decision = cs.deselectDecision || 'Proposed';
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:6px;">
          <span class="control-id" style="opacity:0.7;">${c.id}</span>
          <span style="font-size:12px;color:var(--text-muted);">${c.n}</span>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:${decision==='Approved'?'#166534':decision==='Rejected'?'#b45309':'#92400e'};">${decision}</span>
          ${cs.deselectReason ? `<span style="font-size:11px;color:#92400e;font-style:italic;">Reason: ${escapeHTML(cs.deselectReason)}</span>` : ''}
          ${cs.deselectDecisionReason ? `<span style="font-size:11px;color:#334155;font-style:italic;">Decision: ${escapeHTML(cs.deselectDecisionReason)}</span>` : ''}
          <button class="btn btn-sm" style="font-size:10px;padding:2px 7px;background:white;border:1px solid var(--border);color:var(--navy);margin-left:auto;" onclick="unrecommendControlDeselect('${cid}')">Undo</button>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${(function() {
      const outsideQueue = [];
      if (state.policySelectedControls) {
        Object.keys(state.policySelectedControls).forEach(fam => {
          const sel = state.policySelectedControls[fam];
          const famControls = CONTROLS.filter(c => c.f === fam && (c.bl.includes(state.baseline) || (state.privacyOverlay && c.bl.includes('P'))));
          famControls.forEach(c => {
            if (sel.includes(c.id)) return;
            const owner = (state.controlOwners || {})[c.id] || {};
            const domainOwner = (state.domainOwners || {})[fam] || {};
            let reason = 'Not selected in ' + fam + ' policy control set';
            if (owner.name && domainOwner.name && owner.name.trim().toLowerCase() === domainOwner.name.trim().toLowerCase()) {
              reason = 'Retained by domain policy owner';
            } else if (owner.name) {
              reason = 'Owned outside your queue — ' + owner.name;
            }
            outsideQueue.push({ ...c, deselFam: fam, queueReason: reason });
          });
        });
      }
      if (!outsideQueue.length) return '';
      return `<details style="margin-top:16px;"><summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-muted);padding:8px 0;user-select:none;">▶ ${outsideQueue.length} controls outside your control-owner queue</summary>
        <div style="font-size:11px;color:var(--text-muted);margin:4px 0 8px 0;">These controls are managed at the domain-policy level or routed to another owner; they are not removed from the overall program unless the domain policy owner formally de-selects them.</div>
        <div class="table-scroll" style="margin-top:8px;">
          <table class="control-table"><thead><tr><th style="width:80px;">Control</th><th>Name</th><th style="width:70px;">Family</th><th style="width:220px;">Reason</th></tr></thead>
          <tbody>${outsideQueue.map(c => `<tr style="opacity:0.62;"><td><span class="control-id" style="opacity:0.8;">${c.id}</span></td><td style="font-size:13px;color:var(--text-muted);">${c.n}</td><td><span class="family-badge" style="opacity:0.65;">${c.f}</span></td><td style="font-size:11px;color:#334155;font-weight:600;">${escapeHTML(c.queueReason)}</td></tr>`).join('')}</tbody>
          </table></div></details>`;
    })()}`;
}

function filterControlList() {
  const q   = (document.getElementById('ctrlSearch')?.value||'').toLowerCase();
  const fam = document.getElementById('ctrlFamilyFilter')?.value||'';
  const st  = document.getElementById('ctrlStatusFilter')?.value||'';
  const des = document.getElementById('ctrlDeselectFilter')?.value||'';
  document.querySelectorAll('#controlInventoryTable tbody tr').forEach(row => {
    const matchQ = !q   || (row.dataset.id||'').toLowerCase().includes(q) || (row.cells[1]?.textContent||'').toLowerCase().includes(q);
    const matchF = !fam || row.dataset.family===fam;
    const matchS = !st  || row.dataset.status===st;
    const matchD = !des || (des === 'deselected' && row.dataset.deselected === '1');
    row.style.display = (matchQ && matchF && matchS && matchD) ? '' : 'none';
  });
}

function goToControlDetail(ctrlId) {
  state._controlLibraryMode = false;
  state._selectedCtrl = ctrlId;
  showTab('control');
  goToStep('control', 2);
}

function userCanAccessControlWorkspace() {
  if (!state.currentUserId) return true; // admin mode
  var user = (state.users || []).find(function(u) { return u.id === state.currentUserId; });
  if (!user) return false;
  var visibleTabs = getPersonVisibleTabIds(user) || [];
  return visibleTabs.indexOf('control') !== -1;
}

function openControlFromLibrary(ctrlId) {
  if (userCanAccessControlWorkspace()) {
    goToControlDetail(ctrlId);
    return;
  }
  openControlLibraryReadOnly(ctrlId);
}

function openControlLibraryReadOnly(ctrlId) {
  var ctrl = (getActiveControls() || []).find(function(c) { return c.id === ctrlId; });
  if (!ctrl) { showToast('Control not found.', true); return; }
  normalizeControlDesignState(ctrlId);
  var cs = state.controlStatus[ctrlId] || {};
  var owner = (state.controlOwners || {})[ctrlId] || {};
  var reqs = cs.assetOwnerRequirements || [];
  var covered = getCtrlCoveredAssetTypes(ctrlId);
  var policyReqs = getControlPolicyReqs(ctrlId);
  var nistParts = parseControlParts(ctrlId) || {};
  var designSource = cs.designSource || (cs.externalDocRef ? 'external' : 'inline');
  var linkedAssetNames = (cs.linkedAssets || []).map(function(aid) {
    var a = (state.assets || []).find(function(x) { return String(x.id) === String(aid); });
    return a ? a.name : String(aid);
  });
  var linkedProcessNames = (cs.linkedProcesses || []).map(function(pid) {
    var p = (state.processes || []).find(function(x) { return String(x.id) === String(pid); });
    return p ? p.name : String(pid);
  });
  var nistRequirementText = (typeof NIST_CONTROL_TEXT !== 'undefined' && NIST_CONTROL_TEXT[ctrlId])
    ? NIST_CONTROL_TEXT[ctrlId]
    : ctrlShortDesc(ctrl);
  var policyObjectivesHtml = policyReqs.length
    ? '<div style="display:flex;flex-direction:column;gap:8px;">' + policyReqs.map(function(r) {
        return '<div style="border:1px solid #c7d2fe;background:#eef2ff;border-radius:6px;padding:8px 10px;">'
          + '<div style="font-size:11px;font-weight:700;color:#4338ca;margin-bottom:3px;">' + escapeHTML((r.reqId || 'Policy objective') + ' · ' + (r.policyTitle || r.fam || 'Policy')) + '</div>'
          + '<div style="font-size:12px;color:#1f2937;line-height:1.5;">' + escapeHTML(r.reqText || 'No objective text captured.') + '</div>'
          + '</div>';
      }).join('') + '</div>'
    : '<div style="font-size:12px;color:var(--text-muted);">No policy objectives linked.</div>';

  var designHtml = '';
  if (designSource === 'external') {
    designHtml = '<div style="display:grid;grid-template-columns:1fr;gap:8px;">'
      + '<div><strong>External reference:</strong> ' + escapeHTML(cs.externalDocTitle || '—') + '</div>'
      + '<div><strong>Location:</strong> ' + escapeHTML(cs.externalDocRef || '—') + '</div>'
      + '<div><strong>Coverage summary:</strong> ' + escapeHTML(cs.externalDocSummary || '—') + '</div>'
      + '</div>';
  } else {
    var partKeys = Object.keys(nistParts);
    if (partKeys.length) {
      designHtml = '<div style="display:flex;flex-direction:column;gap:8px;">'
        + partKeys.map(function(letter) {
            var partText = ((cs.designParts || {})[letter] || '').trim();
            return '<div style="border:1px solid var(--border);border-radius:6px;padding:8px 10px;">'
              + '<div style="font-size:11px;font-weight:700;color:var(--teal);margin-bottom:3px;">Part ' + letter + '</div>'
              + '<div style="font-size:12px;color:#374151;line-height:1.5;">' + escapeHTML(partText || 'Not documented') + '</div>'
              + '</div>';
          }).join('')
        + '</div>';
    } else {
      designHtml = '<div style="font-size:12px;color:#374151;line-height:1.6;">' + escapeHTML((cs.approach || cs.narrative || '').trim() || 'No design narrative documented.') + '</div>';
    }
  }

  var reqTable = reqs.length
    ? '<div class="table-scroll"><table class="control-table"><thead><tr><th style="width:140px;">Asset Type</th><th>Required Actions</th><th>Required Evidence</th><th>Acceptance Criteria</th></tr></thead><tbody>'
      + reqs.map(function(r) {
          return '<tr><td style="font-size:11px;font-weight:700;color:#334155;">' + escapeHTML(r.assetType || 'General') + '</td>'
            + '<td style="font-size:12px;color:#374151;">' + escapeHTML(r.requirement || '—') + '</td>'
            + '<td style="font-size:12px;color:#374151;">' + escapeHTML(r.evidenceNeeded || '—') + '</td>'
            + '<td style="font-size:12px;color:#374151;">' + escapeHTML(r.acceptanceCriteria || '—') + '</td></tr>';
        }).join('')
      + '</tbody></table></div>'
    : '<div style="font-size:12px;color:var(--text-muted);">No asset-owner requirements documented yet.</div>';

  var overlay = document.createElement('div');
  overlay.id = 'controlLibraryReadOnlyOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.58);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = '<div style="background:white;width:min(980px,96vw);max-height:92vh;overflow:auto;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,0.3);">'
    + '<div style="position:sticky;top:0;background:white;border-bottom:1px solid var(--border);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;z-index:2;">'
    + '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);">Control Library · Read-only</div>'
    + '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-top:2px;">' + escapeHTML(ctrl.id) + ' — ' + escapeHTML(ctrl.n) + '</div>'
    + '<div style="font-size:12px;color:var(--text-muted);margin-top:3px;">Owner: ' + escapeHTML(owner.name || 'Unassigned') + ' · Status: ' + escapeHTML(cs.status || 'Not Started') + '</div></div>'
    + '<button onclick="document.getElementById(\'controlLibraryReadOnlyOverlay\').remove()" style="border:none;background:#f8fafc;color:#334155;font-size:16px;font-weight:700;border-radius:8px;padding:6px 10px;cursor:pointer;">✕</button></div>'
    + '<div style="padding:18px;">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">'
    + '<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Policy Objectives</div>'
    + policyObjectivesHtml
    + '</div>'
    + '<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Asset Scope</div>'
    + '<div style="font-size:12px;color:#374151;">' + (covered.length ? covered.map(function(t){ return escapeHTML(t.label); }).join(' · ') : 'No asset types selected') + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Linked assets: ' + escapeHTML(linkedAssetNames.length ? linkedAssetNames.join(', ') : 'None') + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);">Linked processes: ' + escapeHTML(linkedProcessNames.length ? linkedProcessNames.join(', ') : 'None') + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;">'
    + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">NIST Requirements</div>'
    + '<div style="font-size:12px;color:#374151;line-height:1.65;white-space:pre-line;">' + escapeHTML(nistRequirementText || 'No NIST requirement text available.') + '</div>'
    + '</div>'
    + '<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;">'
    + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Control Design</div>'
    + designHtml
    + '</div>'
    + '<div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;">'
    + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Asset-Type Requirements & Required Evidence</div>'
    + reqTable
    + '</div>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

// ── RETURN & PROPOSE DE-SELECT ────────────────────────────────────────────────
function returnControlToPolicyOwner(ctrlId) {
  const ctrl   = CONTROLS.find(c => c.id === ctrlId);
  const cName  = ctrl ? ctrl.n : ctrlId;
  const pOwner = ctrl ? ((state.domainOwners[ctrl.f]||{}).name || state.programOwnerTitle || 'Policy Owner') : 'Policy Owner';
  const cid    = ctrlId.replace(/'/g,"\\'");
  const overlay = document.createElement('div');
  overlay.id = 'returnCtrlOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:28px;width:460px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'
    + '<div style="font-size:22px;margin-bottom:8px;">↩</div>'
    + '<div style="font-size:17px;font-weight:800;color:var(--navy);margin-bottom:6px;">Return to Policy Owner?</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:14px;line-height:1.6;">You are about to return <strong>' + escapeHTML(ctrlId) + ' — ' + escapeHTML(cName) + '</strong> to <strong>' + escapeHTML(pOwner) + '</strong>. It will be excluded from your design queue. Your progress is preserved.</div>'
    + '<div style="margin-bottom:16px;"><label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);display:block;margin-bottom:6px;">Reason (optional)</label>'
    + '<textarea id="returnCtrlReason" rows="2" class="form-input" style="font-size:12px;resize:vertical;" placeholder="e.g. This control belongs to the IAM team, not my remit…"></textarea></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    + '<button class="btn btn-secondary" onclick="closeReturnCtrlModal()">Cancel</button>'
    + '<button class="btn" style="background:#dc2626;color:white;border:none;" onclick="confirmReturnControl(\'' + cid + '\')">↩ Return to Policy Owner</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function confirmReturnControl(ctrlId) {
  const reason = document.getElementById('returnCtrlReason')?.value.trim() || '';
  closeReturnCtrlModal();
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  state.controlStatus[ctrlId].returnedToPolicyOwner = true;
  state.controlStatus[ctrlId].returnReason  = reason;
  state.controlStatus[ctrlId].returnedAt    = new Date().toLocaleDateString();
  markDirty();
  addAuditEntry('control', ctrlId, 'Control returned to policy owner' + (reason ? ': ' + reason : ''));
  showToast('↩ ' + ctrlId + ' returned to policy owner.');
  renderControlStep1();
}

function closeReturnCtrlModal() { document.getElementById('returnCtrlOverlay')?.remove(); }

function unreturnControl(ctrlId) {
  if (!state.controlStatus[ctrlId]) return;
  state.controlStatus[ctrlId].returnedToPolicyOwner = false;
  state.controlStatus[ctrlId].returnReason = '';
  markDirty();
  showToast('Control ' + ctrlId + ' restored to your queue.');
  renderControlStep1();
}

function recommendControlDeselect(ctrlId) {
  const ctrl   = CONTROLS.find(c => c.id === ctrlId);
  const cName  = ctrl ? ctrl.n : ctrlId;
  const pOwner = ctrl ? ((state.domainOwners[ctrl.f]||{}).name || state.programOwnerTitle || 'Policy Owner') : 'Policy Owner';
  const cid    = ctrlId.replace(/'/g,"\\'");
  const overlay = document.createElement('div');
  overlay.id = 'deselectCtrlOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:28px;width:480px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'
    + '<div style="font-size:22px;margin-bottom:8px;">✗</div>'
    + '<div style="font-size:17px;font-weight:800;color:var(--navy);margin-bottom:6px;">Propose De-selection?</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;line-height:1.6;">You are proposing that <strong>' + escapeHTML(ctrlId) + ' — ' + escapeHTML(cName) + '</strong> be removed from scope.</div>'
    + '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#92400e;">This flags the control as "Recommended for De-selection" in the library for <strong>' + escapeHTML(pOwner) + '</strong> to decide on. It does not remove the control immediately.</div>'
    + '<div style="margin-bottom:16px;"><label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);display:block;margin-bottom:6px;">Reason <span style="color:var(--red);">*</span></label>'
    + '<textarea id="deselectCtrlReason" rows="3" class="form-input" style="font-size:12px;resize:vertical;" placeholder="Explain why this control should not be in scope (e.g. technical environment does not support this, another system handles this, risk formally accepted at CISO level…)"></textarea></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    + '<button class="btn btn-secondary" onclick="closeDeselectCtrlModal()">Cancel</button>'
    + '<button class="btn" style="background:#d97706;color:white;border:none;" onclick="confirmRecommendDeselect(\'' + cid + '\')">✗ Propose De-selection</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function getCurrentActorName() {
  if (!state.currentUserId) return state.programOwner || 'Admin';
  var user = (state.users || []).find(function(u) { return u.id === state.currentUserId; });
  return (user && user.name) ? user.name : (state.programOwner || 'User');
}

function appendDeselectHistory(ctrlId, action, reason) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].deselectHistory) state.controlStatus[ctrlId].deselectHistory = [];
  state.controlStatus[ctrlId].deselectHistory.push({
    action: action,
    reason: reason || '',
    by: getCurrentActorName(),
    at: new Date().toISOString()
  });
}

function confirmRecommendDeselect(ctrlId) {
  const reason = document.getElementById('deselectCtrlReason')?.value.trim() || '';
  if (!reason) { showToast('Please provide a reason for the de-selection proposal.', true); return; }
  closeDeselectCtrlModal();
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  state.controlStatus[ctrlId].recommendedDeselect     = true;
  state.controlStatus[ctrlId].deselectReason          = reason;
  state.controlStatus[ctrlId].deselectProposedAt      = new Date().toLocaleDateString();
  state.controlStatus[ctrlId].deselectProposedBy      = getCurrentActorName();
  state.controlStatus[ctrlId].deselectDecision        = '';
  state.controlStatus[ctrlId].deselectDecisionReason  = '';
  state.controlStatus[ctrlId].deselectDecidedAt       = '';
  state.controlStatus[ctrlId].deselectDecidedBy       = '';
  appendDeselectHistory(ctrlId, 'Proposed', reason);
  markDirty();
  addAuditEntry('control', ctrlId, 'De-selection proposed by ' + state.controlStatus[ctrlId].deselectProposedBy + ': ' + reason);
  showToast('✗ ' + ctrlId + ' proposed for de-selection — policy owner will review.');
  renderControlStep1();
}

function closeDeselectCtrlModal() { document.getElementById('deselectCtrlOverlay')?.remove(); }

function unrecommendControlDeselect(ctrlId) {
  if (!state.controlStatus[ctrlId]) return;
  state.controlStatus[ctrlId].recommendedDeselect = false;
  state.controlStatus[ctrlId].deselectDecision = 'Withdrawn';
  state.controlStatus[ctrlId].deselectDecisionReason = 'Proposal withdrawn by submitter';
  state.controlStatus[ctrlId].deselectDecidedAt = new Date().toLocaleDateString();
  state.controlStatus[ctrlId].deselectDecidedBy = getCurrentActorName();
  appendDeselectHistory(ctrlId, 'Withdrawn', 'Proposal withdrawn by submitter');
  markDirty();
  addAuditEntry('control', ctrlId, 'De-selection proposal withdrawn by ' + getCurrentActorName());
  showToast('De-selection proposal withdrawn for ' + ctrlId + '.');
  renderControlStep1();
}

function policyOwnerDecideDeselect(ctrlId, decision) {
  const ctrl = CONTROLS.find(c => c.id === ctrlId);
  const overlay = document.createElement('div');
  overlay.id = 'deselectDecisionOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:28px;width:500px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'
    + '<div style="font-size:17px;font-weight:800;color:var(--navy);margin-bottom:6px;">' + (decision === 'Approved' ? 'Approve' : 'Reject') + ' De-selection</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">Control: <strong>' + escapeHTML(ctrlId + ' — ' + ((ctrl && ctrl.n) || '')) + '</strong></div>'
    + '<div style="margin-bottom:16px;"><label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);display:block;margin-bottom:6px;">Decision rationale <span style="color:var(--red);">*</span></label>'
    + '<textarea id="deselectDecisionReason" rows="3" class="form-input" style="font-size:12px;resize:vertical;" placeholder="Document the reasoning for this decision for audit traceability..."></textarea></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'deselectDecisionOverlay\')?.remove()">Cancel</button>'
    + '<button class="btn" style="background:' + (decision === 'Approved' ? '#166534' : '#b45309') + ';color:white;border:none;" onclick="confirmPolicyOwnerDeselectDecision(\'' + ctrlId.replace(/'/g,"\\'") + '\',\'' + decision + '\')">Confirm ' + (decision === 'Approved' ? 'Approval' : 'Rejection') + '</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

function confirmPolicyOwnerDeselectDecision(ctrlId, decision) {
  var reason = (document.getElementById('deselectDecisionReason') || {}).value || '';
  reason = reason.trim();
  if (!reason) { showToast('Decision rationale is required for audit purposes.', true); return; }
  document.getElementById('deselectDecisionOverlay')?.remove();
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  var cs = state.controlStatus[ctrlId];
  if (decision === 'Approved') {
    var snap = {
      recommendedDeselect: cs.recommendedDeselect,
      deselectDecision: cs.deselectDecision,
      deselectDecisionReason: cs.deselectDecisionReason,
      deselectDecidedAt: cs.deselectDecidedAt,
      deselectDecidedBy: cs.deselectDecidedBy
    };
    pushScopedUndo({
      label: 'De-selection approved: ' + ctrlId,
      undo: function() {
        var c = state.controlStatus[ctrlId];
        if (!c) return;
        c.recommendedDeselect = snap.recommendedDeselect;
        c.deselectDecision = snap.deselectDecision;
        c.deselectDecisionReason = snap.deselectDecisionReason;
        c.deselectDecidedAt = snap.deselectDecidedAt;
        c.deselectDecidedBy = snap.deselectDecidedBy;
        try { renderPolicyStep2(); } catch (eR) {}
      }
    });
  }
  cs.deselectDecision = decision;
  cs.deselectDecisionReason = reason;
  cs.deselectDecidedAt = new Date().toLocaleDateString();
  cs.deselectDecidedBy = getCurrentActorName();
  cs.recommendedDeselect = decision === 'Approved';
  appendDeselectHistory(ctrlId, decision, reason);
  markDirty();
  addAuditEntry('control', ctrlId, 'De-selection ' + decision.toLowerCase() + ' by ' + cs.deselectDecidedBy + ': ' + reason);
  showToast('De-selection ' + (decision === 'Approved' ? 'approved' : 'rejected') + ' for ' + ctrlId + '.');
  renderPolicyStep2();
}

// ── STEP 2: DESIGN THE CONTROL ────────────────────────────────────────────────
function renderControlStep2() {
  const body = document.getElementById('control-step-2-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">🏛️</div><div class="es-title">CISO Setup Required</div></div>`;
    return;
  }
  const controls = getScopedControls().filter(c =>
    !(state.controlStatus[c.id]||{}).returnedToPolicyOwner &&
    !(state.controlStatus[c.id]||{}).recommendedDeselect
  );
  controls.forEach(c => {
    if (!state.controlStatus[c.id]) state.controlStatus[c.id] = { status:'Not Started', approach:'', narrative:'', evidence:[], notes:'' };
    if (!state.controlStatus[c.id].evidence) state.controlStatus[c.id].evidence = [];
  });
  if (!state._selectedCtrl || !controls.find(c=>c.id===state._selectedCtrl)) {
    state._selectedCtrl = controls[0]?.id || null;
  }
  const sel = controls.find(c=>c.id===state._selectedCtrl);

  body.innerHTML = `
    <div style="display:flex;min-height:500px;height:calc(100vh - 320px);overflow:hidden;margin:-4px;">
      <!-- LEFT: control list -->
      <div style="width:260px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:#fafbfc;">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);">
          <input type="text" class="form-input" style="font-size:12px;" placeholder="🔍  Filter controls…" id="ctrlDetailSearch" oninput="filterCtrlDetailList()">
        </div>
        <div style="overflow-y:auto;flex:1;" id="ctrlDetailList">
          ${controls.map(c => {
            const cs  = state.controlStatus[c.id]||{};
            const designed = !!(cs.designSource || (cs.approach&&cs.approach.trim()) || (cs.designParts&&Object.values(cs.designParts).some(v=>v&&v.trim())));
            const st  = cs.status||'Not Started';
            const isSel = c.id===state._selectedCtrl;
            const dot = designed ? '#166534' : st==='In Progress' ? '#92400e' : st==='Planned' ? '#d97706' : '#94a3b8';
            const cid = c.id.replace(/'/g,"\\'");
            return `<div onclick="selectCtrlDetail('${cid}')" data-ctrl-id="${c.id}" data-ctrl-name="${c.n.toLowerCase()}"
              style="padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;background:${isSel?'rgba(13,148,136,0.07)':'transparent'};border-left:3px solid ${isSel?'var(--teal)':'transparent'};transition:all 0.15s;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                <span style="font-family:monospace;font-size:11px;font-weight:700;color:${isSel?'var(--teal)':'var(--navy)'};">${c.id}</span>
                <div style="width:7px;height:7px;border-radius:50%;background:${dot};margin-left:auto;flex-shrink:0;" title="${designed?'Design documented':'Not yet designed'}"></div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.n}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <!-- RIGHT: detail form -->
      <div style="flex:1;overflow-y:auto;padding:20px 24px;" id="ctrlDetailForm">
        ${sel ? renderControlDetailForm(sel) : '<div class="empty-state"><div class="es-title">Select a control from the list</div></div>'}
      </div>
    </div>`;
}

function filterCtrlDetailList() {
  const q = (document.getElementById('ctrlDetailSearch')?.value||'').toLowerCase();
  document.querySelectorAll('#ctrlDetailList [data-ctrl-id]').forEach(el => {
    const id   = (el.dataset.ctrlId||'').toLowerCase();
    const name = (el.dataset.ctrlName||'').toLowerCase();
    el.style.display = (!q || id.includes(q) || name.includes(q)) ? '' : 'none';
  });
}

function selectCtrlDetail(ctrlId) {
  state._selectedCtrl = ctrlId;
  renderControlStep2();
}

// Return list of {reqId, reqText, policyTitle, fam} for all requirements that cite ctrlId
function getControlPolicyReqs(ctrlId) {
  var hits = [];
  if (!state.domainPolicies) return hits;
  Object.keys(state.domainPolicies).forEach(function(fam) {
    var dp = state.domainPolicies[fam];
    if (!dp || !dp.requirements) return;
    dp.requirements.forEach(function(req) {
      if (req.controls && req.controls.includes(ctrlId)) {
        hits.push({ reqId: req.id||'', reqText: req.text||'', policyTitle: dp.title || getPolicyMergedTitle(fam), fam: fam });
      }
    });
  });
  return hits;
}

function isControlDesigned(ctrlId) {
  const cs = state.controlStatus[ctrlId] || {};
  if (cs.designSource === 'external') {
    return !!((cs.externalDocTitle || '').trim() && (cs.externalDocRef || '').trim());
  }
  if (cs.designParts && Object.values(cs.designParts).some(function(v) { return v && String(v).trim(); })) return true;
  return !!((cs.approach && cs.approach.trim()) || (cs.narrative && cs.narrative.trim()));
}

function normalizeControlDesignState(ctrlId) {
  if (!state.controlStatus) state.controlStatus = {};
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  var cs = state.controlStatus[ctrlId];
  if (!cs.assetOwnerRequirements) cs.assetOwnerRequirements = [];
  cs.assetOwnerRequirements = cs.assetOwnerRequirements.map(function(r) {
    return {
      assetType: r.assetType || 'General',
      requirement: r.requirement || '',
      evidenceNeeded: r.evidenceNeeded || '',
      acceptanceCriteria: r.acceptanceCriteria || ''
    };
  });
  // Backward compatibility: older snapshots used one free-text assetGuidance field.
  if ((cs.assetGuidance || '').trim() && !cs.assetOwnerRequirements.some(function(r) { return (r.requirement || '').trim(); })) {
    cs.assetOwnerRequirements.push({
      assetType: 'General',
      requirement: cs.assetGuidance,
      evidenceNeeded: '',
      acceptanceCriteria: ''
    });
  }
  if (!Array.isArray(cs.evidence)) cs.evidence = [];
  cs.evidence = cs.evidence.map(function(ev) {
    var e = Object.assign({}, ev);
    if (e.dataUrl && String(e.dataUrl).indexOf('data:image') === 0) {
      e.kind = 'image';
    }
    if (e.kind === 'image') {
      e.caption = e.caption != null ? String(e.caption) : (e.ref != null ? String(e.ref) : '');
      if (e.mime !== 'image/png' && e.mime !== 'image/jpeg') {
        e.mime = String(e.dataUrl || '').indexOf('image/png') !== -1 ? 'image/png' : 'image/jpeg';
      }
      delete e.type;
      delete e.ref;
    } else {
      e.kind = 'ref';
      e.type = e.type || 'Policy';
      e.ref = e.ref != null ? String(e.ref) : '';
      delete e.dataUrl;
      delete e.mime;
      delete e.caption;
    }
    return e;
  });
}

function getDesignChecklist(ctrl) {
  var cs = state.controlStatus[ctrl.id] || {};
  var designSource = cs.designSource || 'inline';
  var nistParts = parseControlParts(ctrl.id);
  var coveredTypes = getCtrlCoveredAssetTypes(ctrl.id);
  var linkedCount = (cs.linkedAssets || []).length + (cs.linkedProcesses || []).length;
  var coverageReady = coveredTypes.length > 0 || linkedCount > 0;
  var policyReqs = getControlPolicyReqs(ctrl.id);
  var sourceReady = true;
  var sourceDetail = '';
  if (designSource === 'external') {
    var hasTitle = !!(cs.externalDocTitle || '').trim();
    var hasRef = !!(cs.externalDocRef || '').trim();
    var hasSummary = !!(cs.externalDocSummary || '').trim();
    sourceReady = hasTitle && hasRef && hasSummary;
    sourceDetail = sourceReady ? 'Reference captured with coverage summary' : 'Provide title, location, and coverage summary';
  } else if (nistParts) {
    var letters = Object.keys(nistParts);
    var answered = letters.filter(function(letter) { return (cs.designParts || {})[letter] && String((cs.designParts || {})[letter]).trim(); }).length;
    sourceReady = answered === letters.length;
    sourceDetail = answered + ' of ' + letters.length + ' NIST letter parts addressed';
  } else {
    sourceReady = !!(cs.approach || '').trim();
    sourceDetail = sourceReady ? 'Design narrative documented' : 'Add a design description';
  }
  return {
    sourceReady: sourceReady,
    sourceDetail: sourceDetail,
    coverageReady: coverageReady,
    coverageDetail: coverageReady ? 'Assets/processes identified' : 'Identify asset type or inventory scope',
    policyReady: policyReqs.length > 0 ? true : !!sourceReady,
    policyDetail: policyReqs.length ? (policyReqs.length + ' linked policy requirement(s)') : 'No explicit policy requirement link; NIST coverage required'
  };
}

function getControlRequirementCoverage(ctrl) {
  normalizeControlDesignState(ctrl.id);
  var cs = state.controlStatus[ctrl.id] || {};
  var reqs = cs.assetOwnerRequirements || [];
  var coveredTypes = getCtrlCoveredAssetTypes(ctrl.id).map(function(t) { return t.label; });
  var targets = coveredTypes.length ? coveredTypes : ['General'];
  var satisfied = targets.filter(function(typeLabel) {
    var entry = reqs.find(function(r) { return r.assetType === typeLabel; }) || reqs.find(function(r) { return r.assetType === 'General'; });
    return !!(entry && ((entry.requirement || '').trim() || (entry.evidenceNeeded || '').trim()));
  });
  var hasCriteria = targets.filter(function(typeLabel) {
    var entry = reqs.find(function(r) { return r.assetType === typeLabel; }) || reqs.find(function(r) { return r.assetType === 'General'; });
    return !!(entry && (entry.acceptanceCriteria || '').trim());
  }).length;
  return {
    targetCount: targets.length,
    satisfiedCount: satisfied.length,
    criteriaCount: hasCriteria
  };
}

// Parse a NIST 800-53 control statement into top-level letter parts (a, b, c, …)
// Returns null when control has no meaningful sub-parts
function parseControlParts(ctrlId) {
  var text = (typeof NIST_CONTROL_TEXT !== 'undefined' && NIST_CONTROL_TEXT[ctrlId]) ? NIST_CONTROL_TEXT[ctrlId] : '';
  if (!text) return null;
  var positions = [];
  var re = /(?:^|\n)([a-z])\.\s/g;
  var m;
  while ((m = re.exec(text)) !== null) {
    positions.push({ letter: m[1], start: m.index + (m[0].charAt(0) === '\n' ? 1 : 0) });
  }
  if (positions.length < 2) return null;
  var parts = {};
  for (var i = 0; i < positions.length; i++) {
    var end = i < positions.length - 1 ? positions[i+1].start : text.length;
    var raw = text.substring(positions[i].start, end).trim().replace(/^[a-z]\.\s*/, '');
    parts[positions[i].letter] = raw.trim();
  }
  return Object.keys(parts).length >= 2 ? parts : null;
}

function extractNistAssignments(text) {
  var src = String(text || '');
  if (!src) return [];
  var out = [];
  var seen = {};
  var re = /\[Assignment:\s*([^\]]+)\]/gi;
  var m;
  while ((m = re.exec(src)) !== null) {
    var raw = (m[1] || '').trim();
    if (!raw) continue;
    var key = raw.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(raw);
  }
  return out;
}

function setCtrlDesignSource(ctrlId, source) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  state.controlStatus[ctrlId].designSource = source;
  if (source && (!state.controlStatus[ctrlId].status || state.controlStatus[ctrlId].status === 'Not Started')) {
    state.controlStatus[ctrlId].status = 'Planned';
  }
  markDirty();
  setTimeout(function(){ renderControlStep2(); }, 0);
}

function setCtrlDesignPart(ctrlId, letter, value) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].designParts) state.controlStatus[ctrlId].designParts = {};
  state.controlStatus[ctrlId].designParts[letter] = value;
  markDirty();
}

function setCtrlPartAssignment(ctrlId, letter, assignmentLabel, value) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].designPartParams) state.controlStatus[ctrlId].designPartParams = {};
  if (!state.controlStatus[ctrlId].designPartParams[letter]) state.controlStatus[ctrlId].designPartParams[letter] = {};
  state.controlStatus[ctrlId].designPartParams[letter][assignmentLabel] = value;
  markDirty();
}

function setCtrlAssignment(ctrlId, assignmentLabel, value) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].designParams) state.controlStatus[ctrlId].designParams = {};
  state.controlStatus[ctrlId].designParams[assignmentLabel] = value;
  markDirty();
}

function setCtrlAssetTypeStatus(ctrlId, typeKey, value) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].assetTypeStatus) state.controlStatus[ctrlId].assetTypeStatus = {};
  state.controlStatus[ctrlId].assetTypeStatus[typeKey] = value;
  markDirty();
}

function getCtrlCoveredAssetTypes(ctrlId) {
  var cs = state.controlStatus[ctrlId] || {};
  var coverage = cs.assetCoverage || {};
  var result = [];
  ASSET_TYPES.forEach(function(cat) {
    cat.types.forEach(function(t) { if (coverage[t.key]) result.push({ key: t.key, label: t.label }); });
  });
  (state.customAssetTypes||[]).forEach(function(at) {
    if (coverage['custom_' + at]) result.push({ key: 'custom_' + at, label: at });
  });
  return result;
}

function toggleCtrlAssetLink(ctrlId, assetId, checked) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].linkedAssets) state.controlStatus[ctrlId].linkedAssets = [];
  if (checked) {
    if (!state.controlStatus[ctrlId].linkedAssets.includes(assetId)) state.controlStatus[ctrlId].linkedAssets.push(assetId);
  } else {
    state.controlStatus[ctrlId].linkedAssets = state.controlStatus[ctrlId].linkedAssets.filter(a => a !== assetId);
  }
  markDirty();
  if (state._selectedCtrl === ctrlId) renderControlStep2();
}

function toggleCtrlProcessLink(ctrlId, processId, checked) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].linkedProcesses) state.controlStatus[ctrlId].linkedProcesses = [];
  if (checked) {
    if (!state.controlStatus[ctrlId].linkedProcesses.includes(processId)) state.controlStatus[ctrlId].linkedProcesses.push(processId);
  } else {
    state.controlStatus[ctrlId].linkedProcesses = state.controlStatus[ctrlId].linkedProcesses.filter(p => p !== processId);
  }
  markDirty();
  if (state._selectedCtrl === ctrlId) renderControlStep2();
}

var __EVIDENCE_IMAGE_MAX_BYTES = 100 * 1024;

function buildEvidenceArtifactSectionHTML(ctrl) {
  normalizeControlDesignState(ctrl.id);
  var cs = state.controlStatus[ctrl.id] || {};
  var cid = ctrl.id.replace(/'/g, "\\'");
  var ev = cs.evidence || [];
  var g = FAMILY_EVIDENCE_GUIDANCE[ctrl.f];
  var hint = g && g.evidence ? '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.5;"><strong>Examples for ' + escapeHTML(g.label || ctrl.f) + ':</strong> ' + escapeHTML(g.evidence.slice(0, 3).join(' · ')) + '</div>' : '';
  var rows = ev.map(function(evRow, idx) {
    var kind = evRow.kind === 'image' ? 'image' : 'ref';
    var refPart = kind === 'ref'
      ? '<div style="display:grid;grid-template-columns:130px 1fr;gap:8px;margin-top:8px;">'
        + '<select class="form-select" style="font-size:11px;" onchange="setEvidenceField(\'' + cid + '\',' + idx + ',\'type\',this.value)">'
        + ['Policy', 'Procedure', 'Screenshot', 'Log excerpt', 'Report', 'Ticket', 'Other'].map(function(tp) {
          return '<option' + ((evRow.type || '') === tp ? ' selected' : '') + '>' + tp + '</option>';
        }).join('')
        + '</select>'
        + '<input class="form-input" style="font-size:12px;" placeholder="URL, path, or reference ID" value="' + escapeHTML(evRow.ref || '') + '" oninput="setEvidenceField(\'' + cid + '\',' + idx + ',\'ref\',this.value)">'
        + '</div>'
      : '<div style="margin-top:8px;">'
        + '<input class="form-input" style="font-size:11px;margin-bottom:6px;" placeholder="Caption / context" value="' + escapeHTML(evRow.caption || '') + '" oninput="setEvidenceField(\'' + cid + '\',' + idx + ',\'caption\',this.value)">'
        + '<input type="file" accept="image/png,image/jpeg" style="font-size:11px;margin-bottom:6px;" onchange="handleEvidenceImageUpload(\'' + cid + '\',' + idx + ',this)">'
        + (evRow.dataUrl
          ? '<div style="display:flex;align-items:center;gap:10px;"><img src="' + evRow.dataUrl + '" alt="" style="max-height:72px;border-radius:6px;border:1px solid var(--border);cursor:zoom-in;" onclick="openEvidenceImageViewerAt(\'' + cid + '\',' + idx + ')"><span style="font-size:10px;color:var(--text-muted);">Click preview for full size</span></div>'
          : '<div style="font-size:10px;color:var(--text-muted);">No image yet — choose PNG/JPEG up to 100 KB.</div>')
        + '</div>';
    return '<div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;background:#fafbff;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
      + '<div style="font-size:10px;font-weight:700;color:var(--navy);text-transform:uppercase;">Evidence row ' + (idx + 1) + '</div>'
      + '<div style="display:flex;gap:6px;align-items:center;">'
      + '<select class="form-select" style="font-size:11px;padding:3px 8px;" onchange="setEvidenceKind(\'' + cid + '\',' + idx + ',this.value)">'
      + '<option value="ref"' + (kind === 'ref' ? ' selected' : '') + '>Document / reference</option>'
      + '<option value="image"' + (kind === 'image' ? ' selected' : '') + '>Screenshot (PNG/JPEG)</option>'
      + '</select>'
      + '<button type="button" class="btn btn-sm" style="font-size:10px;padding:2px 8px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;" onclick="removeCtrlEvidence(\'' + cid + '\',' + idx + ')">Remove</button>'
      + '</div></div>'
      + refPart
      + '</div>';
  }).join('');
  return '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--navy);margin-bottom:4px;">Evidence artifacts</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.55;">Attach references or small screenshots (assessment aids). Images are stored in-browser only — keep each file at or under 100 KB.</div>'
    + hint
    + (rows || '<div style="font-size:11px;color:var(--text-muted);">No evidence rows yet.</div>')
    + '<button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px;font-size:11px;" onclick="addCtrlEvidence(\'' + cid + '\')">+ Add evidence row</button>'
    + '</div>';
}

function setEvidenceKind(ctrlId, idx, kind) {
  if (!state.controlStatus[ctrlId] || !state.controlStatus[ctrlId].evidence || !state.controlStatus[ctrlId].evidence[idx]) return;
  var row = state.controlStatus[ctrlId].evidence[idx];
  if (kind === 'image') {
    row.kind = 'image';
    row.mime = row.mime || 'image/png';
    row.caption = row.caption != null ? row.caption : '';
    row.dataUrl = row.dataUrl || '';
    delete row.type;
    delete row.ref;
  } else {
    row.kind = 'ref';
    row.type = row.type || 'Policy';
    row.ref = row.ref != null ? row.ref : (row.caption || '');
    delete row.dataUrl;
    delete row.mime;
    delete row.caption;
  }
  markDirty();
  renderControlStep2();
}

function handleEvidenceImageUpload(ctrlId, idx, input) {
  var f = input.files && input.files[0];
  if (!f) return;
  if (f.type !== 'image/png' && f.type !== 'image/jpeg') {
    showToast('Only PNG or JPEG images are allowed for evidence screenshots.', true);
    input.value = '';
    return;
  }
  if (f.size > __EVIDENCE_IMAGE_MAX_BYTES) {
    showToast('Image too large — max ' + Math.round(__EVIDENCE_IMAGE_MAX_BYTES / 1024) + ' KB per screenshot.', true);
    input.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function() {
    if (!state.controlStatus[ctrlId] || !state.controlStatus[ctrlId].evidence || !state.controlStatus[ctrlId].evidence[idx]) return;
    var url = reader.result;
    var prev = state.controlStatus[ctrlId].evidence[idx].dataUrl;
    state.controlStatus[ctrlId].evidence[idx].kind = 'image';
    state.controlStatus[ctrlId].evidence[idx].dataUrl = url;
    state.controlStatus[ctrlId].evidence[idx].mime = f.type;
    logFieldChange('controlStatus.' + ctrlId + '.evidence[' + idx + '].image', prev ? '(replaced)' : '(none)', '(binary)');
    markDirty();
    renderControlStep2();
    showToast('Image attached — use Save now to persist.');
  };
  reader.onerror = function() { showToast('Could not read image file.', true); };
  reader.readAsDataURL(f);
  input.value = '';
}

function openEvidenceImageViewerAt(ctrlId, idx) {
  var row = ((state.controlStatus[ctrlId] || {}).evidence || [])[idx];
  if (!row || !row.dataUrl) return;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:10100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = '<div style="position:relative;max-width:96vw;max-height:96vh;">'
    + '<button type="button" id="evFullClose" style="position:absolute;top:-44px;right:0;background:white;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;">Close</button>'
    + '<img alt="Evidence" style="max-width:92vw;max-height:88vh;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.5);">'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('img').src = row.dataUrl;
  document.getElementById('evFullClose').onclick = function() { overlay.remove(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

// ── CONTROL DETAIL FORM (Step 2 right panel) ──────────────────────────────────
function renderControlDetailForm(ctrl) {
  normalizeControlDesignState(ctrl.id);
  const cs  = state.controlStatus[ctrl.id] || {};
  const co  = (state.controlOwners||{})[ctrl.id] || {};
  const st  = cs.status || 'Not Started';
  const pn  = (() => {
    const ctrls = getScopedControls().filter(c =>
      !(state.controlStatus[c.id]||{}).returnedToPolicyOwner &&
      !(state.controlStatus[c.id]||{}).recommendedDeselect);
    const idx = ctrls.findIndex(c=>c.id===ctrl.id);
    return { prev: idx>0?ctrls[idx-1].id:null, next: idx<ctrls.length-1?ctrls[idx+1].id:null };
  })();
  const designSource    = cs.designSource || '';
  const designParts     = cs.designParts  || {};
  const nistParts       = parseControlParts(ctrl.id);
  const nistFullText    = (typeof NIST_CONTROL_TEXT !== 'undefined' && NIST_CONTROL_TEXT[ctrl.id]) ? NIST_CONTROL_TEXT[ctrl.id] : '';
  const controlAssignments = extractNistAssignments(nistFullText);
  const designParams    = cs.designParams || {};
  const coveredTypes    = getCtrlCoveredAssetTypes(ctrl.id);
  const assetTypeStatus = cs.assetTypeStatus || {};
  const policyReqs      = getControlPolicyReqs(ctrl.id);
  const designChecklist = getDesignChecklist(ctrl);
  const cid = ctrl.id.replace(/'/g,"\\'");

  return `
    <!-- ① Control header -->
    <div style="background:var(--navy);color:white;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-family:monospace;font-size:18px;font-weight:800;">${ctrl.id}</span>
            <span class="family-badge" style="background:rgba(255,255,255,0.15);color:white;border-color:rgba(255,255,255,0.2);">${ctrl.f}</span>
          </div>
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${ctrl.n}</div>
          <div>${pillsHTML(ctrl.bl)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7;margin-bottom:4px;">Status</div>
          ${chipHTML(st)}
        </div>
      </div>
    </div>

    <!-- ② Design Requirements Context -->
    <div style="background:#fafbff;border:2px solid var(--navy);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <span style="font-size:16px;">📋</span>
        <div>
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:var(--navy);">Requirements Your Design Must Satisfy</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Your control design must demonstrate how it addresses ALL of the following.</div>
        </div>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:${policyReqs.length ? '12px' : '0'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1d4ed8;">① NIST SP 800-53 Rev. 5 — Control Requirement</div>
          <a href="https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home?element=${ctrl.id}" target="_blank" rel="noopener" style="font-size:11px;color:#1d4ed8;text-decoration:none;font-weight:600;border:1px solid #bfdbfe;padding:2px 8px;border-radius:4px;white-space:nowrap;">🔗 NIST Catalog</a>
        </div>
        <div style="font-size:12px;color:#1e3a5f;line-height:1.7;white-space:pre-line;">${(typeof NIST_CONTROL_TEXT !== 'undefined' && NIST_CONTROL_TEXT[ctrl.id]) ? escapeHTML(NIST_CONTROL_TEXT[ctrl.id]) : escapeHTML(ctrlShortDesc(ctrl))}</div>
      </div>

      ${policyReqs.length ? `
      <div style="background:#faf5ff;border:1px solid rgba(99,102,241,0.25);border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6366f1;margin-bottom:10px;">② Policy Requirements Linked to this Control (${policyReqs.length})</div>
        ${policyReqs.map(r =>
          '<div style="border-left:3px solid #6366f1;padding:8px 12px;margin-bottom:8px;background:rgba(99,102,241,0.03);border-radius:0 6px 6px 0;">'
          + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
          + '<span style="font-family:monospace;font-size:11px;font-weight:700;background:rgba(99,102,241,0.1);color:#6366f1;padding:1px 6px;border-radius:4px;">' + escapeHTML(r.reqId) + '</span>'
          + '<span style="font-size:11px;color:var(--text-muted);">' + escapeHTML(r.policyTitle) + '</span>'
          + '</div>'
          + '<div style="font-size:12px;color:var(--navy);line-height:1.6;">' + escapeHTML(r.reqText) + '</div>'
          + '</div>'
        ).join('')}
      </div>` : `
      <div style="background:#faf5ff;border:1px solid rgba(99,102,241,0.15);border-radius:8px;padding:10px 14px;font-size:11px;color:#6366f1;">
        ② No policy requirements explicitly link to this control yet — your design still needs to satisfy the NIST requirement above.
      </div>`}
    </div>

    <!-- ③ Asset & Process Scope -->
    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--navy);margin-bottom:4px;">Asset &amp; Process Scope</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px;line-height:1.6;">
        Identify which asset types and processes this control applies to. Your design must address how it works for <strong>each type you check</strong>. Assessors will validate coverage by asset type.
      </div>

      ${((state.assets||[]).length > 0 || (state.processes||[]).length > 0) ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--navy);margin-bottom:8px;">Link Specific Assets &amp; Processes from Inventory</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:100px;overflow-y:auto;padding:4px;">
          ${(state.assets||[]).map(a => {
            const linked = (cs.linkedAssets||[]).includes(a.id||a.name);
            const aid = (a.id||a.name||'').replace(/'/g,"\\'");
            return `<label style="display:flex;align-items:center;gap:5px;font-size:11px;padding:4px 8px;background:${linked?'rgba(13,148,136,0.08)':'#f8fafc'};border:1px solid ${linked?'var(--teal)':'var(--border)'};border-radius:6px;cursor:pointer;white-space:nowrap;"><input type="checkbox" ${linked?'checked':''} style="accent-color:var(--teal);" onchange="toggleCtrlAssetLink('${cid}','${aid}',this.checked)">${escapeHTML(a.name||a.id)}</label>`;
          }).join('')}
          ${(state.processes||[]).map(p => {
            const linked = (cs.linkedProcesses||[]).includes(p.id||p.name);
            const pid = (p.id||p.name||'').replace(/'/g,"\\'");
            return `<label style="display:flex;align-items:center;gap:5px;font-size:11px;padding:4px 8px;background:${linked?'rgba(99,102,241,0.08)':'#f8fafc'};border:1px solid ${linked?'rgba(99,102,241,0.4)':'var(--border)'};border-radius:6px;cursor:pointer;white-space:nowrap;"><input type="checkbox" ${linked?'checked':''} style="accent-color:#6366f1;" onchange="toggleCtrlProcessLink('${cid}','${pid}',this.checked)">⚙️ ${escapeHTML(p.name||p.id)}</label>`;
          }).join('')}
        </div>
      </div>` : `
      <div style="background:#f8fafc;border:1px dashed var(--border);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--text-muted);margin-bottom:14px;">
        No assets or processes in inventory yet — add them in the Assets &amp; SSP tab. Asset type coverage below still applies.
      </div>`}

      <div style="font-size:11px;font-weight:700;color:var(--navy);margin-bottom:8px;">Asset Type Coverage <span style="font-weight:400;color:var(--text-muted);">(check all that apply)</span></div>
      ${buildAssetCoverageHTML(ctrl.id)}
    </div>

    <!-- ④ Control Design -->
    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--navy);margin-bottom:4px;">Control Design</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px;line-height:1.6;">Document how this control is designed and implemented. This must address all parts of the NIST requirement above. Assessors use this to verify your implementation covers all sub-requirements.</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
        ${[
          ['Design Source Complete', designChecklist.sourceReady, designChecklist.sourceDetail],
          ['Asset/Process Scope Set', designChecklist.coverageReady, designChecklist.coverageDetail],
          ['Policy/NIST Alignment', designChecklist.policyReady, designChecklist.policyDetail]
        ].map(([label, ok, detail]) => `
          <div style="background:${ok?'#f0fdf4':'#fff7ed'};border:1px solid ${ok?'#86efac':'#fdba74'};border-radius:8px;padding:8px 10px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:${ok?'#166534':'#b45309'};">${ok?'✓':'⚠'} ${label}</div>
            <div style="font-size:10px;color:${ok?'#166534':'#92400e'};margin-top:3px;line-height:1.45;">${detail}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <label style="display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border:2px solid ${!designSource||designSource==='inline'?'var(--teal)':'var(--border)'};border-radius:8px;cursor:pointer;flex:1;background:${!designSource||designSource==='inline'?'rgba(13,148,136,0.04)':'white'};">
          <input type="radio" name="ctrlDesignSrc_${ctrl.id}" value="inline" ${!designSource||designSource==='inline'?'checked':''} onchange="setCtrlDesignSource('${cid}','inline')" style="margin-top:2px;accent-color:var(--teal);">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--navy);">Document the design here</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Write the control design directly. Recommended when no existing procedure covers this control.</div>
          </div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border:2px solid ${designSource==='external'?'var(--teal)':'var(--border)'};border-radius:8px;cursor:pointer;flex:1;background:${designSource==='external'?'rgba(13,148,136,0.04)':'white'};">
          <input type="radio" name="ctrlDesignSrc_${ctrl.id}" value="external" ${designSource==='external'?'checked':''} onchange="setCtrlDesignSource('${cid}','external')" style="margin-top:2px;accent-color:var(--teal);">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--navy);">Point to an existing procedure or standard</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Reference a procedure, standard, or policy that already captures this control design.</div>
          </div>
        </label>
      </div>

      ${designSource === 'external' ? `
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 160px;gap:10px;margin-bottom:10px;">
          <div>
            <label class="form-label" style="font-size:10px;">Document Title</label>
            <input class="form-input" style="font-size:12px;" value="${escapeHTML(cs.externalDocTitle||'')}" placeholder="e.g. Account Management Procedure v2.1" oninput="setCtrlField('${cid}','externalDocTitle',this.value)">
          </div>
          <div>
            <label class="form-label" style="font-size:10px;">Document Type</label>
            <select class="form-select" style="font-size:12px;" onchange="setCtrlField('${cid}','externalDocType',this.value)">
              ${['','Procedure','Standard','Policy','SOP','Framework Control','Work Instruction','Other'].map(t=>`<option ${(cs.externalDocType||'')=== t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <label class="form-label" style="font-size:10px;">Reference / Location (URL, file path, or document ID)</label>
          <input class="form-input" style="font-size:12px;" value="${escapeHTML(cs.externalDocRef||'')}" placeholder="e.g. https://wiki.company.com/procedures/ac-2  or  ISMS-PROC-AC-002" oninput="setCtrlField('${cid}','externalDocRef',this.value)">
        </div>
        <div>
          <label class="form-label" style="font-size:10px;">Coverage Summary <span style="font-weight:400;">(briefly explain how the document addresses each NIST sub-requirement)</span></label>
          <textarea class="form-input" rows="3" style="font-size:12px;resize:vertical;" placeholder="e.g. Section 3.1 addresses sub-req (a–d): account types and approval. Section 4 covers (g): monitoring. Section 5 covers (h–l): lifecycle notifications." oninput="setCtrlField('${cid}','externalDocSummary',this.value)">${escapeHTML(cs.externalDocSummary||'')}</textarea>
        </div>
      </div>
      ` : nistParts ? `
      <div style="font-size:11px;color:#166534;margin-bottom:12px;padding:8px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;">
        ✅ NIST ${ctrl.id} has ${Object.keys(nistParts).length} sub-requirements (${Object.keys(nistParts)[0].toUpperCase()}–${Object.keys(nistParts).slice(-1)[0].toUpperCase()}). Document how your design addresses each one below.
      </div>
      ${Object.keys(nistParts).map(letter => {
        const partText = nistParts[letter];
        const savedVal = designParts[letter] || '';
        const assignments = extractNistAssignments(partText);
        const partParams = ((cs.designPartParams || {})[letter]) || {};
        return `<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:12px;overflow:hidden;">
          <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;">
            <span style="font-family:monospace;font-size:14px;font-weight:800;color:var(--navy);background:rgba(30,58,95,0.08);padding:2px 8px;border-radius:4px;flex-shrink:0;">${letter.toUpperCase()}</span>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.6;">${escapeHTML(partText.length > 220 ? partText.substring(0,220)+'…' : partText)}</div>
          </div>
          <div style="padding:10px 14px;">
            <label class="form-label" style="font-size:10px;">How does your design address sub-requirement ${letter.toUpperCase()}?</label>
            <textarea class="form-input" rows="3" style="font-size:12px;line-height:1.6;resize:vertical;" placeholder="Describe the specific process, system, or mechanism that satisfies this sub-requirement…" oninput="setCtrlDesignPart('${cid}','${letter}',this.value)">${escapeHTML(savedVal)}</textarea>
            ${assignments.length ? `<div style="margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#1d4ed8;margin-bottom:6px;">Tailoring Required for This Sub-Requirement</div>
              <div style="font-size:11px;color:#1e3a8a;margin-bottom:8px;">Fill organization-defined values referenced in this specific subcomponent.</div>
              ${assignments.map(a => {
                const safeA = a.replace(/'/g,"\\'");
                const savedA = partParams[a] || '';
                return `<label class="form-label" style="font-size:10px;margin-top:6px;">${escapeHTML(a)}</label>
                <input class="form-input" style="font-size:12px;" value="${escapeHTML(savedA)}" placeholder="Define value for: ${escapeHTML(a)}" oninput="setCtrlPartAssignment('${cid}','${letter}','${safeA}',this.value)">`;
              }).join('')}
            </div>` : ''}
          </div>
        </div>`;
      }).join('')}
      ` : `
      <div>
        <label class="form-label">Control Design Description</label>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">Describe how this control is designed and implemented. Be specific about systems, processes, configurations, and responsible roles. Assessors use this to verify your implementation.</div>
        <textarea class="form-input" rows="5" style="font-size:12px;line-height:1.6;resize:vertical;" placeholder="Describe how this control operates in your environment…" oninput="setCtrlField('${cid}','approach',this.value)">${escapeHTML(cs.approach||'')}</textarea>
        ${controlAssignments.length ? `<div style="margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#1d4ed8;margin-bottom:6px;">Tailoring Required</div>
          <div style="font-size:11px;color:#1e3a8a;margin-bottom:8px;">This control statement includes organization-defined values. Define them here as part of the design.</div>
          ${controlAssignments.map(a => {
            const safeA = a.replace(/'/g,"\\'");
            const savedA = designParams[a] || '';
            return `<label class="form-label" style="font-size:10px;margin-top:6px;">${escapeHTML(a)}</label>
            <input class="form-input" style="font-size:12px;" value="${escapeHTML(savedA)}" placeholder="Define value for: ${escapeHTML(a)}" oninput="setCtrlAssignment('${cid}','${safeA}',this.value)">`;
          }).join('')}
        </div>` : ''}
      </div>
      `}

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <label class="form-label">Auditor-Ready Narrative <span style="font-weight:400;font-size:11px;color:var(--text-muted);">(optional — integrates all sub-reqs into one statement)</span></label>
        <textarea class="form-input" rows="3" style="font-size:12px;line-height:1.6;resize:vertical;" placeholder="The organization implements ${ctrl.id} through…" oninput="setCtrlField('${cid}','narrative',this.value)">${escapeHTML(cs.narrative||'')}</textarea>
      </div>
    </div>

    ${buildEvidenceArtifactSectionHTML(ctrl)}

    <!-- ⑤ Implementation Status -->
    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--navy);margin-bottom:4px;">Implementation Status</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">Set the overall status. If asset types are in scope, you can also track status per asset type to reflect partial rollout.</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:${coveredTypes.length>0?'14px':'0'};">
        <div>
          <label class="form-label" style="font-size:10px;">Overall Status</label>
          <select class="form-select" onchange="setCtrlStatus('${cid}',this.value)">
            ${['Not Started','Planned','In Progress','Implemented','Not Applicable','Inherited'].map(s=>`<option ${st===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        ${st==='Planned'||st==='In Progress' ? `
        <div>
          <label class="form-label" style="font-size:10px;">Target Completion Date</label>
          <input class="form-input" type="date" style="font-size:12px;" value="${escapeHTML(co.dueDate||'')}" oninput="setCtrlOwnerField('${cid}','dueDate',this.value)">
        </div>` : ''}
      </div>

      ${coveredTypes.length > 0 ? `
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
        <div style="font-size:11px;font-weight:700;color:var(--navy);margin-bottom:10px;">Status by Asset Type</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${coveredTypes.map(t => {
            const tStatus = assetTypeStatus[t.key] || '';
            const tkey = t.key.replace(/'/g,"\\'");
            return `<div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:11px;color:var(--navy);min-width:220px;">${escapeHTML(t.label)}</span>
              <select class="form-select" style="flex:1;font-size:11px;padding:5px 8px;" onchange="setCtrlAssetTypeStatus('${cid}','${tkey}',this.value)">
                ${['','Not Started','Planned','In Progress','Implemented','Not Applicable','Inherited'].map(s=>`<option ${tStatus===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      ${st === 'Not Applicable' ? `
      <div style="margin-top:14px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:14px;">
        <label class="form-label" style="color:#c2410c;font-size:10px;">⚠️ Not Applicable — Justification Required <span class="required">*</span></label>
        <textarea class="form-input" rows="3" style="font-size:12px;resize:vertical;" placeholder="Explain why this control does not apply…" oninput="setCtrlField('${cid}','naJustification',this.value)">${escapeHTML(cs.naJustification||'')}</textarea>
      </div>` : ''}
      ${st === 'Inherited' ? `
      <div style="margin-top:14px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;">
        <label class="form-label" style="color:#1d4ed8;font-size:10px;">🔗 Inherited From — Source Required</label>
        <input class="form-input" style="font-size:12px;" placeholder="e.g. AWS GovCloud (FedRAMP High), or Corporate AD managed by IT Ops…" value="${escapeHTML(cs.inheritedFrom||'')}" oninput="setCtrlField('${cid}','inheritedFrom',this.value)">
      </div>` : ''}
    </div>

    <!-- ⑥ Internal Notes -->
    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--navy);margin-bottom:4px;">Internal Notes <span style="font-weight:400;font-size:11px;color:var(--text-muted);">(not included in reports)</span></div>
      <textarea class="form-input" rows="2" style="font-size:12px;resize:vertical;" placeholder="Gaps, remediation plans, open questions, implementation blockers…" oninput="setCtrlField('${cid}','notes',this.value)">${escapeHTML(cs.notes||'')}</textarea>
    </div>

    <!-- ⑦ Return / De-select -->
    <div style="border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 16px;background:rgba(239,68,68,0.02);margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:2px;">Not your control?</div>
          <div style="font-size:11px;color:var(--text-muted);">Return it to the policy owner for reassignment, or propose that it be removed from scope.</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;margin-left:auto;">
          <button class="btn btn-sm" style="background:white;border:1px solid rgba(220,38,38,0.4);color:#dc2626;font-weight:600;white-space:nowrap;" onclick="returnControlToPolicyOwner('${cid}')">↩ Return to Policy Owner</button>
          <button class="btn btn-sm" style="background:white;border:1px solid rgba(245,158,11,0.4);color:#d97706;font-weight:600;white-space:nowrap;" onclick="recommendControlDeselect('${cid}')">✗ Propose De-selection</button>
        </div>
      </div>
    </div>

    <!-- Prev / Next -->
    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);">
      <button class="btn btn-secondary btn-sm" onclick="${pn.prev?`selectCtrlDetail('${pn.prev.replace(/'/g,"\\'")}')`:''}" ${!pn.prev?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>← Prev Control</button>
      <button class="btn btn-secondary btn-sm" onclick="${pn.next?`selectCtrlDetail('${pn.next.replace(/'/g,"\\'")}')`:''}" ${!pn.next?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>Next Control →</button>
    </div>`;
}

function setCtrlStatus(ctrlId, status) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  var oldStatus = state.controlStatus[ctrlId].status || 'Not Started';
  state.controlStatus[ctrlId].status = status;
  logFieldChange('controlStatus.' + ctrlId + '.status', oldStatus, status);
  if (oldStatus !== status) addAuditEntry('control', ctrlId, 'Status changed: ' + oldStatus + ' → ' + status);
  renderControlStep2();
}

var __CTRL_FIELD_LOG_SKIP = { approach: 1, narrative: 1, notes: 1, naJustification: 1, externalDocSummary: 1 };
function setCtrlField(ctrlId, field, value) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  var prev = state.controlStatus[ctrlId][field];
  state.controlStatus[ctrlId][field] = value;
  if (!__CTRL_FIELD_LOG_SKIP[field]) logFieldChange('controlStatus.' + ctrlId + '.' + field, prev, value);
  markDirty();
}

function setCtrlOwnerField(ctrlId, field, value) {
  if (!state.controlOwners) state.controlOwners = {};
  if (!state.controlOwners[ctrlId]) state.controlOwners[ctrlId] = {};
  var prev = state.controlOwners[ctrlId][field];
  state.controlOwners[ctrlId][field] = value;
  if (field === 'name' || field === 'email') delete state.controlOwners[ctrlId].isDemoPlaceholder;
  logFieldChange('controlOwners.' + ctrlId + '.' + field, prev, value);
  markDirty();
}

function addCtrlEvidence(ctrlId) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].evidence) state.controlStatus[ctrlId].evidence = [];
  state.controlStatus[ctrlId].evidence.push({ kind: 'ref', type: 'Policy', ref: '' });
  markDirty();
  renderControlStep2();
}

function removeCtrlEvidence(ctrlId, idx) {
  state.controlStatus[ctrlId].evidence.splice(idx, 1);
  markDirty();
  renderControlStep2();
}

function setEvidenceField(ctrlId, idx, field, value) {
  if (state.controlStatus[ctrlId]?.evidence?.[idx]) {
    var prev = state.controlStatus[ctrlId].evidence[idx][field];
    state.controlStatus[ctrlId].evidence[idx][field] = value;
    logFieldChange('controlStatus.' + ctrlId + '.evidence[' + idx + '].' + field, prev, value);
    markDirty();
  }
}

function setAssetCoverage(ctrlId, typeKey, checked) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].assetCoverage) state.controlStatus[ctrlId].assetCoverage = {};
  state.controlStatus[ctrlId].assetCoverage[typeKey] = checked;
  markDirty();
  if (state._selectedCtrl === ctrlId) renderControlStep2();
}

function getAllAssetTypes() {
  ensureAssetTypeMetadata();
  var custom = (state.customAssetTypes || []).filter(function(t){ return t && t.trim(); });
  var standard = [];
  getActiveAssetTypeCatalog().forEach(function(cat){ cat.types.forEach(function(t){ standard.push(t.label); }); });
  return standard.concat(custom).concat(['Other']);
}

function getAssetTypeKey(label) {
  var catalog = getActiveAssetTypeCatalog();
  for (var i = 0; i < catalog.length; i++) {
    for (var j = 0; j < catalog[i].types.length; j++) {
      if (catalog[i].types[j].label === label) return catalog[i].types[j].key;
    }
  }
  return null;
}

function buildAssetTypeOptions(selectedLabel) {
  var html = '<option value="">— Select type —</option>';
  var activeLabels = [];
  getActiveAssetTypeCatalog().forEach(function(cat) {
    html += '<optgroup label="' + cat.category + '">';
    cat.types.forEach(function(t) {
      activeLabels.push(t.label);
      html += '<option value="' + t.label + '"' + (selectedLabel === t.label ? ' selected' : '') + '>' + t.label + '</option>';
    });
    html += '</optgroup>';
  });
  var custom = (state.customAssetTypes || []).filter(function(t){ return t && t.trim(); });
  if (custom.length) {
    html += '<optgroup label="Custom">';
    custom.forEach(function(t) {
      html += '<option value="' + t + '"' + (selectedLabel === t ? ' selected' : '') + '>' + t + '</option>';
    });
    html += '</optgroup>';
  }
  if (selectedLabel && selectedLabel !== 'Other' && activeLabels.indexOf(selectedLabel) === -1 && custom.indexOf(selectedLabel) === -1) {
    html += '<optgroup label="Retired / Unlisted"><option value="' + _esc(selectedLabel) + '" selected>' + _esc(selectedLabel) + '</option></optgroup>';
  }
  html += '<option value="Other"' + (selectedLabel === 'Other' ? ' selected' : '') + '>Other</option>';
  return html;
}

function setCustomAssetCoverage(ctrlId, typeName, checked) {
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  if (!state.controlStatus[ctrlId].assetCoverage) state.controlStatus[ctrlId].assetCoverage = {};
  state.controlStatus[ctrlId].assetCoverage['custom_' + typeName] = checked;
  markDirty();
  if (state._selectedCtrl === ctrlId) renderControlStep2();
}

function addCustomAssetType(ctrlId) {
  var input = document.getElementById('_newAssetTypeName');
  var groupInput = document.getElementById('_newAssetTypeCategory');
  if (!input) return;
  var name = input.value.trim();
  var groupName = (groupInput && groupInput.value ? groupInput.value : 'Custom').trim() || 'Custom';
  if (!name) { showToast('Please enter a type name.', true); input.focus(); return; }
  var allExisting = getAllAssetTypes().map(function(t){ return t.toLowerCase(); });
  if (allExisting.includes(name.toLowerCase())) {
    showToast('"' + name + '" already exists.', true); input.select(); return;
  }
  input.value = '';
  if (userCanApproveAssetTypeRequests()) {
    applyAssetTypeAdd(name, groupName);
    addAuditEntry('program', 'asset-types', 'Asset type added directly by ' + getCurrentActorName() + ': "' + name + '" in group "' + groupName + '"');
    markDirty();
    showToast('✅ Added asset type "' + name + '"');
    setCustomAssetCoverage(ctrlId, name, true);
    var coverageDiv = document.getElementById('asset-coverage-' + ctrlId);
    if (coverageDiv) coverageDiv.outerHTML = buildAssetCoverageHTML(ctrlId);
    return;
  }
  if (groupInput) groupInput.value = groupName;
  submitAssetTypeRequest('add', name, 'Requested from control design coverage editor', groupName);
  showToast('Asset type add request submitted to program owner.');
}

function removeCustomAssetType(typeName) {
  if (!confirm('Request deletion of asset type "' + typeName + '"?\n\nIf approved, this will uncheck it from all controls.')) return;
  if (userCanApproveAssetTypeRequests()) {
    var removed = applyAssetTypeDelete(typeName);
    if (!removed) { showToast('Type not found or already removed.', true); return; }
    addAuditEntry('program', 'asset-types', 'Asset type removed directly by ' + getCurrentActorName() + ': "' + typeName + '"');
    markDirty();
    showToast('Removed asset type "' + typeName + '"');
    renderControlStep2();
    return;
  }
  submitAssetTypeRequest('delete', typeName, 'Requested from control design coverage editor');
  renderControlStep2();
}

function buildAssetCoverageHTML(ctrlId) {
  ensureAssetTypeMetadata();
  var cs = state.controlStatus[ctrlId] || {};
  var customTypes = state.customAssetTypes || [];

  var standardHTML = getActiveAssetTypeCatalog().map(function(cat) {
    var groupHTML = '<div style="grid-column:1/-1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-top:8px;margin-bottom:2px;">' + cat.category + '</div>';
    cat.types.forEach(function(t) {
      var chk = (cs.assetCoverage||{})[t.key];
      groupHTML += '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--navy);cursor:pointer;padding:3px 0;">'
        + '<input type="checkbox"' + (chk?' checked':'') + ' style="accent-color:var(--teal);" onchange="setAssetCoverage(\'' + ctrlId + '\',\'' + t.key + '\',this.checked)">'
        + t.label + '</label>';
    });
    return groupHTML;
  }).join('');

  var groupedCustom = {};
  customTypes.forEach(function(at) {
    var grp = (state.customAssetTypeGroups || {})[at] || 'Custom';
    if (!groupedCustom[grp]) groupedCustom[grp] = [];
    groupedCustom[grp].push(at);
  });
  var customHTML = Object.keys(groupedCustom).sort().map(function(groupName) {
    var groupHeader = '<div style="grid-column:1/-1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#0f766e;margin-top:8px;margin-bottom:2px;">' + _esc(groupName) + '</div>';
    var rows = groupedCustom[groupName].map(function(at) {
      var chk = (cs.assetCoverage||{})['custom_' + at];
      var safeAt = at.replace(/'/g, "\\'");
      return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--navy);cursor:pointer;padding:3px 0;">'
        + '<input type="checkbox"' + (chk?' checked':'') + ' style="accent-color:var(--teal);" onchange="setCustomAssetCoverage(\'' + ctrlId + '\',\'' + safeAt + '\',this.checked)">'
        + _esc(at)
        + '<span onclick="removeCustomAssetType(\'' + safeAt + '\')" title="Request delete for this type" style="margin-left:4px;color:var(--red);cursor:pointer;font-size:10px;opacity:0.6;" onmouseenter="this.style.opacity=\'1\'" onmouseleave="this.style.opacity=\'0.6\'">✕</span>'
        + '</label>';
    }).join('');
    return groupHeader + rows;
  }).join('');

  var groupOpts = getAllAssetTypeGroups().map(function(g){ return '<option value="' + _esc(g) + '">' + _esc(g) + '</option>'; }).join('');
  var addRowHTML = '<div style="grid-column:1/-1;display:grid;grid-template-columns:1fr 190px auto;align-items:center;gap:6px;margin-top:6px;padding-top:8px;border-top:1px dashed var(--border);">'
    + '<input id="_newAssetTypeName" class="form-input" style="font-size:12px;padding:5px 8px;" placeholder="Add custom type (e.g. IoT Device, Mainframe…)"'
    + ' onkeydown="if(event.key===\'Enter\')addCustomAssetType(\'' + ctrlId + '\')">'
    + '<select id="_newAssetTypeCategory" class="form-select" style="font-size:12px;padding:5px 8px;">' + groupOpts + '</select>'
    + '<button class="btn btn-secondary btn-sm" onclick="addCustomAssetType(\'' + ctrlId + '\')">+ Add</button>'
    + '</div>';

  return '<div id="asset-coverage-' + ctrlId + '" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-bottom:8px;">'
    + standardHTML + customHTML + addRowHTML
    + '</div>';
}

function toggleAssetMapping(controlId, assetId, checked) {
  if (!state.assetMappings) state.assetMappings = {};
  if (!state.assetMappings[controlId]) state.assetMappings[controlId] = [];
  if (checked) {
    if (!state.assetMappings[controlId].includes(assetId)) state.assetMappings[controlId].push(assetId);
  } else {
    state.assetMappings[controlId] = state.assetMappings[controlId].filter(a => a !== assetId);
  }
  markDirty();
  renderControlStep2();
}

// ── STEP 3: ASSET OWNER REQUIREMENTS ─────────────────────────────────────────
function renderControlStep3() {
  const body = document.getElementById('control-step-3-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">🏛️</div><div class="es-title">CISO Setup Required</div></div>`;
    return;
  }
  const controls = getScopedControls().filter(c =>
    !(state.controlStatus[c.id]||{}).returnedToPolicyOwner &&
    !(state.controlStatus[c.id]||{}).recommendedDeselect
  );
  const designedControls = controls.filter(function(c) {
    const cs = state.controlStatus[c.id] || {};
    return cs.designSource || (cs.approach && cs.approach.trim()) ||
           (cs.designParts && Object.values(cs.designParts).some(v => v && v.trim()));
  });

  if (designedControls.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><div class="es-title">No Controls Designed Yet</div><p>Go to Step 2 to design at least one control. Once you've documented the design, you'll define what asset owners need to do to comply.</p><button class="btn btn-primary" onclick="goToStep('control',2)" style="margin-top:16px;">Go to Step 2 →</button></div>`;
    return;
  }

  const filter     = state._ctrlStep3Filter || 'all';
  const allFams    = [...new Set(designedControls.map(c=>c.f))];
  const shown      = filter === 'all' ? designedControls : designedControls.filter(c => c.f === filter);
  const withReqs   = designedControls.filter(function(c) {
    normalizeControlDesignState(c.id);
    return ((state.controlStatus[c.id]||{}).assetOwnerRequirements||[]).some(r =>
      (r.requirement && r.requirement.trim()) || (r.evidenceNeeded && r.evidenceNeeded.trim())
    );
  }).length;
  const uniqueTypes = [...new Set(designedControls.flatMap(c => getCtrlCoveredAssetTypes(c.id).map(t => t.label)))].length;

  body.innerHTML = `
    <div class="section-title">Asset-Type Requirements &amp; Required Evidence</div>
    <div class="section-subtitle">For each designed control, define downstream obligations by asset type: what asset/process owners must do, what evidence they must provide, and how reviewers should judge sufficiency. These definitions flow into the Assets &amp; SSP attestation workflow.</div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 16px;border-left:3px solid #166534;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#166534;">Controls Designed</div>
        <div style="font-size:26px;font-weight:800;color:#166534;">${designedControls.length}</div>
        <div style="font-size:10px;color:#166534;opacity:0.7;">of ${controls.length} assigned</div>
      </div>
      <div style="background:${withReqs>0?'#f0fdf4':'#f8fafc'};border:1px solid ${withReqs>0?'#86efac':'var(--border)'};border-radius:10px;padding:14px 16px;border-left:3px solid ${withReqs>0?'#166534':'#94a3b8'};">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${withReqs>0?'#166534':'#64748b'};">Requirements Defined</div>
        <div style="font-size:26px;font-weight:800;color:${withReqs>0?'#166534':'#64748b'};">${withReqs}</div>
        <div style="font-size:10px;color:${withReqs>0?'#166534':'#64748b'};opacity:0.7;">controls with asset owner reqs</div>
      </div>
      <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;border-left:3px solid #1d4ed8;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1d4ed8;">Asset Types in Scope</div>
        <div style="font-size:26px;font-weight:800;color:#1d4ed8;">${uniqueTypes}</div>
        <div style="font-size:10px;color:#1d4ed8;opacity:0.7;">unique types across all controls</div>
      </div>
    </div>

      <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#92400e;">
      <strong>💡 Design intent:</strong> You are defining implementation obligations, not attesting compliance. Asset owners will later attest in their own workspace using the requirements/evidence expectations you define here.
    </div>

    <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:16px;flex-wrap:wrap;width:fit-content;">
      ${[['all','All Controls',designedControls.length]].concat(allFams.map(f => [f, f + ' — ' + (FAMILIES[f]||f), designedControls.filter(c=>c.f===f).length])).map(([val,label,count]) =>
        `<button onclick="state._ctrlStep3Filter='${val}';renderControlStep3();" style="padding:7px 14px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:${filter===val?'var(--navy)':'white'};color:${filter===val?'white':'var(--text-muted)'};border-right:1px solid var(--border);">${label} <span style="background:${filter===val?'rgba(255,255,255,0.2)':'#e2e8f0'};border-radius:99px;padding:1px 7px;font-size:10px;margin-left:4px;">${count}</span></button>`
      ).join('')}
    </div>

    <div id="ctrlStep3List">
      ${shown.map(c => {
        normalizeControlDesignState(c.id);
        const cs       = state.controlStatus[c.id] || {};
        const covTypes = getCtrlCoveredAssetTypes(c.id);
        const pReqs    = getControlPolicyReqs(c.id);
        const existing = cs.assetOwnerRequirements || [];
        const cid      = c.id.replace(/'/g,"\\'");

        const typeBlocks = covTypes.length > 0 ? covTypes.map(t => {
          const req   = existing.find(r => r.assetType === t.label) || { assetType: t.label, requirement: '', evidenceNeeded: '', acceptanceCriteria: '' };
          const tlabel = escapeHTML(t.label).replace(/'/g,"\\'");
          return `<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:10px;">
            <div style="background:#f8fafc;padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--navy);">📦 ${escapeHTML(t.label)}</div>
            <div style="padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label class="form-label" style="font-size:10px;">Required implementation actions <span class="required">*</span></label>
                <textarea class="form-input" rows="3" style="font-size:11px;line-height:1.6;resize:vertical;" placeholder="e.g. Review all service accounts quarterly, revoke stale accounts, and document manager approval before reactivation." oninput="setAssetOwnerReq('${cid}','${tlabel}','requirement',this.value)">${escapeHTML(req.requirement||'')}</textarea>
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Required evidence artifacts</label>
                <textarea class="form-input" rows="3" style="font-size:11px;line-height:1.6;resize:vertical;" placeholder="e.g. Signed review report, identity export with timestamps, workflow ticket showing approver and closure." oninput="setAssetOwnerReq('${cid}','${tlabel}','evidenceNeeded',this.value)">${escapeHTML(req.evidenceNeeded||'')}</textarea>
              </div>
              <div style="grid-column:1 / -1;">
                <label class="form-label" style="font-size:10px;">Evidence acceptance criteria</label>
                <textarea class="form-input" rows="2" style="font-size:11px;line-height:1.6;resize:vertical;" placeholder="e.g. Must be from current quarter, include asset owner + approver names, and show closure of all exceptions." oninput="setAssetOwnerReq('${cid}','${tlabel}','acceptanceCriteria',this.value)">${escapeHTML(req.acceptanceCriteria||'')}</textarea>
              </div>
            </div>
          </div>`;
        }).join('') : `
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">
          <div style="background:#f8fafc;padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--navy);">General Compliance Requirements <span style="font-size:10px;font-weight:400;color:#d97706;">(no asset types identified — go to Step 2 to set asset coverage)</span></div>
          <div style="padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label class="form-label" style="font-size:10px;">Required implementation actions</label>
              <textarea class="form-input" rows="3" style="font-size:11px;line-height:1.6;resize:vertical;" placeholder="Describe compliance requirements for all asset owners…" oninput="setAssetOwnerReq('${cid}','General','requirement',this.value)">${escapeHTML((existing.find(r=>r.assetType==='General')||{}).requirement||'')}</textarea>
            </div>
            <div>
              <label class="form-label" style="font-size:10px;">Required evidence artifacts</label>
              <textarea class="form-input" rows="3" style="font-size:11px;line-height:1.6;resize:vertical;" placeholder="What evidence or documentation is needed to prove compliance…" oninput="setAssetOwnerReq('${cid}','General','evidenceNeeded',this.value)">${escapeHTML((existing.find(r=>r.assetType==='General')||{}).evidenceNeeded||'')}</textarea>
            </div>
            <div style="grid-column:1 / -1;">
              <label class="form-label" style="font-size:10px;">Evidence acceptance criteria</label>
              <textarea class="form-input" rows="2" style="font-size:11px;line-height:1.6;resize:vertical;" placeholder="Define what makes evidence acceptable for review." oninput="setAssetOwnerReq('${cid}','General','acceptanceCriteria',this.value)">${escapeHTML((existing.find(r=>r.assetType==='General')||{}).acceptanceCriteria||'')}</textarea>
            </div>
          </div>
        </div>`;

        return `<div style="background:white;border:1px solid var(--border);border-radius:10px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#fafbfc;padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
            <span class="control-id">${c.id}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:var(--navy);">${escapeHTML(c.n)}</div>
              ${covTypes.length > 0
                ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${covTypes.map(t=>escapeHTML(t.label)).join(' · ')}</div>`
                : `<div style="font-size:11px;color:#d97706;margin-top:2px;">⚠ No asset types identified — set coverage in Step 2</div>`}
            </div>
            ${chipHTML(cs.status||'Not Started')}
          </div>
          <div style="padding:16px 18px;">
            ${pReqs.length > 0 ? `<div style="background:#faf5ff;border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#6366f1;"><strong>Policy reqs:</strong> ${pReqs.map(r=>escapeHTML(r.reqId)).join(', ')} — ${escapeHTML(pReqs[0].policyTitle)}</div>` : ''}
            ${typeBlocks}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function setAssetOwnerReq(ctrlId, assetTypeLabel, field, value) {
  normalizeControlDesignState(ctrlId);
  if (!state.controlStatus[ctrlId]) state.controlStatus[ctrlId] = {};
  const reqs = state.controlStatus[ctrlId].assetOwnerRequirements;
  let existing = reqs.find(r => r.assetType === assetTypeLabel);
  var prev = existing ? existing[field] : undefined;
  if (existing) {
    existing[field] = value;
  } else {
    const newReq = { assetType: assetTypeLabel, requirement: '', evidenceNeeded: '', acceptanceCriteria: '' };
    newReq[field] = value;
    reqs.push(newReq);
  }
  logFieldChange('controlStatus.' + ctrlId + '.assetOwnerReq:' + assetTypeLabel + ':' + field, prev, value);
  markDirty();
}

function getControlOwnerGuidanceForScope(ctrlId, scopeLabel) {
  normalizeControlDesignState(ctrlId);
  var cs = state.controlStatus[ctrlId] || {};
  var reqs = cs.assetOwnerRequirements || [];
  var exact = reqs.find(function(r) { return r.assetType === scopeLabel; });
  var general = reqs.find(function(r) { return r.assetType === 'General'; });
  var selected = exact || general || reqs[0] || null;
  if (!selected) {
    return {
      actions: (cs.assetGuidance || '').trim(),
      evidence: '',
      criteria: ''
    };
  }
  return {
    actions: selected.requirement || '',
    evidence: selected.evidenceNeeded || '',
    criteria: selected.acceptanceCriteria || ''
  };
}

function buildGuidanceFromControlOwner(ctrlId, scopeLabel) {
  var g = getControlOwnerGuidanceForScope(ctrlId, scopeLabel);
  var hasAny = (g.actions || '').trim() || (g.evidence || '').trim() || (g.criteria || '').trim();
  if (!hasAny) {
    return '<em style="color:#86efac;">No requirements defined yet by control owner in Control Wizard Step 3.</em>';
  }
  var html = '';
  if ((g.actions || '').trim()) {
    html += '<div style="margin-bottom:6px;"><strong>Required actions:</strong> ' + _esc(g.actions) + '</div>';
  }
  if ((g.evidence || '').trim()) {
    html += '<div style="margin-bottom:6px;"><strong>Required evidence:</strong> ' + _esc(g.evidence) + '</div>';
  }
  if ((g.criteria || '').trim()) {
    html += '<div><strong>Acceptance criteria:</strong> ' + _esc(g.criteria) + '</div>';
  }
  return html;
}

// ── STEP 4: REVIEW & SUBMIT DESIGN ───────────────────────────────────────────
function renderControlStep4() {
  const body = document.getElementById('control-step-4-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">🏛️</div><div class="es-title">CISO Setup Required</div></div>`;
    return;
  }
  const controls = getScopedControls().filter(c =>
    !(state.controlStatus[c.id]||{}).returnedToPolicyOwner &&
    !(state.controlStatus[c.id]||{}).recommendedDeselect
  );
  if (!state._controlSubmitSelection) state._controlSubmitSelection = {};
  controls.forEach(function(c) {
    if (state._controlSubmitSelection[c.id] === undefined) {
      const st = (state.controlStatus[c.id] || {}).status || 'Not Started';
      state._controlSubmitSelection[c.id] = st !== 'Not Started';
    }
  });
  const submitEligibleControls = controls.filter(c => ((state.controlStatus[c.id]||{}).status || 'Not Started') !== 'Not Started');
  const selectedForSubmit = submitEligibleControls.filter(c => !!state._controlSubmitSelection[c.id]);
  const notStartedCount = controls.length - submitEligibleControls.length;
  const families = [...new Set(controls.map(c=>c.f))];

  const isDesigned = c => isControlDesigned(c.id);
  const designedControls = controls.filter(isDesigned);
  const withReqs   = controls.filter(c => getControlRequirementCoverage(c).satisfiedCount > 0);
  const fullyMappedReqs = controls.filter(c => {
    const cov = getControlRequirementCoverage(c);
    return cov.targetCount > 0 && cov.satisfiedCount >= cov.targetCount;
  });
  const withCriteria = controls.filter(c => getControlRequirementCoverage(c).criteriaCount > 0);
  const withStatus = controls.filter(c => { const st=(state.controlStatus[c.id]||{}).status; return st && st!=='Not Started'; });
  const cnt = {
    Implemented:      controls.filter(c=>(state.controlStatus[c.id]||{}).status==='Implemented').length,
    'In Progress':    controls.filter(c=>(state.controlStatus[c.id]||{}).status==='In Progress').length,
    Planned:          controls.filter(c=>(state.controlStatus[c.id]||{}).status==='Planned').length,
    'Not Applicable': controls.filter(c=>(state.controlStatus[c.id]||{}).status==='Not Applicable').length,
    'Not Started':    controls.filter(c=>!(state.controlStatus[c.id]||{}).status||(state.controlStatus[c.id]||{}).status==='Not Started').length,
  };
  const returnedCount  = getScopedControls().filter(c=>(state.controlStatus[c.id]||{}).returnedToPolicyOwner).length;
  const deselectCount  = getScopedControls().filter(c=>(state.controlStatus[c.id]||{}).recommendedDeselect).length;
  const pctDesigned    = controls.length ? Math.round((designedControls.length/controls.length)*100) : 0;

  body.innerHTML = `
    <div class="section-title">Review &amp; Submit Design</div>
    <div class="section-subtitle">Review your control design documentation before submitting to the policy owner for review. This is a <em>design submission</em> — not a compliance attestation. Asset owners submit compliance evidence separately in the Assets &amp; SSP workspace.</div>

    <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#1e40af;">
      <strong>📌 What you're submitting:</strong> A design-only package: policy/NIST-aligned control design, scoped assets/processes, and required implementation/evidence expectations for asset and process owners.
    </div>

    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px;">
      ${[
        ['In Queue',       controls.length,          'var(--navy)', '#eff6ff'],
        ['Design Done',    designedControls.length,  '#166534',     '#f0fdf4'],
        ['Reqs Defined',   withReqs.length,           '#6366f1',     '#faf5ff'],
        ['Req Mapping',    fullyMappedReqs.length,    '#0f766e',     '#f0fdfa'],
        ['Status Set',     withStatus.length,         '#d97706',     '#fffbeb'],
      ].map(([label,count,color,bg]) => `
        <div style="background:${bg};border:1px solid ${color}22;border-radius:10px;padding:14px 16px;border-left:3px solid ${color};">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};">${label}</div>
          <div style="font-size:28px;font-weight:800;color:${color};line-height:1.1;margin-top:4px;">${count}</div>
          <div style="font-size:10px;color:${color};opacity:0.7;margin-top:2px;">of ${controls.length} controls</div>
        </div>`).join('')}
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600;color:var(--navy);">Design Completion</div>
        <div style="font-size:13px;font-weight:700;color:var(--teal);">${pctDesigned}%</div>
      </div>
      <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;margin-bottom:10px;">
        <div style="background:${pctDesigned===100?'#166534':'var(--teal)'};height:100%;width:${pctDesigned}%;border-radius:99px;transition:width 0.3s;"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--text-muted);">
        <div>✅ <strong>${designedControls.length}</strong> controls with design documented</div>
        <div>📝 <strong>${withReqs.length}</strong> controls with downstream requirements</div>
        <div>🔗 <strong>${fullyMappedReqs.length}</strong> controls mapped across scoped asset types</div>
        <div>🧪 <strong>${withCriteria.length}</strong> controls with evidence acceptance criteria</div>
        ${returnedCount > 0 ? `<div>↩ <strong>${returnedCount}</strong> returned to policy owner</div>` : ''}
        ${deselectCount > 0 ? `<div>✗ <strong>${deselectCount}</strong> proposed for de-selection</div>` : ''}
      </div>
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--navy);margin-bottom:14px;">Before You Submit</div>
      ${[
        [designedControls.length > 0,         'At least one control has a design documented',         'Go to Step 2 to document control designs'],
        [designedControls.length===controls.length, 'All controls have design documentation',          designedControls.length + ' of ' + controls.length + ' documented — ' + (controls.length-designedControls.length) + ' still need design in Step 2'],
        [withStatus.length===controls.length,  'All controls have implementation status set',      withStatus.length + ' of ' + controls.length + ' have status set'],
        [withReqs.length > 0,                  'Downstream requirements/evidence are defined',          'Go to Step 3 to define required actions and evidence'],
        [fullyMappedReqs.length===controls.length, 'Requirements are mapped for each scoped asset type/process', fullyMappedReqs.length + ' of ' + controls.length + ' fully mapped'],
      ].map(([ok,label,hint]) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="font-size:16px;flex-shrink:0;margin-top:1px;">${ok?'✅':'⚠️'}</div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:600;color:var(--navy);">${label}</div>
            ${!ok ? `<div style="font-size:11px;color:#d97706;margin-top:2px;">${hint}</div>` : ''}
          </div>
        </div>`
      ).join('')}
      <div style="font-size:11px;color:var(--text-muted);padding-top:8px;">You can submit with incomplete items; policy owner and CISO reviewers will see QA gaps in this summary.</div>
    </div>

    <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--border);">Design Summary by Family</div>
    ${families.map(fam => {
      const fc   = controls.filter(c=>c.f===fam);
      const fd   = fc.filter(isDesigned);
      const fpct = fc.length ? Math.round(fd.length/fc.length*100) : 0;
      return `<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden;">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fafbfc;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <span class="family-badge">${fam}</span>
          <div style="flex:1;"><div style="font-size:13px;font-weight:600;color:var(--navy);">${FAMILIES[fam]||fam}</div><div style="font-size:11px;color:var(--text-muted);">${fc.length} controls · ${fd.length} designed</div></div>
          <div style="display:flex;align-items:center;gap:8px;"><div style="width:80px;background:#e2e8f0;border-radius:99px;height:5px;overflow:hidden;"><div style="background:${fpct===100?'#166534':'var(--teal)'};height:100%;width:${fpct}%;border-radius:99px;"></div></div><div style="font-size:12px;font-weight:700;color:${fpct===100?'#166534':'var(--navy)'};width:36px;text-align:right;">${fpct}%</div></div>
          <span style="font-size:14px;flex-shrink:0;">▼</span>
        </div>
        <div style="display:none;padding:0 16px 12px;">
          <table class="control-table" style="margin-top:8px;">
            <thead><tr><th style="width:80px;">Control</th><th>Name</th><th style="width:130px;">Status</th><th style="width:80px;">Design</th><th style="width:80px;">Reqs</th><th style="width:80px;">Criteria</th></tr></thead>
            <tbody>${fc.map(c => {
              const cs = state.controlStatus[c.id]||{};
              const hd = isDesigned(c);
              const cov = getControlRequirementCoverage(c);
              const hr = cov.targetCount > 0 && cov.satisfiedCount >= cov.targetCount;
              const hc = cov.criteriaCount > 0;
              return `<tr><td><span class="control-id">${c.id}</span></td><td style="font-size:12px;">${escapeHTML(c.n)}</td><td>${chipHTML(cs.status||'Not Started')}</td><td style="text-align:center;">${hd?'<span style="color:#166534;font-size:15px;">✓</span>':'<span style="color:#d97706;font-size:11px;">—</span>'}</td><td style="text-align:center;">${hr?'<span style="color:#166534;font-size:15px;">✓</span>':'<span style="color:var(--text-muted);font-size:11px;">—</span>'}</td><td style="text-align:center;">${hc?'<span style="color:#0f766e;font-size:15px;">✓</span>':'<span style="color:var(--text-muted);font-size:11px;">—</span>'}</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`;
    }).join('')}

    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-top:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:700;color:var(--navy);">Select Controls to Submit for Review</div>
        <div style="font-size:11px;color:var(--text-muted);">${selectedForSubmit.length} selected of ${submitEligibleControls.length} eligible</div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">Controls with status <strong>Not Started</strong> are excluded from submission by default and cannot be submitted.</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button class="btn btn-secondary btn-sm" onclick="setAllControlSubmitSelections(true)">Select all eligible</button>
        <button class="btn btn-secondary btn-sm" onclick="setAllControlSubmitSelections(false)">Clear selection</button>
      </div>
      <div class="table-scroll">
        <table class="control-table">
          <thead><tr><th style="width:42px;"></th><th style="width:90px;">Control</th><th>Name</th><th style="width:130px;">Status</th><th style="width:90px;">Design</th></tr></thead>
          <tbody>
            ${controls.map(c => {
              const st = (state.controlStatus[c.id] || {}).status || 'Not Started';
              const canSubmit = st !== 'Not Started';
              const checked = canSubmit && !!state._controlSubmitSelection[c.id];
              return `<tr>
                <td><input type="checkbox" ${checked ? 'checked' : ''} ${canSubmit ? '' : 'disabled'} onchange="setControlSubmitSelection('${c.id.replace(/'/g,"\\'")}',this.checked)" style="accent-color:var(--teal);"></td>
                <td><span class="control-id">${c.id}</span></td>
                <td style="font-size:12px;color:var(--navy);">${escapeHTML(c.n)}</td>
                <td>${chipHTML(st)}</td>
                <td style="font-size:11px;color:${isDesigned(c)?'#166534':'#d97706'};font-weight:700;">${isDesigned(c)?'Ready':'Missing'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${notStartedCount ? `<div style="font-size:11px;color:#b45309;margin-top:8px;">${notStartedCount} control${notStartedCount===1?'':'s'} are Not Started and excluded.</div>` : ''}
    </div>

    <div style="background:white;border:2px solid var(--navy);border-radius:12px;padding:24px;margin-top:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:20px;">📤</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--navy);">Submit Design for Policy Owner Review</div>
          <div style="font-size:12px;color:var(--text-muted);">Your design package is routed for review. Asset-owner attestation remains separate in Assets &amp; SSP.</div>
        </div>
      </div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--text-muted);">
        Submitter is captured from your active user profile: <strong>${escapeHTML(((state.users||[]).find(u=>u.id===state.currentUserId)||{}).name || 'Current user')}</strong>.
      </div>
      <div style="margin-bottom:14px;">
        <label class="form-label" style="font-size:11px;">Notes for Policy Owner (optional)</label>
        <textarea class="form-input" id="designSubmitNotes" rows="2" style="font-size:12px;resize:vertical;" placeholder="Any context, caveats, or open items the policy owner should be aware of…">${escapeHTML(state.controlDesignSubmission?.notes||'')}</textarea>
      </div>
      ${state.controlDesignSubmission?.submittedAt ? `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#166534;">
        ✅ Last submitted: ${state.controlDesignSubmission.submittedAt} by ${escapeHTML(state.controlDesignSubmission.submitterName||'—')} — ${state.controlDesignSubmission.designedCount} of ${state.controlDesignSubmission.totalCount} controls designed.
      </div>` : ''}
    </div>`;
}

function submitControlDesign() {
  if (blockActionIfDemoPlaceholders()) return;
  clearScopedUndoStack('control design submit');
  const currentUser = state.currentUserId ? (state.users||[]).find(u=>u.id===state.currentUserId) : null;
  const name = (currentUser && currentUser.name) ? currentUser.name : 'Control Owner';
  const title = (currentUser && currentUser.title) ? currentUser.title : '';
  const notes = document.getElementById('designSubmitNotes')?.value.trim() || '';

  const controls = getScopedControls().filter(c =>
    !(state.controlStatus[c.id]||{}).returnedToPolicyOwner &&
    !(state.controlStatus[c.id]||{}).recommendedDeselect
  );
  const submitEligibleControls = controls.filter(c => ((state.controlStatus[c.id]||{}).status || 'Not Started') !== 'Not Started');
  const selectedControls = submitEligibleControls.filter(c => !!(state._controlSubmitSelection || {})[c.id]);
  if (!selectedControls.length) {
    showToast('Select at least one eligible control to submit. Not Started controls are excluded.', true);
    return;
  }
  const designedControls = controls.filter(c => isControlDesigned(c.id));
  const fullyMappedReqs = controls.filter(c => {
    const cov = getControlRequirementCoverage(c);
    return cov.targetCount > 0 && cov.satisfiedCount >= cov.targetCount;
  });

  const myControls  = currentUser ? selectedControls.filter(c=>(state.controlOwners[c.id]||{}).name===currentUser.name) : selectedControls;
  const famsInvolved = [...new Set(myControls.map(c=>c.f).filter(Boolean))];
  const policyOwnerNames = [...new Set(famsInvolved.map(fam=>(state.domainOwners[fam]||{}).name).filter(Boolean))];
  const recipientLabel = policyOwnerNames.length ? policyOwnerNames.join(', ') : 'Policy Owner';

  state.controlDesignSubmission = {
    submitterName: name, submitterTitle: title, notes: notes,
    submittedAt: new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    designedCount: designedControls.length, totalCount: controls.length,
    fullyMappedReqCount: fullyMappedReqs.length, submittedControlCount: selectedControls.length,
    timestamp: Date.now(), routedTo: policyOwnerNames,
  };

  if (!state.controlReviewQueue) state.controlReviewQueue = [];
  myControls.forEach(function(c) {
    const ex = state.controlReviewQueue.find(r=>r.controlId===c.id);
    if (ex) { ex.status='Design Submitted'; ex.submittedAt=new Date().toISOString(); ex.submittedBy=name; }
    else state.controlReviewQueue.push({ controlId:c.id, family:c.f, policyOwner:(state.domainOwners[c.f]||{}).name||'', submittedBy:name, submittedAt:new Date().toISOString(), status:'Design Submitted' });
  });

  addAuditEntry('control', null, 'Control design submitted by ' + name + ': ' + selectedControls.length + ' selected for review (' + designedControls.length + '/' + controls.length + ' designed, ' + fullyMappedReqs.length + '/' + controls.length + ' fully mapped), routed to ' + recipientLabel);
  showToast('✅ Submitted ' + selectedControls.length + ' selected control' + (selectedControls.length===1?'':'s') + ' to ' + recipientLabel + '.');
  markDirty();
  renderControlStep4();
}

function setControlSubmitSelection(ctrlId, checked) {
  if (!state._controlSubmitSelection) state._controlSubmitSelection = {};
  const st = (state.controlStatus[ctrlId] || {}).status || 'Not Started';
  if (st === 'Not Started') {
    state._controlSubmitSelection[ctrlId] = false;
    showToast('Not Started controls cannot be submitted.', true);
  } else {
    state._controlSubmitSelection[ctrlId] = !!checked;
  }
  markDirty();
  renderControlStep4();
}

function setAllControlSubmitSelections(checked) {
  if (!state._controlSubmitSelection) state._controlSubmitSelection = {};
  const controls = getScopedControls().filter(c =>
    !(state.controlStatus[c.id]||{}).returnedToPolicyOwner &&
    !(state.controlStatus[c.id]||{}).recommendedDeselect
  );
  controls.forEach(function(c) {
    const st = (state.controlStatus[c.id] || {}).status || 'Not Started';
    state._controlSubmitSelection[c.id] = st === 'Not Started' ? false : !!checked;
  });
  markDirty();
  renderControlStep4();
}

// Stub retained for backward compatibility (referenced by old snapshots)
function submitControlImplementation() { submitControlDesign(); }
function updateCtrlSubmitBtn() {}
function saveAttestDraft() {}

function setControlField(id, field, value) {
  if (!state.controlStatus[id]) state.controlStatus[id] = {};
  state.controlStatus[id][field] = value;
}

// ============================================================
// ASSET OWNER TAB
// ============================================================
// ─── ASSET TYPES ─────────────────────────────────────────────────────────────
// 2-tier hierarchy. Coverage stored as named keys (e.g. 'app_saas', 'infra_cloud_iaas').
const ASSET_TYPES = [
  { category: 'Application', types: [
    { key: 'app_internal_ext',   label: 'Internally Developed (Internet-Facing)' },
    { key: 'app_internal_int',   label: 'Internally Developed (Internal/Intranet)' },
    { key: 'app_cots_ext',       label: 'COTS (Internet-Facing)' },
    { key: 'app_cots_int',       label: 'COTS (Internal/Intranet)' },
    { key: 'app_saas',           label: 'SaaS' },
  ]},
  { category: 'Infrastructure', types: [
    { key: 'infra_onprem',       label: 'On-Prem Server' },
    { key: 'infra_network',      label: 'Network Device' },
    { key: 'infra_cloud_iaas',   label: 'Cloud IaaS' },
    { key: 'infra_cloud_paas',   label: 'Cloud PaaS' },
    { key: 'infra_storage',      label: 'Storage / Data Store' },
  ]},
  { category: 'Endpoint', types: [
    { key: 'endpoint_windows',   label: 'Workstation (Windows)' },
    { key: 'endpoint_mac_linux', label: 'Workstation (macOS/Linux)' },
    { key: 'endpoint_mobile',    label: 'Mobile Device' },
    { key: 'endpoint_vdi',       label: 'Virtual Desktop (VDI)' },
  ]},
  { category: 'Identity & Credential', types: [
    { key: 'iam_idp',            label: 'Identity Provider / SSO' },
    { key: 'iam_service_acct',   label: 'Service Account / Non-human Identity' },
  ]},
  { category: 'Development & Operations', types: [
    { key: 'devops_cicd',        label: 'CI/CD Pipeline' },
    { key: 'devops_repo',        label: 'Code Repository' },
    { key: 'devops_container',   label: 'Container Orchestration (Kubernetes)' },
  ]},
];
const SSP_STATUSES = ['Complies','Partially Complies','Does Not Comply','Not Applicable','Inherited'];
const SSP_STATUS_COLORS = {'Complies':'var(--green)','Partially Complies':'var(--amber)','Does Not Comply':'var(--red)','Not Applicable':'var(--slate)','Inherited':'var(--blue)'};

// Process categories — each maps to a set of control families for SSP coverage
const PROCESS_CATEGORIES = [
  { id:'risk-mgmt',     label:'Risk Management',                    families:['RA','CA','PL'] },
  { id:'vuln-mgmt',     label:'Vulnerability Management',           families:['RA','SI','CA'] },
  { id:'iam',           label:'Identity & Access Management',       families:['AC','IA','PS'] },
  { id:'config-change', label:'Configuration & Change Management',  families:['CM','SA','MA'] },
  { id:'supply-chain',  label:'Third-Party / Supply Chain Mgmt',    families:['SA','SR','CA'] },
  { id:'incident-resp', label:'Incident Response',                  families:['IR','AU','SI'] },
  { id:'bcp',           label:'Business Continuity & Contingency',  families:['CP','MA','PE'] },
  { id:'awareness',     label:'Security Awareness & Training',      families:['AT','PS','PL'] },
];

function userCanApproveAssetTypeRequests() {
  if (!state.currentUserId) return true; // admin mode
  var user = (state.users || []).find(function(u) { return u.id === state.currentUserId; });
  if (!user) return false;
  var personIds = state._currentPersonIds || [user.id];
  var roleSet = [];
  personIds.forEach(function(pid) {
    var rec = (state.users || []).find(function(u) { return u.id === pid; });
    if (!rec) return;
    var recRoles = (rec.roles && rec.roles.length) ? rec.roles : [rec.role];
    recRoles.forEach(function(r) { if (r && roleSet.indexOf(r) === -1) roleSet.push(r); });
  });
  if (roleSet.indexOf('ciso') !== -1) return true;
  return (user.name || '').trim().toLowerCase() === (state.programOwner || '').trim().toLowerCase();
}

function ensureAssetTypeMetadata() {
  if (!state.customAssetTypeGroups) state.customAssetTypeGroups = {};
  if (!state.customAssetTypeHeaders) state.customAssetTypeHeaders = [];
  if (!state.removedBuiltInAssetTypeKeys) state.removedBuiltInAssetTypeKeys = [];
  if (!state.removedBuiltInAssetTypeGroups) state.removedBuiltInAssetTypeGroups = [];
  (state.customAssetTypes || []).forEach(function(t) {
    if (!state.customAssetTypeGroups[t]) state.customAssetTypeGroups[t] = 'Custom';
  });
  Object.keys(state.customAssetTypeGroups).forEach(function(t) {
    if (!(state.customAssetTypes || []).includes(t)) delete state.customAssetTypeGroups[t];
  });
  var builtInKeys = [];
  ASSET_TYPES.forEach(function(cat) {
    cat.types.forEach(function(t) { builtInKeys.push(t.key); });
  });
  state.removedBuiltInAssetTypeKeys = (state.removedBuiltInAssetTypeKeys || []).filter(function(k) {
    return builtInKeys.indexOf(k) !== -1;
  });
  var builtInGroups = ASSET_TYPES.map(function(cat) { return cat.category; });
  state.removedBuiltInAssetTypeGroups = (state.removedBuiltInAssetTypeGroups || []).filter(function(g) {
    return builtInGroups.indexOf(g) !== -1;
  });
}

function findBuiltInAssetType(typeName) {
  var name = String(typeName || '').trim().toLowerCase();
  if (!name) return null;
  for (var i = 0; i < ASSET_TYPES.length; i++) {
    for (var j = 0; j < ASSET_TYPES[i].types.length; j++) {
      var t = ASSET_TYPES[i].types[j];
      if (String(t.label || '').trim().toLowerCase() === name) {
        return { category: ASSET_TYPES[i].category, key: t.key, label: t.label };
      }
    }
  }
  return null;
}

function getActiveAssetTypeCatalog() {
  ensureAssetTypeMetadata();
  var removed = state.removedBuiltInAssetTypeKeys || [];
  return ASSET_TYPES.map(function(cat) {
    return {
      category: cat.category,
      types: cat.types.filter(function(t) { return removed.indexOf(t.key) === -1; })
    };
  }).filter(function(cat) { return cat.types.length > 0; });
}

function getAllAssetTypeGroups() {
  ensureAssetTypeMetadata();
  var removedBuiltInGroups = state.removedBuiltInAssetTypeGroups || [];
  var standard = ASSET_TYPES.map(function(cat) { return cat.category; }).filter(function(g) {
    return removedBuiltInGroups.indexOf(g) === -1;
  });
  var customHeaders = (state.customAssetTypeHeaders || []).filter(function(h){ return h && h.trim(); });
  var fromTypes = Object.values(state.customAssetTypeGroups || {}).filter(function(h){ return h && h.trim(); });
  var all = standard.concat(customHeaders).concat(fromTypes).concat(['Custom']);
  return all.filter(function(v, i, arr){ return arr.indexOf(v) === i; });
}

function applyAssetTypeAdd(typeName, groupName) {
  var name = (typeName || '').trim();
  if (!name) return false;
  ensureAssetTypeMetadata();
  var builtIn = findBuiltInAssetType(name);
  if (builtIn) {
    var removedIdx = (state.removedBuiltInAssetTypeKeys || []).indexOf(builtIn.key);
    if (removedIdx === -1) return false;
    state.removedBuiltInAssetTypeKeys.splice(removedIdx, 1);
    state.removedBuiltInAssetTypeGroups = (state.removedBuiltInAssetTypeGroups || []).filter(function(g) {
      return g !== builtIn.category;
    });
    return true;
  }
  var all = getAllAssetTypes().map(function(t){ return String(t).toLowerCase(); });
  if (all.indexOf(name.toLowerCase()) !== -1) return false;
  if (!state.customAssetTypes) state.customAssetTypes = [];
  state.customAssetTypes.push(name);
  state.customAssetTypeGroups[name] = (groupName || 'Custom').trim() || 'Custom';
  return true;
}

function applyAssetTypeDelete(typeName) {
  var name = (typeName || '').trim();
  if (!name) return false;
  ensureAssetTypeMetadata();
  var wasRemoved = false;
  var customIdx = (state.customAssetTypes || []).indexOf(name);
  if (customIdx !== -1) {
    state.customAssetTypes = (state.customAssetTypes || []).filter(function(t){ return t !== name; });
    delete state.customAssetTypeGroups[name];
    wasRemoved = true;
  } else {
    var builtIn = findBuiltInAssetType(name);
    if (!builtIn) return false;
    if ((state.removedBuiltInAssetTypeKeys || []).indexOf(builtIn.key) !== -1) return false;
    state.removedBuiltInAssetTypeKeys.push(builtIn.key);
    wasRemoved = true;
    Object.keys(state.controlStatus || {}).forEach(function(cid) {
      if (state.controlStatus[cid] && state.controlStatus[cid].assetCoverage) {
        delete state.controlStatus[cid].assetCoverage[builtIn.key];
      }
    });
  }
  Object.keys(state.controlStatus || {}).forEach(function(cid) {
    if (state.controlStatus[cid] && state.controlStatus[cid].assetCoverage) {
      delete state.controlStatus[cid].assetCoverage['custom_' + name];
    }
  });
  return wasRemoved;
}

function applyAssetTypeChangeDirect(action, typeName, reason, groupName) {
  if (!userCanApproveAssetTypeRequests()) { showToast('Only admin/program owner can edit asset types directly.', true); return; }
  var cleanType = (typeName || '').trim();
  var cleanReason = (reason || '').trim();
  var normalizedAction = action === 'delete' ? 'delete' : 'add';
  if (!cleanType) { showToast('Asset type name is required.', true); return; }
  if (!cleanReason) { showToast('Please provide rationale for audit traceability.', true); return; }
  var changed = normalizedAction === 'add' ? applyAssetTypeAdd(cleanType, groupName) : applyAssetTypeDelete(cleanType);
  if (!changed) { showToast('No change applied (already exists or already removed).', true); return; }
  addAuditEntry('program', 'asset-types', 'Asset type ' + normalizedAction + ' approved directly by ' + getCurrentActorName() + ' for "' + cleanType + '": ' + cleanReason);
  markDirty();
  showToast('Asset type ' + (normalizedAction === 'add' ? 'added' : 'removed') + '.');
  renderAssetTypeLibrary();
}

function removeAssetTypeHeader(headerName) {
  var clean = (headerName || '').trim();
  if (!clean) return;
  if (clean === 'Custom') { showToast('The "Custom" header cannot be removed.', true); return; }
  ensureAssetTypeMetadata();
  var hasAssignedCustomTypes = Object.keys(state.customAssetTypeGroups || {}).some(function(k) {
    return (state.customAssetTypes || []).indexOf(k) !== -1 && state.customAssetTypeGroups[k] === clean;
  });
  var hasAssignedBuiltInTypes = getActiveAssetTypeCatalog().some(function(cat) {
    return cat.category === clean && cat.types.length > 0;
  });
  if (hasAssignedCustomTypes || hasAssignedBuiltInTypes) {
    showToast('Cannot delete this header while asset types are assigned to it. Reassign or remove those types first.', true);
    return;
  }
  var isBuiltInGroup = ASSET_TYPES.some(function(cat){ return cat.category === clean; });
  if (isBuiltInGroup) {
    if ((state.removedBuiltInAssetTypeGroups || []).indexOf(clean) === -1) {
      state.removedBuiltInAssetTypeGroups.push(clean);
    }
  } else {
    state.customAssetTypeHeaders = (state.customAssetTypeHeaders || []).filter(function(h){ return h !== clean; });
  }
  markDirty();
  renderAssetTypeLibrary();
}

function submitAssetTypeRequest(action, typeName, reason, groupName) {
  var normalizedAction = action === 'delete' ? 'delete' : 'add';
  var cleanType = (typeName || '').trim();
  var cleanReason = (reason || '').trim();
  var groupNameInput = groupName || (document.getElementById('assetTypeReqGroup') || {}).value || 'Custom';
  var cleanGroup = (groupNameInput || 'Custom').trim() || 'Custom';
  if (!cleanType) { showToast('Asset type name is required.', true); return; }
  if (!cleanReason) { showToast('Please provide a rationale for audit purposes.', true); return; }
  if (!state.assetTypeRequests) state.assetTypeRequests = [];
  var actor = getCurrentActorName();
  var request = {
    id: 'atr_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    action: normalizedAction,
    typeName: cleanType,
    groupName: cleanGroup,
    reason: cleanReason,
    requestedBy: actor,
    requestedAt: new Date().toISOString(),
    status: 'Pending',
    reviewedBy: '',
    reviewedAt: '',
    reviewReason: ''
  };
  state.assetTypeRequests.push(request);
  addAuditEntry('program', 'asset-types', 'Asset type ' + normalizedAction + ' requested by ' + actor + ' for "' + cleanType + '"' + (normalizedAction === 'add' ? ' in group "' + cleanGroup + '"' : '') + ': ' + cleanReason);
  markDirty();
  showToast('Asset type ' + normalizedAction + ' request submitted for program owner approval.');
  renderAssetTypeLibrary();
}

function requestOrApplyAssetTypeChange(action, typeName, defaultGroupName) {
  var cleanType = (typeName || '').trim();
  if (!cleanType) { showToast('Asset type name is required.', true); return; }
  var reasonPrompt = action === 'delete'
    ? 'Deletion rationale (required for audit trail):'
    : 'Rationale for adding/restoring this type (required):';
  var reason = window.prompt(reasonPrompt, '');
  if (!reason || !reason.trim()) {
    showToast('Rationale is required.', true);
    return;
  }
  if (userCanApproveAssetTypeRequests()) applyAssetTypeChangeDirect(action, cleanType, reason.trim(), defaultGroupName || 'Custom');
  else submitAssetTypeRequest(action, cleanType, reason.trim(), defaultGroupName || 'Custom');
}

function reviewAssetTypeRequest(requestId, decision) {
  if (!userCanApproveAssetTypeRequests()) { showToast('Only the program owner can approve these requests.', true); return; }
  var req = (state.assetTypeRequests || []).find(function(r){ return r.id === requestId; });
  if (!req) return;
  var reason = window.prompt((decision === 'Approved' ? 'Approval' : 'Rejection') + ' rationale (required for audit trail):', '');
  if (!reason || !reason.trim()) { showToast('Decision rationale is required.', true); return; }
  req.status = decision;
  req.reviewReason = reason.trim();
  req.reviewedBy = getCurrentActorName();
  req.reviewedAt = new Date().toISOString();
  if (decision === 'Approved') {
    var applied = req.action === 'add' ? applyAssetTypeAdd(req.typeName, req.groupName || 'Custom') : applyAssetTypeDelete(req.typeName);
    if (!applied) {
      req.status = 'Rejected';
      req.reviewReason = 'Auto-rejected: requested change could not be applied (already exists/removed). ' + req.reviewReason;
      addAuditEntry('program', 'asset-types', 'Asset type request auto-rejected during apply: ' + req.action + ' "' + req.typeName + '"');
      showToast('Request could not be applied and was auto-rejected.', true);
    }
  }
  addAuditEntry('program', 'asset-types', 'Asset type request ' + req.id + ' marked ' + req.status + ' by ' + req.reviewedBy + ': ' + req.reviewReason);
  markDirty();
  renderAssetTypeLibrary();
}

function renderAssetTypeLibrary() {
  var body = document.getElementById('asset-type-library-body');
  if (!body) return;
  ensureAssetTypeMetadata();
  var canApprove = userCanApproveAssetTypeRequests();
  var custom = (state.customAssetTypes || []).slice().sort();
  var activeCatalog = getActiveAssetTypeCatalog();
  var activeBuiltInRows = [];
  activeCatalog.forEach(function(cat) {
    cat.types.forEach(function(t) {
      activeBuiltInRows.push({ label: t.label, group: cat.category, source: 'Default', isCustom: false });
    });
  });
  var activeTypeRows = activeBuiltInRows.concat(custom.map(function(t) {
    return { label: t, group: (state.customAssetTypeGroups || {})[t] || 'Custom', source: 'Custom', isCustom: true };
  }));
  var retiredBuiltIns = [];
  (state.removedBuiltInAssetTypeKeys || []).forEach(function(key) {
    ASSET_TYPES.forEach(function(cat) {
      cat.types.forEach(function(t) {
        if (t.key === key) retiredBuiltIns.push({ label: t.label, group: cat.category });
      });
    });
  });
  var groups = getAllAssetTypeGroups();
  var requests = (state.assetTypeRequests || []).slice().sort(function(a, b) {
    return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
  });
  var pendingCount = requests.filter(function(r){ return r.status === 'Pending'; }).length;

  body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">'
    + '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#1d4ed8;text-transform:uppercase;">Default types (active)</div><div style="font-size:24px;font-weight:800;color:#1d4ed8;">' + activeBuiltInRows.length + '</div></div>'
    + '<div style="background:#f0f9ff;border:1px solid #7dd3fc;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#0369a1;text-transform:uppercase;">Custom types</div><div style="font-size:24px;font-weight:800;color:#0369a1;">' + custom.length + '</div></div>'
    + '<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#c2410c;text-transform:uppercase;">Retired default types</div><div style="font-size:24px;font-weight:800;color:#c2410c;">' + retiredBuiltIns.length + '</div></div>'
    + '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;">Pending requests</div><div style="font-size:24px;font-weight:800;color:#92400e;">' + pendingCount + '</div></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">Request Asset Type Change</div>'
    + '<div style="display:grid;grid-template-columns:120px 1fr 180px;gap:8px;margin-bottom:8px;">'
    + '<select id="assetTypeReqAction" class="form-select" style="font-size:12px;"><option value="add">Add type</option><option value="delete">Delete type</option></select>'
    + '<input id="assetTypeReqName" class="form-input" style="font-size:12px;" placeholder="Asset type name (e.g. OT Device, Mainframe)">'
    + '<select id="assetTypeReqGroup" class="form-select" style="font-size:12px;">' + groups.map(function(g){ return '<option>' + escapeHTML(g) + '</option>'; }).join('') + '</select>'
    + '</div>'
    + '<textarea id="assetTypeReqReason" class="form-input" rows="2" style="font-size:12px;resize:vertical;" placeholder="Why is this add/delete needed?"></textarea>'
    + '<div style="margin-top:8px;">'
    + (canApprove
      ? '<button class="btn btn-primary btn-sm" onclick="(function(){var a=document.getElementById(\'assetTypeReqAction\').value;var n=document.getElementById(\'assetTypeReqName\').value;var r=document.getElementById(\'assetTypeReqReason\').value;var g=document.getElementById(\'assetTypeReqGroup\').value;applyAssetTypeChangeDirect(a,n,r,g);})()">Apply Change</button>'
      : '<button class="btn btn-secondary btn-sm" onclick="(function(){var a=document.getElementById(\'assetTypeReqAction\').value;var n=document.getElementById(\'assetTypeReqName\').value;var r=document.getElementById(\'assetTypeReqReason\').value;var g=document.getElementById(\'assetTypeReqGroup\').value;submitAssetTypeRequest(a,n,r,g);})()">Request Program Owner Approval</button>')
    + '</div></div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">All Active Asset Types</div>'
    + (activeTypeRows.length
      ? '<div class="table-scroll"><table class="control-table"><thead><tr><th>Type</th><th style="width:90px;">Source</th><th style="width:200px;">Header Group</th><th style="width:110px;">Actions</th></tr></thead><tbody>'
        + activeTypeRows.map(function(row){
          var selected = row.group || 'Custom';
          var safeType = row.label.replace(/'/g,"\\'");
          var groupCell = '<span style="font-size:12px;color:var(--text-muted);">' + escapeHTML(selected) + '</span>';
          if (row.isCustom && canApprove) {
            groupCell = '<select class="form-select" style="font-size:12px;" onchange="state.customAssetTypeGroups[\'' + safeType + '\']=this.value;markDirty();renderAssetTypeLibrary();">' + groups.map(function(g){ return '<option' + (selected===g?' selected':'') + '>' + escapeHTML(g) + '</option>'; }).join('') + '</select>';
          }
          return '<tr><td style="font-size:12px;color:var(--navy);font-weight:600;">' + escapeHTML(row.label) + '</td>'
            + '<td style="font-size:11px;color:#334155;font-weight:700;text-transform:uppercase;">' + escapeHTML(row.source) + '</td>'
            + '<td>' + groupCell + '</td>'
            + '<td><button class="btn btn-sm" style="font-size:10px;padding:3px 8px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;" onclick="requestOrApplyAssetTypeChange(\'delete\',\'' + safeType + '\',\'' + selected.replace(/'/g,"\\'") + '\')">Delete</button></td></tr>';
        }).join('')
        + '</tbody></table></div>'
      : '<div style="font-size:12px;color:var(--text-muted);">No active asset types available.</div>')
    + '<div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:10px;">'
    + '<div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;">Retired Default Types</div>'
    + (retiredBuiltIns.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + retiredBuiltIns.map(function(item){
          var safeLabel = item.label.replace(/'/g,"\\'");
          var safeGroup = item.group.replace(/'/g,"\\'");
          return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 8px;border:1px solid #fed7aa;border-radius:999px;background:#fff7ed;color:#9a3412;">'
            + escapeHTML(item.label)
            + '<button style="border:none;background:none;color:#0369a1;cursor:pointer;font-size:11px;font-weight:700;" onclick="requestOrApplyAssetTypeChange(\'add\',\'' + safeLabel + '\',\'' + safeGroup + '\')">Restore</button>'
            + '</span>';
        }).join('') + '</div>'
      : '<div style="font-size:11px;color:var(--text-muted);">No retired default types.</div>')
    + '</div>'
    + '<div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:10px;">'
    + '<div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;">Header Groups</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">These are the overarching section headers used in control asset coverage.</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">'
    + groups.map(function(g){
      var canDelete = g !== 'Custom';
      var safeGroup = g.replace(/'/g,"\\'");
      return '<span style="font-size:11px;padding:4px 8px;border:1px solid var(--border);border-radius:999px;background:#f8fafc;color:#334155;">' + escapeHTML(g)
        + (canApprove && canDelete ? '<button style="margin-left:6px;border:none;background:none;color:#b91c1c;cursor:pointer;font-size:11px;" onclick="removeAssetTypeHeader(\'' + safeGroup + '\')">✕</button>' : '')
        + '</span>';
    }).join('')
    + '</div>'
    + (canApprove
      ? '<div style="display:flex;gap:8px;"><input id="newAssetTypeHeader" class="form-input" style="font-size:12px;" placeholder="Add header group (e.g. Operational Technology)"><button class="btn btn-secondary btn-sm" onclick="(function(){var v=(document.getElementById(\'newAssetTypeHeader\').value||\'\').trim();if(!v)return;var all=getAllAssetTypeGroups().map(function(x){return x.toLowerCase();});if(all.includes(v.toLowerCase())){showToast(\'Header already exists.\',true);return;}if(!state.customAssetTypeHeaders)state.customAssetTypeHeaders=[];state.customAssetTypeHeaders.push(v);markDirty();renderAssetTypeLibrary();})()">+ Add Header</button></div>'
      : '<div style="font-size:11px;color:var(--text-muted);">Only program owner/admin can edit header groups.</div>')
    + '</div>'
    + '</div></div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">Approval Queue & History</div>'
    + (requests.length ? '<div class="table-scroll"><table class="control-table"><thead><tr><th style="width:90px;">Action</th><th>Type</th><th>Requested By</th><th>Status</th><th>Reasoning</th>' + (canApprove ? '<th style="width:170px;">Decision</th>' : '<th style="width:120px;">Reviewed By</th>') + '</tr></thead><tbody>'
      + requests.map(function(r){
        var statusColor = r.status === 'Approved' ? '#166534' : r.status === 'Rejected' ? '#b45309' : '#92400e';
        return '<tr>'
          + '<td style="font-size:11px;text-transform:uppercase;font-weight:700;color:#334155;">' + escapeHTML(r.action) + '</td>'
          + '<td style="font-size:12px;color:var(--navy);font-weight:600;">' + escapeHTML(r.typeName) + '</td>'
          + '<td style="font-size:11px;color:var(--text-muted);">' + escapeHTML(r.requestedBy || '—') + '<div>' + escapeHTML((r.requestedAt || '').slice(0,10)) + '</div></td>'
          + '<td style="font-size:11px;font-weight:700;color:' + statusColor + ';">' + escapeHTML(r.status) + '</td>'
          + '<td style="font-size:11px;color:var(--text-muted);line-height:1.45;"><div><strong>Request:</strong> ' + escapeHTML(r.reason || '—') + '</div>' + (r.reviewReason ? '<div style="margin-top:4px;"><strong>Decision:</strong> ' + escapeHTML(r.reviewReason) + '</div>' : '') + '</td>'
          + (canApprove
            ? '<td>' + (r.status === 'Pending'
              ? '<button class="btn btn-sm" style="background:#166534;color:white;border:none;font-size:10px;padding:4px 7px;margin-right:6px;" onclick="reviewAssetTypeRequest(\'' + r.id + '\',\'Approved\')">Approve</button><button class="btn btn-sm" style="background:#b45309;color:white;border:none;font-size:10px;padding:4px 7px;" onclick="reviewAssetTypeRequest(\'' + r.id + '\',\'Rejected\')">Reject</button>'
              : '<span style="font-size:11px;color:var(--text-muted);">' + escapeHTML(r.reviewedBy || '—') + '</span>') + '</td>'
            : '<td style="font-size:11px;color:var(--text-muted);">' + escapeHTML(r.reviewedBy || '—') + '</td>')
          + '</tr>';
      }).join('') + '</tbody></table></div>'
      : '<div style="font-size:12px;color:var(--text-muted);">No requests submitted yet.</div>')
    + '</div>'
    + '<div style="margin-top:12px;"><button class="btn btn-secondary btn-sm" onclick="goToAssetWorkspace()">Open Asset Workspace →</button></div>';
}

function getAssetOwnerProfiles() {
  var users = (state.users || []).filter(function(u) {
    var roles = (u.roles && u.roles.length) ? u.roles : [u.role];
    return roles.indexOf('asset-owner') !== -1;
  });
  return users.sort(function(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function onAssetLibraryOwnerChange() {
  var sel = document.getElementById('assetLibOwnerSelect');
  var newWrap = document.getElementById('assetLibOwnerNewWrap');
  if (!sel) return;
  if (newWrap) newWrap.style.display = sel.value === '__new__' ? '' : 'none';
}

function createAssetFromLibrary() {
  var name = (document.getElementById('assetLibNewName') || {}).value || '';
  var type = (document.getElementById('assetLibNewType') || {}).value || '';
  var ownerSel = (document.getElementById('assetLibOwnerSelect') || {}).value || '';
  var newOwnerName = (document.getElementById('assetLibOwnerNewName') || {}).value || '';
  var newOwnerTitle = (document.getElementById('assetLibOwnerNewTitle') || {}).value || '';
  var newOwnerEmail = (document.getElementById('assetLibOwnerNewEmail') || {}).value || '';
  name = name.trim();
  newOwnerName = newOwnerName.trim();
  newOwnerTitle = newOwnerTitle.trim();
  newOwnerEmail = newOwnerEmail.trim();
  if (!name) { showToast('Asset name is required.', true); return; }
  if (!type) { showToast('Asset type is required.', true); return; }

  var ownerProfiles = getAssetOwnerProfiles();
  var selectedOwner = ownerProfiles.find(function(u) { return u.id === ownerSel; }) || null;
  var ownerName = selectedOwner ? (selectedOwner.name || '') : '';
  var ownerId = selectedOwner ? selectedOwner.id : '';
  var ownerEmail = selectedOwner ? (selectedOwner.email || '') : '';
  if (ownerSel === '__new__') {
    if (!newOwnerName) { showToast('New asset owner name is required.', true); return; }
    if (!newOwnerTitle) { showToast('New asset owner title/role is required.', true); return; }
    if (!newOwnerEmail) { showToast('New asset owner email is required.', true); return; }
    if (!state.users) state.users = [];
    var existingByName = (state.users || []).find(function(u) {
      return String(u.name || '').trim().toLowerCase() === newOwnerName.toLowerCase();
    });
    if (existingByName) {
      if (!existingByName.email) existingByName.email = newOwnerEmail;
      if (!existingByName.note) existingByName.note = newOwnerTitle;
      if (!existingByName.roles) existingByName.roles = [existingByName.role];
      if (existingByName.roles.indexOf('asset-owner') === -1) existingByName.roles.push('asset-owner');
      if (!existingByName.role) existingByName.role = 'asset-owner';
      if (!existingByName.assets) existingByName.assets = [];
      ownerId = existingByName.id;
      ownerName = existingByName.name;
      ownerEmail = existingByName.email || newOwnerEmail;
    } else {
      var newUser = {
        id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: newOwnerName,
        email: newOwnerEmail,
        role: 'asset-owner',
        roles: ['asset-owner'],
        families: [],
        controls: [],
        assets: [],
        note: newOwnerTitle
      };
      state.users.push(newUser);
      ownerId = newUser.id;
      ownerName = newUser.name;
      ownerEmail = newUser.email;
    }
  }

  if (!state.assets) state.assets = [];
  var newAsset = { id: 'asset-' + Date.now(), name: name, type: type, owner: ownerName, ownerId: ownerId, ownerEmail: ownerEmail, description: '' };
  state.assets.push(newAsset);

  if (ownerId) {
    var user = (state.users || []).find(function(u) { return u.id === ownerId; });
    if (user) {
      if (!user.assets) user.assets = [];
      if (user.assets.indexOf(newAsset.id) === -1) user.assets.push(newAsset.id);
    }
  }

  addAuditEntry('asset', newAsset.id, 'Asset created from Asset Library: ' + newAsset.name + (ownerName ? ' (owner: ' + ownerName + ')' : ''));
  markDirty();
  showToast('Asset created: ' + newAsset.name);
  renderAssetLibrary();
  renderSidebarAssets();
}

function renderAssetLibrary() {
  var body = document.getElementById('asset-library-body');
  if (!body) return;
  var assets = (state.assets || []).slice().sort(function(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  var ownerProfiles = getAssetOwnerProfiles();
  var sspLabel = state.privacyOverlay ? 'SPSP' : 'SSP';

  body.innerHTML = ''
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">'
    + '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#1d4ed8;text-transform:uppercase;">Assets in library</div><div style="font-size:24px;font-weight:800;color:#1d4ed8;">' + assets.length + '</div></div>'
    + '<div style="background:#ecfdf5;border:1px solid #86efac;border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Asset owner profiles</div><div style="font-size:24px;font-weight:800;color:#166534;">' + ownerProfiles.length + '</div></div>'
    + '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:12px 14px;"><div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;">Scope</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:8px;">Global catalog (all assets)</div></div>'
    + '</div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">Create New Asset</div>'
    + '<div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px;margin-bottom:8px;">'
    + '<input id="assetLibNewName" class="form-input" style="font-size:12px;" placeholder="Asset name (e.g. HR Management System)">'
    + '<select id="assetLibNewType" class="form-select" style="font-size:12px;">' + buildAssetTypeOptions('') + '</select>'
    + '<select id="assetLibOwnerSelect" class="form-select" style="font-size:12px;" onchange="onAssetLibraryOwnerChange()">'
    + '<option value="">Unassigned</option>'
    + ownerProfiles.map(function(u){
      var roleTitle = (u.note || '').trim();
      var label = u.name + (roleTitle ? ' — ' + roleTitle : '') + (u.email ? ' (' + u.email + ')' : '');
      return '<option value="' + _esc(u.id) + '">' + _esc(label) + '</option>';
    }).join('')
    + '<option value="__new__">+ Create new asset owner profile…</option>'
    + '</select>'
    + '</div>'
    + '<div id="assetLibOwnerNewWrap" style="display:none;margin-bottom:8px;">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'
    + '<input id="assetLibOwnerNewName" class="form-input" style="font-size:12px;" placeholder="Owner full name">'
    + '<input id="assetLibOwnerNewTitle" class="form-input" style="font-size:12px;" placeholder="Title / role">'
    + '<input id="assetLibOwnerNewEmail" class="form-input" type="email" style="font-size:12px;" placeholder="Email">'
    + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Creates a user profile in Users &amp; Roles with the Asset Owner role.</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button class="btn btn-primary btn-sm" onclick="createAssetFromLibrary()">Create Asset</button>'
    + '<button class="btn btn-secondary btn-sm" onclick="goToAssetWorkspace()">Open Asset Workspace →</button>'
    + '</div>'
    + '</div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">Asset Catalog</div>'
    + (assets.length
      ? '<div class="table-scroll"><table class="control-table"><thead><tr><th>Asset</th><th>Type</th><th>Asset Owner</th><th style="width:90px;">' + sspLabel + '</th><th style="width:150px;">Actions</th></tr></thead><tbody>'
        + assets.map(function(a){
          var sign = (state.sspSignoffs || {})[a.id] || {};
          var status = sign.status || 'Not Started';
          return '<tr>'
            + '<td style="font-size:12px;font-weight:600;color:var(--navy);">' + _esc(a.name || 'Unnamed') + '</td>'
            + '<td style="font-size:12px;color:var(--text-muted);">' + _esc(a.type || '—') + '</td>'
            + '<td style="font-size:12px;color:var(--text-muted);">' + _esc(a.owner || 'Unassigned') + '</td>'
            + '<td style="font-size:11px;font-weight:700;color:#334155;">' + _esc(status) + '</td>'
            + '<td><button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px;" onclick="openAssetWizardFromLibrary(\'' + a.id + '\')">Open Wizard</button></td>'
            + '</tr>';
        }).join('')
        + '</tbody></table></div>'
      : '<div style="font-size:12px;color:var(--text-muted);">No assets yet. Use "Create New Asset" to get started.</div>')
    + '</div>';
}

// ─── ASSET TAB DISPATCHER ────────────────────────────────────────────────────
function renderAssetTab() {
  var workspacePanel = document.getElementById('asset-workspace-panel');
  var assetLibraryPanel = document.getElementById('asset-library-panel');
  var libraryPanel = document.getElementById('asset-type-library-panel');
  var assetNav = document.getElementById('nav-asset');
  var assetLibNav = document.getElementById('nav-asset-library');
  var assetTypeLibNav = document.getElementById('nav-asset-type-library');
  if (assetNav) assetNav.classList.toggle('active', !state._assetTypeLibraryMode && !state._assetLibraryMode);
  if (assetLibNav) assetLibNav.classList.toggle('active', !!state._assetLibraryMode);
  if (assetTypeLibNav) assetTypeLibNav.classList.toggle('active', !!state._assetTypeLibraryMode);
  if (state._assetLibraryMode) {
    if (workspacePanel) workspacePanel.style.display = 'none';
    if (libraryPanel) libraryPanel.style.display = 'none';
    if (assetLibraryPanel) assetLibraryPanel.style.display = '';
    renderAssetLibrary();
    return;
  }
  if (state._assetTypeLibraryMode) {
    if (workspacePanel) workspacePanel.style.display = 'none';
    if (assetLibraryPanel) assetLibraryPanel.style.display = 'none';
    if (libraryPanel) libraryPanel.style.display = '';
    renderAssetTypeLibrary();
    return;
  }
  if (assetLibraryPanel) assetLibraryPanel.style.display = 'none';
  if (libraryPanel) libraryPanel.style.display = 'none';
  if (workspacePanel) workspacePanel.style.display = '';
  var listPanel = document.getElementById('asset-list-panel');
  var wizPanel  = document.getElementById('asset-wizard-panel');
  var hasLegacyPanels = !!(listPanel && wizPanel);
  var assetId   = state._selectedAssetId;
  var procId    = state._selectedProcessId;
  var scopedIds = getCurrentPersonAssetIds();
  if (scopedIds && assetId && scopedIds.indexOf(String(assetId)) === -1) {
    state._selectedAssetId = null;
    assetId = null;
  }
  if (!assetId && !procId && scopedIds && scopedIds.length === 1) {
    state._selectedAssetId = scopedIds[0];
    assetId = scopedIds[0];
  }
  var inAsset   = assetId && (state.assets||[]).find(function(a){ return String(a.id)===String(assetId); });
  var inProc    = procId  && (state.processes||[]).find(function(p){ return String(p.id)===String(procId); });

  if (hasLegacyPanels) {
    if (inAsset || inProc) {
      if (listPanel) listPanel.style.display = 'none';
      if (wizPanel)  wizPanel.style.display  = 'flex';
      var step = currentStep.asset || 1;
      for (var i = 1; i <= 3; i++) {
        var s = document.getElementById('asset-step-' + i);
        if (s) s.classList.toggle('active', i === step);
      }
      renderAssetWizardChrome();
      renderAssetStep(step);
    } else {
      state._selectedAssetId   = null;
      state._selectedProcessId = null;
      if (listPanel) listPanel.style.display = '';
      if (wizPanel)  wizPanel.style.display  = 'none';
      renderAssetHome();
    }
    return;
  }

  if (inAsset || inProc) {
    var step2 = currentStep.asset || 1;
    renderAssetWizardChrome();
    renderAssetStep(step2);
  } else {
    state._selectedAssetId = null;
    state._selectedProcessId = null;
    currentStep.asset = 1;
    renderAssetHome();
  }
}

function renderAssetStep(step) {
  var isProc = !!state._selectedProcessId;
  if (step===1) { isProc ? renderProcessSSPStep1() : renderAssetSSPStep1(); }
  if (step===2) { isProc ? renderProcessSSPStep2() : renderAssetSSPStep2(); }
  if (step===3) { isProc ? renderProcessSSPStep3() : renderAssetSSPStep3(); }
}

// ─── ASSET & PROCESS HOME ────────────────────────────────────────────────────
function renderAssetHome() {
  var body = document.getElementById('asset-list-body') || document.getElementById('asset-step-1-body');
  if (!body) return;

  if (!state.baseline) {
    body.innerHTML = '<div class="empty-state"><div class="es-icon">🏗️</div><div class="es-title">Program Not Ready Yet</div><p>The CISO must complete program setup before System Security Plans can be created.</p></div>';
    return;
  }

  // When logged in as an asset-owner, only show their assigned assets/processes
  var myAssetIds = getCurrentPersonAssetIds();
  var isAssetOwner = !!myAssetIds;

  var assets    = (state.assets    || []).filter(function(a){ return !myAssetIds || myAssetIds.includes(String(a.id)); });
  var processes = (state.processes || []).filter(function(p){ return !myAssetIds || myAssetIds.includes(String(p.id)); });
  var sspLabel  = state.privacyOverlay ? 'SPSP' : 'SSP';

  function sspRow(item, isProc) {
    var controls   = isProc ? getProcessSSPControls(item) : getAssetSSPControls(item);
    var attests    = (state.sspAttestations||{})[item.id] || {};
    var signoff    = (state.sspSignoffs||{})[item.id]     || {};
    var completed  = controls.filter(function(c){ return attests[c.id] && attests[c.id].status; }).length;
    var pct        = controls.length ? Math.round(completed/controls.length*100) : 0;
    var status     = signoff.status==='Approved'?'Approved':signoff.status==='Submitted'?'Submitted':completed>0?'In Progress':'Not Started';
    var col        = status==='Approved'?'var(--green)':status==='Submitted'?'var(--blue)':status==='In Progress'?'var(--amber)':'var(--slate)';
    var enterFn    = isProc ? 'enterProcessSSP' : 'enterAssetSSP';
    var removeFn   = isProc ? 'removeProcess'   : 'removeAsset';
    var subtitle   = isProc
      ? ((PROCESS_CATEGORIES.find(function(c){return c.id===item.category;})||{}).label || item.category || 'Process')
      : _esc(item.type||'—');
    return '<tr>'
      + '<td style="font-weight:600;"><a href="#" onclick="event.preventDefault();' + enterFn + '(\'' + item.id + '\')" style="color:var(--teal);text-decoration:none;font-size:13px;" onmouseenter="this.style.textDecoration=\'underline\'" onmouseleave="this.style.textDecoration=\'none\'">' + _esc(item.name||'Unnamed') + '</a>'
      + '<span style="display:block;font-size:11px;font-weight:400;color:var(--text-muted);margin-top:1px;">' + sspLabel + (signoff.signedDate?' · updated '+signoff.signedDate:'') + '</span></td>'
      + '<td style="font-size:12px;color:var(--text-muted);">' + subtitle + '</td>'
      + '<td style="font-size:12px;color:var(--text-muted);">' + _esc(item.owner||'—') + '</td>'
      + '<td style="text-align:center;font-size:13px;font-weight:600;">' + (controls.length||'<span style="color:var(--text-muted);">—</span>') + '</td>'
      + '<td><div style="display:flex;align-items:center;gap:6px;"><div style="flex:1;background:var(--border);border-radius:3px;height:5px;overflow:hidden;"><div style="height:100%;background:'+col+';width:'+pct+'%;border-radius:3px;"></div></div><span style="font-size:11px;font-weight:600;color:'+col+';min-width:30px;text-align:right;">'+pct+'%</span></div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+completed+' / '+controls.length+' attested</div></td>'
      + '<td><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:'+col+'22;color:'+col+';white-space:nowrap;">'+status+'</span></td>'
      + (isAssetOwner ? '<td></td>' : '<td style="text-align:center;"><button class="btn btn-secondary btn-sm" onclick="'+removeFn+'(\''+item.id+'\')" style="color:var(--red);padding:3px 8px;" title="Remove">✕</button></td>')
      + '</tr>';
  }

  function sectionTable(items, isProc, icon, label, emptyMsg) {
    var addFn = isProc ? 'openAddItemModal(\'process\')' : 'openAddItemModal(\'asset\')';
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;margin-top:' + (isProc?'32px':'0') + ';">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:18px;">' + icon + '</span>'
      + '<span style="font-size:15px;font-weight:700;color:var(--navy);">' + label + '</span>'
      + '<span style="font-size:12px;color:var(--text-muted);margin-left:4px;">(' + items.length + ')</span>'
      + '</div>'
      + (isAssetOwner ? '' : '<button class="btn btn-primary btn-sm" onclick="' + addFn + '">+ Register</button>')
      + '</div>';
    if (!items.length) {
      h += '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:10px;padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">' + emptyMsg + '</div>';
      return h;
    }
    h += '<div class="table-scroll"><table class="control-table" style="table-layout:fixed;">'
      + '<thead><tr><th style="width:28%;">' + (isProc?'Process':'Asset') + '</th><th style="width:14%;">'+(isProc?'Category':'Type')+'</th><th style="width:14%;">Owner</th><th style="width:10%;">Controls</th><th style="width:18%;">Progress</th><th style="width:10%;">Status</th><th style="width:6%;"></th></tr></thead><tbody id="tbod-${Math.random().toString(36).slice(2,8)}">';
    items.forEach(function(item){ h += sspRow(item, isProc); });
    h += '</tbody></table></div>';
    return h;
  }

  body.innerHTML = sectionTable(assets, false, '🖥️', 'Assets', 'No assets registered yet. Click Register to add a system, application, or infrastructure component.')
    + sectionTable(processes, true, '⚙️', 'Processes', 'No processes registered yet. Click Register to add an operational process in scope for this program.');
}

// ─── GET CONTROLS FOR AN ASSET'S SSP ─────────────────────────────────────────
// Returns controls explicitly mapped to this asset via assetMappings.
// Falls back to type-based matching via assetCoverage if no explicit mappings exist.
function getAssetSSPControls(asset) {
  if (!asset) return [];
  var allControls  = getActiveControls();
  var assetMaps    = state.assetMappings || {};

  // Explicit mappings: control owner ticked this asset in the "Applies To Assets" section
  var explicitIds = [];
  Object.keys(assetMaps).forEach(function(cid) {
    if ((assetMaps[cid]||[]).some(function(id){ return String(id) === String(asset.id); })) {
      explicitIds.push(cid);
    }
  });

  if (explicitIds.length) {
    return allControls.filter(function(c){ return explicitIds.includes(c.id); });
  }

  // Check if it's a custom type
  var customTypes = state.customAssetTypes || [];
  if (customTypes.includes(asset.type)) {
    return allControls.filter(function(c) {
      return !!((state.controlStatus[c.id]||{}).assetCoverage||{})['custom_' + asset.type];
    });
  }

  // Named key lookup via new 2-tier hierarchy
  var typeKey = getAssetTypeKey(asset.type);
  if (!typeKey) return allControls; // 'Other' or unknown legacy type → all controls

  return allControls.filter(function(c) {
    var cov = (state.controlStatus[c.id]||{}).assetCoverage || {};
    return !!cov[typeKey];
  });
}

// ─── ENTER / EXIT SSP WIZARD ─────────────────────────────────────────────────
function enterAssetSSP(assetId) {
  if (!userCanAccessAssetWorkspace()) {
    showToast('Access restricted: only Asset Owners can open the asset SSP wizard.', true);
    return;
  }
  var scopedIds = getCurrentPersonAssetIds();
  if (scopedIds && scopedIds.indexOf(String(assetId)) === -1) {
    showToast('This asset is not assigned to your profile.', true);
    return;
  }
  state._assetTypeLibraryMode = false;
  state._assetLibraryMode = false;
  state._selectedAssetId   = String(assetId);
  state._selectedProcessId = null;
  currentStep.asset = 1;
  var listPanel = document.getElementById('asset-list-panel');
  var wizPanel  = document.getElementById('asset-wizard-panel');
  if (listPanel) listPanel.style.display = 'none';
  if (wizPanel)  wizPanel.style.display  = 'flex';
  for (var i = 1; i <= 3; i++) {
    var s = document.getElementById('asset-step-' + i);
    if (s) s.classList.toggle('active', i === 1);
  }
  renderAssetWizardChrome();
  renderAssetSSPStep1();
}

function enterProcessSSP(procId) {
  state._assetTypeLibraryMode = false;
  state._selectedProcessId = String(procId);
  state._selectedAssetId   = null;
  currentStep.asset = 1;
  var listPanel = document.getElementById('asset-list-panel');
  var wizPanel  = document.getElementById('asset-wizard-panel');
  if (listPanel) listPanel.style.display = 'none';
  if (wizPanel)  wizPanel.style.display  = 'flex';
  for (var i = 1; i <= 3; i++) {
    var s = document.getElementById('asset-step-' + i);
    if (s) s.classList.toggle('active', i === 1);
  }
  renderAssetWizardChrome();
  renderProcessSSPStep1();
}

function exitAssetWizard() {
  state._selectedAssetId   = null;
  state._selectedProcessId = null;
  renderAssetTab();
}

function assetSSPNext(fromStep) {
  goToStep('asset', fromStep + 1);
}

// ─── WIZARD CHROME ───────────────────────────────────────────────────────────
function renderAssetWizardChrome() {
  var chrome = document.getElementById('asset-wizard-chrome');
  if (!chrome) return;
  var step = currentStep.asset || 1;
  var isPrivacy = state.privacyOverlay;
  var sspLabel  = isPrivacy ? 'SPSP' : 'SSP';
  var isProc    = !!state._selectedProcessId;
  var item, subtitle, step1Label;
  if (isProc) {
    item       = (state.processes||[]).find(function(p){ return String(p.id)===String(state._selectedProcessId); });
    if (!item) return;
    var cat    = PROCESS_CATEGORIES.find(function(c){ return c.id === item.category; });
    subtitle   = (cat ? cat.label : item.category||'Process') + ' · Process SSP';
    step1Label = 'Process Profile';
  } else {
    item       = (state.assets||[]).find(function(a){ return String(a.id)===String(state._selectedAssetId); });
    if (!item) return;
    subtitle   = _esc(item.type||'System') + ' · ' + sspLabel;
    step1Label = 'Asset Profile';
  }

  var steps = [
    { n:1, label:step1Label },
    { n:2, label:'Control Attestations' },
    { n:3, label:'Sign Off' }
  ];

  var stepsHtml = steps.map(function(s) {
    var active  = step === s.n;
    var done    = step > s.n;
    var circleStyle = active
      ? 'background:var(--teal);color:white;'
      : done ? 'background:var(--green);color:white;' : 'background:var(--border);color:var(--text-muted);';
    return '<div class="step-item' + (active?' active':'') + '" onclick="goToStep(\'asset\',' + s.n + ')" style="cursor:pointer;">'
      + '<div class="step-circle" style="' + circleStyle + (done?'font-size:12px;':' ') + '">' + (done?'✓':s.n) + '</div>'
      + '<div class="step-info"><div class="step-num">Step ' + s.n + '</div><div class="step-name">' + s.label + '</div></div>'
      + '</div>';
  }).join('<div class="step-connector"></div>');

  chrome.innerHTML = '<div style="display:flex;align-items:center;gap:0;padding:12px 0;">'
    + '<button onclick="exitAssetWizard()" style="border:none;background:none;color:var(--teal);font-size:13px;font-weight:600;cursor:pointer;padding:6px 0;margin-right:24px;white-space:nowrap;">← All Assets &amp; Processes</button>'
    + '<div style="margin-right:24px;flex-shrink:0;">'
    + '<div style="font-size:14px;font-weight:700;color:var(--navy);">' + _esc(item.name) + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);">' + subtitle + '</div>'
    + '</div>'
    + '<div class="step-nav" style="flex-direction:row;gap:0;padding:0;background:none;border:none;flex:1;">'
    + stepsHtml
    + '</div>'
    + '</div>';
}

// ─── STEP 1: ASSET PROFILE ───────────────────────────────────────────────────
function renderAssetSSPStep1() {
  var body  = document.getElementById('asset-step-1-body');
  if (!body) return;
  var asset = (state.assets||[]).find(function(a){ return String(a.id) === String(state._selectedAssetId); });
  if (!asset) { renderAssetHome(); return; }
  var idx   = state.assets.indexOf(asset);

  body.innerHTML = '<div class="section-title">Asset Profile</div>'
    + '<div class="section-subtitle">Confirm or update the details for this asset. This information is included in the SSP header.</div>'
    + '<div style="max-width:600px;">'
    + '<div class="form-group"><label class="form-label">Asset Name <span style="color:var(--red);">*</span></label>'
    + '<input class="form-input" value="' + _esc(asset.name||'') + '" placeholder="e.g. HR Management System"'
    + ' oninput="state.assets[' + idx + '].name=this.value;renderAssetWizardChrome(); window.markDirty();"></div>'
    + '<div class="form-group"><label class="form-label">Asset Type <span style="color:var(--red);">*</span></label>'
    + '<select class="form-select" onchange="state.assets[' + idx + '].type=this.value;">'
    + buildAssetTypeOptions(asset.type)
    + '</select>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Asset type determines which controls appear in the SSP when no explicit control mappings are set.</div>'
    + '</div>'
    + '<div class="form-group"><label class="form-label">Asset Owner / Responsible Party</label>'
    + '<input class="form-input" value="' + _esc(asset.owner||'') + '" placeholder="Name or role"'
    + ' oninput="state.assets[' + idx + '].owner=this.value; window.markDirty();"></div>'
    + ((['Workstation (Windows)','Workstation (macOS/Linux)','Mobile Device','Virtual Desktop (VDI)'].includes(asset.type))
      ? '<div class="form-group"><label class="form-label">MDM Solution <span style="font-weight:400;color:var(--text-muted);">(optional)</span></label>'
        + '<input class="form-input" value="' + _esc(asset.mdm||'') + '" placeholder="e.g. Jamf Pro, Microsoft Intune, Kandji…"'
        + ' oninput="state.assets[' + idx + '].mdm=this.value; window.markDirty();"></div>'
      : '')
    + '<div class="form-group"><label class="form-label">Description <span style="font-weight:400;color:var(--text-muted);">(optional)</span></label>'
    + '<textarea class="form-input" rows="3" placeholder="Brief description of what this asset does and its sensitivity..." oninput="state.assets[' + idx + '].description=this.value; window.markDirty();">' + _esc(asset.description||'') + '</textarea></div>'
    + '<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px 16px;font-size:12px;color:#1e40af;">'
    + '<strong>What happens next:</strong> Step 2 lists every control that has been mapped to this asset by your control owners. For each one, you\'ll select an attestation status and provide a brief explanation.'
    + '</div>'
    + '</div>';
}

// ─── STEP 2: CONTROL ATTESTATIONS ────────────────────────────────────────────
function renderAssetSSPStep2() {
  var body  = document.getElementById('asset-step-2-body');
  if (!body) return;
  var asset = (state.assets||[]).find(function(a){ return String(a.id) === String(state._selectedAssetId); });
  if (!asset) return;

  var controls = getAssetSSPControls(asset);
  var attests  = (state.sspAttestations||{})[asset.id] || {};
  var signoff  = (state.sspSignoffs||{})[asset.id]     || {};
  var isSubmitted = signoff.status === 'Submitted' || signoff.status === 'Approved';

  // Update count in footer
  var countEl = document.getElementById('asset-step-2-count');
  if (countEl) {
    var done = controls.filter(function(c){ return attests[c.id] && attests[c.id].status; }).length;
    countEl.textContent = done + ' / ' + controls.length + ' attested';
  }

  if (!controls.length) {
    body.innerHTML = '<div class="empty-state"><div class="es-icon">📋</div><div class="es-title">No Controls Mapped Yet</div>'
      + '<p>No controls have been mapped to this asset type yet. Control owners assign controls to assets in the Control Owner tab. Once assigned, they will appear here for attestation.</p></div>';
    return;
  }

  var isPrivacy = state.privacyOverlay;
  var sspLabel  = isPrivacy ? 'SPSP' : 'SSP';

  var html = '<div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">'
    + controls.length + ' controls applicable to this ' + _esc(asset.type||'asset')
    + (isSubmitted ? ' · <span style="color:var(--green);font-weight:600;">✓ Submitted</span>' : '')
    + '</div>';

  // Group by family
  var byFamily = {};
  var famOrder = [];
  controls.forEach(function(c) {
    if (!byFamily[c.f]) { byFamily[c.f] = []; famOrder.push(c.f); }
    byFamily[c.f].push(c);
  });

  famOrder.forEach(function(fam) {
    var famControls = byFamily[fam];
    var famDone = famControls.filter(function(c){ return attests[c.id] && attests[c.id].status; }).length;
    html += '<div style="margin-bottom:28px;">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border);">'
      + '<span class="family-badge">' + fam + '</span>'
      + '<span style="font-size:13px;font-weight:700;color:var(--navy);">' + ((DOMAIN_DEFAULTS[fam]||{}).label||fam) + '</span>'
      + '<span style="margin-left:auto;font-size:12px;color:var(--text-muted);">' + famDone + ' / ' + famControls.length + '</span>'
      + '</div>';

    famControls.forEach(function(c) {
      var cs      = state.controlStatus[c.id] || {};
      var guidanceHtml = buildGuidanceFromControlOwner(c.id, asset.type || 'General');
      var att     = attests[c.id] || {};
      var statusVal = att.status || '';
      var explanation = att.explanation || '';
      var evidenceLocation = att.evidenceLocation || '';
      var statusColor = SSP_STATUS_COLORS[statusVal] || 'var(--border)';

      html += '<div style="border:1px solid ' + (statusVal?statusColor+'66':'var(--border)') + ';border-radius:10px;padding:16px;margin-bottom:12px;background:' + (statusVal?'white':'#fafbfc') + ';">'
        + '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">'
        + '<span class="control-id" style="flex-shrink:0;">' + c.id + '</span>'
        + '<div style="flex:1;"><div style="font-weight:600;font-size:13px;color:var(--navy);">' + _esc(c.n) + '</div>'
        + (cs.narrative ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Impl: ' + _esc(cs.narrative.substring(0,120)) + (cs.narrative.length>120?'…':'') + '</div>' : '')
        + '</div>'
        + '</div>'
        + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:12px;">'
          + '<div style="font-weight:600;color:#166534;margin-bottom:4px;">📌 Guidance from Control Owner</div>'
          + '<div style="color:#15803d;line-height:1.5;">' + guidanceHtml + '</div>'
          + '</div>'
        + '<div style="display:grid;grid-template-columns:180px 1fr 1fr;gap:12px;align-items:start;">'
        + '<div><label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">Attestation</label>'
        + '<select style="width:100%;padding:7px 10px;border:1px solid ' + (statusVal?statusColor:'var(--border)') + ';border-radius:6px;font-size:13px;font-weight:' + (statusVal?'600':'400') + ';color:' + (statusVal?statusColor:'var(--text-muted)') + ';background:white;cursor:pointer;"'
        + (isSubmitted ? ' disabled' : '')
        + ' onchange="setSSPAttestation(\'' + asset.id + '\',\'' + c.id + '\',\'status\',this.value);renderAssetSSPStep2();">'
        + '<option value="">— Select status —</option>'
        + SSP_STATUSES.map(function(s){ return '<option value="' + s + '"' + (statusVal===s?' selected':'') + ' style="color:' + (SSP_STATUS_COLORS[s]||'inherit') + ';">' + s + '</option>'; }).join('')
        + '</select></div>'
        + '<div><label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">'
        + (statusVal && statusVal !== 'Complies' ? '<span style="color:var(--red);">*</span> ' : '')
        + 'Explanation / Notes</label>'
        + '<textarea style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;resize:vertical;font-family:inherit;" rows="2"'
        + ' placeholder="' + (statusVal==='Complies'?'Optional — describe how this is implemented...':'Required — explain status...') + '"'
        + (isSubmitted ? ' readonly' : '')
        + ' oninput="setSSPAttestation(\'' + asset.id + '\',\'' + c.id + '\',\'explanation\',this.value)">'
        + _esc(explanation)
        + '</textarea></div>'
        + '<div><label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">Evidence Location</label>'
        + '<input style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;"'
        + ' placeholder="SharePoint/Drive URL, ticket, folder path, or evidence repo reference"'
        + ' value="' + _esc(evidenceLocation) + '"'
        + (isSubmitted ? ' readonly' : '')
        + ' oninput="setSSPAttestation(\'' + asset.id + '\',\'' + c.id + '\',\'evidenceLocation\',this.value)">'
        + '</div>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
  });

  body.innerHTML = html;
}

// ─── STEP 3: REVIEW & SIGN OFF ───────────────────────────────────────────────
function renderAssetSSPStep3() {
  var body  = document.getElementById('asset-step-3-body');
  if (!body) return;
  var asset = (state.assets||[]).find(function(a){ return String(a.id) === String(state._selectedAssetId); });
  if (!asset) return;

  var controls  = getAssetSSPControls(asset);
  var attests   = (state.sspAttestations||{})[asset.id] || {};
  var signoff   = (state.sspSignoffs||{})[asset.id]     || {};
  var isPrivacy = state.privacyOverlay;
  var sspLabel  = isPrivacy ? 'SPSP' : 'SSP';

  var complies   = controls.filter(function(c){ return (attests[c.id]||{}).status==='Complies'; }).length;
  var partial    = controls.filter(function(c){ return (attests[c.id]||{}).status==='Partially Complies'; }).length;
  var notComply  = controls.filter(function(c){ return (attests[c.id]||{}).status==='Does Not Comply'; }).length;
  var notApply   = controls.filter(function(c){ return (attests[c.id]||{}).status==='Not Applicable'; }).length;
  var inherited  = controls.filter(function(c){ return (attests[c.id]||{}).status==='Inherited'; }).length;
  var unanswered = controls.filter(function(c){ return !(attests[c.id]||{}).status; }).length;
  var isComplete = unanswered === 0;
  var isSubmitted= signoff.status === 'Submitted' || signoff.status === 'Approved';
  var evidenceLocations = controls
    .map(function(c){
      var loc = ((attests[c.id]||{}).evidenceLocation || '').trim();
      if (!loc) return null;
      return { id: c.id, location: loc };
    })
    .filter(Boolean);

  // Submitted banner
  var bannerHtml = '';
  if (signoff.status === 'Approved') {
    bannerHtml = '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-bottom:24px;display:flex;gap:12px;align-items:center;">'
      + '<span style="font-size:20px;">✅</span><div>'
      + '<div style="font-weight:700;color:#166534;">SSP Approved</div>'
      + '<div style="font-size:12px;color:#15803d;">Approved on ' + _esc(signoff.signedDate||'') + '</div>'
      + '</div></div>';
  } else if (signoff.status === 'Submitted') {
    bannerHtml = '<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:16px;margin-bottom:24px;display:flex;gap:12px;align-items:center;">'
      + '<span style="font-size:20px;">📬</span><div>'
      + '<div style="font-weight:700;color:#1e40af;">' + sspLabel + ' Submitted — Awaiting Review</div>'
      + '<div style="font-size:12px;color:#2563eb;">Submitted by ' + _esc(signoff.signedBy||'') + ' on ' + _esc(signoff.signedDate||'') + '</div>'
      + '</div></div>';
  }

  // Summary table
  var rows = [
    ['Complies', complies, 'var(--green)'],
    ['Partially Complies', partial, 'var(--amber)'],
    ['Does Not Comply', notComply, 'var(--red)'],
    ['Not Applicable', notApply, 'var(--slate)'],
    ['Inherited', inherited, 'var(--blue)'],
    ['Not yet attested', unanswered, '#94a3b8']
  ];

  var summaryHtml = rows.map(function(r) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'
      + '<span style="width:12px;height:12px;border-radius:50%;background:' + r[2] + ';display:inline-block;flex-shrink:0;"></span>'
      + '<span style="flex:1;font-size:13px;">' + r[0] + '</span>'
      + '<span style="font-weight:700;font-size:14px;color:' + r[2] + ';">' + r[1] + '</span>'
      + '</div>';
  }).join('');

  // Missing explanations warning
  var needsExplanation = controls.filter(function(c) {
    var s = (attests[c.id]||{}).status;
    return s && s !== 'Complies' && !(attests[c.id]||{}).explanation;
  });

  var warnHtml = '';
  if (needsExplanation.length) {
    warnHtml = '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:20px;">'
      + '<div style="font-weight:600;color:#92400e;margin-bottom:4px;">⚠️ ' + needsExplanation.length + ' control(s) are missing an explanation</div>'
      + '<div style="font-size:12px;color:#b45309;">Controls not marked "Complies" should include an explanation. Please return to Step 2 to complete: '
      + needsExplanation.map(function(c){ return '<strong>' + c.id + '</strong>'; }).join(', ')
      + '</div></div>';
  }

  // Submit button state
  var submitBtn = document.getElementById('asset-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = isSubmitted || !isComplete;
    submitBtn.style.opacity = (isSubmitted || !isComplete) ? '0.5' : '1';
    submitBtn.textContent = isSubmitted ? (signoff.status==='Approved'?'✓ Approved':'✓ Submitted') : '✓ Sign & Submit ' + sspLabel;
  }

  body.innerHTML = bannerHtml
    + '<div class="section-title">Review &amp; Sign Off</div>'
    + '<div class="section-subtitle">Review your attestation summary before submitting. Once submitted, the SSP will be sent to your ISSM for review.</div>'
    + (!isComplete ? '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#b91c1c;"><strong>⚠️ Incomplete:</strong> ' + unanswered + ' control(s) still need an attestation status. Return to Step 2 to complete them.</div>' : '')
    + warnHtml
    + '<div style="max-width:560px;">'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:20px;">'
    + '<div style="font-weight:700;font-size:14px;color:var(--navy);margin-bottom:14px;">Attestation Summary — ' + _esc(asset.name) + '</div>'
    + '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">' + _esc(asset.type||'System') + ' · ' + controls.length + ' controls in scope · ' + sspLabel + '</div>'
    + summaryHtml
    + '</div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);margin-bottom:8px;">Evidence Locations</div>'
    + (evidenceLocations.length
      ? '<div style="display:flex;flex-direction:column;gap:6px;">' + evidenceLocations.map(function(e){
          return '<div style="font-size:12px;color:#374151;"><span class="control-id" style="margin-right:6px;">' + _esc(e.id) + '</span>' + _esc(e.location) + '</div>';
        }).join('') + '</div>'
      : '<div style="font-size:12px;color:var(--text-muted);">No evidence locations entered yet.</div>')
    + '</div>'
    + (!isSubmitted ? '<div class="form-group"><label class="form-label">Signed by <span style="color:var(--red);">*</span></label>'
      + '<input class="form-input" id="ssp-signedby" placeholder="Your full name" value="' + _esc(signoff.signedBy||getSignerName()) + '"></div>' : '')
    + '</div>';
}

function getSignerName() {
  if (!state.currentUserId) return '';
  var u = (state.users||[]).find(function(u){ return u.id === state.currentUserId; });
  return u ? u.name : '';
}

// ─── SSP STATE HELPERS ────────────────────────────────────────────────────────
function setSSPAttestation(assetId, controlId, field, value) {
  if (!state.sspAttestations) state.sspAttestations = {};
  if (!state.sspAttestations[assetId]) state.sspAttestations[assetId] = {};
  if (!state.sspAttestations[assetId][controlId]) state.sspAttestations[assetId][controlId] = {};
  var prev = state.sspAttestations[assetId][controlId][field];
  state.sspAttestations[assetId][controlId][field] = value;
  state.sspAttestations[assetId][controlId].date = new Date().toISOString().slice(0,10);
  logFieldChange('sspAttestations.' + assetId + '.' + controlId + '.' + field, prev, value);
  markDirty();
}

function submitSSP() {
  if (blockActionIfDemoPlaceholders()) return;
  clearScopedUndoStack('SSP submit');
  var asset = (state.assets||[]).find(function(a){ return String(a.id) === String(state._selectedAssetId); });
  if (!asset) return;
  var controls  = getAssetSSPControls(asset);
  var attests   = (state.sspAttestations||{})[asset.id] || {};
  var unanswered = controls.filter(function(c){ return !(attests[c.id]||{}).status; });
  if (unanswered.length) { showToast('Please attest all ' + unanswered.length + ' remaining controls before submitting.', true); return; }
  var signerInput = document.getElementById('ssp-signedby');
  var signer = signerInput ? signerInput.value.trim() : getSignerName();
  if (!signer) { showToast('Please enter your name before signing.', true); if (signerInput) signerInput.focus(); return; }
  if (!confirm('Submit the SSP for "' + asset.name + '" signed by ' + signer + '?\n\nThis will send it to your ISSM for review.')) return;
  if (!state.sspSignoffs) state.sspSignoffs = {};
  state.sspSignoffs[asset.id] = { signedBy: signer, signedDate: new Date().toISOString().slice(0,10), status: 'Submitted' };
  // Push to ISSM review queue
  if (!state.controlReviewQueue) state.controlReviewQueue = [];
  state.controlReviewQueue.push({ type:'ssp', assetId: asset.id, assetName: asset.name, submittedBy: signer, date: new Date().toISOString().slice(0,10), status:'Pending' });
  addAuditEntry('asset', asset.id, 'SSP submitted by ' + signer);
  markDirty();
  showToast('✅ SSP submitted for ' + asset.name);
  renderAssetSSPStep3();
  updateNotificationBadges();
  showTab('reports');
}

// ─── ASSET MANAGEMENT ────────────────────────────────────────────────────────

function removeAsset(assetId) {
  var asset = (state.assets||[]).find(function(a){ return String(a.id)===String(assetId); });
  if (!asset) return;
  if (!confirm('Remove "' + asset.name + '" from the asset inventory?\n\nThis will also delete its SSP attestations. This cannot be undone.')) return;
  state.assets = state.assets.filter(function(a){ return String(a.id)!==String(assetId); });
  if (state.sspAttestations) delete state.sspAttestations[assetId];
  if (state.sspSignoffs)     delete state.sspSignoffs[assetId];
  if (state.assetMappings)   Object.keys(state.assetMappings).forEach(function(cid){ state.assetMappings[cid] = (state.assetMappings[cid]||[]).filter(function(id){ return String(id)!==String(assetId); }); });
  markDirty();
  renderAssetHome();
  renderSidebarAssets();
}

function removeProcess(procId) {
  var proc = (state.processes||[]).find(function(p){ return String(p.id)===String(procId); });
  if (!proc) return;
  if (!confirm('Remove "' + proc.name + '"?\n\nThis will also delete its SSP attestations. This cannot be undone.')) return;
  state.processes = state.processes.filter(function(p){ return String(p.id)!==String(procId); });
  if (state.sspAttestations) delete state.sspAttestations[procId];
  if (state.sspSignoffs)     delete state.sspSignoffs[procId];
  markDirty();
  renderAssetHome();
}

// ─── TYPE-PICKER MODAL (Step 0) ───────────────────────────────────────────────
function openAddItemModal(preselect) {
  var overlay = document.createElement('div');
  overlay.id = 'addItemOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;';

  var assetForm = '<div id="_addItemAssetForm"' + (preselect==='process'?' style="display:none;"':'') + '>'
    + '<div class="form-group"><label class="form-label">Asset Name <span style="color:var(--red);">*</span></label>'
    + '<input class="form-input" id="_newAssetName" placeholder="e.g. HR Management System"></div>'
    + '<div class="form-group"><label class="form-label">Asset Type <span style="color:var(--red);">*</span></label>'
    + '<select class="form-select" id="_newAssetType">'
    + buildAssetTypeOptions('')
    + '</select></div>'
    + '<div class="form-group"><label class="form-label">Asset Owner</label>'
    + '<input class="form-input" id="_newAssetOwner" placeholder="Name or role"></div>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'addItemOverlay\').remove()">Cancel</button>'
    + '<button class="btn btn-primary" onclick="confirmAddAsset()">Register Asset →</button>'
    + '</div></div>';

  var procForm = '<div id="_addItemProcForm"' + (preselect!=='process'?' style="display:none;"':'') + '>'
    + '<div class="form-group"><label class="form-label">Process Name <span style="color:var(--red);">*</span></label>'
    + '<input class="form-input" id="_newProcName" placeholder="e.g. Vulnerability Management Program"></div>'
    + '<div class="form-group"><label class="form-label">Process Category <span style="color:var(--red);">*</span></label>'
    + '<select class="form-select" id="_newProcCategory"><option value="">— Select category —</option>'
    + PROCESS_CATEGORIES.map(function(c){ return '<option value="' + c.id + '">' + c.label + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="form-group"><label class="form-label">Process Owner</label>'
    + '<input class="form-input" id="_newProcOwner" placeholder="Name or role"></div>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'addItemOverlay\').remove()">Cancel</button>'
    + '<button class="btn btn-primary" onclick="confirmAddProcess()">Register Process →</button>'
    + '</div></div>';

  overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:32px;width:480px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">'
    + '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:4px;">Register New</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Are you registering a system / infrastructure asset, or an operational process?</div>'
    + '<div style="display:flex;gap:10px;margin-bottom:24px;">'
    + '<button id="_typePickerAsset" onclick="document.getElementById(\'_addItemAssetForm\').style.display=\'\';document.getElementById(\'_addItemProcForm\').style.display=\'none\';document.getElementById(\'_typePickerAsset\').style.fontWeight=\'700\';document.getElementById(\'_typePickerProc\').style.fontWeight=\'400\';" '
    + 'style="flex:1;padding:12px;border-radius:10px;border:2px solid var(--teal);background:#f0fdfa;color:var(--navy);cursor:pointer;font-size:13px;font-weight:' + (preselect==='process'?'400':'700') + ';">🖥️ Asset</button>'
    + '<button id="_typePickerProc" onclick="document.getElementById(\'_addItemProcForm\').style.display=\'\';document.getElementById(\'_addItemAssetForm\').style.display=\'none\';document.getElementById(\'_typePickerProc\').style.fontWeight=\'700\';document.getElementById(\'_typePickerAsset\').style.fontWeight=\'400\';" '
    + 'style="flex:1;padding:12px;border-radius:10px;border:2px solid ' + (preselect==='process'?'var(--teal)':'var(--border)') + ';background:' + (preselect==='process'?'#f0fdfa':'white') + ';color:var(--navy);cursor:pointer;font-size:13px;font-weight:' + (preselect==='process'?'700':'400') + ';">⚙️ Process</button>'
    + '</div>'
    + assetForm
    + procForm
    + '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
  setTimeout(function(){
    var f = preselect==='process' ? document.getElementById('_newProcName') : document.getElementById('_newAssetName');
    if (f) f.focus();
  }, 50);
}
function openAddAssetModal() { openAddItemModal('asset'); }

function confirmAddAsset() {
  var name  = (document.getElementById('_newAssetName')?.value||'').trim();
  var type  = document.getElementById('_newAssetType')?.value||'';
  var owner = (document.getElementById('_newAssetOwner')?.value||'').trim();
  if (!name) { showToast('Please enter an asset name.', true); return; }
  if (!type) { showToast('Please select an asset type.', true); return; }
  if (!state.assets) state.assets = [];
  var newAsset = { id: 'asset-' + Date.now(), name: name, type: type, owner: owner, description: '' };
  state.assets.push(newAsset);
  document.getElementById('addItemOverlay')?.remove();
  markDirty();
  renderSidebarAssets();
  enterAssetSSP(newAsset.id);
}

function confirmAddProcess() {
  var name     = (document.getElementById('_newProcName')?.value||'').trim();
  var category = document.getElementById('_newProcCategory')?.value||'';
  var owner    = (document.getElementById('_newProcOwner')?.value||'').trim();
  if (!name)     { showToast('Please enter a process name.', true); return; }
  if (!category) { showToast('Please select a process category.', true); return; }
  if (!state.processes) state.processes = [];
  var newProc = { id: 'proc-' + Date.now(), name: name, category: category, owner: owner, description: '' };
  state.processes.push(newProc);
  document.getElementById('addItemOverlay')?.remove();
  markDirty();
  enterProcessSSP(newProc.id);
}

// ─── GET CONTROLS FOR A PROCESS SSP ──────────────────────────────────────────
function getProcessSSPControls(proc) {
  if (!proc) return [];
  var cat = PROCESS_CATEGORIES.find(function(c){ return c.id === proc.category; });
  if (!cat) return [];
  var famSet = {};
  cat.families.forEach(function(f){ famSet[f] = true; });
  return getActiveControls().filter(function(c){ return famSet[c.f]; });
}

// ─── PROCESS SSP STEPS ────────────────────────────────────────────────────────
function renderProcessSSPStep1() {
  var body = document.getElementById('asset-step-1-body');
  if (!body) return;
  var proc = (state.processes||[]).find(function(p){ return String(p.id)===String(state._selectedProcessId); });
  if (!proc) { body.innerHTML = '<div class="empty-state"><div class="es-icon">⚠️</div><div class="es-title">Process Not Found</div></div>'; return; }
  var idx = state.processes.indexOf(proc);
  var cat = PROCESS_CATEGORIES.find(function(c){ return c.id === proc.category; });

  body.innerHTML = '<div class="section-title">Process Profile</div>'
    + '<div class="section-subtitle">Confirm or update the details for this process. This information is included in the Process SSP header.</div>'
    + '<div style="max-width:600px;">'
    + '<div class="form-group"><label class="form-label">Process Name <span style="color:var(--red);">*</span></label>'
    + '<input class="form-input" value="' + _esc(proc.name||'') + '" placeholder="e.g. Vulnerability Management Program"'
    + ' oninput="state.processes[' + idx + '].name=this.value;renderAssetWizardChrome(); window.markDirty();"></div>'
    + '<div class="form-group"><label class="form-label">Process Category <span style="color:var(--red);">*</span></label>'
    + '<select class="form-select" onchange="state.processes[' + idx + '].category=this.value;">'
    + PROCESS_CATEGORIES.map(function(c){ return '<option value="' + c.id + '"' + (proc.category===c.id?' selected':'') + '>' + c.label + '</option>'; }).join('')
    + '</select>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Category determines which control families appear in the process SSP attestations.'
    + (cat ? ' Currently covers: <strong>' + cat.families.join(', ') + '</strong>.' : '') + '</div>'
    + '</div>'
    + '<div class="form-group"><label class="form-label">Process Owner / Responsible Party</label>'
    + '<input class="form-input" value="' + _esc(proc.owner||'') + '" placeholder="Name or role"'
    + ' oninput="state.processes[' + idx + '].owner=this.value; window.markDirty();"></div>'
    + '<div class="form-group"><label class="form-label">Description <span style="font-weight:400;color:var(--text-muted);">(optional)</span></label>'
    + '<textarea class="form-input" rows="3" placeholder="Brief description of this process, its scope, and any key procedures..." oninput="state.processes[' + idx + '].description=this.value; window.markDirty();">' + _esc(proc.description||'') + '</textarea></div>'
    + '<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px 16px;font-size:12px;color:#1e40af;">'
    + '<strong>What happens next:</strong> Step 2 lists controls from the selected process category families. For each one, attest how this process implements or satisfies the control.'
    + '</div>'
    + '</div>';
}

function renderProcessSSPStep2() {
  var body = document.getElementById('asset-step-2-body');
  if (!body) return;
  var proc = (state.processes||[]).find(function(p){ return String(p.id)===String(state._selectedProcessId); });
  if (!proc) return;

  var controls  = getProcessSSPControls(proc);
  var attests   = (state.sspAttestations||{})[proc.id] || {};
  var signoff   = (state.sspSignoffs||{})[proc.id]     || {};
  var isSubmitted = signoff.status === 'Submitted' || signoff.status === 'Approved';

  var countEl = document.getElementById('asset-step-2-count');
  if (countEl) {
    var done = controls.filter(function(c){ return attests[c.id] && attests[c.id].status; }).length;
    countEl.textContent = done + ' / ' + controls.length + ' attested';
  }

  if (!controls.length) {
    body.innerHTML = '<div class="empty-state"><div class="es-icon">📋</div><div class="es-title">No Controls for This Category</div><p>Change the process category in Step 1 to load applicable controls.</p></div>';
    return;
  }

  var cat = PROCESS_CATEGORIES.find(function(c){ return c.id === proc.category; });
  var html = '<div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">'
    + controls.length + ' controls applicable to ' + _esc((cat||{}).label||proc.category||'this process')
    + (isSubmitted ? ' · <span style="color:var(--green);font-weight:600;">✓ Submitted</span>' : '') + '</div>';

  var byFamily = {};
  var famOrder = [];
  controls.forEach(function(c) {
    if (!byFamily[c.f]) { byFamily[c.f] = []; famOrder.push(c.f); }
    byFamily[c.f].push(c);
  });

  famOrder.forEach(function(fam) {
    var famControls = byFamily[fam];
    var famDone = famControls.filter(function(c){ return attests[c.id] && attests[c.id].status; }).length;
    html += '<div style="margin-bottom:28px;">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border);">'
      + '<span class="family-badge">' + fam + '</span>'
      + '<span style="font-size:13px;font-weight:700;color:var(--navy);">' + ((DOMAIN_DEFAULTS[fam]||{}).label||fam) + '</span>'
      + '<span style="margin-left:auto;font-size:12px;color:var(--text-muted);">' + famDone + ' / ' + famControls.length + '</span>'
      + '</div>';

    famControls.forEach(function(c) {
      var cs          = state.controlStatus[c.id] || {};
      var guidanceHtml = buildGuidanceFromControlOwner(c.id, 'General');
      var att         = attests[c.id] || {};
      var statusVal   = att.status || '';
      var explanation = att.explanation || '';
      var evidenceLocation = att.evidenceLocation || '';
      var statusColor = SSP_STATUS_COLORS[statusVal] || 'var(--border)';

      html += '<div style="border:1px solid ' + (statusVal?statusColor+'66':'var(--border)') + ';border-radius:10px;padding:16px;margin-bottom:12px;background:' + (statusVal?'white':'#fafbfc') + ';">'
        + '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">'
        + '<span class="control-id" style="flex-shrink:0;">' + c.id + '</span>'
        + '<div style="flex:1;"><div style="font-weight:600;font-size:13px;color:var(--navy);">' + _esc(c.n) + '</div>'
        + (cs.narrative ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Impl: ' + _esc(cs.narrative.substring(0,120)) + (cs.narrative.length>120?'…':'') + '</div>' : '')
        + '</div></div>'
        + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:12px;">'
        + '<div style="font-weight:600;color:#166534;margin-bottom:4px;">📌 Guidance from Control Owner</div>'
        + '<div style="color:#15803d;line-height:1.5;">' + guidanceHtml + '</div>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:180px 1fr 1fr;gap:12px;align-items:start;">'
        + '<div><label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">Attestation</label>'
        + '<select style="width:100%;padding:7px 10px;border:1px solid ' + (statusVal?statusColor:'var(--border)') + ';border-radius:6px;font-size:13px;font-weight:' + (statusVal?'600':'400') + ';color:' + (statusVal?statusColor:'var(--text-muted)') + ';background:white;cursor:pointer;"'
        + (isSubmitted ? ' disabled' : '')
        + ' onchange="setSSPAttestation(\'' + proc.id + '\',\'' + c.id + '\',\'status\',this.value);renderProcessSSPStep2();">'
        + '<option value="">— Select status —</option>'
        + SSP_STATUSES.map(function(s){ return '<option value="' + s + '"' + (statusVal===s?' selected':'') + ' style="color:' + (SSP_STATUS_COLORS[s]||'inherit') + ';">' + s + '</option>'; }).join('')
        + '</select></div>'
        + '<div><label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">'
        + (statusVal && statusVal !== 'Complies' ? '<span style="color:var(--red);">*</span> ' : '')
        + 'Explanation / Notes</label>'
        + '<textarea style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;resize:vertical;font-family:inherit;" rows="2"'
        + ' placeholder="' + (statusVal==='Complies'?'Optional — describe how this process addresses the control...':'Required — explain status...') + '"'
        + (isSubmitted ? ' readonly' : '')
        + ' oninput="setSSPAttestation(\'' + proc.id + '\',\'' + c.id + '\',\'explanation\',this.value)">'
        + _esc(explanation)
        + '</textarea></div>'
        + '<div><label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:4px;">Evidence Location</label>'
        + '<input style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;"'
        + ' placeholder="SharePoint/Drive URL, ticket, folder path, or evidence repo reference"'
        + ' value="' + _esc(evidenceLocation) + '"'
        + (isSubmitted ? ' readonly' : '')
        + ' oninput="setSSPAttestation(\'' + proc.id + '\',\'' + c.id + '\',\'evidenceLocation\',this.value)">'
        + '</div></div></div>';
    });
    html += '</div>';
  });

  body.innerHTML = html;
}

function renderProcessSSPStep3() {
  var body = document.getElementById('asset-step-3-body');
  if (!body) return;
  var proc = (state.processes||[]).find(function(p){ return String(p.id)===String(state._selectedProcessId); });
  if (!proc) return;

  var controls    = getProcessSSPControls(proc);
  var attests     = (state.sspAttestations||{})[proc.id] || {};
  var signoff     = (state.sspSignoffs||{})[proc.id]     || {};
  var complies    = controls.filter(function(c){ return (attests[c.id]||{}).status==='Complies'; }).length;
  var partial     = controls.filter(function(c){ return (attests[c.id]||{}).status==='Partially Complies'; }).length;
  var notComply   = controls.filter(function(c){ return (attests[c.id]||{}).status==='Does Not Comply'; }).length;
  var notApply    = controls.filter(function(c){ return (attests[c.id]||{}).status==='Not Applicable'; }).length;
  var inherited   = controls.filter(function(c){ return (attests[c.id]||{}).status==='Inherited'; }).length;
  var unanswered  = controls.filter(function(c){ return !(attests[c.id]||{}).status; }).length;
  var isComplete  = unanswered === 0;
  var isSubmitted = signoff.status === 'Submitted' || signoff.status === 'Approved';
  var evidenceLocations = controls
    .map(function(c){
      var loc = ((attests[c.id]||{}).evidenceLocation || '').trim();
      if (!loc) return null;
      return { id: c.id, location: loc };
    })
    .filter(Boolean);
  var cat         = PROCESS_CATEGORIES.find(function(c){ return c.id === proc.category; });

  var submitBtn = document.getElementById('asset-submit-btn');
  if (submitBtn) {
    submitBtn.textContent = isSubmitted ? '✓ Submitted' : '✓ Sign & Submit Process SSP';
    submitBtn.onclick = function(){ submitProcessSSP(); };
    submitBtn.disabled = isSubmitted;
  }

  body.innerHTML = (isSubmitted ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;"><span style="font-size:20px;">✅</span><div><div style="font-weight:700;color:#166534;">Process SSP Submitted</div><div style="font-size:12px;color:#15803d;">Signed by ' + _esc(signoff.signedBy||'') + ' on ' + (signoff.signedDate||'') + '</div></div></div>' : '')
    + '<div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:16px;">Review: ' + _esc(proc.name) + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">'
    + [['Complies',complies,'var(--green)'],['Partial',partial,'var(--amber)'],['Not Comply',notComply,'var(--red)'],['N/A',notApply,'var(--slate)'],['Inherited',inherited,'var(--blue)'],['Unanswered',unanswered,unanswered?'var(--red)':'var(--text-muted)']].map(function(x){
        return '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:'+x[2]+';">'+x[1]+'</div><div style="font-size:11px;color:var(--text-muted);">'+x[0]+'</div></div>';
      }).join('')
    + '</div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-bottom:20px;">'
    + '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--text-muted);margin-bottom:8px;">Evidence Locations</div>'
    + (evidenceLocations.length
      ? '<div style="display:flex;flex-direction:column;gap:6px;">' + evidenceLocations.map(function(e){
          return '<div style="font-size:12px;color:#374151;"><span class="control-id" style="margin-right:6px;">' + _esc(e.id) + '</span>' + _esc(e.location) + '</div>';
        }).join('') + '</div>'
      : '<div style="font-size:12px;color:var(--text-muted);">No evidence locations entered yet.</div>')
    + '</div>'
    + (!isComplete ? '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#c2410c;">⚠️ ' + unanswered + ' control' + (unanswered===1?'':'s') + ' still need attestation before you can submit.</div>' : '')
    + (!isSubmitted && isComplete ? '<div class="form-group" style="max-width:360px;"><label class="form-label">Your Name (Signing Officer)</label>'
      + '<input class="form-input" id="ssp-signedby" value="' + _esc(getSignerName()) + '" placeholder="Enter your full name"></div>' : '');
}

function submitProcessSSP() {
  if (blockActionIfDemoPlaceholders()) return;
  clearScopedUndoStack('Process SSP submit');
  var proc = (state.processes||[]).find(function(p){ return String(p.id)===String(state._selectedProcessId); });
  if (!proc) return;
  var controls   = getProcessSSPControls(proc);
  var attests    = (state.sspAttestations||{})[proc.id] || {};
  var unanswered = controls.filter(function(c){ return !(attests[c.id]||{}).status; });
  if (unanswered.length) { showToast('Please attest all ' + unanswered.length + ' remaining controls before submitting.', true); return; }
  var signerInput = document.getElementById('ssp-signedby');
  var signer = signerInput ? signerInput.value.trim() : getSignerName();
  if (!signer) { showToast('Please enter your name before signing.', true); if (signerInput) signerInput.focus(); return; }
  if (!confirm('Submit the Process SSP for "' + proc.name + '" signed by ' + signer + '?')) return;
  if (!state.sspSignoffs) state.sspSignoffs = {};
  state.sspSignoffs[proc.id] = { signedBy: signer, signedDate: new Date().toISOString().slice(0,10), status: 'Submitted' };
  addAuditEntry('process', proc.id, 'Process SSP submitted by ' + signer);
  markDirty();
  showToast('✅ Process SSP submitted for ' + proc.name);
  renderProcessSSPStep3();
  updateNotificationBadges();
  showTab('reports');
}

// Legacy stubs (keep so old snapshots don't break)
function saveAttestation() { showToast('✅ Attestations saved!'); }
function addAsset() { openAddAssetModal(); }

// ============================================================
// CONTROL TESTER TAB
// ============================================================
function renderTesterTab() { renderTesterStep(currentStep.tester); }

function renderTesterStep(step) {
  if (step===1) renderTesterStep1();
  if (step===2) renderTesterStep2();
  if (step===3) renderTesterStep3();
  if (step===4) renderTesterStep4();
}

function renderTesterStep1() {
  const body = document.getElementById('tester-step-1-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">🏛️</div><div class="es-title">CISO Setup Required</div><p>The CISO must complete all program setup steps first, including baseline selection, PM controls, and control assignment.</p></div>`;
    return;
  }
  const controls = getActiveControls();
  const implemented = controls.filter(c=>(state.controlStatus[c.id]||{}).status==='Implemented');
  body.innerHTML = `
    <div class="section-title">Testing Scope</div>
    <div class="section-subtitle">Select controls to include in this test cycle. Best practice is to test implemented controls.</div>
    <div class="summary-box" style="margin-bottom:20px;">
      <h3>Program Overview</h3>
      <div class="summary-kv"><span class="sk">Total Controls in Scope:</span><span class="sv">${controls.length}</span></div>
      <div class="summary-kv"><span class="sk">Implemented:</span><span class="sv">${implemented.length}</span></div>
      <div class="summary-kv"><span class="sk">Previously Tested:</span><span class="sv">${Object.keys(state.controlTestResults).length}</span></div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <strong style="font-size:14px;">Select Controls for Testing</strong>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="selectAllTests(true)">Select All</button>
        <button class="btn btn-secondary btn-sm" onclick="selectAllTests(false)" style="margin-left:6px;">Clear</button>
        <button class="btn btn-secondary btn-sm" onclick="selectImplementedTests()" style="margin-left:6px;">Select Implemented</button>
      </div>
    </div>
    <div class="table-scroll">
      <table class="control-table">
        <thead><tr><th style="width:40px;">✓</th><th style="width:80px;">ID</th><th>Control Name</th><th>Status</th><th>Last Tested</th></tr></thead>
        <tbody id="testScopeTable">
          ${controls.map(c => {
            const cs = state.controlStatus[c.id]||{};
            const tr = state.controlTestResults[c.id]||{};
            return `<tr>
              <td><input type="checkbox" class="test-scope-cb" data-id="${c.id}" ${tr.selected?'checked':''} style="accent-color:var(--teal);"
                onchange="state.controlTestResults['${c.id}']={...(state.controlTestResults['${c.id}']||{}),selected:this.checked}"></td>
              <td><span class="control-id">${c.id}</span></td>
              <td>${c.n}</td>
              <td>${chipHTML(cs.status||'Not Started')}</td>
              <td style="font-size:12px; color:var(--text-muted);">${tr.date||'Never'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function selectAllTests(val) {
  document.querySelectorAll('.test-scope-cb').forEach(cb => {
    cb.checked = val;
    const id = cb.dataset.id;
    if (!state.controlTestResults[id]) state.controlTestResults[id] = {};
    state.controlTestResults[id].selected = val;
  });
}

function selectImplementedTests() {
  document.querySelectorAll('.test-scope-cb').forEach(cb => {
    const id = cb.dataset.id;
    const isImpl = (state.controlStatus[id]||{}).status === 'Implemented';
    cb.checked = isImpl;
    if (!state.controlTestResults[id]) state.controlTestResults[id] = {};
    state.controlTestResults[id].selected = isImpl;
  });
}

function renderTesterStep2() {
  const body = document.getElementById('tester-step-2-body');
  if (!body) return;
  const selected = getActiveControls().filter(c => state.controlTestResults[c.id]?.selected);
  if (!selected.length) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><div class="es-title">No Controls Selected for Testing</div><p>Return to Step 1 and select at least one control that has been implemented. Only implemented controls should be included in test cycles.</p></div>`;
    return;
  }
  body.innerHTML = `
    <div class="section-title">Test Procedures</div>
    <div class="section-subtitle">${selected.length} controls selected for testing. Review standard test procedures below.</div>
    <div class="controls-list scroll-area">
      ${selected.map(c => `
      <div class="ctrl-row" style="flex-direction:column; align-items:stretch; gap:6px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <span class="cr-id">${c.id}</span>
          <span style="font-weight:600; font-size:13px; flex:1;">${c.n}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); background:#f8fafc; padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
          <strong>Test Procedure:</strong> (1) Review policy documentation for ${c.n.toLowerCase()}. (2) Interview responsible personnel. (3) Observe system configuration or logs. (4) Test a sample of records or outputs for compliance.
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <input class="form-input" style="font-size:12px;" placeholder="Tester notes / procedure modifications..." value="${escapeHTML(state.controlTestResults[c.id]?.procedure||'')}"
            oninput="setTestField('${c.id}','procedure',this.value)">
        </div>
      </div>`).join('')}
    </div>`;
}

function setTestField(id, field, value) {
  if (!state.controlTestResults[id]) state.controlTestResults[id] = {};
  state.controlTestResults[id][field] = value;
}

function renderTesterStep3() {
  const body = document.getElementById('tester-step-3-body');
  if (!body) return;
  const selected = getActiveControls().filter(c => state.controlTestResults[c.id]?.selected);
  if (!selected.length) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><div class="es-title">No Controls Selected for Testing</div><p>Return to Step 1 and select the controls you want to test. Record results after reviewing test procedures in Step 2.</p></div>`;
    return;
  }
  body.innerHTML = `
    <div class="section-title">Record Test Results</div>
    <div class="section-subtitle">Enter test results and evidence for each selected control.</div>
    <div class="controls-list scroll-area">
      ${selected.map(c => {
        const tr = state.controlTestResults[c.id]||{};
        return `
        <div class="ctrl-row" style="flex-direction:column; align-items:stretch; gap:8px;">
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="cr-id">${c.id}</span>
            <span style="font-weight:600; flex:1;">${c.n}</span>
            ${chipHTML(tr.result||'—')}
          </div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
            <div>
              <label class="form-label" style="font-size:11px;">Test Result</label>
              <select class="form-select" style="font-size:12px;" onchange="setTestField('${c.id}','result',this.value)">
                <option ${!tr.result?'selected':''}>— Select —</option>
                <option ${tr.result==='Pass'?'selected':''}>Pass</option>
                <option ${tr.result==='Partial'?'selected':''}>Partial</option>
                <option ${tr.result==='Fail'?'selected':''}>Fail</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size:11px;">Test Date</label>
              <input class="form-input" type="date" style="font-size:12px;" value="${tr.date||new Date().toISOString().slice(0,10)}"
                oninput="setTestField('${c.id}','date',this.value)">
            </div>
            <div>
              <label class="form-label" style="font-size:11px;">Tester Name</label>
              <input class="form-input" style="font-size:12px;" placeholder="Your name" value="${tr.tester||''}"
                oninput="setTestField('${c.id}','tester',this.value)">
            </div>
          </div>
          <div>
            <label class="form-label" style="font-size:11px;">Evidence / Findings</label>
            <input class="form-input" style="font-size:12px;" placeholder="Evidence reference and any findings noted..." value="${tr.findings||''}"
              oninput="setTestField('${c.id}','findings',this.value)">
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function saveTestResults() { goToStep('tester', 4); }

function renderTesterStep4() {
  const body = document.getElementById('tester-step-4-body');
  if (!body) return;
  const selected = getActiveControls().filter(c => state.controlTestResults[c.id]?.selected);
  const passed = selected.filter(c => state.controlTestResults[c.id]?.result==='Pass');
  const failed = selected.filter(c => state.controlTestResults[c.id]?.result==='Fail');
  const partial = selected.filter(c => state.controlTestResults[c.id]?.result==='Partial');
  const untested = selected.filter(c => !state.controlTestResults[c.id]?.result || state.controlTestResults[c.id]?.result==='— Select —');

  body.innerHTML = `
    <div class="section-title">Findings &amp; Test Report</div>
    <div class="section-subtitle">Summary of test results and deficiencies requiring remediation.</div>
    <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr); margin-bottom:20px;">
      <div class="metric-card"><div class="mc-value" style="color:var(--green);">${passed.length}</div><div class="mc-label">Passed</div></div>
      <div class="metric-card"><div class="mc-value" style="color:var(--amber);">${partial.length}</div><div class="mc-label">Partial</div></div>
      <div class="metric-card"><div class="mc-value" style="color:var(--red);">${failed.length}</div><div class="mc-label">Failed</div></div>
      <div class="metric-card"><div class="mc-value" style="color:var(--slate);">${untested.length}</div><div class="mc-label">Not Recorded</div></div>
    </div>
    ${failed.length > 0 ? `
    <div style="margin-bottom:20px;">
      <strong style="font-size:14px; color:var(--red);">⚠️ Failed Controls — Remediation Required</strong>
      <div class="controls-list" style="margin-top:10px;">
        ${failed.map(c => {
          const tr = state.controlTestResults[c.id]||{};
          return `<div class="ctrl-row">
            <span class="cr-id">${c.id}</span>
            <span style="flex:1; font-size:13px;">${c.n}</span>
            <span class="chip chip-red">FAIL</span>
            <span style="font-size:12px; color:var(--text-muted); max-width:200px; text-overflow:ellipsis; overflow:hidden;">${tr.findings||'No details'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
    <div class="info-alert" style="background:#f0fdf4; border-color:#bbf7d0;">
      <div class="ia-icon">📄</div>
      <div class="ia-text" style="color:#166534;">Click "Finalize Test Report" to lock in these results. Failed controls will appear as open findings in the Reports dashboard.</div>
    </div>`;
}

function finalizeTestReport() {
  state.testReportFinalized = true;
  state.testReportDate = new Date().toLocaleDateString();
  showToast('✅ Test report finalized! Results are now in the Reports dashboard.');
}

// ============================================================
// TEST ADEQUACY VIEW — Control Testing Frequency & Progress
// ============================================================
function openTestAdequacyView(controlId) {
  const ctrl = CONTROLS.find(c => c.id === controlId);
  if (!ctrl) return;

  // Default test frequencies per family
  const defaultFrequencies = {
    AC: 'Quarterly', AT: 'Annual', AU: 'Monthly', CA: 'Quarterly',
    CM: 'Monthly', CP: 'Annual', IA: 'Monthly', IR: 'Annual',
    MA: 'Quarterly', MP: 'Annual', PE: 'Quarterly', PL: 'Annual',
    PM: 'Annual', PS: 'Annual', PT: 'Annual', RA: 'Annual',
    SA: 'Quarterly', SC: 'Monthly', SI: 'Monthly', SR: 'Annual'
  };

  const freq = defaultFrequencies[ctrl.f] || 'Quarterly';
  const adequacy = state.testAdequacy && state.testAdequacy[controlId] || {
    frequency: freq,
    completedTests: 0,
    requiredTests: 4,
    lastTest: null,
    nextTestDue: null
  };

  const overlay = document.createElement('div');
  overlay.id = 'testAdequacyOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:12px;padding:32px;width:520px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <h2 style="margin:0 0 24px 0;color:var(--navy);font-size:18px;">${ctrl.id} — Test Adequacy</h2>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        <div style="border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Testing Frequency</div>
          <div style="font-size:16px;font-weight:700;color:var(--teal);">${adequacy.frequency}</div>
        </div>
        <div style="border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Last Test</div>
          <div style="font-size:14px;color:var(--text);">${adequacy.lastTest ? new Date(adequacy.lastTest).toLocaleDateString() : 'Never'}</div>
        </div>
      </div>

      <div style="border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px;">Test Progress (${adequacy.completedTests}/${adequacy.requiredTests})</div>
        <div style="display:grid;grid-template-columns:repeat(${adequacy.requiredTests},1fr);gap:8px;">
          ${Array.from({length: adequacy.requiredTests}, (_, i) => `
            <div style="aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:${i < adequacy.completedTests ? 'var(--green)' : 'var(--border)'};color:${i < adequacy.completedTests ? 'white' : 'var(--text-muted)'};">
              ${i < adequacy.completedTests ? '✓' : (i+1)}
            </div>
          `).join('')}
        </div>
      </div>

      ${adequacy.nextTestDue ? `
      <div style="background:rgba(13,148,136,0.05);border:1px solid rgba(13,148,136,0.2);border-radius:8px;padding:12px;margin-bottom:24px;font-size:13px;color:var(--text);">
        Next test due: <strong>${new Date(adequacy.nextTestDue).toLocaleDateString()}</strong>
      </div>
      ` : ''}

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button onclick="document.getElementById('testAdequacyOverlay').remove()" style="padding:10px 20px;border:1px solid var(--border);background:white;border-radius:6px;cursor:pointer;">Close</button>
        <button onclick="recordTestExecution('${controlId}'); document.getElementById('testAdequacyOverlay').remove();" style="padding:10px 20px;background:var(--teal);color:white;border:none;border-radius:6px;cursor:pointer;">Record Test</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function recordTestExecution(controlId) {
  if (!state.testAdequacy) state.testAdequacy = {};
  const adequacy = state.testAdequacy[controlId] || {
    frequency: 'Quarterly',
    completedTests: 0,
    requiredTests: 4,
    lastTest: null,
    nextTestDue: null
  };
  adequacy.completedTests = (adequacy.completedTests || 0) + 1;
  adequacy.lastTest = new Date().toISOString();
  // Calculate next test due based on frequency
  const now = new Date();
  const freq = adequacy.frequency;
  let nextDue = new Date(now);
  if (freq.includes('Monthly')) nextDue.setMonth(nextDue.getMonth() + 1);
  else if (freq.includes('Quarterly')) nextDue.setMonth(nextDue.getMonth() + 3);
  else if (freq.includes('Annual')) nextDue.setFullYear(nextDue.getFullYear() + 1);
  adequacy.nextTestDue = nextDue.toISOString();
  state.testAdequacy[controlId] = adequacy;
  markDirty();
  showToast('✅ Test execution recorded for ' + controlId);
}

// ============================================================
// REPORTS & PROGRAM DASHBOARD
// renderProgramDashboard (CISO overview card), renderReports
// (full reports tab), renderPolicyRoadmap (Gantt),
// openCISOReview / cisoApprovePolicy / cisoReturnPolicy (modal).
// ============================================================
function openCISOReview(fam) {
  const title = getPolicyMergedTitle(fam);
  const allFams = getPolicyAllFamilies(fam);
  const owner = state.domainOwners[fam] || {};
  const dp = (state.domainPolicies || {})[fam] || {};
  const revHistory = (dp.revisionHistory || []).slice().reverse();
  const badges = allFams.map(f => '<span class="family-badge" style="font-size:11px;padding:2px 6px;">' + f + '</span>').join(' ');
  const purpose = dp.purpose || ((DOMAIN_DEFAULTS[fam]||DOMAIN_DEFAULT_GENERIC).purpose || '');
  const scope = dp.scope || ((DOMAIN_DEFAULTS[fam]||DOMAIN_DEFAULT_GENERIC).scope || '');
  const requirements = dp.requirements || [];

  const existingOverlay = document.getElementById('cisoReviewOverlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'cisoReviewOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:40px 20px;';

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;width:820px;max-width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.2);overflow:hidden;">
      <!-- Header -->
      <div style="background:var(--navy);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="display:flex;gap:6px;margin-bottom:6px;">${badges}</div>
          <div style="font-size:20px;font-weight:800;color:white;">${title}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:2px;">Submitted by ${escapeHTML(owner.name||'—')} · ${escapeHTML(owner.role||'')}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:6px;font-weight:600;">Routed for review to: ${escapeHTML(getPolicyPendingReviewerDisplay(fam))}</div>
        </div>
        <button onclick="document.getElementById('cisoReviewOverlay').remove()" style="background:rgba(255,255,255,0.12);border:none;color:white;font-size:18px;cursor:pointer;border-radius:8px;padding:6px 12px;line-height:1;">✕</button>
      </div>

      <!-- Policy Content Preview -->
      <div style="padding:24px 28px;border-bottom:1px solid var(--border);max-height:360px;overflow-y:auto;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">Purpose</div>
        <div style="font-size:13px;color:var(--navy);line-height:1.7;margin-bottom:16px;">${escapeHTML(purpose||'—')}</div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">Scope</div>
        <div style="font-size:13px;color:var(--navy);line-height:1.7;margin-bottom:16px;">${escapeHTML(scope||'—')}</div>
        ${requirements.length ? `
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">Policy Requirements (${requirements.length})</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${requirements.slice(0,5).map(r=>{
            var reqControls = getRequirementControlIds(r);
            var reqBadges = buildRequirementControlBadgeHtml(reqControls, 6);
            var reqText = stripRequirementNistRef(r.text || r.requirement || '');
            return `<div style="font-size:13px;color:var(--navy);padding:10px 12px;background:var(--bg);border-radius:6px;border-left:3px solid var(--teal);">${reqBadges ? `<div style="margin-bottom:5px;display:flex;flex-wrap:wrap;gap:3px;">${reqBadges}</div>` : ''}${escapeHTML(reqText)}</div>`;
          }).join('')}
          ${requirements.length > 5 ? `<div style="font-size:12px;color:var(--text-muted);padding:4px 0;">…and ${requirements.length - 5} more requirements</div>` : ''}
        </div>` : '<div style="font-size:13px;color:var(--text-muted);">Policy content not yet drafted (Step 3 incomplete).</div>'}
        ${revHistory.length ? `
        <div style="margin-top:16px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">Revision History</div>
          ${revHistory.map(r=>`<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${r.date} · v${r.version} · ${escapeHTML(r.changes||'')}</div>`).join('')}
        </div>` : ''}
      </div>

      <!-- Review Action Panel -->
      <div style="padding:24px 28px;">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px;">Review Notes</div>
        <textarea id="cisoReviewNotes" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;resize:vertical;min-height:80px;font-family:inherit;" placeholder="Add your review notes here — required when returning to submitter, optional when approving…"></textarea>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
          <button onclick="document.getElementById('cisoReviewOverlay').remove()" style="padding:10px 20px;border:1px solid var(--border);border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-muted);">Cancel</button>
          <button onclick="cisoReturnPolicy('${fam}')" style="padding:10px 20px;border:1px solid rgba(239,68,68,0.4);border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:var(--red);">↩ Return to ${escapeHTML(owner.name||'Submitter')}</button>
          <button onclick="cisoApprovePolicy('${fam}')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--teal);cursor:pointer;font-size:13px;font-weight:700;color:white;">✓ Approve Policy</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function cisoApprovePolicy(fam) {
  if (!state.policyStatus) state.policyStatus = {};
  const notes = document.getElementById('cisoReviewNotes')?.value.trim() || '';
  var approverTitle = state.programOwnerTitle || 'CISO';
  var prev = state.policyStatus[fam] || {};
  state.policyStatus[fam] = {
    status: 'Approved',
    approvedBy: state.programOwner || approverTitle,
    approvedDate: new Date().toISOString().slice(0, 10),
    notes: notes,
    submittedAt: prev.submittedAt || '',
    submittedTo: prev.submittedTo || '',
    submittedToRole: prev.submittedToRole || '',
    submittedToEmail: prev.submittedToEmail || ''
  };
  // Add to revision history
  if (!state.domainPolicies) state.domainPolicies = {};
  if (!state.domainPolicies[fam]) state.domainPolicies[fam] = {};
  if (!state.domainPolicies[fam].revisionHistory) state.domainPolicies[fam].revisionHistory = [];
  state.domainPolicies[fam].revisionHistory.push({ version: '1.0', date: new Date().toISOString().slice(0,10), author: state.programOwner||approverTitle, changes: 'Approved by ' + approverTitle + '.' + (notes ? ' Notes: ' + notes : '') });
  markDirty();
  document.getElementById('cisoReviewOverlay')?.remove();
  showToast('✅ Policy approved — ' + getPolicyMergedTitle(fam));
  renderReports();
}

function cisoReturnPolicy(fam) {
  const notes = document.getElementById('cisoReviewNotes')?.value.trim() || '';
  if (!notes) { showToast('Please add review notes before returning the policy.', true); return; }
  if (!state.policyStatus) state.policyStatus = {};
  var prevR = state.policyStatus[fam] || {};
  var retBy = state.programOwner || (state.programOwnerTitle || 'CISO');
  state.policyStatus[fam] = {
    status: 'Returned',
    returnedDate: new Date().toISOString().slice(0, 10),
    returnedBy: retBy,
    notes: notes,
    submittedAt: prevR.submittedAt || '',
    submittedTo: prevR.submittedTo || '',
    submittedToRole: prevR.submittedToRole || '',
    submittedToEmail: prevR.submittedToEmail || ''
  };
  if (!state.domainPolicies) state.domainPolicies = {};
  if (!state.domainPolicies[fam]) state.domainPolicies[fam] = {};
  if (!state.domainPolicies[fam].revisionHistory) state.domainPolicies[fam].revisionHistory = [];
  state.domainPolicies[fam].revisionHistory.push({ version: 'R', date: new Date().toISOString().slice(0,10), author: state.programOwner||(state.programOwnerTitle||'CISO'), changes: 'Returned for revision by ' + (state.programOwnerTitle||'CISO') + '. Notes: ' + notes });
  markDirty();
  document.getElementById('cisoReviewOverlay')?.remove();
  showToast('↩ Policy returned to submitter — ' + getPolicyMergedTitle(fam));
  renderReports();
}

function renderProgramDashboard(controls, families) {
  const baseline    = state.baseline==='L'?'Low':state.baseline==='M'?'Moderate':'High';
  const privSuffix  = state.privacyOverlay ? ' + Privacy' : '';
  const policyFams  = families.filter(f => f !== 'PM');

  // ── Authoritative count for banner (NIST 800-53B baseline, PM shown separately) ──
  const pmSelected  = Object.values(state.pmControls||{}).filter(Boolean).length;
  const authCount   = BASELINE_COUNTS[state.baseline] || controls.length;
  const pmSuffix    = pmSelected ? ' + ' + pmSelected + ' PM' : '';

  // ── Policy stats ──
  const polApproved   = policyFams.filter(f => (state.policyStatus[f]||{}).status === 'Approved').length;
  const polInReview   = policyFams.filter(f => (state.policyStatus[f]||{}).status === 'Under Review');
  const polDraft      = policyFams.filter(f => (state.policyStatus[f]||{}).status === 'Draft').length;
  const polReturned   = policyFams.filter(f => (state.policyStatus[f]||{}).status === 'Returned').length;
  const polNotStarted = policyFams.filter(f => !['Approved','Under Review','Draft','Returned'].includes((state.policyStatus[f]||{}).status)).length;
  const polPct        = policyFams.length ? Math.round((polApproved/policyFams.length)*100) : 0;

  // ── Control stats ──
  // Use authoritative NIST count as the total (abbreviated CONTROLS array is a representative subset)
  const ctrlTotal       = authCount + pmSelected;
  const ctrlImplemented = controls.filter(c => (state.controlStatus[c.id]||{}).status === 'Implemented').length;
  const ctrlInProgress  = controls.filter(c => (state.controlStatus[c.id]||{}).status === 'In Progress').length;
  const ctrlPlanned     = controls.filter(c => (state.controlStatus[c.id]||{}).status === 'Planned').length;
  const ctrlNA          = controls.filter(c => (state.controlStatus[c.id]||{}).status === 'Not Applicable').length;
  const ctrlNotStarted  = ctrlTotal - ctrlImplemented - ctrlInProgress - ctrlPlanned - ctrlNA;
  const implPct         = ctrlTotal ? Math.round((ctrlImplemented/ctrlTotal)*100) : 0;
  const ctrlInScope     = ctrlTotal - ctrlNA;
  const approvedObjectiveControls = new Set();
  function addApprovedObjectiveControls(requirements) {
    (requirements || []).forEach(function(req) {
      var mapped = [];
      if (req) {
        if (Array.isArray(req.controls)) mapped = req.controls;
        else if (typeof req.controls === 'string' && req.controls.trim()) mapped = [req.controls];
        else if (typeof req.controlId === 'string' && req.controlId.trim()) mapped = [req.controlId];
      }
      mapped.forEach(function(cid) {
        var normalized = String(cid || '').trim().toUpperCase();
        if (normalized) approvedObjectiveControls.add(normalized);
      });
    });
  }
  Object.keys(state.domainPolicies || {}).forEach(function(fam) {
    var status = ((state.policyStatus || {})[fam] || {}).status;
    if (status !== 'Approved') return;
    addApprovedObjectiveControls(((state.domainPolicies || {})[fam] || {}).requirements);
  });
  if (getISPStatus() === 'Approved') {
    addApprovedObjectiveControls(((state.infoSecPolicy || {}).requirements || []));
  }
  const withObjective = controls.filter(function(c) {
    if ((state.controlStatus[c.id] || {}).status === 'Not Applicable') return false;
    return approvedObjectiveControls.has(String(c.id || '').trim().toUpperCase());
  }).length;
  const objectivePct = ctrlInScope ? Math.round((withObjective / ctrlInScope) * 100) : 0;
  const withoutObjective = Math.max(0, ctrlInScope - withObjective);

  // ── Asset SSP stats ──
  const allAssets    = state.assets || [];
  const sspAttest    = state.sspAttestations || {};
  const sspSign      = state.sspSignoffs || {};
  let sspTotalCtrl = 0, sspDoneCtrl = 0, sspSubmitted = 0, sspApproved = 0;
  allAssets.forEach(function(a) {
    var ac = getAssetSSPControls(a);
    var at = sspAttest[a.id] || {};
    var sg = sspSign[a.id]   || {};
    sspTotalCtrl += ac.length;
    sspDoneCtrl  += ac.filter(function(c){ return at[c.id] && at[c.id].status; }).length;
    if (sg.status === 'Submitted') sspSubmitted++;
    if (sg.status === 'Approved')  sspApproved++;
  });
  const sspReadyCount = sspSubmitted + sspApproved;
  const sspPct        = sspTotalCtrl ? Math.round(sspDoneCtrl / sspTotalCtrl * 100) : 0;
  const sspLabel      = state.privacyOverlay ? 'SPSP' : 'SSP';

  // ── Activity counts ──
  const activeTasks = ctrlPlanned + ctrlInProgress + polDraft + polInReview.length;
  const underReview = polInReview.length + ctrlInProgress;
  var polReviewNames = [];
  polInReview.forEach(function(f) {
    var w = getPolicyPendingReviewerDisplay(f);
    if (w && polReviewNames.indexOf(w) === -1) polReviewNames.push(w);
  });
  const polReviewFooterSuffix = polInReview.length && polReviewNames.length
    ? ' · ' + polReviewNames.map(function(n) { return escapeHTML(n); }).join('; ')
    : '';

  // ── HTML builder helpers ──
  function pBar(pct, color) {
    return '<div style="height:7px;background:rgba(15,31,61,0.07);border-radius:4px;overflow:hidden;margin:8px 0 12px;">'
      + '<div style="height:100%;background:' + color + ';width:' + Math.min(pct,100) + '%;border-radius:4px;transition:width 0.5s ease;"></div></div>';
  }
  function dot(color, label, count) {
    return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#4b5563;">'
      + '<span style="width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0;"></span>'
      + escapeHTML(label) + ' (' + count + ')</span>';
  }

  // ── Awaiting-approval inbox rows ──
  const awaitingHTML = polInReview.map(fam => {
    const o = state.domainOwners[fam] || {};
    const title = getPolicyMergedTitle(fam);
    const allFams = getPolicyAllFamilies(fam);
    const badges = allFams.map(f => '<span class="family-badge" style="font-size:10px;padding:1px 5px;">' + f + '</span>').join(' ');
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border);">'
      + '<div style="display:flex;gap:10px;align-items:center;">'
      + '<span style="font-size:16px;flex-shrink:0;">📄</span>'
      + '<div><div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">' + badges + '</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--navy);">' + escapeHTML(title) + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Submitted by ' + escapeHTML(o.name||fam) + '</div>'
      + '<div style="font-size:11px;color:#6366f1;margin-top:4px;font-weight:600;">With: ' + escapeHTML(getPolicyPendingReviewerDisplay(fam)) + '</div></div>'
      + '</div>'
      + '<button class="btn btn-secondary btn-sm" onclick="openCISOReview(\'' + fam + '\')">Review →</button>'
      + '</div>';
  }).join('');

  const deselectBaselineDash = controls.filter(function(c) {
    var cs = state.controlStatus[c.id] || {};
    if (cs.deselectDecision !== 'Approved') return false;
    var inBl = c.bl && (c.bl.indexOf(state.baseline) !== -1 || (state.privacyOverlay && c.bl.indexOf('P') !== -1));
    return inBl;
  }).length;

  return `
    <!-- ╔══ Phase 1 Complete banner ══╗ -->
    <div style="border:1px solid #86efac;border-radius:10px;background:linear-gradient(135deg,#f0fdf4,#e8fdf3);overflow:hidden;margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid #86efac;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="background:#166534;color:white;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:0.6px;white-space:nowrap;">PHASE 1 · COMPLETE</span>
          <span style="font-size:13px;font-weight:700;color:#166534;">Establish Program Governance</span>
        </div>
        <span style="font-size:11px;color:#166534;opacity:0.75;">✓ All steps complete</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;">
        <div style="width:22px;height:22px;border-radius:50%;background:#166534;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:white;font-size:11px;font-weight:700;">✓</span>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#166534;">Establish Program Governance Setup Complete</div>
          <div style="font-size:11px;color:#15803d;margin-top:3px;">Your governance program foundation is in place — ${baseline}${privSuffix} baseline · ${authCount}${pmSuffix} controls across ${policyFams.length} families · Cyber Program Owner: <strong>${escapeHTML(state.programOwner||'—')}</strong></div>
        </div>
      </div>
    </div>

    ${deselectBaselineDash ? '<div class="callout-deselected-baseline" style="border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:12px 18px;margin-bottom:16px;font-size:12px;color:#92400e;line-height:1.5;"><strong>Baseline scope note:</strong> ' + deselectBaselineDash + ' control(s) are formally <em>de-selected</em> from the active baseline. They remain in the catalog for audit traceability — open the Control Library and filter <strong>De-selected (baseline)</strong> to review them.</div>' : ''}

    <!-- ╔══ Executive Summary header ══╗ -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-size:16px;font-weight:800;color:var(--navy);">Executive Summary</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(13,148,136,0.09);border:1px solid rgba(13,148,136,0.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--teal);">🔔 Approvals${polInReview.length>0?' · '+polInReview.length:''}</span>
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(13,148,136,0.09);border:1px solid rgba(13,148,136,0.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--teal);">📋 Policy</span>
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(13,148,136,0.09);border:1px solid rgba(13,148,136,0.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--teal);">🔧 Controls</span>
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(13,148,136,0.09);border:1px solid rgba(13,148,136,0.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--teal);">🎯 Objectives</span>
      </div>
    </div>

    <!-- ╔══ Main 2-col layout ══╗ -->
    <div style="display:grid;grid-template-columns:1fr 1.55fr;gap:20px;margin-bottom:18px;align-items:start;">

      <!-- LEFT: Awaiting Your Approval inbox -->
      <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:15px;">📬</span>
          <span style="font-size:14px;font-weight:700;color:var(--navy);">Awaiting Your Approval</span>
          ${polInReview.length > 0 ? '<span style="background:var(--red);color:white;font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;">' + polInReview.length + '</span>' : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px;">Policies submitted for CISO sign-off</div>
        ${awaitingHTML || '<div style="text-align:center;padding:30px 16px;">'
          + '<div style="font-size:24px;margin-bottom:8px;">📭</div>'
          + '<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:4px;">Nothing awaiting approval</div>'
          + '<div style="font-size:11px;color:var(--text-muted);">Policy owners will submit domain policies here when ready for your review.</div>'
          + '</div>'}
      </div>

      <!-- RIGHT: Three stacked status cards -->
      <div style="display:flex;flex-direction:column;gap:14px;">

        <!-- Policy Status -->
        <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>📋</span>
              <span style="font-size:13px;font-weight:700;color:var(--navy);">Policy Status</span>
            </div>
            <span style="font-size:12px;color:var(--text-muted);font-weight:600;">${polApproved}/${policyFams.length}</span>
          </div>
          <div style="font-size:21px;font-weight:800;color:${polApproved===policyFams.length&&policyFams.length>0?'var(--green)':'var(--navy)'};">${polPct}% Approved</div>
          ${pBar(polPct,'var(--teal)')}
          <div style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-bottom:12px;">
            ${dot('var(--green)','Approved',polApproved)}
            ${dot('var(--amber)','In Review',polInReview.length)}
            ${dot('#3b82f6','Draft',polDraft)}
            ${dot('#d1d5db','Not Started',polNotStarted)}
          </div>
          <div id="policy-roadmap-toggle" style="display:none;border-top:1px solid var(--border);padding-top:12px;">
            <button onclick="document.getElementById('policy-roadmap-chart').style.display=document.getElementById('policy-roadmap-chart').style.display==='none'?'block':'none';" style="background:none;border:none;cursor:pointer;color:var(--teal);font-size:12px;font-weight:700;padding:0;">📊 View Roadmap →</button>
            <div id="policy-roadmap-chart" style="display:none;margin-top:12px;max-height:280px;overflow-y:auto;font-size:12px;"></div>
          </div>
        </div>

        <!-- Control Implementation -->
        <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>◎</span>
              <span style="font-size:13px;font-weight:700;color:var(--navy);">Control Implementation</span>
            </div>
            <span style="font-size:12px;color:var(--text-muted);font-weight:600;">${ctrlImplemented}/${ctrlTotal}</span>
          </div>
          <div style="font-size:21px;font-weight:800;color:${implPct===100?'var(--green)':'var(--navy)'};">${implPct}% Implemented</div>
          ${pBar(implPct,'var(--green)')}
          <div style="display:flex;flex-wrap:wrap;gap:10px 16px;">
            ${dot('var(--green)','Implemented',ctrlImplemented)}
            ${dot('#3b82f6','In Review',ctrlInProgress)}
            ${dot('var(--amber)','Planned',ctrlPlanned)}
            ${dot('#d1d5db','Not Started',ctrlNotStarted)}
          </div>
        </div>

        <!-- Control Objectives / Scope -->
        <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>🎯</span>
              <span style="font-size:13px;font-weight:700;color:var(--navy);">Control Objectives</span>
            </div>
            <span style="font-size:12px;color:var(--text-muted);font-weight:600;">${withObjective}/${ctrlInScope}</span>
          </div>
          <div style="font-size:21px;font-weight:800;color:${objectivePct===100?'var(--green)':'var(--navy)'};">${objectivePct}% Established</div>
          ${pBar(objectivePct,'#86efac')}
          <div style="display:flex;flex-wrap:wrap;gap:10px 16px;">
            ${dot('var(--green)','With Objective',withObjective)}
            ${dot('var(--amber)','Without Objective',withoutObjective)}
            ${dot('#d1d5db','Not Applicable',ctrlNA)}
          </div>
        </div>

        <!-- Asset SSP Coverage -->
        <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:18px 20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>🖥️</span>
              <span style="font-size:13px;font-weight:700;color:var(--navy);">Asset ${sspLabel} Coverage</span>
            </div>
            <span style="font-size:12px;color:var(--text-muted);font-weight:600;">${sspReadyCount}/${allAssets.length} submitted</span>
          </div>
          <div style="font-size:21px;font-weight:800;color:${sspPct===100&&allAssets.length>0?'var(--green)':'var(--navy)'};">${sspPct}% Attested</div>
          ${pBar(sspPct,'var(--teal)')}
          <div style="display:flex;flex-wrap:wrap;gap:10px 16px;">
            ${dot('var(--green)','Approved',sspApproved)}
            ${dot('var(--blue)','Submitted',sspSubmitted)}
            ${dot('var(--amber)','In Progress',allAssets.length - sspApproved - sspSubmitted - (allAssets.length - sspApproved - sspSubmitted > 0 ? allAssets.filter(function(a){ var s=(sspSign[a.id]||{}).status; return !s||s==='Not Started'; }).length : 0))}
            ${dot('var(--slate)','Not Started',allAssets.filter(function(a){ var s=(sspSign[a.id]||{}).status; return !s; }).length)}
          </div>
        </div>

      </div><!-- /right column -->
    </div><!-- /2-col grid -->

    <!-- ╔══ Footer: task count + roadmap ══╗ -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:rgba(15,31,61,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:20px;">
      <span style="font-size:12px;color:var(--text-muted);">
        <strong style="color:var(--navy);">${activeTasks}</strong> active tasks ·
        <strong style="color:var(--navy);">${underReview}</strong> under review${polReviewFooterSuffix}
      </span>
      <button style="background:none;border:none;cursor:pointer;color:var(--teal);font-size:12px;font-weight:700;padding:0;"
        onclick="document.getElementById('reports-body').querySelector('.metrics-grid')?.scrollIntoView({behavior:'smooth'})">
        View Roadmap →
      </button>
    </div>

    <!-- ╔══ Action items (only when there's something to do) ══╗ -->
    ${(function(){
      var items = [];
      if (polReturned) items.push({icon:'↩',color:'#ef4444',bg:'#fef2f2',border:'rgba(220,38,38,0.3)',label:polReturned+' polic'+(polReturned===1?'y':'ies')+' returned — needs reassignment',action:'showTab(\'policy\')'});
      if (polInReview.length) {
        var prNames = [];
        polInReview.forEach(function(f) {
          var w = getPolicyPendingReviewerDisplay(f);
          if (w && prNames.indexOf(w) === -1) prNames.push(w);
        });
        var prWho = prNames.length ? ' — with ' + prNames.map(function(n) { return escapeHTML(n); }).join(', ') : '';
        items.push({icon:'👁',color:'#6366f1',bg:'rgba(99,102,241,0.04)',border:'rgba(99,102,241,0.2)',label:polInReview.length+' polic'+(polInReview.length===1?'y':'ies')+' pending review' + prWho,action:'showTab(\'reports\')'});
      }
      var unowned = policyFams.filter(function(f){ var o=state.domainOwners[f]||{}; return !o.name||o.name===(DOMAIN_SUGGESTED_ROLES[f]||''); }).length;
      if (unowned) items.push({icon:'👤',color:'#f59e0b',bg:'#fffbeb',border:'rgba(245,158,11,0.3)',label:unowned+' domain'+(unowned===1?'':'s')+' still need an owner assigned',action:'goToDomainOwnersFromDashboard()'});
      if (!items.length) return '';
      return '<div style="margin-bottom:24px;display:flex;flex-direction:column;gap:8px;">'
        + items.map(function(it){
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid '+it.border+';border-radius:10px;background:'+it.bg+';">'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<span style="font-size:16px;">'+it.icon+'</span>'
            + '<span style="font-size:13px;font-weight:600;color:'+it.color+';">'+it.label+'</span>'
            + '</div>'
            + '<button class="btn btn-sm" style="background:'+it.color+';color:white;border:none;white-space:nowrap;" onclick="'+it.action+'">View →</button>'
            + '</div>';
        }).join('')
        + '</div>';
    })()}

    <!-- ── Divider before detailed reporting ── -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
      <div style="flex:1;height:1px;background:var(--border);"></div>
      <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;color:var(--text-muted);text-transform:uppercase;">Detailed Reporting</div>
      <div style="flex:1;height:1px;background:var(--border);"></div>
    </div>
  `;
}

function getScopedFamilies() {
  if (!state.currentUserId) return getActiveFamilies();
  var user = (state.users||[]).find(function(u){ return u.id === state.currentUserId; });
  if (!user || !user.families || !user.families.length) return getActiveFamilies();
  if (user.role === 'issm' || user.role === 'custodian') return user.families;
  return getActiveFamilies();
}

// True when this login should see the org-level Reports executive block (domain policy approval queue, etc.).
function userSeesProgramExecutiveDashboard(user) {
  if (!user) return false;
  if (user.role === 'ciso' || user.role === 'admin') return true;
  var ids = state._currentPersonIds || [user.id];
  for (var i = 0; i < ids.length; i++) {
    var rec = (state.users || []).find(function(u) { return u.id === ids[i]; });
    if (rec && (rec.role === 'ciso' || rec.role === 'admin')) return true;
  }
  return false;
}


// ─── ASSET OWNER REPORTS VIEW ────────────────────────────────────────────────
// Full replacement for the reports tab when logged in as an asset-owner.
function renderAssetOwnerReport(user) {
  var myAssetIds = (user.assets || []).map(String);
  var myAssets   = (state.assets || []).filter(function(a){ return myAssetIds.includes(String(a.id)); });
  var sspLabel   = state.privacyOverlay ? 'SPSP' : 'SSP';

  // ── Aggregate stats ───────────────────────────────────────────────────────
  var totalControls  = 0;
  var totalAttested  = 0;
  var submitted      = 0;
  var approved       = 0;

  var assetRows = myAssets.map(function(a) {
    var controls = getAssetSSPControls(a);
    var attests  = (state.sspAttestations || {})[a.id] || {};
    var signoff  = (state.sspSignoffs    || {})[a.id]  || {};
    var done     = controls.filter(function(c){ return attests[c.id] && attests[c.id].status; }).length;
    var pct      = controls.length ? Math.round(done / controls.length * 100) : 0;
    var status   = signoff.status === 'Approved'  ? 'Approved'
                 : signoff.status === 'Submitted' ? 'Submitted'
                 : done > 0 ? 'In Progress' : 'Not Started';
    var col      = status === 'Approved'  ? 'var(--green)'
                 : status === 'Submitted' ? 'var(--blue)'
                 : status === 'In Progress' ? 'var(--amber)' : 'var(--slate)';

    totalControls += controls.length;
    totalAttested += done;
    if (status === 'Submitted') submitted++;
    if (status === 'Approved')  approved++;

    return { a:a, controls:controls, done:done, pct:pct, status:status, col:col };
  });

  var overallPct  = totalControls ? Math.round(totalAttested / totalControls * 100) : 0;
  var readyCount  = submitted + approved;

  // ── Personal header card ──────────────────────────────────────────────────
  var roleMeta = ROLE_META['asset-owner'] || {};
  var html = '';

  html += '<div style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:20px;">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">'
    + '<span style="font-size:24px;">' + roleMeta.icon + '</span>'
    + '<div><div style="font-size:16px;font-weight:800;color:#1e3a5f;">' + _esc(user.name) + '</div>'
    + '<div style="font-size:12px;color:#2563eb;">Asset Owner — ' + myAssets.length + ' asset' + (myAssets.length !== 1 ? 's' : '') + ' in scope</div></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;">'
    +   '<div style="font-size:22px;font-weight:800;color:' + (overallPct >= 80 ? 'var(--green)' : overallPct >= 40 ? 'var(--amber)' : '#dc2626') + ';">' + overallPct + '%</div>'
    +   '<div style="font-size:11px;color:var(--text-muted);">Attestation Progress</div></div>'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;">'
    +   '<div style="font-size:22px;font-weight:800;color:var(--navy);">' + totalAttested + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);">/' + totalControls + '</span></div>'
    +   '<div style="font-size:11px;color:var(--text-muted);">Controls Attested</div></div>'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;">'
    +   '<div style="font-size:22px;font-weight:800;color:' + (readyCount === myAssets.length && myAssets.length > 0 ? 'var(--green)' : 'var(--navy)') + ';">' + readyCount + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);">/' + myAssets.length + '</span></div>'
    +   '<div style="font-size:11px;color:var(--text-muted);">SSPs Submitted</div></div>'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;">'
    +   '<div style="font-size:22px;font-weight:800;color:' + (totalControls - totalAttested === 0 ? 'var(--green)' : 'var(--amber)') + ';">' + (totalControls - totalAttested) + '</div>'
    +   '<div style="font-size:11px;color:var(--text-muted);">Pending Attestations</div></div>'
    + '</div></div>';

  // ── Per-asset SSP status table ────────────────────────────────────────────
  html += '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:20px;">'
    + '<div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:14px;">My ' + sspLabel + ' Status</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="border-bottom:2px solid var(--border);">'
    + '<th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Asset</th>'
    + '<th style="text-align:left;padding:6px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Type</th>'
    + '<th style="text-align:center;padding:6px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Controls</th>'
    + '<th style="padding:6px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Progress</th>'
    + '<th style="text-align:center;padding:6px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Status</th>'
    + '<th style="text-align:center;padding:6px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Action</th>'
    + '</tr></thead><tbody id="tbod-${Math.random().toString(36).slice(2,8)}">';

  assetRows.forEach(function(r) {
    html += '<tr style="border-bottom:1px solid var(--border);">'
      + '<td style="padding:10px 8px;font-weight:600;color:var(--navy);">' + _esc(r.a.name || 'Unnamed')
      +   '<div style="font-size:11px;font-weight:400;color:var(--text-muted);margin-top:1px;">' + sspLabel + (r.a.description ? ' · ' + _esc(r.a.description.substring(0,60)) + (r.a.description.length > 60 ? '…' : '') : '') + '</div></td>'
      + '<td style="padding:10px 8px;font-size:12px;color:var(--text-muted);">' + _esc(r.a.type || '—') + '</td>'
      + '<td style="padding:10px 8px;text-align:center;font-weight:600;">' + (r.controls.length || '<span style="color:var(--text-muted);">—</span>') + '</td>'
      + '<td style="padding:10px 8px;min-width:140px;">'
      +   '<div style="display:flex;align-items:center;gap:6px;">'
      +     '<div style="flex:1;background:var(--border);border-radius:3px;height:5px;overflow:hidden;"><div style="height:100%;background:' + r.col + ';width:' + r.pct + '%;border-radius:3px;"></div></div>'
      +     '<span style="font-size:11px;font-weight:600;color:' + r.col + ';min-width:30px;text-align:right;">' + r.pct + '%</span>'
      +   '</div>'
      +   '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + r.done + ' / ' + r.controls.length + ' attested</div>'
      + '</td>'
      + '<td style="padding:10px 8px;text-align:center;">'
      +   '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:10px;background:' + r.col + '22;color:' + r.col + ';white-space:nowrap;">' + r.status + '</span>'
      + '</td>'
      + '<td style="padding:10px 8px;text-align:center;">'
      +   '<button class="btn btn-secondary btn-sm" onclick="openAssetWizardFromLibrary(\'' + r.a.id + '\')" style="font-size:11px;padding:4px 10px;">Open ' + sspLabel + ' →</button>'
      + '</td>'
      + '</tr>';
  });

  if (!assetRows.length) {
    html += '<tr><td colspan="6" style="padding:32px;text-align:center;color:var(--text-muted);">No assets assigned yet.</td></tr>';
  }

  html += '</tbody></table></div>';
  return html;
}

// True when the logged-in viewer should see ISP "awaiting approval" on Reports (CISO/program owner path — not the dedicated approver dashboard).
function shouldShowISPApprovalCallout(user) {
  var p = (state.policyStatus || {}).ISP || {};
  if (p.status !== 'Under Review') return false;
  if (!state.currentUserId) return true;
  if (!user) return false;
  if (user.role === 'ciso' || user.role === 'admin') return true;
  var sub = String(p.submittedTo || '').trim().toLowerCase();
  if (sub && String(user.name || '').trim().toLowerCase() === sub) return true;
  return false;
}

function renderISPApprovalCallout(user) {
  if (!shouldShowISPApprovalCallout(user)) return '';
  var p = (state.policyStatus || {}).ISP || {};
  var title = (state.infoSecPolicy && state.infoSecPolicy.title) || 'Information Security Policy';
  return '<div style="margin-bottom:20px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.06);border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">'
    + '<div><div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;">Action required</div>'
    + '<div style="font-size:15px;font-weight:700;color:var(--navy);margin-top:4px;">Information Security Policy is awaiting your approval</div>'
    + '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' + escapeHTML(title)
    + (p.submittedAt ? ' · Routed for review on ' + escapeHTML(p.submittedAt) : '') + '</div></div>'
    + '<button type="button" class="btn btn-primary btn-sm" onclick="showTab(\'policy\');goToCISOPolicyEditor();">Review & approve →</button>'
    + '</div>';
}

function renderMyDashboard(controls, families) {
  var user = state.currentUserId ? (state.users||[]).find(function(u){ return u.id === state.currentUserId; }) : null;
  if (!user) return '';
  var roleMeta = ROLE_META[user.role] || {};
  var scopedControls = getScopedControls();
  var scopedStatuses = scopedControls.reduce(function(acc, c) {
    var s = (state.controlStatus[c.id]||{}).status||'Not Started';
    acc[s] = (acc[s]||0) + 1; return acc;
  }, {});
  var myImpl = scopedStatuses['Implemented']||0;
  var myTotal = scopedControls.length;
  var myPct = myTotal ? Math.round(myImpl/myTotal*100) : 0;
  var myFamilies = (user.families||[]).filter(function(f){ return f !== 'PM'; });

  // Count overdue items
  var overdue = 0;
  scopedControls.forEach(function(c) {
    var co = (state.controlOwners||{})[c.id] || {};
    if (co.dueDate && co.dueDate < new Date().toISOString().slice(0,10)) overdue++;
  });

  // Pending review count (for ISSM)
  var pendingReview = 0;
  if (user.role === 'issm' || user.role === 'ciso') {
    pendingReview = (state.controlReviewQueue||[]).filter(function(r) {
      if (user.role !== 'issm') return true;
      var fam = (r.controlId||'').replace(/-.*/, '');
      return (user.families||[]).includes(fam);
    }).length;
  }

  return '<div style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:20px;">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">'
    + '<span style="font-size:24px;">' + (roleMeta.icon||'\uD83D\uDC64') + '</span>'
    + '<div><div style="font-size:16px;font-weight:800;color:#1e3a5f;">' + escapeHTML(user.name) + '</div>'
    + '<div style="font-size:12px;color:#2563eb;">' + escapeHTML(roleMeta.label||user.role) + (myFamilies.length ? ' \u2014 ' + myFamilies.join(', ') : '') + '</div></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#166534;">' + myPct + '%</div><div style="font-size:11px;color:var(--text-muted);">My Coverage</div></div>'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--navy);">' + myImpl + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);">/' + myTotal + '</span></div><div style="font-size:11px;color:var(--text-muted);">Implemented</div></div>'
    + '<div style="background:white;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:' + (overdue?'#dc2626':'#166534') + ';">' + overdue + '</div><div style="font-size:11px;color:var(--text-muted);">Overdue</div></div>'
    + (pendingReview ? '<div style="background:white;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#6366f1;">' + pendingReview + '</div><div style="font-size:11px;color:var(--text-muted);">Pending Review</div></div>' : '<div style="background:white;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--navy);">' + myFamilies.length + '</div><div style="font-size:11px;color:var(--text-muted);">My Families</div></div>')
    + '</div></div>';
}

function toggleReportsView() {
  state._reportsMyView = !state._reportsMyView;
  renderReports();
}

// ── ISP Approval actions (for 'approver' role) ────────────────────────────
function approveISP() {
  var notes = (document.getElementById('isp-approver-notes') || {}).value || '';
  if (!state.policyStatus) state.policyStatus = {};
  if (!state.policyReviewCycle) state.policyReviewCycle = {};
  var rc = state.policyReviewCycle.ISP || (state.policyReviewCycle.ISP = {});
  var prev = state.policyStatus.ISP || {};
  var approverUser = state.currentUserId ? (state.users||[]).find(function(u){ return u.id === state.currentUserId; }) : null;
  var approverName = approverUser ? approverUser.name : (rc.approvedBy || 'Approver');
  state.policyStatus.ISP = {
    status: 'Approved',
    approvedBy: approverName,
    approvedDate: new Date().toISOString().slice(0,10),
    approvedAt: new Date().toISOString().slice(0,10),
    notes: notes,
    submittedAt: prev.submittedAt || '',
    submittedTo: prev.submittedTo || rc.approvedBy || '',
    submittedToRole: prev.submittedToRole || rc.approverRole || '',
    submittedToEmail: prev.submittedToEmail || rc.approverEmail || ''
  };
  rc.approvalDate = new Date().toISOString().slice(0,10);
  rc.lastReviewed = new Date().toISOString().slice(0,10);
  if (state.infoSecPolicy) {
    if (!state.infoSecPolicy.revisionHistory) state.infoSecPolicy.revisionHistory = [];
    var ver = '1.' + state.infoSecPolicy.revisionHistory.length;
    state.infoSecPolicy.revisionHistory.push({ version: ver, date: new Date().toISOString().slice(0,10), author: approverName, changes: 'Approved.' + (notes ? ' Notes: ' + notes : '') });
  }
  try { addAuditEntry('policy', 'ISP', 'ISP approved by ' + approverName); } catch(e) {}
  markDirty();
  showToast('\u2705 Information Security Policy approved.');
  goToCISOPolicyEditor();
}

function returnISPToEditor() {
  var notes = (document.getElementById('isp-approver-notes') || {}).value || '';
  if (!notes) { showToast('Please add return comments before returning the policy.', true); return; }
  if (!state.policyStatus) state.policyStatus = {};
  var prev = state.policyStatus.ISP || {};
  state.policyStatus.ISP = {
    status: 'Returned',
    returnedDate: new Date().toISOString().slice(0,10),
    notes: notes,
    submittedAt: prev.submittedAt || '',
    submittedTo: prev.submittedTo || '',
    submittedToRole: prev.submittedToRole || '',
    submittedToEmail: prev.submittedToEmail || ''
  };
  try { addAuditEntry('policy', 'ISP', 'ISP returned with comments: ' + notes); } catch(e) {}
  markDirty();
  showToast('\u21A9 ISP returned to editor with comments.');
  goToCISOPolicyEditor();
}

// ── Approver-role dashboard ────────────────────────────────────────────────
function renderApproverDashboard(user) {
  var isp = state.infoSecPolicy;
  var ispSt = ((state.policyStatus||{}).ISP || {}).status || (isp && isp.title ? 'Under Review' : 'Not Started');
  var rc = (state.policyReviewCycle||{}).ISP || {};
  var submittedBy = rc.submittedTo ? '' : (state.programOwner || 'CISO');
  var approvedDate = ((state.policyStatus||{}).ISP || {}).approvedDate || '';

  var stChip = ispSt === 'Approved'
    ? '<span style="background:rgba(13,148,136,0.1);border:1px solid rgba(13,148,136,0.3);color:var(--teal);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">Approved</span>'
    : ispSt === 'Under Review'
    ? '<span style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);color:#6366f1;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">Pending Your Approval</span>'
    : ispSt === 'Returned'
    ? '<span style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#dc2626;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">Returned</span>'
    : '<span style="background:rgba(100,116,139,0.08);border:1px solid var(--border);color:var(--text-muted);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">Not Started</span>';

  var html = '<div style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:20px;">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">'
    + '<span style="font-size:24px;">\u2705</span>'
    + '<div><div style="font-size:16px;font-weight:800;color:#1e3a5f;">' + escapeHTML(user.name) + '</div>'
    + '<div style="font-size:12px;color:#2563eb;">Policy Approver \u2014 ISP</div></div></div></div>';

  html += '<div style="max-width:700px;">';
  html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:12px;">Your Approval Queue</div>';

  if (!isp || !isp.title) {
    html += '<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:32px;text-align:center;">'
      + '<div style="font-size:32px;margin-bottom:12px;">\uD83D\uDCCB</div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:6px;">No policy awaiting approval</div>'
      + '<div style="font-size:13px;color:var(--text-muted);">The CISO has not yet submitted the Information Security Policy for review.</div>'
      + '</div>';
  } else {
    html += '<div style="background:white;border:1px solid ' + (ispSt==='Under Review'?'rgba(99,102,241,0.3)':'var(--border)') + ';border-radius:10px;padding:20px;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
      + '<div><span style="font-family:monospace;font-size:11px;font-weight:700;background:#e0f2fe;color:#0369a1;padding:2px 7px;border-radius:4px;margin-right:8px;">ISP</span>'
      + '<span style="font-size:15px;font-weight:700;color:var(--navy);">' + escapeHTML(isp.title||'Information Security Policy') + '</span></div>'
      + stChip
      + '</div>';

    if (rc.submittedDate || submittedBy) {
      html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">Submitted by ' + escapeHTML(state.programOwner||'CISO') + (rc.submittedDate ? ' on ' + rc.submittedDate : '') + '</div>';
    }

    html += '<button class="btn btn-secondary btn-sm" style="margin-bottom:16px;" onclick="goToCISOPolicyEditor()">📋 View Full Policy →</button>';

    if (ispSt === 'Under Review') {
      html += '<div style="border-top:1px solid var(--border);padding-top:16px;">'
        + '<div style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:6px;">Review Notes (required to return, optional to approve)</div>'
        + '<textarea id="isp-approver-notes" class="form-input" rows="3" style="font-size:13px;resize:vertical;margin-bottom:12px;" placeholder="Add any notes or conditions for approval…"></textarea>'
        + '<div style="display:flex;gap:10px;">'
        + '<button class="btn btn-sm" style="background:white;border:1px solid rgba(239,68,68,0.4);color:#dc2626;font-weight:600;" onclick="returnISPToEditor()">↩ Return with Comments</button>'
        + '<button class="btn btn-primary btn-sm" onclick="approveISP()">✅ Approve Policy</button>'
        + '</div></div>';
    } else if (ispSt === 'Approved') {
      html += '<div style="font-size:12px;color:var(--teal);font-weight:600;">\u2713 Approved' + (approvedDate ? ' on ' + approvedDate : '') + '</div>';
    } else if (ispSt === 'Returned') {
      html += '<div style="font-size:12px;color:#dc2626;font-weight:600;">\u21A9 Returned — awaiting revision from ' + escapeHTML(state.programOwner||'CISO') + '</div>';
    }

    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderReports() {
  const body = document.getElementById('reports-body');
  if (!body) return;
  if (!state.baseline) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">\uD83D\uDCCA</div><div class="es-title">Reports Unavailable \u2014 Setup Required</div><p>The CISO must complete all 4 program setup steps (baseline selection, PM controls, security policy, and role assignments) before reports can be generated. Go to the CISO tab to continue.</p></div>`;
    return;
  }

  // Always use scoped data for non-admin roles — no toggle needed
  var user = state.currentUserId ? (state.users||[]).find(function(u){ return u.id === state.currentUserId; }) : null;
  var isScoped = !!user && user.role !== 'admin';
  var showMyView = isScoped; // always scoped for non-admin, always full for admin

  const controls = showMyView ? getScopedControls() : getActiveControls();
  const families = showMyView ? getScopedFamilies() : getActiveFamilies();

  // Asset-owners get a completely different SSP-focused view
  var isAssetOwnerRole = user && user.role === 'asset-owner';
  if (isAssetOwnerRole && showMyView) {
    body.innerHTML = renderAssetOwnerReport(user);
    return;
  }

  // Approvers get a focused ISP approval queue — not the program-wide dashboard
  var isApproverRole = user && user.role === 'approver';
  if (isApproverRole && showMyView) {
    body.innerHTML = renderApproverDashboard(user);
    return;
  }

  // Empty state for scoped users with no assignments
  if (showMyView && controls.length === 0 && families.length === 0) {
    var uName = user ? user.name.split(' ')[0] : 'there';
    body.innerHTML = '<div class="empty-state"><div class="es-icon">\uD83D\uDCCA</div><div class="es-title">Welcome, ' + escapeHTML(uName) + '</div>'
      + '<p>No controls or policy domains have been assigned to you yet. Once your CISO or ISSM assigns work to you, your personal dashboard and reports will appear here.</p></div>';
    return;
  }

  const statuses = controls.reduce((acc, c) => {
    const s = (state.controlStatus[c.id]||{}).status||'Not Started';
    acc[s] = (acc[s]||0) + 1; return acc;
  }, {});
  const implemented = statuses['Implemented']||0;
  const planned = statuses['Planned']||0;
  const notStarted = statuses['Not Started']||0;
  const notApplicable = statuses['Not Applicable']||0;
  const policyStatuses = families.reduce((acc, f) => {
    const s = (state.policyStatus[f]||{}).status||'Not Started';
    acc[s] = (acc[s]||0)+1; return acc;
  }, {});
  const testResults = Object.values(state.controlTestResults||{});
  const passed = testResults.filter(r=>r.result==='Pass').length;
  const failed = testResults.filter(r=>r.result==='Fail').length;
  // Use the same control set everywhere on the dashboard — the `controls` array
  // from getActiveControls()/getScopedControls() already includes PM controls
  // that apply to the selected baseline. Adding state.pmControls on top of that
  // double-counts them, causing the "Total in Scope" card to exceed the sum of
  // the Implementation-Status bars.
  const authTotalInReports = controls.length;
  const coveragePct = authTotalInReports ? Math.round((implemented/authTotalInReports)*100) : 0;

  var postSetupCallout = '';
  if (!user && state.cisoComplete) {
    postSetupCallout = '<div style="background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #86efac;border-radius:12px;padding:18px 22px;margin-bottom:22px;max-width:920px;">'
      + '<div style="font-size:15px;font-weight:800;color:#14532d;margin-bottom:8px;">Program setup is complete</div>'
      + '<div style="font-size:13px;color:#166534;line-height:1.6;margin-bottom:14px;">Choose a <strong>workspace</strong> in the sidebar to build domain policies, document controls, manage assets, or run tests. This screen is your program-wide dashboard and reports.</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:10px;">'
      + '<button type="button" class="btn btn-primary" onclick="goToPoliciesHome()">Open domain policies</button>'
      + '<button type="button" class="btn btn-secondary" onclick="showTab(\'users\')">Users &amp; roles</button>'
      + '<button type="button" class="btn btn-secondary" onclick="exportProgramJson()">Export JSON backup</button>'
      + '</div></div>';
  }

  var showProgramExecDashboard = !user || userSeesProgramExecutiveDashboard(user);
  body.innerHTML = `
    ${postSetupCallout}
    ${isScoped && showMyView ? renderMyDashboard(controls, families) : ''}
    ${renderISPApprovalCallout(user)}
    ${showProgramExecDashboard ? renderProgramDashboard(controls, families) : ''}
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="mc-value">${authTotalInReports}</div>
        <div class="mc-label">Total Controls in Scope</div>
        <div class="mc-sub" style="color:var(--text-muted);">${state.baseline==='L'?'Low':state.baseline==='M'?'Moderate':'High'}${state.privacyOverlay?'+Privacy':''} Baseline</div>
      </div>
      <div class="metric-card">
        <div class="mc-value" style="color:var(--green);">${coveragePct}%</div>
        <div class="mc-label">Implementation Coverage</div>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${coveragePct}%"></div></div>
      </div>
      <div class="metric-card">
        <div class="mc-value" style="color:${policyStatuses['Approved']>0?'var(--green)':'var(--amber)'};">${policyStatuses['Approved']||0}</div>
        <div class="mc-label">Approved Policies</div>
        <div class="mc-sub" style="color:var(--text-muted);">of ${families.length} total domains</div>
      </div>
      <div class="metric-card">
        <div class="mc-value" style="color:${failed===0?'var(--green)':'var(--red)'};">${failed}</div>
        <div class="mc-label">Open Test Findings</div>
        <div class="mc-sub" style="color:var(--green);">${passed} passed</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
      <div style="background:white; border:1px solid var(--border); border-radius:10px; padding:20px;">
        <div style="font-weight:700; font-size:14px; margin-bottom:14px; color:var(--navy);">Control Implementation Status</div>
        ${[['Implemented',implemented,'var(--green)'],['Planned',planned,'var(--amber)'],['Not Started',notStarted,'var(--red)'],['Not Applicable',notApplicable,'var(--slate)']].map(([label,count,color])=>`
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <span style="width:100px; font-size:13px;">${label}</span>
          <div style="flex:1; background:var(--border); border-radius:4px; height:10px; overflow:hidden;">
            <div style="height:100%; background:${color}; width:${authTotalInReports?Math.round(count/authTotalInReports*100):0}%; border-radius:4px;"></div>
          </div>
          <span style="font-size:13px; font-weight:600; min-width:30px; text-align:right;">${count}</span>
        </div>`).join('')}
      </div>
      <div style="background:white; border:1px solid var(--border); border-radius:10px; padding:20px;">
        <div style="font-weight:700; font-size:14px; margin-bottom:14px; color:var(--navy);">Policy Status</div>
        ${[['Approved',policyStatuses['Approved']||0,'var(--green)'],['Under Review',policyStatuses['Under Review']||0,'var(--amber)'],['Returned',policyStatuses['Returned']||0,'#dc2626'],['Draft',policyStatuses['Draft']||0,'var(--blue)'],['Not Started',policyStatuses['Not Started']||families.length-(policyStatuses['Approved']||0)-(policyStatuses['Under Review']||0)-(policyStatuses['Draft']||0)-(policyStatuses['Returned']||0),'var(--slate)']].map(([label,count,color])=>`
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <span style="width:100px; font-size:13px;">${label}</span>
          <div style="flex:1; background:var(--border); border-radius:4px; height:10px; overflow:hidden;">
            <div style="height:100%; background:${color}; width:${families.length?Math.round(count/families.length*100):0}%; border-radius:4px;"></div>
          </div>
          <span style="font-size:13px; font-weight:600; min-width:30px; text-align:right;">${count}</span>
        </div>`).join('')}
      </div>
    </div>

    <div style="background:white; border:1px solid var(--border); border-radius:10px; padding:20px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="font-weight:700; font-size:14px; color:var(--navy);">Control Inventory</div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="reportSearch" placeholder="Search..." style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px;" oninput="filterReportTable()">
          <select id="reportFamFilter" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px;" onchange="filterReportTable()">
            <option value="">All Families</option>
            ${families.map(f=>`<option value="${f}">${f}</option>`).join('')}
          </select>
          <select id="reportStatusFilter" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px;" onchange="filterReportTable()">
            <option value="">All Statuses</option>
            <option>Not Started</option><option>Planned</option><option>Implemented</option><option>Not Applicable</option>
          </select>
        </div>
      </div>
      <div class="table-scroll">
        <table class="control-table" id="reportControlTable">
          <thead>
            <tr>
              <th style="width:80px;">ID</th>
              <th>Control Name</th>
              <th style="width:70px;">Family</th>
              <th>Baselines</th>
              <th style="width:130px;">Impl. Status</th>
              <th style="width:100px;">Test Result</th>
            </tr>
          </thead>
          <tbody id="tbod-${Math.random().toString(36).slice(2,8)}">
            ${controls.map(c => {
              const cs = state.controlStatus[c.id]||{};
              const tr = state.controlTestResults[c.id]||{};
              return `<tr data-id="${c.id}" data-family="${c.f}" data-status="${cs.status||'Not Started'}">
                <td><span class="control-id">${c.id}</span></td>
                <td>${c.n}</td>
                <td><span class="family-badge">${c.f}</span></td>
                <td>${pillsHTML(c.bl)}</td>
                <td>${chipHTML(cs.status||'Not Started')}</td>
                <td>${tr.result ? chipHTML(tr.result) : '<span style="color:var(--text-muted); font-size:12px;">Not tested</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="background:white; border:1px solid var(--border); border-radius:10px; padding:20px; margin-bottom:20px;">
      <div style="font-weight:700; font-size:14px; margin-bottom:16px; color:var(--navy);">Per-Family Implementation Breakdown</div>
      <div class="table-scroll">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="text-align:left; padding:10px; font-weight:600;">Family</th>
              <th style="text-align:center; padding:10px; font-weight:600;">Policy</th>
              <th style="text-align:center; padding:10px; font-weight:600;">Controls</th>
              <th style="text-align:center; padding:10px; font-weight:600;">Implemented</th>
              <th style="text-align:center; padding:10px; font-weight:600;">In Progress</th>
              <th style="text-align:center; padding:10px; font-weight:600;">Not Started</th>
              <th style="text-align:center; padding:10px; font-weight:600;">Coverage</th>
            </tr>
          </thead>
          <tbody id="tbod-${Math.random().toString(36).slice(2,8)}">
            ${families.map(fam => {
              const famControls = controls.filter(c => c.f === fam);
              const implemented = famControls.filter(c => (state.controlStatus[c.id]||{}).status === 'Implemented').length;
              const planned = famControls.filter(c => (state.controlStatus[c.id]||{}).status === 'Planned').length;
              const notStarted = famControls.filter(c => (state.controlStatus[c.id]||{}).status === 'Not Started').length;
              const policyStatus = (state.policyStatus[fam]||{}).status || 'Not Started';
              const coverage = famControls.length ? Math.round((implemented / famControls.length) * 100) : 0;
              return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:12px 10px; font-weight:600;">${fam}</td>
                <td style="padding:12px 10px; text-align:center;">${chipHTML(policyStatus)}</td>
                <td style="padding:12px 10px; text-align:center; font-weight:600;">${famControls.length}</td>
                <td style="padding:12px 10px; text-align:center; color:var(--green); font-weight:600;">${implemented}</td>
                <td style="padding:12px 10px; text-align:center; color:var(--amber); font-weight:600;">${planned}</td>
                <td style="padding:12px 10px; text-align:center; color:var(--red); font-weight:600;">${notStarted}</td>
                <td style="padding:12px 10px; text-align:center;"><span style="background:${coverage===100?'var(--green-light)':coverage>=50?'var(--amber-light)':'var(--red-light)'};padding:4px 8px; border-radius:4px; font-weight:600;">${coverage}%</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // Populate policy roadmap, review queue, and audit trail after HTML is rendered
  setTimeout(() => { renderReviewQueuePanel(); renderPolicyRoadmap(families); renderAuditTrailPanel(); }, 100);
}

function renderPolicyRoadmap(families) {
  const toggle = document.getElementById('policy-roadmap-toggle');
  const chart = document.getElementById('policy-roadmap-chart');
  if (!toggle || !chart || !families || families.length === 0) return;

  const today = new Date();
  const sixMonthsOut = new Date(today.getTime() + 180*24*60*60*1000);

  // Get policy data with deadlines
  const policies = families.filter(f => f !== 'PM').map(fam => {
    const status = (state.policyStatus[fam]||{}).status || 'Not Started';
    const deadline = state.domainDeadlines[fam] || deadlineFromPriority(fam);
    const deadlineDate = new Date(deadline);
    const progress = status === 'Approved' ? 100 : status === 'Under Review' ? 60 : status === 'Draft' ? 30 : 0;
    const isOverdue = deadlineDate < today && progress < 100;
    const title = getPolicyMergedTitle(fam);
    return { fam, title, status, deadline, deadlineDate, progress, isOverdue };
  }).sort((a, b) => a.deadlineDate - b.deadlineDate);

  // Show toggle if there are policies
  toggle.style.display = policies.length > 0 ? 'block' : 'none';

  // ── Roll-up by calendar month ──────────────────────────────────
  // Group policies into month buckets, then render one bar per bucket.
  const buckets = {};
  const bucketOrder = [];
  policies.forEach(function(p) {
    const key = p.deadline.slice(0, 7); // 'YYYY-MM'
    if (!buckets[key]) { buckets[key] = { policies:[], date: p.deadlineDate }; bucketOrder.push(key); }
    buckets[key].policies.push(p);
  });

  const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastBucketDate = buckets[bucketOrder[bucketOrder.length-1]]?.date || sixMonthsOut;
  const maxDate = new Date(lastBucketDate.getFullYear(), lastBucketDate.getMonth()+2, 1);
  const totalMs = maxDate - minDate || 1;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  let ganttHTML = '<div style="margin-top:8px;">';
  bucketOrder.forEach(function(key) {
    const bucket  = buckets[key];
    const ps      = bucket.policies;
    const bucketMs = bucket.date - minDate;
    const barWidth = Math.max(4, Math.min(100, (bucketMs / totalMs) * 100));

    // Bucket status: worst-case colour (overdue > not-started > in-progress > approved)
    const hasOverdue  = ps.some(function(p){ return p.isOverdue; });
    const hasApproved = ps.every(function(p){ return p.status === 'Approved'; });
    const hasReview   = ps.some(function(p){ return p.status === 'Under Review'; });
    const barColor = hasOverdue ? 'var(--red)' : hasApproved ? 'var(--green)' : hasReview ? 'var(--amber)' : '#3b82f6';

    const yr = key.slice(0,4), mo = parseInt(key.slice(5),10)-1;
    const label = monthNames[mo] + ' ' + yr;
    const famsLabel = ps.map(function(p){ return p.fam; }).join(', ');
    const countLabel = ps.length + ' ' + (ps.length===1?'policy':'policies');

    ganttHTML += '<div style="margin-bottom:10px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">'
      + '<span style="font-size:12px;font-weight:700;color:var(--navy);">' + label + '</span>'
      + '<span style="font-size:10px;color:var(--text-muted);">' + countLabel + '</span>'
      + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted);margin-bottom:3px);font-family:monospace;">' + escapeHTML(famsLabel) + '</div>'
      + '<div style="height:20px;background:rgba(15,31,61,0.08);border-radius:4px;overflow:hidden;">'
      + '<div style="height:100%;background:' + barColor + ';width:' + barWidth + '%;border-radius:3px;transition:width 0.4s;"></div>'
      + '</div>'
      + '</div>';
  });
  ganttHTML += '</div>';

  chart.innerHTML = ganttHTML;
}

function filterReportTable() {
  const selectAll = document.getElementById('select-all-controls');
  if (selectAll) selectAll.checked = false;
  const selectAllMain = document.getElementById('select-all');
  if (selectAllMain) selectAllMain.checked = false;

  const q = (document.getElementById('reportSearch')?.value||'').toLowerCase();
  const fam = document.getElementById('reportFamFilter')?.value||'';
  const st = document.getElementById('reportStatusFilter')?.value||'';
  document.querySelectorAll('#reportControlTable tbody tr').forEach(row => {
    const id = row.dataset.id||'';
    const family = row.dataset.family||'';
    const status = row.dataset.status||'';
    const name = row.cells[1]?.textContent.toLowerCase()||'';
    row.style.display = (
      (!q || id.toLowerCase().includes(q) || name.includes(q)) &&
      (!fam || family===fam) &&
      (!st || status===st)
    ) ? '' : 'none';
  });
}

function printReport() {
  window.print();
}

function renderAuditTrailPanel() {
  // Append audit trail panel to reports body if it exists
  var body = document.getElementById('reports-body');
  if (!body) return;
  var existing = document.getElementById('auditTrailPanel');
  if (existing) existing.remove();
  var entries = (state.auditTrail || []);
  var fieldCount = (state.changeLog || []).length;
  var mode = state._auditTrailUiMode === 'fields' ? 'fields' : 'events';
  var panel = document.createElement('div');
  panel.id = 'auditTrailPanel';
  panel.style.cssText = 'background:white;border:1px solid var(--border);border-radius:10px;padding:20px;margin-top:20px;';
  var modeRow = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center;">'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">View</span>'
    + '<button type="button" class="btn btn-sm ' + (mode === 'events' ? 'btn-primary' : 'btn-secondary') + '" style="font-size:11px;" onclick="setAuditTrailUiMode(\'events\')">Semantic events</button>'
    + '<button type="button" class="btn btn-sm ' + (mode === 'fields' ? 'btn-primary' : 'btn-secondary') + '" style="font-size:11px;" onclick="setAuditTrailUiMode(\'fields\')">Field-level changes</button>'
    + '</div>';
  var eventFilters = mode === 'events'
    ? '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">'
      + '<button type="button" class="btn btn-sm btn-secondary" onclick="filterAuditView(\'all\')" style="font-size:11px;">All</button>'
      + '<button type="button" class="btn btn-sm btn-secondary" onclick="filterAuditView(\'program\')" style="font-size:11px;">Program</button>'
      + '<button type="button" class="btn btn-sm btn-secondary" onclick="filterAuditView(\'policy\')" style="font-size:11px;">Policy</button>'
      + '<button type="button" class="btn btn-sm btn-secondary" onclick="filterAuditView(\'control\')" style="font-size:11px;">Controls</button>'
      + '</div>'
    : '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;align-items:flex-end;">'
      + '<div><label class="form-label" style="font-size:10px;">User / id contains</label>'
      + '<input class="form-input" style="font-size:12px;min-width:160px;" placeholder="e.g. admin" value="' + escapeHTML(state._changeLogUserFilter || '') + '" oninput="setChangeLogUserFilter(this.value)"></div>'
      + '<div><label class="form-label" style="font-size:10px;">Date contains</label>'
      + '<input class="form-input" style="font-size:12px;min-width:140px;" placeholder="2026-04" value="' + escapeHTML(state._changeLogDateFilter || '') + '" oninput="setChangeLogDateFilter(this.value)"></div>'
      + '</div>';
  panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">'
    + '<div style="font-weight:700;font-size:14px;color:var(--navy);">Activity &amp; change log</div>'
    + '<div style="font-size:12px;color:var(--text-muted);">' + entries.length + ' events · ' + fieldCount + ' field edits (retained)</div>'
    + '</div>'
    + modeRow
    + eventFilters
    + '<div id="auditTrailContent"></div>';
  body.appendChild(panel);
  syncAuditTrailPanelContent();
}

function filterAuditView(type) {
  state._auditTrailEventCatFilter = type || 'all';
  syncAuditTrailPanelContent();
}

// ── Attestation Review Queue (for CISO / ISSM on Reports) ──────────────
function renderReviewQueuePanel() {
  var body = document.getElementById('reports-body');
  if (!body) return;
  var existing = document.getElementById('reviewQueuePanel');
  if (existing) existing.remove();

  var queue = (state.controlReviewQueue || []);
  // Scope queue to current user's families if ISSM
  var user = state.currentUserId ? (state.users||[]).find(function(u){ return u.id === state.currentUserId; }) : null;
  if (user && user.role === 'issm' && user.families && user.families.length) {
    queue = queue.filter(function(r) {
      var fam = r.family || (r.controlId||'').replace(/-.*/, '');
      return user.families.includes(fam);
    });
  }
  // Only show for admin, ciso, issm
  if (user && user.role !== 'ciso' && user.role !== 'issm') return;
  if (!queue.length) return;

  var panel = document.createElement('div');
  panel.id = 'reviewQueuePanel';
  panel.style.cssText = 'background:white;border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:20px;';

  var rows = queue.map(function(r) {
    var ctrl = CONTROLS.find(function(c){ return c.id === r.controlId; });
    var cs = (state.controlStatus||{})[r.controlId] || {};
    var owner = (state.controlOwners||{})[r.controlId] || {};
    var submitted = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '';
    var statusColor = cs.status === 'Implemented' ? '#16a34a' : cs.status === 'In Progress' ? '#f59e0b' : '#6b7280';
    return '<tr style="border-bottom:1px solid rgba(0,0,0,0.05);">'
      + '<td style="padding:8px 10px;font-family:monospace;font-weight:700;font-size:12px;">' + escapeHTML(r.controlId) + '</td>'
      + '<td style="padding:8px 10px;font-size:12px;">' + escapeHTML(ctrl ? ctrl.n : '') + '</td>'
      + '<td style="padding:8px 10px;font-size:12px;">' + escapeHTML(r.submittedBy || owner.name || '') + '</td>'
      + '<td style="padding:8px 10px;font-size:12px;color:' + statusColor + ';font-weight:600;">' + escapeHTML(cs.status || 'Unknown') + '</td>'
      + '<td style="padding:8px 10px;font-size:11px;color:var(--text-muted);">' + submitted + '</td>'
      + '<td style="padding:8px 6px;text-align:right;white-space:nowrap;">'
      + '<button class="btn btn-sm" style="background:#16a34a;color:white;border:none;font-size:11px;padding:3px 8px;margin-right:4px;" onclick="reviewQueueAction(\'' + r.controlId + '\',\'approve\')">Approve</button>'
      + '<button class="btn btn-sm" style="background:#f59e0b;color:white;border:none;font-size:11px;padding:3px 8px;" onclick="reviewQueueAction(\'' + r.controlId + '\',\'return\')">Request Evidence</button>'
      + '</td></tr>';
  }).join('');

  panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
    + '<div style="display:flex;align-items:center;gap:10px;">'
    + '<span style="font-size:18px;">\uD83D\uDCCB</span>'
    + '<div><div style="font-weight:700;font-size:14px;color:var(--navy);">Attestation Review Queue</div>'
    + '<div style="font-size:12px;color:var(--text-muted);">' + queue.length + ' control' + (queue.length===1?'':'s') + ' awaiting your review</div></div></div>'
    + '<button class="btn btn-sm btn-secondary" style="font-size:11px;" onclick="approveAllReviewQueue()">Approve All</button>'
    + '</div>'
    + '<div class="table-scroll"><table style="width:100%;border-collapse:collapse;">'
    + '<thead><tr style="background:#f8fafc;border-bottom:1px solid var(--border);">'
    + '<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);">Control</th>'
    + '<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);">Name</th>'
    + '<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);">Submitted By</th>'
    + '<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);">Status</th>'
    + '<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);">Date</th>'
    + '<th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:var(--text-muted);">Action</th>'
    + '</tr></thead><tbody id="tbod-${Math.random().toString(36).slice(2,8)}">' + rows + '</tbody></table></div>';

  // Insert at the top of reports body, before metrics
  body.insertBefore(panel, body.firstChild);
}

function reviewQueueAction(controlId, action) {
  if (action === 'approve') {
    // Remove from queue, mark as reviewed
    state.controlReviewQueue = (state.controlReviewQueue||[]).filter(function(r){ return r.controlId !== controlId; });
    addAuditEntry('control', controlId, 'Attestation approved');
    showToast('\u2705 ' + controlId + ' approved');
  } else if (action === 'return') {
    // Mark as needing evidence, keep in queue with updated status
    var item = (state.controlReviewQueue||[]).find(function(r){ return r.controlId === controlId; });
    if (item) item.status = 'Evidence Requested';
    addAuditEntry('control', controlId, 'Additional evidence requested');
    showToast('\u26A0\uFE0F Evidence request sent for ' + controlId);
  }
  renderReviewQueuePanel();
}

function approveAllReviewQueue() {
  var queue = state.controlReviewQueue || [];
  if (!queue.length) return;
  if (!confirm('Approve all ' + queue.length + ' pending attestations?')) return;
  queue.forEach(function(r) { addAuditEntry('control', r.controlId, 'Attestation approved (bulk)'); });
  state.controlReviewQueue = [];
  showToast('\u2705 All attestations approved');
  renderReviewQueuePanel();
}

// ============================================================
// USERS & ROLES
// ============================================================

const ROLE_META = {
  'ciso':          { label:'Program Owner',          icon:'🏛️', color:'#6366f1', desc:'Owns the Tier 1 Information Security Policy. High-level program oversight across all domains.' },
  'issm':          { label:'ISSM / Domain Policy Owner',    icon:'🛡️', color:'#0ea5e9', desc:'Drafts and maintains Tier 2 domain-level policies for assigned control families. Oversees ISSOs.' },
  'control-owner': { label:'Control Owner',                 icon:'🔧', color:'#f59e0b', desc:'Implements and attests assigned controls. Writes Tier 3 procedures and produces evidence.' },
  'asset-owner':   { label:'Asset Owner',                   icon:'🖥️', color:'#10b981', desc:'Completes and signs off System Security Plans (SSPs) for assigned assets.' },
  'custodian':     { label:'Policy Custodian',              icon:'📂', color:'#8b5cf6', desc:'Read-only view of assigned policies. Reviews and downloads policy documents.' },
  'approver':      { label:'Policy Approver (ISP)',         icon:'✅', color:'#059669', desc:'Signs off the Tier 1 Information Security Policy when routed for review. Uses Reports and the Policy Library — not the Domain policies workspace (Tier 2 ISSM drafting).' },
};


// Role-specific default workspaces
const ROLE_DEFAULT_TAB = {
  'ciso':          'ciso',
  'issm':          'policy',
  'control-owner': 'control',
  'asset-owner':   'asset',
  'custodian':     'policy',
  'approver':      'reports',
};

function showRolePicker() {
  const overlay = document.getElementById('rolePickerOverlay');
  if (!overlay) return;
  // Sync users from domain owners, control owners, etc. so the picker shows current data
  syncUsersFromState();
  // Update subtitle with org name if set
  const sub = document.getElementById('rolePickerSubtitle');
  if (sub) sub.textContent = 'Select your profile to continue';
  renderRolePickerProfiles();
  overlay.style.display = 'flex';
}

function renderRolePickerProfiles() {
  const container = document.getElementById('rolePickerProfiles');
  if (!container) return;
  if (!state.users || state.users.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:rgba(255,255,255,0.35);font-size:14px;">'
      + 'No users have been added yet.<br><span style="font-size:12px;margin-top:6px;display:block;">An admin can add users in the Users &amp; Roles section.</span></div>';
    return;
  }

  // ── Group users by PERSON (name), merging roles ──
  var roleOrder = ['ciso','issm','control-owner','asset-owner','custodian'];
  var byPerson = {};
  var personOrder = [];
  state.users.forEach(function(u) {
    var key = (u.name || '').trim().toLowerCase();
    if (!key) return;
    if (!byPerson[key]) {
      byPerson[key] = { name: u.name, records: [], roles: [], primaryId: u.id };
      personOrder.push(key);
    }
    byPerson[key].records.push(u);
    if (byPerson[key].roles.indexOf(u.role) === -1) byPerson[key].roles.push(u.role);
  });

  // Sort people: CISO first, then by role priority
  personOrder.sort(function(a, b) {
    var ra = 99, rb = 99;
    byPerson[a].roles.forEach(function(r){ var i = roleOrder.indexOf(r); if (i !== -1 && i < ra) ra = i; });
    byPerson[b].roles.forEach(function(r){ var i = roleOrder.indexOf(r); if (i !== -1 && i < rb) rb = i; });
    return ra - rb;
  });

  // Build assignment text for a person across all their records
  var buildAssignText = function(records) {
    var parts = [];
    records.forEach(function(u) {
      if ((u.role === 'issm' || u.role === 'custodian') && u.families && u.families.length)
        parts.push(u.families.join(', '));
      else if (u.role === 'control-owner' && u.controls && u.controls.length)
        parts.push(u.controls.length + ' control(s)');
      else if (u.role === 'asset-owner' && u.assets && u.assets.length)
        parts.push(u.assets.length + ' asset(s)');
    });
    return parts.join(' · ');
  };

  var html = '';
  personOrder.forEach(function(key) {
    var person = byPerson[key];
    var primaryRole = person.roles[0] || 'custodian';
    // Find highest-priority role for the primary color
    for (var rp = 0; rp < roleOrder.length; rp++) {
      if (person.roles.indexOf(roleOrder[rp]) !== -1) { primaryRole = roleOrder[rp]; break; }
    }
    var pm = ROLE_META[primaryRole] || { label: primaryRole, icon:'👤', color:'#64748b', desc:'' };
    var assignText = buildAssignText(person.records);
    // Use the first record's ID for login — applyRoleView will find all sibling records by name
    var loginId = person.primaryId;

    html += '<div onclick="selectUserProfile(\'' + loginId + '\')" '
      + 'style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;cursor:pointer;transition:all 0.15s;" '
      + 'onmouseenter="this.style.background=\'rgba(255,255,255,0.12)\';this.style.borderColor=\'' + pm.color + '\';" '
      + 'onmouseleave="this.style.background=\'rgba(255,255,255,0.06)\';this.style.borderColor=\'rgba(255,255,255,0.1)\';">'
      + '<div style="font-size:24px;margin-bottom:10px;">' + pm.icon + '</div>'
      + '<div style="color:white;font-weight:600;font-size:15px;margin-bottom:8px;">' + _esc(person.name) + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
    // Show a badge for each role this person holds
    person.roles.forEach(function(role) {
      var rm = ROLE_META[role] || { label: role, color:'#64748b' };
      html += '<span style="display:inline-block;background:' + rm.color + '22;color:' + rm.color + ';font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;">' + rm.label + '</span>';
    });
    html += '</div>';
    if (assignText) {
      html += '<div style="color:rgba(255,255,255,0.4);font-size:12px;font-family:monospace;">' + _esc(assignText) + '</div>';
    }
    html += '</div>';
  });

  container.innerHTML = html;
}

function selectUserProfile(userId) {
  if(typeof window !== 'undefined') {
    window.selectedControl = null;
    window.selectedDomain = null;
    if(state) state._policyDomain = null;
  }
  const rightPanel = document.getElementById('right-panel-content');
  if(rightPanel) rightPanel.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Loading user context...</div>';
  const origText = document.body.style.opacity;
  document.body.style.opacity = '0.7';
  setTimeout(() => { document.body.style.opacity = origText; }, 300);

  const overlay = document.getElementById('rolePickerOverlay');
  if (overlay) overlay.style.display = 'none';
  applyRoleView(userId);
  if (userId === 'admin') {
    showTab('ciso');
    showToast('🔑 Admin mode');
  } else {
    const u = state.users.find(function(x){ return x.id === userId; });
    if (u) showToast('👤 Signed in as ' + u.name);
  }
}

function applyRoleView(userId) {
  state.currentUserId = userId === 'admin' ? null : userId;
  const user = state.currentUserId ? state.users.find(function(u){ return u.id === state.currentUserId; }) : null;

  // Clear transient UI state to prevent stale selections from a different persona
  state._selectedCtrl      = null;
  state._policyDomain      = null;
  state._policyOwnerFilter = '';
  state._selectedAssetId   = null;
  state._selectedProcessId = null;

  // Update profile button label
  const btn = document.getElementById('profileBtn');
  if (btn) btn.textContent = user ? '👤 ' + user.name : '🔑 Admin';

  // Admin: show all tabs (including users & roles)
  if (!user) {
    TAB_IDS.forEach(function(id) {
      const nav = document.getElementById('nav-' + id);
      if (nav) nav.style.display = '';
    });
    const adminSection = document.getElementById('sidebar-users-section');
    if (adminSection) adminSection.style.display = '';
    return;
  }

  // Non-admin: hide Users & Roles nav and admin sidebar section
  const adminSection = document.getElementById('sidebar-users-section');
  if (adminSection) adminSection.style.display = 'none';

  // ── Merge tabs from ALL roles this person holds ──
  // Find every user record with the same name (case-insensitive)
  var nameKey = (user.name || '').trim().toLowerCase();
  var allRecords = (state.users || []).filter(function(u) {
    return u.name && u.name.trim().toLowerCase() === nameKey;
  });
  // Store sibling IDs so other code can check all roles for this person
  state._currentPersonIds = allRecords.map(function(u){ return u.id; });

  var allRoles = [];
  allRecords.forEach(function(rec) {
    var recRoles = (rec.roles && rec.roles.length) ? rec.roles : [rec.role];
    recRoles.forEach(function(r) {
      if (allRoles.indexOf(r) === -1) allRoles.push(r);
    });
  });

  var visible = getPersonVisibleTabIds(user);

  TAB_IDS.forEach(function(id) {
    const nav = document.getElementById('nav-' + id);
    if (nav) nav.style.display = visible.indexOf(id) !== -1 ? '' : 'none';
  });

  // Navigate to the highest-priority role's default tab (approver last — defaults to Reports)
  var rolePriority = ['ciso','issm','control-owner','asset-owner','custodian','approver'];
  var primaryRole = user.role;
  for (var rp = 0; rp < rolePriority.length; rp++) {
    if (allRoles.indexOf(rolePriority[rp]) !== -1) { primaryRole = rolePriority[rp]; break; }
  }
  var defaultTab = ROLE_DEFAULT_TAB[primaryRole] || visible[0] || 'reports';
  if (visible.indexOf(defaultTab) === -1) {
    defaultTab = visible.indexOf('reports') !== -1 ? 'reports' : (visible[0] || 'reports');
  }
  showTab(defaultTab);

  // For policy-based roles: pre-select first assigned family from any ISSM/custodian record
  var policyFams = [];
  allRecords.forEach(function(rec) {
    if ((rec.role === 'issm' || rec.role === 'custodian') && rec.families) {
      rec.families.forEach(function(f){ if (policyFams.indexOf(f) === -1) policyFams.push(f); });
    }
  });
  if (policyFams.length) {
    state._policyDomain = policyFams[0];
    state._policyOwnerFilter = '';
  }

  // For control owners: pre-select first assigned control from any control-owner record
  var ctrlIds = [];
  allRecords.forEach(function(rec) {
    if (rec.role === 'control-owner' && rec.controls) {
      rec.controls.forEach(function(c){ if (ctrlIds.indexOf(c) === -1) ctrlIds.push(c); });
    }
  });
  if (ctrlIds.length) {
    state._selectedCtrl = ctrlIds[0];
    goToStep('control', 1);
  }
}

// ---- User Sync ----

// Upsert a user by name (case-insensitive). If the person already exists:
//   - merges family/control assignments if the role matches
//   - fills in missing email
//   - marks as auto-generated
// If they don't exist, creates a new record.
function upsertUser(data) {
  if (!state.users) state.users = [];
  var nName = data.name.trim().toLowerCase();
  
  var existing = state.users.find(function(u) {
    return u.name.trim().toLowerCase() === nName;
  });

  if (existing) {
    if (data.email && !existing.email) existing.email = data.email;
    if (!existing.families) existing.families = [];
    if (!existing.controls) existing.controls = [];
    if (!existing.assets)   existing.assets   = [];
    
    if(!existing.roles) existing.roles = [existing.role];
    if(data.role && !existing.roles.includes(data.role)) existing.roles.push(data.role);
    
    (data.families || []).forEach(function(f) { if (!existing.families.includes(f)) existing.families.push(f); });
    (data.controls || []).forEach(function(c) { if (!existing.controls.includes(c)) existing.controls.push(c); });
    if (data.assets && data.assets.length>0) existing.assets = data.assets; 
    
    existing._autoGenerated = true;
  } else {
    state.users.push({
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      name: data.name.trim(),
      email: data.email || '',
      role: data.role,
      roles: [data.role],
      families: data.families || [],
      controls: data.controls || [],
      assets: data.assets || [],
      note: data.note || '',
      _autoGenerated: true,
    });
  }
}

// Reads all role assignments made throughout the wizard and syncs them
// into state.users. Called every time the Users tab is rendered so it
// is always up to date without needing explicit save hooks everywhere.
function syncUsersFromState() {
  // 1. Program Owner → CISO (include any domains they own directly)
  if (state.programOwner && state.programOwner.trim()) {
    var cisoFamilies = [];
    var cisoNameKey = state.programOwner.trim().toLowerCase();
    Object.keys(state.domainOwners || {}).forEach(function(fam) {
      var o = state.domainOwners[fam];
      if (o && o.name && o.name.trim().toLowerCase() === cisoNameKey) cisoFamilies.push(fam);
    });
    upsertUser({
      name: state.programOwner,
      email: state.programOwnerEmail || '',
      role: 'ciso',
      families: cisoFamilies,
      note: state.programOwnerTitle || '',
    });
  }

  // 2. Domain Owners → ISSM (aggregate multi-domain owners by name)
  //    Skip if this person is already the CISO (same name) to avoid duplicates
  //    First, clear auto-generated ISSM family assignments so reassignments take effect cleanly
  var cisoKey = (state.programOwner || '').trim().toLowerCase();
  if (state.users) {
    state.users.forEach(function(u) {
      if (u.role === 'issm' && u._autoGenerated) {
        u.families = [];
      }
    });
  }
  var issmByName = {};
  Object.keys(state.domainOwners || {}).forEach(function(fam) {
    var o = state.domainOwners[fam];
    if (!o || !o.name) return;
    var key = o.name.trim().toLowerCase();
    if (key === cisoKey) return;  // CISO already synced above — don't create a second entry
    if (!issmByName[key]) issmByName[key] = { name: o.name.trim(), email: o.email || '', families: [] };
    if (!issmByName[key].families.includes(fam)) issmByName[key].families.push(fam);
  });
  Object.keys(issmByName).forEach(function(k) {
    var d = issmByName[k];
    upsertUser({ name: d.name, email: d.email, role: 'issm', families: d.families });
  });

  // 3a. ISP Custodian (Tier 1 policy) → custodian
  var ispCust = state.infoSecPolicy && state.infoSecPolicy.custodian;
  if (ispCust && ispCust.name && ispCust.name.trim()) {
    upsertUser({ name: ispCust.name.trim(), email: ispCust.email || '', role: 'custodian', families: ['ISP'] });
  }

  // 3. Domain Policy Custodians → custodian (aggregate by name)
  var custByName = {};
  Object.keys(state.policyCustodians || {}).forEach(function(fam) {
    var entry = state.policyCustodians[fam];
    // support both legacy string format and new object format
    var name  = typeof entry === 'string' ? entry : (entry && entry.name) || '';
    var email = typeof entry === 'string' ? '' : (entry && entry.email) || '';
    var role  = typeof entry === 'string' ? '' : (entry && entry.role) || '';
    if (!name || !name.trim()) return;
    var key = name.trim().toLowerCase();
    if (!custByName[key]) custByName[key] = { name: name.trim(), email: email, role: role, families: [] };
    if (!custByName[key].families.includes(fam)) custByName[key].families.push(fam);
    // fill in email/role if we see them later for same person
    if (email && !custByName[key].email) custByName[key].email = email;
    if (role && !custByName[key].role) custByName[key].role = role;
  });
  Object.keys(custByName).forEach(function(k) {
    var d = custByName[k];
    upsertUser({ name: d.name, email: d.email, role: 'custodian', families: d.families });
  });

  // 4. Control Owners → control-owner (aggregate by name)
  var ctrlByName = {};
  Object.keys(state.controlOwners || {}).forEach(function(ctrlId) {
    var o = state.controlOwners[ctrlId];
    if (!o || !o.name) return;
    var key = o.name.trim().toLowerCase();
    if (!ctrlByName[key]) ctrlByName[key] = { name: o.name.trim(), email: o.email || '', controls: [] };
    if (!ctrlByName[key].controls.includes(ctrlId)) ctrlByName[key].controls.push(ctrlId);
  });
  Object.keys(ctrlByName).forEach(function(k) {
    var d = ctrlByName[k];
    upsertUser({ name: d.name, email: d.email, role: 'control-owner', controls: d.controls });
  });

  // 5. Policy Review Approvers (sync custom approvers different from default)
  Object.keys(state.policyReviewCycle || {}).forEach(function(policyKey) {
    var rc = state.policyReviewCycle[policyKey];
    if (!rc || !rc.approvedBy || !rc.approvedBy.trim()) return;

    // Default formal approver is the program owner (CISO) for both ISP and domain policies; ISSM is policy owner, not default approver.
    var defaultApproverName = (state.programOwner || '').trim();

    // Only create a user entry if the approver differs from the default
    var currentApproverName = rc.approvedBy.trim();
    var approverKey = currentApproverName.toLowerCase();
    if (approverKey === defaultApproverName.toLowerCase() || approverKey === cisoKey) return;

    upsertUser({ name: currentApproverName, email: rc.approverEmail || '', role: 'approver', families: [policyKey] });
  });

  // 6. Asset Owners → asset-owner (aggregate by name from state.assets)
  var assetOwnerByName = {};
  (state.assets || []).forEach(function(a) {
    if (!a.owner || !a.owner.trim()) return;
    var key = a.owner.trim().toLowerCase();
    if (!assetOwnerByName[key]) assetOwnerByName[key] = { name: a.owner.trim(), email: a.ownerEmail || '', assets: [] };
    assetOwnerByName[key].assets.push(a.id);
    if (a.ownerEmail && !assetOwnerByName[key].email) assetOwnerByName[key].email = a.ownerEmail;
  });
  Object.keys(assetOwnerByName).forEach(function(k) {
    var d = assetOwnerByName[k];
    upsertUser({ name: d.name, email: d.email, role: 'asset-owner', assets: d.assets });
  });
}

// ---- Users Tab Render ----

function renderUsersTab() {
  const body = document.getElementById('users-body');
  if (!body) return;

  // Pull in any roles assigned elsewhere in the wizard
  syncUsersFromState();

  const families = Object.keys(FAMILIES).sort();
  const allControls = CONTROLS || [];

  let html = '<div style="max-width:900px;">';

  // Summary bar
  const counts = {};
  (state.users || []).forEach(function(u){ counts[u.role] = (counts[u.role]||0)+1; });
  html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px;">';
  Object.keys(ROLE_META).forEach(function(r) {
    const m = ROLE_META[r];
    html += '<div style="background:' + m.color + '18;border:1px solid ' + m.color + '44;border-radius:8px;padding:8px 16px;display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:16px;">' + m.icon + '</span>'
      + '<span style="font-size:13px;font-weight:600;color:' + m.color + ';">' + (counts[r]||0) + '</span>'
      + '<span style="font-size:12px;color:#64748b;">' + m.label + '</span>'
      + '</div>';
  });
  html += '</div>';

  // Add user form (inline)
  html += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">'
    + '<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:16px;">➕ Add New User</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Full Name *</label>'
    + '<input id="newUserName" placeholder="Jane Smith" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" /></div>'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Email</label>'
    + '<input id="newUserEmail" placeholder="jane@agency.gov" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" /></div>'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Role *</label>'
    + '<select id="newUserRole" onchange="renderNewUserAssignments()" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:white;">'
    + '<option value="">— select role —</option>'
    + Object.keys(ROLE_META).map(function(r){ return '<option value="' + r + '">' + ROLE_META[r].icon + ' ' + ROLE_META[r].label + '</option>'; }).join('')
    + '</select></div>'
    + '</div>'
    + '<div id="newUserAssignments" style="margin-bottom:12px;"></div>'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Note (optional)</label>'
    + '<input id="newUserNote" placeholder="e.g. Primary contact for AC/IA domain" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;" /></div>'
    + '<div style="margin-top:16px;">'
    + '<button class="btn" onclick="saveNewUser()" style="padding:8px 20px;font-size:13px;">Add User</button>'
    + '</div>'
    + '</div>';

  // User list
  if (!state.users || state.users.length === 0) {
    html += '<div style="text-align:center;padding:48px;color:#94a3b8;font-size:14px;background:#f8fafc;border:1px dashed #e2e8f0;border-radius:12px;">'
      + '👥 No users added yet. Add your first user above.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:12px;">';
    (state.users || []).forEach(function(u, idx) {
      const m = ROLE_META[u.role] || { label:u.role, icon:'👤', color:'#64748b' };
      const assignText = (u.role === 'issm' || u.role === 'custodian')
        ? (u.families && u.families.length ? u.families.map(function(f){ return '<span style="font-family:monospace;font-weight:700;">' + f + '</span>'; }).join(' ') : '<span style="color:#94a3b8;">No domains assigned</span>')
        : u.role === 'control-owner'
          ? (u.controls && u.controls.length ? u.controls.slice(0,6).map(function(c){ return '<span style="font-family:monospace;font-size:11px;background:#f1f5f9;padding:1px 5px;border-radius:3px;">' + c + '</span>'; }).join(' ') + (u.controls.length > 6 ? ' <span style="color:#94a3b8;">+' + (u.controls.length-6) + ' more</span>' : '') : '<span style="color:#94a3b8;">No controls assigned</span>')
          : '';
      html += '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;display:flex;align-items:center;gap:16px;">'
        + '<div style="font-size:28px;">' + m.icon + '</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
        + '<span style="font-weight:700;font-size:15px;color:#1e293b;">' + _esc(u.name) + '</span>'
        + '<span style="background:' + m.color + '18;color:' + m.color + ';font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;">' + m.label + '</span>'
        + (u._autoGenerated ? '<span style="background:#f0fdf4;color:#16a34a;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid #bbf7d0;" title="Automatically synced from wizard">⚙ synced</span>' : '<span style="background:#fafafa;color:#94a3b8;font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;border:1px solid #e2e8f0;">manual</span>')
        + (u.email ? '<span style="color:#94a3b8;font-size:12px;">' + _esc(u.email) + '</span>' : '')
        + '</div>'
        + (assignText ? '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">' + assignText + '</div>' : '')
        + (u.note ? '<div style="color:#94a3b8;font-size:12px;margin-top:4px;">' + _esc(u.note) + '</div>' : '')
        + '</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="previewAsUser(\'' + u.id + '\')" title="Preview as this user" style="background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;">👁 Preview</button>'
        + '<button onclick="openEditUserModal(\'' + u.id + '\')" title="Edit user" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;">✏️ Edit</button>'
        + '<button onclick="removeUser(\'' + u.id + '\')" title="Remove user" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;">✕</button>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  body.innerHTML = html;
}

function renderNewUserAssignments() {
  const role = document.getElementById('newUserRole').value;
  const container = document.getElementById('newUserAssignments');
  if (!container) return;
  if (!role || role === 'ciso') { container.innerHTML = ''; return; }

  const families = getActiveFamilies ? getActiveFamilies() : Object.keys(FAMILIES);

  if (role === 'issm' || role === 'custodian') {
    container.innerHTML = '<label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Assigned Domains</label>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;">'
      + families.filter(function(f){ return f !== 'PM'; }).map(function(f) {
          return '<label style="display:flex;align-items:center;gap:5px;background:#f1f5f9;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;">'
            + '<input type="checkbox" value="' + f + '" name="newUserFam"> <span style="font-family:monospace;font-weight:700;">' + f + '</span> <span style="color:#64748b;">' + (FAMILIES[f]||f) + '</span></label>';
        }).join('')
      + '</div>';
  } else if (role === 'control-owner') {
    const ctrls = (CONTROLS || []).filter(function(c){ return families.includes(c.f); });
    container.innerHTML = '<label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Assigned Controls</label>'
      + '<div style="max-height:180px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;">'
      + ctrls.map(function(c) {
          return '<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">'
            + '<input type="checkbox" value="' + c.id + '" name="newUserCtrl"> <span style="font-family:monospace;font-weight:600;">' + c.id + '</span></label>';
        }).join('')
      + '</div>';
  }
}

function saveNewUser() {
  const name = (document.getElementById('newUserName').value || '').trim();
  const email = (document.getElementById('newUserEmail').value || '').trim();
  const role = document.getElementById('newUserRole').value;
  const note = (document.getElementById('newUserNote').value || '').trim();
  if (!name) { showToast('⚠️ Name is required'); return; }
  if (!role) { showToast('⚠️ Please select a role'); return; }

  const families = Array.from(document.querySelectorAll('input[name="newUserFam"]:checked')).map(function(cb){ return cb.value; });
  const controls = Array.from(document.querySelectorAll('input[name="newUserCtrl"]:checked')).map(function(cb){ return cb.value; });

  const user = { id: 'u_' + Date.now(), name: name, email: email, role: role, families: families, controls: controls, note: note };
  if (!state.users) state.users = [];
  state.users.push(user);
  showToast('✅ ' + name + ' added');
  renderUsersTab();
}

function removeUser(id) {
  state.users = (state.users || []).filter(function(u){ return u.id !== id; });
  if (state.currentUserId === id) applyRoleView('admin');
  renderUsersTab();
  showToast('User removed');
}

function previewAsUser(id) {
  selectUserProfile(id);
  showToast('👁 Previewing as ' + (state.users.find(function(u){ return u.id===id; })||{}).name);
}

function openEditUserModal(id) {
  var u = (state.users||[]).find(function(u){ return u.id === id; });
  if (!u) return;
  var overlay = document.createElement('div');
  overlay.id = 'editUserOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:28px 32px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);">'
    + '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:20px;">✏️ Edit User</div>'
    + '<div style="display:flex;flex-direction:column;gap:14px;">'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Full Name</label>'
    + '<input id="_editUserName" class="form-input" value="' + _esc(u.name||'') + '" style="width:100%;box-sizing:border-box;font-size:13px;"></div>'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Email</label>'
    + '<input id="_editUserEmail" class="form-input" value="' + _esc(u.email||'') + '" style="width:100%;box-sizing:border-box;font-size:13px;"></div>'
    + '<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Title / Note</label>'
    + '<input id="_editUserNote" class="form-input" value="' + _esc(u.note||'') + '" style="width:100%;box-sizing:border-box;font-size:13px;"></div>'
    + '</div>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">'
    + '<button class="btn btn-secondary" onclick="document.getElementById(\'editUserOverlay\').remove()">Cancel</button>'
    + '<button class="btn btn-primary" onclick="saveEditUser(\'' + id + '\')">Save Changes</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
}

function saveEditUser(id) {
  var u = (state.users||[]).find(function(u){ return u.id === id; });
  if (!u) return;
  var newName  = document.getElementById('_editUserName')?.value.trim();
  var newEmail = document.getElementById('_editUserEmail')?.value.trim();
  var newNote  = document.getElementById('_editUserNote')?.value.trim();
  if (!newName) { showToast('Name cannot be empty.', true); return; }
  u.name  = newName;
  u.email = newEmail;
  u.note  = newNote;
  markDirty();
  document.getElementById('editUserOverlay')?.remove();
  renderUsersTab();
  showToast('✅ User updated.');
}

// ============================================================
// PERSISTENCE  (localStorage + JSON export/import + demo snapshots)
// ============================================================


// ============================================================
// SNAPSHOT MANAGEMENT
// ============================================================

function _closeSnapModal() {
  var m = document.getElementById('snapshotModal');
  if (m) m.remove();
}

function _saveSnapFromModal() {
  var inp = document.getElementById('snapNameInput');
  if (inp) saveCurrentSnapshot(inp.value);
}


function saveCurrentSnapshot(name, quiet) {
  if (!name || !name.trim()) { showToast('Enter a snapshot name.', true); return; }
  var snaps = getSavedSnapshots();
  var entry = {
    name: name.trim(),
    saved: new Date().toISOString(),
    org: state.orgName || '',
    data: JSON.stringify(buildPersistedPayload())
  };
  if (String(name).indexOf('Auto-backup before restore') === 0) snaps.unshift(entry);
  else snaps.push(entry);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
    if (!quiet) showToast('Snapshot saved: ' + name.trim());
    pruneAutoRestoreSnapshots();
    renderSnapshotsModal();
  } catch (e) {
    showToast('Could not save snapshot — storage full? Try Export JSON.', true);
  }
}

function deleteSnapshot(idx) {
  var snaps = getSavedSnapshots();
  snaps.splice(idx, 1);
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
  showToast('Snapshot deleted.');
  renderSnapshotsModal();
}

function getProgramCountsFromPayload(obj) {
  if (!obj || typeof obj !== 'object') return { users: 0, assets: 0, policies: 0, controls: 0 };
  return {
    users: (obj.users || []).length,
    assets: (obj.assets || []).length,
    policies: Object.keys(obj.domainPolicies || {}).length,
    controls: obj.controlStatus ? Object.keys(obj.controlStatus).length : 0
  };
}

function getCurrentProgramCounts() {
  return getProgramCountsFromPayload(buildPersistedPayload());
}

function applySnapshotFromDataString(dataStr) {
  var saved = JSON.parse(dataStr);
  if (!applyLoadedState(saved)) throw new Error('apply');
  Object.keys(currentStep).forEach(function(k) { currentStep[k] = 1; });
  applyRoleView('admin');
  showTab('ciso');
  goToStep('ciso', 1);
  saveToStorage();
  _closeSnapModal();
  showToast('Snapshot loaded.');
}

function openSnapshotRestoreConfirm(displayName, orgLabel, savedLabel, dataStr) {
  var cur = getCurrentProgramCounts();
  var snapCounts;
  try { snapCounts = getProgramCountsFromPayload(JSON.parse(dataStr)); } catch (e) { snapCounts = { users:0, assets:0, policies:0, controls:0 }; }
  saveCurrentSnapshot('Auto-backup before restore ' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), true);
  pruneAutoRestoreSnapshots();
  var overlay = document.createElement('div');
  overlay.id = 'snapshotRestoreConfirmOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px;';
  var safeName = escapeHTML(displayName || 'Snapshot');
  overlay.innerHTML = '<div style="background:white;border-radius:14px;max-width:520px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.25);">'
    + '<div style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:6px;">Restore snapshot?</div>'
    + '<div style="font-size:13px;color:var(--text-muted);margin-bottom:14px;line-height:1.5;"><strong>' + safeName + '</strong>'
    + (orgLabel ? '<br><span style="color:#64748b;">Org:</span> ' + escapeHTML(orgLabel) : '')
    + (savedLabel ? '<br><span style="color:#64748b;">Saved:</span> ' + escapeHTML(String(savedLabel).slice(0, 19)) : '')
    + '</div>'
    + '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#334155;">'
    + '<div style="font-weight:700;margin-bottom:6px;">Size comparison (top-level counts)</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:12px;"><tr><td></td><td style="text-align:right;font-weight:600;padding:4px;">Current</td><td style="text-align:right;font-weight:600;padding:4px;">Snapshot</td></tr>'
    + '<tr><td>Users</td><td style="text-align:right;">' + cur.users + '</td><td style="text-align:right;">' + snapCounts.users + '</td></tr>'
    + '<tr><td>Assets</td><td style="text-align:right;">' + cur.assets + '</td><td style="text-align:right;">' + snapCounts.assets + '</td></tr>'
    + '<tr><td>Domain policies</td><td style="text-align:right;">' + cur.policies + '</td><td style="text-align:right;">' + snapCounts.policies + '</td></tr>'
    + '<tr><td>Control status rows</td><td style="text-align:right;">' + cur.controls + '</td><td style="text-align:right;">' + snapCounts.controls + '</td></tr>'
    + '</table></div>'
    + '<label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#334155;margin-bottom:16px;cursor:pointer;">'
    + '<input type="checkbox" id="snapshotRestoreAck" style="margin-top:2px;">'
    + '<span>I understand this will replace my current program.</span></label>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
    + '<button type="button" class="btn btn-secondary" id="snapshotRestoreCancel">Cancel</button>'
    + '<button type="button" class="btn btn-primary" id="snapshotRestoreGo" disabled style="opacity:0.5;">Restore and replace</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  var ack = document.getElementById('snapshotRestoreAck');
  var goBtn = document.getElementById('snapshotRestoreGo');
  ack.addEventListener('change', function() {
    goBtn.disabled = !ack.checked;
    goBtn.style.opacity = ack.checked ? '1' : '0.5';
  });
  document.getElementById('snapshotRestoreCancel').onclick = function() { overlay.remove(); };
  goBtn.onclick = function() {
    if (!ack.checked) return;
    overlay.remove();
    try {
      applySnapshotFromDataString(dataStr);
    } catch (e) {
      console.warn(e);
      showToast('Could not load snapshot.', true);
    }
  };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function loadSnapshotByData(dataStr) {
  openSnapshotRestoreConfirm('Program snapshot', '', '', dataStr);
}

function loadSnapshotByIndex(idx) {
  var snaps = getSavedSnapshots();
  if (!snaps[idx]) { showToast('Snapshot not found.', true); return; }
  var s = snaps[idx];
  openSnapshotRestoreConfirm(s.name, s.org || '', s.saved || '', s.data);
}

function loadDemoSnapshot(demoIndex) {
  var demoSnaps = [XMPL_SNAPSHOT, XMPL_DOMAIN_SNAPSHOT];
  var snap = demoSnaps[+demoIndex];
  if (!snap || !snap.data) { showToast('Demo snapshot not found.', true); return; }
  openSnapshotRestoreConfirm(snap.name || 'Demo', snap.org || '', snap.saved || '', snap.data);
}

function renderSnapshotsModal() {
  _closeSnapModal();
  var snaps = getSavedSnapshots();
  var demoSnaps = [XMPL_SNAPSHOT, XMPL_DOMAIN_SNAPSHOT];

  var demoRows = demoSnaps.map(function(snap, i) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">'
      + '<div><div style="font-weight:600;font-size:13px;">' + escapeHTML(snap.name) + '</div>'
      + '<div style="font-size:11px;color:#64748b;">' + escapeHTML(snap.org) + ' — ' + escapeHTML((snap.saved||'').slice(0,10)) + '</div></div>'
      + '<button class="btn btn-sm btn-secondary" onclick="loadDemoSnapshot(' + i + ')">Load Demo</button>'
      + '</div>';
  }).join('');

  var savedRows = snaps.length
    ? snaps.map(function(s, i) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">'
          + '<div><div style="font-weight:600;font-size:13px;">' + escapeHTML(s.name) + '</div>'
          + '<div style="font-size:11px;color:#64748b;">' + escapeHTML(s.org||'') + ' — ' + escapeHTML((s.saved||'').slice(0,10)) + '</div></div>'
          + '<div style="display:flex;gap:6px;">'
          + '<button class="btn btn-sm btn-primary" onclick="loadSnapshotByIndex(' + i + ')">Load</button>'
          + '<button class="btn btn-sm" onclick="deleteSnapshot(' + i + ')" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;">Del</button>'
          + '</div></div>';
      }).join('')
    : '<div style="color:#64748b;font-size:13px;padding:12px 0;">No saved snapshots yet.</div>';

  var overlay = document.createElement('div');
  overlay.id = 'snapshotModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = '<div style="background:white;border-radius:14px;max-width:560px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.25);max-height:80vh;overflow-y:auto;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
    + '<div style="font-size:17px;font-weight:800;color:var(--navy);">Program Snapshots</div>'
    + '<button class="btn btn-secondary btn-sm" onclick="_closeSnapModal()">Close</button>'
    + '</div>'
    + '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">Save Current State</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:20px;">'
    + '<input id="snapNameInput" class="form-input" placeholder="Snapshot name..." style="flex:1;font-size:13px;">'
    + '<button class="btn btn-primary" onclick="_saveSnapFromModal()">Save Snapshot</button>'
    + '</div>'
    + '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">Demo Programs</div>'
    + demoRows
    + '<div style="font-size:13px;font-weight:700;margin:14px 0 4px;">Saved Snapshots</div>'
    + savedRows
    + '</div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

window.getSavedSnapshots = getSavedSnapshots;
window.saveCurrentSnapshot = saveCurrentSnapshot;
window.deleteSnapshot = deleteSnapshot;
window.loadSnapshotByIndex = loadSnapshotByIndex;
window.loadDemoSnapshot = loadDemoSnapshot;
window.renderSnapshotsModal = renderSnapshotsModal;
window._closeSnapModal = _closeSnapModal;
window._saveSnapFromModal = _saveSnapFromModal;
window.setAuditTrailUiMode = setAuditTrailUiMode;
window.setChangeLogUserFilter = setChangeLogUserFilter;
window.setChangeLogDateFilter = setChangeLogDateFilter;
window.handleEvidenceImageUpload = handleEvidenceImageUpload;
window.setEvidenceKind = setEvidenceKind;
window.openEvidenceImageViewerAt = openEvidenceImageViewerAt;
window.openBulkAssignControlModal = openBulkAssignControlModal;
window.applyBulkAssignFromModal = applyBulkAssignFromModal;
window.bulkModalQuickFill = bulkModalQuickFill;

// ============================================================
// INITIALIZATION
// ============================================================

function setupMobileNav() {
  if (document.getElementById('mobileNavToggle')) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'mobileNavToggle';
  btn.setAttribute('aria-label', 'Open navigation menu');
  btn.className = 'mobile-nav-toggle';
  btn.textContent = '☰';
  btn.addEventListener('click', function() {
    document.body.classList.toggle('mobile-nav-open');
  });
  document.body.insertBefore(btn, document.body.firstChild);
  var ov = document.createElement('div');
  ov.id = 'mobileNavBackdrop';
  ov.className = 'mobile-nav-backdrop';
  ov.addEventListener('click', function() { document.body.classList.remove('mobile-nav-open'); });
  document.body.appendChild(ov);
  document.querySelectorAll('.sidebar .sidebar-item').forEach(function(el) {
    el.addEventListener('click', function() {
      if (window.innerWidth <= 768) document.body.classList.remove('mobile-nav-open');
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  try { loadFromStorage(); } catch (e) { console.warn('loadFromStorage:', e); }
  try { applyRoleView('admin'); } catch (e) { console.warn('applyRoleView:', e); }
  try { showTab('ciso'); } catch (e) { console.warn('showTab:', e); }
  try { goToStep('ciso', 1); } catch (e) { console.warn('goToStep:', e); }
  try { setupMobileNav(); } catch (e) { console.warn('setupMobileNav:', e); }
  window.addEventListener('beforeunload', function(ev) {
    if (!window.isDirty) return;
    try { saveToStorage(); } catch (e2) {}
    if (window.isDirty) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  });
});
