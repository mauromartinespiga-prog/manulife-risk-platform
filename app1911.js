// ======================================================================
// DATA LAYER (single source of truth for every screen)
// Hard-coded for the wireframe. Replace EVENTS / ACTIONS with backend responses
// later: every KPI, stage bar, feed status and action table below is derived
// from these two structures, so numbers cannot drift between screens.
// ======================================================================
const STAGES = ['Signal', 'Assessment', 'Review', 'Action', 'Closure'];

const EVENTS = {
  '0142': {
    code: 'IRE-26-0142', short: 'GLP-1 uptake forecast', geo: 'CA / US', vertical: 'L-1',
    severity: '3 Significant', confidence: 'Medium', source: 'Illustrative proxy',
    scored: true, pendingReview: true, stage: 3, stageText: 'Review - pending', statusClass: 'status-amber'
  },
  '0141': {
    code: 'IRE-26-0141', short: 'Extreme heat', geo: 'US / HK / SG', vertical: 'M',
    severity: '4 Severe', confidence: 'Medium', source: 'Climate proxy',
    scored: true, pendingReview: false, stage: 4, stageText: 'Action - open', statusClass: 'status-teal',
    facts: [['Mortality direction', 'Up'], ['Protection', 'Adverse'], ['Annuity / other', 'Conditional favourable'],
            ['Human disposition', 'Reviewed - human assessment']],
    note: 'Acute and sustained extreme heat may elevate near-term mortality claims. Conditional annuity offset is not assumed without demographic validation.'
  },
  '0140': {
    code: 'IRE-26-0140', short: 'Respiratory outbreak', geo: 'CN / MY', vertical: 'M',
    severity: '5 Critical', confidence: 'Low', source: 'Health proxy',
    scored: true, pendingReview: true, stage: 2, stageText: 'Assessment - validation', statusClass: 'status-red',
    facts: [['Mortality direction', 'Up?'], ['Protection', 'Unvalidated'], ['Annuity / other', 'Potential adverse'],
            ['Human disposition', 'Pending - no RI code until validated']],
    note: 'Severity 5 Critical / unvalidated. Severity is not a probability or loss estimate. No RI code is assigned until the Chief Actuary completes the validation gate.'
  },
  '0139': {
    code: 'IRE-26-0139', short: 'Retirement reform', geo: 'JP / CA', vertical: '-',
    severity: 'Classified - Not Scored', confidence: 'N/A', source: 'Proxy sources',
    scored: false, classified: true, pendingReview: false, stage: null, stageText: 'Classified - Not Scored', statusClass: 'status-slate',
    facts: [['Mortality direction', 'N/A'], ['Protection', 'No M/L direction'], ['Annuity / other', 'Policy / demand context'],
            ['Human disposition', 'Contextual only - no mortality score']],
    note: 'Contextual pathway tracked through the Regulatory Intelligence Tracker (MON-POL). Verify primary source text before any product assumption update.'
  },
  '0138': {
    code: 'IRE-26-0138', short: 'Credit spreads', geo: 'CA / US', vertical: '-',
    severity: 'Classified - Not Scored', confidence: 'N/A', source: 'Proxy sources',
    scored: false, classified: true, pendingReview: false, stage: null, stageText: 'Classified - Not Scored', statusClass: 'status-slate',
    facts: [['Mortality direction', 'N/A'], ['Protection', 'No effect inferred'], ['Annuity / other', 'Investment sensitivity'],
            ['Human disposition', 'Investment risk view - not M/L-scored']],
    note: 'Routed to Investment Risk governance rather than M/L scoring.'
  }
};
const TOTAL_EVENTS = 8; // 3 scored + 5 classified (0139 / 0138 / 0137 / 0136 / 0135)

