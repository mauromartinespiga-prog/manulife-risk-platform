document.addEventListener('DOMContentLoaded', () => {
  // 1. NAVIGATION BETWEEN 7 SLIDES
  const navItems = document.querySelectorAll('.nav-item');
  const slides = document.querySelectorAll('.slide');

  function goToSlide(slideNumber) {
    navItems.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.slide === String(slideNumber));
    });
    slides.forEach(s => {
      s.classList.toggle('active', s.id === `slide-${slideNumber}`);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => goToSlide(btn.dataset.slide));
  });

  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => goToSlide(el.dataset.goto));
  });

  // 2. SLIDE 2: TABLE FILTERS & GLOBAL SEARCH
  const filterBtns = document.querySelectorAll('.filter-btn');
  const feedRows = document.querySelectorAll('#riskFeedTable tbody tr');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      feedRows.forEach(row => {
        if (filter === 'all' || row.dataset.type === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  const searchInput = document.getElementById('globalSearch');
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      feedRows.forEach(r => r.style.display = '');
      return;
    }
    goToSlide(2);
    feedRows.forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // 3. SLIDE 3: VECTOR WORLD MAP (D3 + TOPOJSON)
  initVectorWorldMap();

  // 4. SLIDE 6: INTERACTIVE HYPOTHESIS GRAPH
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
      document.getElementById('hypKicker').textContent = data.kicker;
      document.getElementById('hypTitle').textContent = data.title;
      document.getElementById('hypBody').textContent = data.body;
      document.getElementById('hypMeta').innerHTML = data.meta
        .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
        .join('');
      document.getElementById('hypFoot').textContent = data.foot;
    });
  });

  // 5. SLIDE 7: HUMAN-IN-THE-LOOP APPROVAL INTERACTION
  const approveBtn = document.getElementById('approveAssessmentBtn');
  let approved = false;

  approveBtn.addEventListener('click', () => {
    if (approved) return;
    approved = true;

    approveBtn.textContent = '✓ Approved by A. Chen';
    approveBtn.style.background = '#13315C';

    document.getElementById('approvalCell').innerHTML =
      '<span class="badge-pill badge-teal">Approved (A. Chen)</span>';
    document.getElementById('actionsSubtitle').textContent =
      'Four open actions remaining - 1 approved by human reviewer';
    document.getElementById('kpiOpenActions').textContent = '04';
    document.getElementById('kpiPendingReviews').textContent = '01';
    document.getElementById('queueBadge').textContent = '(1)';
    document.getElementById('scenarioStatusBadge').textContent = 'REVIEWED';
    document.getElementById('scenarioStatusBadge').className = 'pill pill-teal';

    const li = document.createElement('li');
    li.innerHTML = '<strong>v1.1 - Assessment approved by A. Chen (12 Nov 2026).</strong> Routed to Action stage.';
    document.getElementById('assessmentHistoryList').appendChild(li);
  });
});

// VECTOR WORLD MAP RENDERER
function initVectorWorldMap() {
  const container = document.getElementById('vectorWorldMap');
  const width = container.clientWidth || 720;
  const height = 255;

  const svg = d3.select('#vectorWorldMap')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const g = svg.append('g');

  const projection = d3.geoNaturalEarth1()
    .scale(width / 5.4)
    .translate([width / 2, height / 1.85]);

  const path = d3.geoPath().projection(projection);

  const zoom = d3.zoom()
    .scaleExtent([1, 6])
    .on('zoom', (event) => g.attr('transform', event.transform));

  svg.call(zoom);

  document.getElementById('zoomInBtn').onclick = () => svg.transition().call(zoom.scaleBy, 1.4);
  document.getElementById('zoomOutBtn').onclick = () => svg.transition().call(zoom.scaleBy, 0.7);
  document.getElementById('resetZoomBtn').onclick = () => svg.transition().call(zoom.transform, d3.zoomIdentity);

  const markers = [
    {
      code: 'CA',
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
      code: 'US',
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
      code: 'CN',
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
      code: 'JP',
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
      code: 'SEA',
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

  // Load vector world atlas TopoJSON
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(res => res.json())
    .then(world => {
      const countries = topojson.feature(world, world.objects.countries).features
        .filter(d => d.id !== '010'); // Exclude Antarctica for clean 16:9 framing

      g.selectAll('path')
        .data(countries)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', '#CBD5E1')
        .attr('stroke', '#F8FAFC')
        .attr('stroke-width', 0.6);

      renderMarkers(g, projection, markers);
    })
    .catch(() => {
      // Offline fallback if CDN is unreachable
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#405367')
        .text('Connect to internet once to load vector world boundaries');
      renderMarkers(g, projection, markers);
    });
}

function renderMarkers(g, projection, markers) {
  const panel = document.getElementById('marketFocusPanel');

  const groups = g.selectAll('.marker-group')
    .data(markers)
    .enter()
    .append('g')
    .attr('class', 'marker-group')
    .style('cursor', 'pointer')
    .attr('transform', d => {
      const [x, y] = projection(d.coords);
      return `translate(${x}, ${y})`;
    })
    .on('click', (_, d) => {
      panel.className = `card ${d.accent} flex-col-between`;
      document.getElementById('focusRegionKicker').textContent = d.kicker;
      document.getElementById('focusEventTitle').textContent = d.title;
      document.getElementById('focusDesc1').textContent = d.desc1;
      document.getElementById('focusDesc2').textContent = d.desc2;
      document.getElementById('focusNextStage').textContent = d.next;
    });

  groups.append('circle')
    .attr('r', 6)
    .attr('fill', d => d.type === 'teal' ? '#087777' : '#94600B')
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 1.8);

  groups.append('text')
    .attr('x', 9)
    .attr('y', 4)
    .attr('font-size', '10.5px')
    .attr('font-weight', '700')
    .attr('fill', '#0B2545')
    .text(d => d.code);
}

// EXPORT CSV HELPER
function exportCSV(name) {
  const rows = [
    ['Event ID', 'Title', 'Geography', 'Vertical', 'Severity', 'Confidence', 'Status'],
    ['IRE-26-0142', 'GLP-1 uptake forecast', 'CA / US', 'L-1', '3 Significant', 'Medium', 'Review - pending'],
    ['IRE-26-0141', 'Extreme heat', 'US / HK / SG', 'M', '4 Severe', 'Medium', 'Action - open'],
    ['IRE-26-0140', 'Respiratory outbreak', 'CN / MY', 'M', '5 Critical', 'Low', 'Assessment - validation']
  ];
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `manulife-risc-${name}-2026-11-12.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}