const ACTIONS = [
  { id: 'A1', name: 'Confirm source attribution',         owner: 'Risk Owner',           due: 'Nov 12', status: 'Open',        events: ['0142'] },
  { id: 'A2', name: 'Validate health proxy / exposure',   owner: 'Actuary / Mkt Risk',   due: 'Nov 15', status: 'In progress', events: ['0142', '0140'] },
  { id: 'A3', name: 'Review CA / US annuity assumptions', owner: 'Actuarial',            due: 'Nov 20', status: 'Open',        events: ['0142'] },
  { id: 'A4', name: 'Review CA / US exposure',            owner: 'Reinsurance Team',     due: 'Nov 20', status: 'Not started', events: ['0142'] },
  { id: 'A5', name: 'Review reinsurance exposure',        owner: 'Reinsurance Team',     due: 'Nov 20', status: 'Open',        events: ['0142'] },
  { id: 'A6', name: 'Approve / ERC routing',              owner: 'Actuary / Risk Owner', due: 'Nov 25', status: 'Pending',     events: ['0142'] },
  { id: 'A7', name: 'Close event / log rationale',        owner: 'ERM',                  due: 'Nov 30', status: 'Not started', events: ['0142'] },
  // Regulatory tracker items (screen 4)
  { id: 'A8', name: 'Prepare verification request',       owner: 'Compliance',           due: 'Nov 18', status: 'Open',        events: ['0139'] },
  { id: 'A9', name: 'Confirm MON-CLM scope',              owner: 'Climate Risk',         due: 'Nov 25', status: 'Not started', events: ['0141'] },
  { id: 'A10', name: 'ERC approval / routing',            owner: 'Risk Owner',           due: 'Nov 25', status: 'Pending',     events: ['0139'] }
];
const STATUS_OPTIONS = ['Not started', 'Open', 'In progress', 'Pending', 'Done'];
const STATUS_BADGE = {
  'Not started': 'badge-slate', 'Open': 'badge-amber', 'In progress': 'badge-teal', 'Pending': 'badge-amber', 'Done': 'badge-teal'
};

const HISTORY_0142 = [
  'v1.0 proxy assessment generated; C-3 updated to 3 (range 3-4).',
  'C-4 retained at 2 pending rubric confirmation; reviewer A. Chen; archive only after closure.'
];

const HYPOTHESIS_EVENT = { H1: '0142', H2: '0141', H3: '0140', H4: '0139', H5: '0138' };

let currentEventId = '0142'; // the "selected event" every Open Event Detail button points at

// ---------------------------------------------------------------- helpers
const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, '0');
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = n => WORDS[n] !== undefined ? WORDS[n] : String(n);
const plural = (n, one, many) => (n === 1 ? one : many);
const actionsFor = id => ACTIONS.filter(a => a.events.includes(id));
const openActionsFor = id => actionsFor(id).filter(a => a.status !== 'Done');

function counts() {
  const list = Object.values(EVENTS);
  return {
    scored: list.filter(e => e.scored).length + 0,
    pending: list.filter(e => e.pendingReview).length,
    open0142: openActionsFor('0142').length
  };
}

function badge(status) {
  return `<span class="badge-pill ${STATUS_BADGE[status] || 'badge-slate'}">${status}</span>`;
}

// Read-only rows (linked tasks on other screens). Each row opens its event.
function renderLinkedTasks(tbody, ids, eventId) {
  if (!tbody) return;
  tbody.innerHTML = ids.map(id => {
    const a = ACTIONS.find(x => x.id === id);
    return `<tr${eventId ? ` class="clickable-row" data-event="${eventId}"` : ''}>
      <td>${a.name}</td><td>${a.owner}</td><td>${a.due}</td><td>${badge(a.status)}</td></tr>`;
  }).join('');
}

// Editable rows (event pages): owner / due edit in place, status is a dropdown.
function renderEditableActions(tbody, list) {
  tbody.innerHTML = list.map(a => `
    <tr data-action="${a.id}">
      <td>${a.name}</td>
      <td class="editable" data-field="owner" title="Click to edit">${a.owner}</td>
      <td class="editable" data-field="due" title="Click to edit">${a.due}</td>
      <td><select class="status-select badge-pill ${STATUS_BADGE[a.status]}" aria-label="Status of ${a.name}">
        ${STATUS_OPTIONS.map(o => `<option${o === a.status ? ' selected' : ''}>${o}</option>`).join('')}
      </select></td>
    </tr>`).join('');
}

function bindActionEditing(tbody) {
  tbody.addEventListener('click', e => {
    const td = e.target.closest('td.editable');
    if (!td || td.querySelector('input')) return;
    const action = ACTIONS.find(a => a.id === td.closest('tr').dataset.action);
    const field = td.dataset.field;
    const input = document.createElement('input');
    input.className = 'inline-edit';
    input.value = action[field];
    td.textContent = '';
    td.appendChild(input);
    input.focus();
    input.select();
    let finished = false;
    const finish = save => {
      if (finished) return;
      finished = true;
      if (save && input.value.trim()) action[field] = input.value.trim();
      refreshAll();
    };
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') finish(true);
      else if (ev.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  });

  tbody.addEventListener('change', e => {
    const sel = e.target.closest('select.status-select');
    if (!sel) return;
    const action = ACTIONS.find(a => a.id === sel.closest('tr').dataset.action);
    action.status = sel.value;
    refreshAll();
  });
}

// ---------------------------------------------------------------- navigation
let goToSlide = () => {};
let applyFeedView = () => {};
let setFeedFilter = () => {};

function openEvent(id, focus) {
  if (!EVENTS[id]) return;
  currentEventId = id;
  renderEventPage();
  goToSlide(7);
  if (focus === 'actions') {
    const target = id === '0142' ? $('eventActionsTable') : $('genericActionsTable');
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('action-flash');
      setTimeout(() => target.classList.remove('action-flash'), 1600);
    }, 120);
  }
}

function openFeed(filter) {
  goToSlide(2);
  setFeedFilter(filter);
}

// ---------------------------------------------------------------- rendering
function renderEventPage() {
  const ev = EVENTS[currentEventId];

  $('eventTitle').textContent = `Event Detail Page - ${ev.code}`;
  $('eventBreadcrumb').textContent = `Overview / Active Risk Feed / Selected event ${ev.code} / ${ev.stageText}`;

  // One workflow, tied to the selected event's actual stage
  const wrap = $('eventStageWrap');
  const note = $('eventStageNote');
  if (ev.stage) {
    wrap.hidden = false;
    note.hidden = true;
    $('eventStageLabel').textContent = `CURRENT EVENT STAGE: ${STAGES[ev.stage - 1].toUpperCase()}`;
    $('eventStageBar').innerHTML = STAGES.map((name, i) => {
      const cls = i + 1 < ev.stage ? 'completed' : (i + 1 === ev.stage ? 'active' : '');
      return `<div class="chevron ${cls}">${i + 1} &nbsp;${name}</div>`;
    }).join('');
  } else {
    wrap.hidden = true;
    note.hidden = false;
    note.textContent = 'Classified - Not Scored: this item is tracked as context and has no workflow stage.';
  }

  const detail = currentEventId === '0142';
  $('eventDetail0142').hidden = !detail;
  $('eventDetailGeneric').hidden = detail;

  if (detail) {
    renderEditableActions($('eventActionsBody'), actionsFor('0142'));
    $('assessmentHistoryList').innerHTML = HISTORY_0142.map(h => `<li>${h}</li>`).join('');
    const approved = ev.stage >= 4;
    const btn = $('approveAssessmentBtn');
    btn.disabled = approved;
    btn.textContent = approved ? '✓ Approved by A. Chen' : 'Approve Assessment (A. Chen)';
    btn.style.background = approved ? '#13315C' : '';
  } else {
    $('genKicker').textContent = `${ev.code} - ${ev.geo}`;
    $('genTitle').textContent = ev.short;
    const rows = [
      ['Geography', ev.geo], ['Vertical', ev.vertical], ['Source', ev.source],
      ['Severity / class', ev.severity], ['Confidence', ev.confidence], ['Stage', ev.stageText],
      ...(ev.facts || [])
    ];
    $('genMeta').innerHTML = rows.map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('');
    $('genNote').textContent = ev.note || '';
    const list = actionsFor(currentEventId);
    renderEditableActions($('genericActionsBody'), list);
    const open = list.filter(a => a.status !== 'Done').length;
    $('genActionsSubtitle').textContent = list.length
      ? `${open} open of ${list.length} linked ${plural(list.length, 'action', 'actions')} - same register as the other screens`
      : '';
    $('genActionsEmpty').hidden = list.length > 0;
    $('genericActionsTable').hidden = list.length === 0;
  }
}

// Recompute every derived number / label on every screen
function refreshAll() {
  const c = counts();
  const n = c.open0142;
  const Open = `${word(n)} open ${plural(n, 'action', 'actions')}`;

  $('kpiScored').textContent = pad2(c.scored);
  $('kpiScoredSub').textContent = `${c.scored} of ${TOTAL_EVENTS} events in current filter`;
  $('kpiPendingReviews').textContent = pad2(c.pending);
  $('kpiOpenActions').textContent = pad2(n);
  $('kpiOpenActionsSub').textContent = `${Open} on IRE-26-0142`;
  $('mapScored').textContent = pad2(c.scored);
  $('mapPendingSub').textContent =
    `Severity 3+ - ${word(c.pending).toLowerCase()} pending human ${plural(c.pending, 'review', 'reviews')}`;
  $('graphScored').textContent = `${pad2(c.scored)} / ${pad2(TOTAL_EVENTS)}`;
  $('graphPending').textContent = pad2(c.pending);
  $('actionsSubtitle').textContent = `${Open} - one event-level register across all screens`;
  $('footerOpenActions').textContent =
    `GLP-1 Phase 1 markets: Canada / US only. ${Open} remain human-owned.`;

  // Feed: stage cells, pending flags, filter labels
  document.querySelectorAll('[data-stage-of]').forEach(el => {
    const ev = EVENTS[el.dataset.stageOf];
    el.textContent = ev.stageText;
    el.className = ev.statusClass;
  });
  document.querySelectorAll('#riskFeedTable tbody tr[data-event]').forEach(row => {
    row.dataset.pending = String(EVENTS[row.dataset.event].pendingReview);
  });
  const label = {
    all: `All (${TOTAL_EVENTS})`,
    scored: `Scored Sev 3+ (${c.scored})`,
    pending: `Pending review (${c.pending})`,
    unscored: `Not Scored (${TOTAL_EVENTS - c.scored})`
  };
  document.querySelectorAll('.filter-btn').forEach(b => { b.textContent = label[b.dataset.filter]; });
  applyFeedView();

  // Scenario banner on screen 1
  const done = EVENTS['0142'].stage >= 4;
  const badgeEl = $('scenarioStatusBadge');
  badgeEl.textContent = done ? 'REVIEWED' : 'PENDING';
  badgeEl.className = done ? 'pill pill-teal' : 'pill pill-slate';

  // Linked-task tables on other screens read from the same register
  renderLinkedTasks($('linkedTasksBody'), ['A2', 'A4', 'A6'], '0142');
  renderLinkedTasks($('policyTasksBody'), ['A8', 'A9', 'A10'], null); // screen 4 is static in this phase

  renderEventPage();
}

function approveAssessment() {
  const ev = EVENTS['0142'];
  if (ev.stage >= 4) return;
  ev.stage = 4;
  ev.stageText = 'Action - open';
  ev.statusClass = 'status-teal';
  ev.pendingReview = false;
  HISTORY_0142.push('<strong>v1.1 - Assessment approved by A. Chen (12 Nov 2026).</strong> Routed to Action stage.');
  refreshAll();
}

// ======================================================================
// PAGE WIRING
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. NAVIGATION BETWEEN THE 7 SCREENS
  const navItems = document.querySelectorAll('.nav-item');
  const slides = document.querySelectorAll('.slide');

  goToSlide = function (slideNumber) {
    navItems.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.slide === String(slideNumber));
    });
    slides.forEach(s => {
      s.classList.toggle('active', s.id === `slide-${slideNumber}`);
    });
    if (String(slideNumber) === '7') renderEventPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navItems.forEach(btn => {
    btn.addEventListener('click', () => goToSlide(btn.dataset.slide));
  });

  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => goToSlide(el.dataset.goto));
  });

  // 2. EVENT PAGE IS THE HUB: anything marked data-event opens that event
  document.addEventListener('click', e => {
    if (e.target.closest('select, input')) return;
    const el = e.target.closest('[data-event]');
    if (el) openEvent(el.dataset.event, el.dataset.focus);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const el = e.target.closest && e.target.closest('[data-event], [data-kpi]');
    if (el && !el.matches('button, input, select')) { e.preventDefault(); el.click(); }
  });
  document.querySelectorAll('[data-event], [data-kpi]').forEach(el => {
    if (!el.matches('button')) el.tabIndex = 0;
  });

  // 3. KPI TILES OPEN A FILTERED LIST (or the relevant screen / event)
  document.querySelectorAll('[data-kpi]').forEach(tile => {
    tile.addEventListener('click', () => {
      const [kind, arg, focus] = tile.dataset.kpi.split(':');
      if (kind === 'feed') openFeed(arg);
      else if (kind === 'event') openEvent(arg, focus);
      else if (kind === 'slide') goToSlide(arg);
    });
  });

  // 4. SCREEN 2: RISK FEED FILTERS + GLOBAL SEARCH (applied together)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const feedRows = document.querySelectorAll('#riskFeedTable tbody tr');
  const searchInput = $('globalSearch');
  let activeFilter = 'all';

  applyFeedView = function () {
    const q = searchInput.value.toLowerCase().trim();
    feedRows.forEach(row => {
      const t = row.dataset.type;
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'pending' ? row.dataset.pending === 'true' : t === activeFilter);
      const matchesQuery = !q || row.textContent.toLowerCase().includes(q);
      row.style.display = matchesFilter && matchesQuery ? '' : 'none';
    });
  };

  setFeedFilter = function (filter) {
    activeFilter = filter;
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    applyFeedView();
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => setFeedFilter(btn.dataset.filter));
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() && !$('slide-2').classList.contains('active')) goToSlide(2);
    applyFeedView();
  });

  // 5. SCREEN 3: VECTOR WORLD MAP (D3 + TOPOJSON, aligned to risc_world_map_base.pdf)
  try {
    initVectorWorldMap();
  } catch (err) {
    // D3 / TopoJSON could not be loaded: keep the rest of the page working.
    console.warn('World map could not be initialised:', err);
    const box = $('vectorWorldMap');
    if (box) {
      box.textContent = 'Map libraries unavailable - connect to the internet to load the vector map.';
      box.style.padding = '16px';
      box.style.color = '#405367';
    }
  }

  // 6. SCREEN 6: INTERACTIVE HYPOTHESIS GRAPH
  const hypothesisData = {
    H1: {
      kicker: 'H1 - SELECTED DIRECTIONAL HYPOTHESIS',
      title: 'IRE-26-0142 - CA / US',
      body: 'Potential survival improvement may reduce protection claims while increasing annuity payment duration. This does not establish a net hedge.',
      meta: [
        ['Confidence', 'Medium (event-level)'],
        ['Relationship', 'Hypothesis / directional'],
        ['Strength', 'Not estimated'],
        ['Net effect', 'Uncertain']
      ],
      foot: 'Shared geography or a plausible pathway is not evidence of dependence.'
    },
    H2: {
      kicker: 'H2 - SELECTED DIRECTIONAL HYPOTHESIS',
      title: 'IRE-26-0141 - US / HK / SG',
      body: 'Acute and sustained extreme heat events may elevate near-term mortality claims across vulnerable protection cohorts.',
      meta: [
        ['Confidence', 'Medium (event-level)'],
        ['Relationship', 'Hypothesis / directional'],
        ['Strength', 'Severity 4 Severe'],
        ['Net effect', 'Protection adverse']
      ],
      foot: 'Conditional annuity offset is not assumed without demographic validation.'
    },
    H3: {
      kicker: 'H3 - SELECTED DIRECTIONAL HYPOTHESIS',
      title: 'IRE-26-0140 - CN / MY (UNVALIDATED)',
      body: 'Unvalidated respiratory outbreak proxy indicates potential mortality stress. Human health proxy verification required prior to scoring.',
      meta: [
        ['Confidence', 'Low (unvalidated proxy)'],
        ['Relationship', 'Hypothesis / directional'],
        ['Strength', 'Severity 5 Critical (provisional)'],
        ['Net effect', 'Pending validation']
      ],
      foot: 'No RI code assigned until Chief Actuary completes validation gate.'
    },
    H4: {
      kicker: 'H4 - CONTEXTUAL PATHWAY (NOT SCORED)',
      title: 'IRE-26-0139 - JP / CA Retirement Reform',
      body: 'Demographic and pension policy shifts may influence annuity demand and product mix without directly altering biological mortality rates.',
      meta: [
        ['Confidence', 'Contextual monitoring'],
        ['Relationship', 'Policy / demand context'],
        ['Strength', 'Classified - Not Scored'],
        ['Net effect', 'No M/L score assigned']
      ],
      foot: 'Tracked via Regulatory Intelligence Tracker (MON-POL).'
    },
    H5: {
      kicker: 'H5 - CONTEXTUAL PATHWAY (NOT SCORED)',
      title: 'IRE-26-0138 - CA / US Credit Spreads',
      body: 'Macroeconomic spread widening affects asset-liability management and investment sensitivity rather than underlying mortality.',
      meta: [
        ['Confidence', 'Contextual monitoring'],
        ['Relationship', 'Investment sensitivity'],
        ['Strength', 'Classified - Not Scored'],
        ['Net effect', 'No M/L effect inferred']
      ],
      foot: 'Routed to Investment Risk governance rather than M/L scoring.'
    }
  };

  document.querySelectorAll('.graph-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.graph-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      const data = hypothesisData[row.dataset.hyp];
      const eventId = HYPOTHESIS_EVENT[row.dataset.hyp];
      currentEventId = eventId;
      $('hypKicker').textContent = data.kicker;
      $('hypTitle').textContent = data.title;
      $('hypBody').textContent = data.body;
      $('hypMeta').innerHTML = data.meta
        .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
        .join('');
      $('hypFoot').textContent = data.foot;
      $('hypOpenBtn').dataset.event = eventId;
    });
  });

  // 7. SCREEN 7: EVENT PAGE - editable actions + human-in-the-loop approval
  bindActionEditing($('eventActionsBody'));
  bindActionEditing($('genericActionsBody'));
  $('approveAssessmentBtn').addEventListener('click', approveAssessment);

  // First paint: derive every number from the data layer
  refreshAll();
});

// ======================================================================
// VECTOR WORLD MAP
// Same geometry as risc_world_map_base.pdf: Natural Earth 1:110m countries,
// longitude -180..180 and latitude 90..-90 mapped linearly onto a 6.2 x 1.74
// frame (Antarctica included). Markers use the same projection, so they can
// be driven by real lat/lon coordinates from a backend later.
// ======================================================================
const MAP_W = 620;
const MAP_H = 174;

const MAP_MARKERS = [
  {
    code: 'CA', event: '0142',
    coords: [-106.3468, 56.1304],
    type: 'teal',
    kicker: 'PHASE 1 GLP-1 MARKET - CANADA (TIER A)',
    title: 'IRE-26-0142 - GLP-1 uptake forecast (CA)',
    desc1: 'Severity 3 Significant / Medium confidence. Illustrative 40% penetration proxy by 2030. Protection favourable; annuity duration risk.',
    desc2: 'Required human gate: validate Canadian in-force age, product mix and duration before RI-2 assessment.',
    next: 'Next stage: Review → Action (Owner: Market Risk)',
    accent: 'accent-top-teal'
  },
  {
    code: 'US', event: '0142',
    coords: [-98.5795, 39.8283],
    type: 'teal',
    kicker: 'PHASE 1 GLP-1 MARKET - UNITED STATES (TIER A)',
    title: 'IRE-26-0142 - GLP-1 uptake forecast (US)',
    desc1: 'Severity 3 Significant / Medium confidence. Primary Phase 1 focus market alongside Canada; net portfolio effect uncertain.',
    desc2: 'Required human gate: confirm source attribution and validate US annuity / protection split with Chief Actuary.',
    next: 'Next stage: Review → Action (Owner: Actuarial)',
    accent: 'accent-top-teal'
  },
  {
    code: 'CN', event: '0140',
    coords: [104.1954, 35.8617],
    type: 'amber',
    kicker: 'ILLUSTRATIVE MARKET EVENT - CHINA / MALAYSIA',
    title: 'IRE-26-0140 - Respiratory outbreak',
    desc1: 'Severity 5 Critical / unvalidated. Mortality stress scenario; low confidence. Severity is not a probability or loss estimate.',
    desc2: 'Required human gate: validate the health proxy and mapped product exposure with the designated risk owner. No RI code until validated.',
    next: 'Next stage: Signal → Assessment',
    accent: 'accent-top-red'
  },
  {
    code: 'JP', event: '0139',
    coords: [138.2529, 36.2048],
    type: 'amber',
    kicker: 'ILLUSTRATIVE MONITORING SCENARIO - JAPAN',
    title: 'IRE-26-0139 - Retirement reform',
    desc1: 'Classified - Not Scored. Demographic and pension policy context affecting annuity demand and product mix.',
    desc2: 'Required human gate: Compliance and Market Risk verify primary policy text before any product assumption update.',
    next: 'Next stage: Contextual watch (MON-POL)',
    accent: 'accent-top-amber'
  },
  {
    code: 'SEA', event: '0141',
    coords: [103.8198, 1.3521],
    type: 'amber',
    kicker: 'ILLUSTRATIVE MARKET EVENT - SINGAPORE / HK',
    title: 'IRE-26-0141 - Extreme heat',
    desc1: 'Severity 4 Severe / Medium confidence. Elevated acute mortality stress across US / HK / SG monitoring cohorts.',
    desc2: 'Required human gate: reviewed under human assessment; Climate Risk confirming disclosure scope.',
    next: 'Next stage: Action - open',
    accent: 'accent-top-amber'
  }
];

const DEFAULT_MARKER = 'CN'; // matches the market focus panel shown in the LaTeX deck

function initVectorWorldMap() {
  const svg = d3.select('#vectorWorldMap')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${MAP_W} ${MAP_H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g');

  // Equirectangular (clipped correctly at the antimeridian), then squeezed
  // vertically so that 360 x 180 degrees fill the 620 x 174 frame.
  const base = d3.geoEquirectangular()
    .scale(MAP_W / (2 * Math.PI))
    .translate([MAP_W / 2, MAP_W / 4])
    .precision(0.1);
  const yK = MAP_H / (MAP_W / 2);
  const squash = d3.geoTransform({
    point(x, y) { this.stream.point(x, y * yK); }
  });
  const projection = { stream: s => base.stream(squash.stream(s)) };
  const project = coords => {
    const [x, y] = base(coords);
    return [x, y * yK];
  };
  const path = d3.geoPath(projection);

  const zoom = d3.zoom()
    .scaleExtent([1, 6])
    .extent([[0, 0], [MAP_W, MAP_H]])
    .translateExtent([[0, 0], [MAP_W, MAP_H]])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
      // keep markers the same size on screen while zooming
      g.selectAll('.marker-group').attr('transform', d =>
        `translate(${d.xy[0]}, ${d.xy[1]}) scale(${1 / event.transform.k})`);
    });

  svg.call(zoom).on('dblclick.zoom', null); // double-click on a marker opens the event instead of zooming

  $('zoomInBtn').onclick = () => svg.transition().call(zoom.scaleBy, 1.4);
  $('zoomOutBtn').onclick = () => svg.transition().call(zoom.scaleBy, 0.7);
  $('resetZoomBtn').onclick = () => svg.transition().call(zoom.transform, d3.zoomIdentity);

  const markers = MAP_MARKERS.map(m => ({ ...m, xy: project(m.coords) }));

  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(world => {
      const countries = topojson.feature(world, world.objects.countries).features;
      const coastline = topojson.mesh(world, world.objects.countries, (a, b) => a === b);

      g.append('g').selectAll('path')
        .data(countries)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', '#D7E2ED')
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 0.5)
        .attr('vector-effect', 'non-scaling-stroke');

      g.append('path')
        .datum(coastline)
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#3A5F8F')
        .attr('stroke-width', 0.6)
        .attr('vector-effect', 'non-scaling-stroke');

      renderMarkers(g, markers);
    })
    .catch(() => {
      // Offline fallback if the CDN is unreachable
      g.append('text')
        .attr('x', MAP_W / 2)
        .attr('y', MAP_H / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', 9)
        .attr('fill', '#405367')
        .text('Connect to internet once to load vector world boundaries');
      renderMarkers(g, markers);
    });
}

function renderMarkers(g, markers) {
  const panel = $('marketFocusPanel');

  function selectMarker(d) {
    currentEventId = d.event;
    g.selectAll('.marker-group').classed('selected', m => m.code === d.code);
    panel.className = `card ${d.accent} flex-col-between`;
    $('focusRegionKicker').textContent = d.kicker;
    $('focusEventTitle').textContent = d.title;
    $('focusDesc1').textContent = d.desc1;
    $('focusDesc2').textContent = d.desc2;
    $('focusNextStage').textContent = d.next;
    $('focusOpenBtn').dataset.event = d.event;
  }

  const groups = g.selectAll('.marker-group')
    .data(markers)
    .enter()
    .append('g')
    .attr('class', d => `marker-group${d.code === DEFAULT_MARKER ? ' selected' : ''}`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', d => `${d.code}: ${d.title}`)
    .style('cursor', 'pointer')
    .attr('transform', d => `translate(${d.xy[0]}, ${d.xy[1]})`)
    .on('click', (_, d) => selectMarker(d))            // click: preview in the focus panel
    .on('dblclick', (_, d) => openEvent(d.event))       // double-click: open the event
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectMarker(d);
      }
    });

  // generous invisible hit area so markers are easy to click at any zoom level
  groups.append('circle')
    .attr('r', 11)
    .attr('fill', 'transparent');

  groups.append('circle')
    .attr('class', 'marker-dot')
    .attr('r', 5)
    .attr('fill', d => d.type === 'teal' ? '#087777' : '#94600B')
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 1.6);

  groups.append('text')
    .attr('x', 8)
    .attr('y', 3.5)
    .attr('font-size', '9.5px')
    .attr('font-weight', '700')
    .attr('fill', '#0B2545')
    .text(d => d.code);
}
