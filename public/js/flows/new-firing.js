import { db } from '../firebase.js';
import { getState, setState } from '../state.js';
import { pushFlow, closeFlow, replaceFlow } from '../router.js';
import { KILN, ARMADILLO_CLAYS, DEFAULT_PREFLIGHT, suggestOffset, userDoc, userCol, etaStr, openAtStr, fmtTemp, fmtOffset } from '../data.js';
import { openLiveFlow } from './live.js';

const STEPS = 8;
let _draft = {};
let _glazeCache = null;  // loaded in step1 for glaze firings; in step3 for glaze note

// Cones beyond the 4 in KILN.cones that may appear in clay/glaze catalog data
const EXTRA_CONES = {
  '5':  { c:'5',  tempF:2167, tempC:1186, label:'Mid-fire stoneware' },
  '9':  { c:'9',  tempF:2300, tempC:1260, label:'High-fire stoneware' },
  '11': { c:'11', tempF:2381, tempC:1294, label:'High-fire reduction' },
  '12': { c:'12', tempF:2419, tempC:1315, label:'Very high-fire' },
};

export function startNewFiringFlow() {
  if (getState().activeFiring) {
    import('./live.js').then(m => m.openLiveFlow(getState().activeFiring));
    return;
  }
  _draft = {
    firingType:  null,
    programId:   null,
    coneC:       null,
    offsetF:     getState().profile?.offsetF || 0,
    hours:       10,
    preheatMins: 0,
    holdMins:    0,
    pieces:      [],
    checks:      { ...(getState().profile?.preflightOn || {}) },
  };
  _glazeCache = null;
  pushFlow(el => step0(el));
}

// ── shared header ─────────────────────────────────────────────

function hdr(el, step, backLabel, backFn) {
  const pct = (step / STEPS) * 100;
  el.insertAdjacentHTML('afterbegin', `
    <div class="flow-header">
      <button class="flow-back" id="fback">${backLabel}</button>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="flow-step-num">${step}/${STEPS}</span>
    </div>
  `);
  el.querySelector('#fback').addEventListener('click', backFn);
}

// ── Step 0: Firing Type ───────────────────────────────────────

function step0(el) {
  const sel = _draft.firingType;
  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step one · Firing type</div>
      <h2 class="flow-title">What are you<br><em>firing?</em></h2>
      <p class="flow-sub">This lets us filter and compare your firings over time.</p>
    </div>
    <div class="type-cards">
      <div class="type-card ${sel === 'bisque' ? 'selected' : ''}" data-type="bisque">
        <div class="type-card-name">Bisque</div>
        <div class="type-card-sub">Raw clay,<br>first firing</div>
      </div>
      <div class="type-card ${sel === 'glaze' ? 'selected' : ''}" data-type="glaze">
        <div class="type-card-name">Glaze</div>
        <div class="type-card-sub">Glazed<br>bisqueware</div>
      </div>
    </div>
    <div class="flow-footer">
      <button class="btn-primary" id="s0-next" ${!sel ? 'disabled style="opacity:.4"' : ''}>
        Continue → Load
      </button>
    </div>
  `;
  hdr(el, 1, '← Cancel', () => closeFlow());

  el.querySelectorAll('.type-card').forEach(card => {
    card.addEventListener('click', () => {
      const prev = _draft.firingType;
      _draft.firingType = card.dataset.type;
      // Clear pieces if type changed — selections are type-specific
      if (prev && prev !== _draft.firingType) { _draft.pieces = []; _glazeCache = null; }
      replaceFlow(el => step0(el));
    });
  });
  el.querySelector('#s0-next')?.addEventListener('click', () => {
    if (_draft.firingType) replaceFlow(el => step1(el));
  });
}

// ── Step 1: Load ──────────────────────────────────────────────
// Moved before Cone so library selections can drive cone suggestions.

async function step1(el) {
  // Preload glazes for glaze firings so the add-group modal has them synchronously
  if (_draft.firingType === 'glaze' && _glazeCache === null) {
    try {
      const { user } = getState();
      if (user) {
        const snap = await userCol(db, user.uid, 'glazes').orderBy('name').get();
        _glazeCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (_) {}
    if (_glazeCache === null) _glazeCache = [];
  }

  renderLoad(el);
}

function renderLoad(el) {
  const isBisque = _draft.firingType === 'bisque';
  const total = _draft.pieces.reduce((s, p) => s + (p.count || 0), 0);

  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step two · The Load</div>
      <h2 class="flow-title">What's <em>going in?</em></h2>
      <p class="flow-sub">${isBisque
        ? 'Pick a clay body for each group — we\'ll suggest a matching cone.'
        : 'Pick the glazes you\'re applying — we\'ll suggest a matching cone.'
      }</p>
    </div>
    <div class="load-header">
      <div>
        <div class="load-total">${total}</div>
        <div class="eyebrow">Total pieces</div>
      </div>
    </div>
    <div class="load-groups">
      ${_draft.pieces.map((p, i) => {
        const tags = isBisque
          ? (p.clay ? [`● ${p.clay}`] : [])
          : (p.glazes || []).map(g => `◆ ${g}`);
        return `
          <div class="load-group">
            <span class="load-count">${p.count}</span>
            <div class="load-body">
              <div class="load-desc">${p.description}</div>
              <div class="load-tags">${tags.map(t => `<span class="load-tag">${t}</span>`).join('')}</div>
            </div>
            <button data-rm="${i}" style="color:var(--mute);font-size:18px;padding:4px 8px">✕</button>
          </div>
        `;
      }).join('')}
    </div>
    <div class="load-add-link" id="add-group">+ Add ${_draft.pieces.length ? 'another' : 'a'} group</div>
    <div class="flow-footer">
      <button class="btn-primary" id="s1-next">Continue → Choose cone</button>
      <button class="btn-ghost" id="s1-skip">Or skip this step</button>
    </div>
  `;
  hdr(el, 2, '← Back', () => replaceFlow(el => step0(el)));

  el.querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      _draft.pieces.splice(Number(btn.dataset.rm), 1);
      renderLoad(el);
    });
  });
  el.querySelector('#add-group').addEventListener('click', () => addGroupModal());
  el.querySelector('#s1-next').addEventListener('click', () => replaceFlow(el => step2(el)));
  el.querySelector('#s1-skip').addEventListener('click', () => replaceFlow(el => step2(el)));
}

function addGroupModal() {
  const isBisque = _draft.firingType === 'bisque';
  const overlay  = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,18,12,.5);z-index:200;display:flex;flex-direction:column;justify-content:flex-end';

  let selectedClayId    = null;
  let selectedClayName  = '';
  let selectedClayCones = [];
  const selectedGlazes  = new Map(); // id → { name, cones[] }

  // Build picker content
  const pickerHtml = isBisque ? buildClayPicker() : buildGlazePicker();

  overlay.innerHTML = `
    <div class="modal-sheet" style="background:var(--bg);border-radius:16px 16px 0 0;padding:24px 24px 48px;max-width:430px;width:100%;margin:0 auto;max-height:88vh;overflow-y:auto">
      <div style="font-family:var(--font-display);font-size:20px;font-style:italic;margin-bottom:var(--sp-5)">Add a group</div>
      <label class="form-label">Count</label>
      <input id="mg-count" type="number" inputmode="numeric" min="1" class="form-input" placeholder="4" style="margin-bottom:var(--sp-5)">
      <label class="form-label">Description</label>
      <input id="mg-desc" type="text" class="form-input" placeholder="Tea bowls" style="margin-bottom:var(--sp-5)">
      <label class="form-label">${isBisque ? 'Clay body' : 'Glazes'} <span style="color:var(--mute);font-weight:400">(optional)</span></label>
      ${pickerHtml}
      <button class="btn-primary" id="mg-add">Add group</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#mg-count').focus();

  // Wire up clay picker (single-select)
  if (isBisque) {
    overlay.querySelectorAll('.picker-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedClayId    = item.dataset.id;
        selectedClayName  = item.dataset.name;
        selectedClayCones = (item.dataset.cones || '').split(',').filter(Boolean);
        overlay.querySelectorAll('.picker-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
  } else {
    // Glaze picker (multi-select)
    overlay.querySelectorAll('.picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (selectedGlazes.has(id)) {
          selectedGlazes.delete(id);
          item.classList.remove('selected');
        } else {
          selectedGlazes.set(id, {
            name:  item.dataset.name,
            cones: (item.dataset.cones || '').split(',').filter(Boolean),
          });
          item.classList.add('selected');
        }
      });
    });
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });

  overlay.querySelector('#mg-add').addEventListener('click', () => {
    const count = parseInt(overlay.querySelector('#mg-count').value) || 0;
    const desc  = overlay.querySelector('#mg-desc').value.trim() || 'Pieces';
    if (count > 0) {
      if (isBisque) {
        const suggestedCones = selectedClayCones;
        _draft.pieces.push({ count, description: desc, clay: selectedClayName || '', clayId: selectedClayId, suggestedCones });
      } else {
        const glazeList = [...selectedGlazes.values()];
        const allCones  = [...new Set(glazeList.flatMap(g => g.cones))];
        _draft.pieces.push({
          count, description: desc,
          glazes:    glazeList.map(g => g.name),
          glazeIds:  [...selectedGlazes.keys()],
          suggestedCones: allCones,
        });
      }
    }
    document.body.removeChild(overlay);
    replaceFlow(el => step1(el));
  });
}

function buildClayPicker() {
  const { profile } = getState();
  const hidden = new Set(profile?.hiddenClayIds || []);
  const visible = ARMADILLO_CLAYS.filter(c => !hidden.has(c.id));
  if (!visible.length) {
    return `<p style="font-size:13px;color:var(--mute);margin-bottom:var(--sp-5)">No clays in your library. Manage them in the Library tab.</p>`;
  }
  return `
    <div class="picker-list" style="margin-bottom:var(--sp-5)">
      ${visible.map(c => `
        <div class="picker-item" data-id="${c.id}" data-name="${c.name}" data-cones="${c.cones.join(',')}">
          <div class="picker-item-name">${c.name}</div>
          <div class="picker-item-sub">${capitalise(c.range)} fire · ${c.cones.map(v => 'Δ' + v).join(', ')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildGlazePicker() {
  if (!_glazeCache || !_glazeCache.length) {
    return `<p style="font-size:13px;color:var(--mute);margin-bottom:var(--sp-5)">No glazes in your library yet. Add some in the Library tab.</p>`;
  }
  return `
    <div class="picker-list" style="margin-bottom:var(--sp-5)">
      ${_glazeCache.map(g => `
        <div class="picker-item" data-id="${g.id}" data-name="${g.name}" data-cones="${(g.cones || []).join(',')}">
          <div class="picker-item-name">${g.name}</div>
          <div class="picker-item-sub">${g.cones?.length ? g.cones.map(c => 'Δ' + c).join(', ') : 'No cone set'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function capitalise(str) { return str ? str[0].toUpperCase() + str.slice(1) : ''; }

// Returns all suggested cones from load selections, sorted by weighted frequency
function getSuggestedConesByFrequency() {
  const counts = {};
  for (const piece of _draft.pieces) {
    for (const c of (piece.suggestedCones || [])) {
      counts[c] = (counts[c] || 0) + (piece.count || 1);
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

// ── Step 2: Cone ──────────────────────────────────────────────

function step2(el, showExtra = false) {
  const suggested      = getSuggestedConesByFrequency();
  const suggestedSet   = new Set(suggested);
  const kilnConeIds    = new Set(KILN.cones.map(c => c.c));

  // Pre-select the highest-frequency suggested cone that exists in KILN.cones
  if (!_draft.coneC) {
    const bestMatch = suggested.find(c => kilnConeIds.has(c));
    if (bestMatch) _draft.coneC = bestMatch;
  }

  // Extra cones: suggested by clay/glaze but not in the standard 4
  const extraConeIds   = suggested.filter(c => !kilnConeIds.has(c));
  const extraConesData = extraConeIds.map(id => EXTRA_CONES[id]).filter(Boolean)
    .sort((a, b) => a.tempF - b.tempF);

  const displayCones = showExtra
    ? [...KILN.cones, ...extraConesData].sort((a, b) => a.tempF - b.tempF)
    : KILN.cones;

  const typeWord = _draft.firingType === 'bisque' ? 'clay' : 'glaze';

  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step three · Cone</div>
      <h2 class="flow-title">How <em>hot?</em></h2>
      <p class="flow-sub">The cone sets the target temperature for this firing.</p>
    </div>
    ${suggested.length && _draft.coneC ? `
      <div class="cone-note" style="margin:0 var(--sp-6) var(--sp-3)">
        Δ${_draft.coneC} pre-selected from your ${typeWord} choices — change if needed.
      </div>` : ''}
    <div class="cone-list">
      ${displayCones.map(c => {
        const isMatch = suggestedSet.has(c.c);
        return `
          <div class="cone-card ${_draft.coneC === c.c ? 'selected' : ''}" data-c="${c.c}">
            <div class="cone-card-num">Δ${c.c}</div>
            <div class="cone-card-body">
              <div class="cone-card-label">${c.label}</div>
              <div class="cone-card-temps">${fmtTemp(c.tempF)}${isMatch ? ' <span class="cone-match-pill">your ' + typeWord + '</span>' : ''}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${extraConesData.length && !showExtra ? `
      <div class="cone-extra-link" id="cone-show-extra">
        Show ${extraConeIds.map(c => 'Δ' + c).join(', ')} — also used for this ${typeWord} →
      </div>
    ` : ''}
    <div class="flow-footer">
      <button class="btn-primary" id="s2-next" ${!_draft.coneC ? 'disabled style="opacity:.4"' : ''}>
        Continue → Speed
      </button>
    </div>
  `;
  hdr(el, 3, '← Back', () => replaceFlow(el => step1(el)));

  el.querySelectorAll('.cone-card').forEach(card => {
    card.addEventListener('click', () => { _draft.coneC = card.dataset.c; replaceFlow(el => step2(el, showExtra)); });
  });
  el.querySelector('#cone-show-extra')?.addEventListener('click', () => replaceFlow(el => step2(el, true)));
  el.querySelector('#s2-next')?.addEventListener('click', () => { if (_draft.coneC) replaceFlow(el => step3(el)); });
}

// ── Step 3: Speed ─────────────────────────────────────────────

function step3(el) {
  const progs = KILN.programs;
  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step four · Speed</div>
      <h2 class="flow-title">How fast<br>does it <em>fire?</em></h2>
      <p class="flow-sub">Match the speed to your ware. Tap a card for guidance.</p>
    </div>
    <div class="speed-list">
      ${progs.map(p => {
        const sel = _draft.programId === p.id;
        return `
          <div class="speed-card ${sel ? 'selected' : ''}" data-id="${p.id}">
            <div class="speed-card-header">
              <div class="speed-card-main">
                <div class="speed-card-name">${p.name}</div>
                <div class="speed-card-sub">${p.sub}</div>
              </div>
              <div class="speed-card-duration">
                <div class="speed-card-h">${p.hoursMin}–${p.hoursMax}<small style="font-size:11px">h</small></div>
                <div class="speed-card-hlabel">est.</div>
              </div>
            </div>
            ${sel && p.bullets.length ? `
              <div class="speed-card-bullets">
                ${p.bullets.map(b => `<div class="speed-bullet">${b}</div>`).join('')}
              </div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <div class="flow-footer">
      <button class="btn-primary" id="s3-next" ${!_draft.programId ? 'disabled style="opacity:.4"' : ''}>
        Continue → Kiln timers
      </button>
    </div>
  `;
  hdr(el, 4, '← Back', () => replaceFlow(el => step2(el)));

  el.querySelectorAll('.speed-card').forEach(card => {
    card.addEventListener('click', () => {
      _draft.programId = card.dataset.id;
      const prog = KILN.programs.find(p => p.id === _draft.programId);
      _draft.hours = prog?.hours || 10;
      replaceFlow(el => step3(el));
    });
  });
  el.querySelector('#s3-next')?.addEventListener('click', () => {
    if (_draft.programId) replaceFlow(el => step4(el));
  });
}

// ── Step 4: Kiln timers (Preheat + Hold at Peak) ──────────────

function step4(el) {
  const ph = _draft.preheatMins;
  const hd = _draft.holdMins;

  const PREHEAT_CHIPS = [
    { h:0,  m:0,  label:'None',  hint:'Bone-dry ware' },
    { h:4,  m:0,  label:'4h',    hint:'Slightly damp' },
    { h:8,  m:0,  label:'8h',    hint:'Thick or wet'  },
    { h:12, m:0,  label:'12h',   hint:'Hand-built'    },
  ];
  const HOLD_CHIPS = [
    { h:0, m:0,  label:'None',  hint:'Standard'       },
    { h:0, m:10, label:'10m',   hint:'Light soak'     },
    { h:0, m:20, label:'20m',   hint:'Even heat'      },
    { h:0, m:30, label:'30m',   hint:'Dense load'     },
  ];

  const phH = Math.floor(ph / 60);
  const phM = ph % 60;
  const hdH = Math.floor(hd / 60);
  const hdM = hd % 60;

  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step five · Kiln timers</div>
      <h2 class="flow-title">Set the <em>timers.</em></h2>
      <p class="flow-sub">These go directly on the controller. Both default to zero.</p>
    </div>

    <div class="timing-section">
      <div class="timing-label">Preheat</div>
      <div class="timing-desc">Holds the kiln at low heat before ramping. Use for damp or hand-built ware.</div>
      <div class="timing-chips">
        ${PREHEAT_CHIPS.map(c => {
          const mins = c.h * 60 + c.m;
          return `<button class="timing-chip ${ph === mins ? 'active' : ''}" data-field="pre" data-mins="${mins}">
            <span class="timing-chip-val">${c.label}</span>
            <span class="timing-chip-hint">${c.hint}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="timing-input-row">
        <input class="timing-h-input" id="pre-h" type="number" inputmode="numeric" min="0" max="24" value="${phH}"><span class="timing-unit">h</span>
        <input class="timing-m-input" id="pre-m" type="number" inputmode="numeric" min="0" max="59" value="${String(phM).padStart(2,'0')}"><span class="timing-unit">m</span>
      </div>
    </div>

    <div class="timing-section">
      <div class="timing-label">Hold at peak</div>
      <div class="timing-desc">Maintains peak temperature after the cone is reached. Common for dense loads or crystalline glazes.</div>
      <div class="timing-chips">
        ${HOLD_CHIPS.map(c => {
          const mins = c.h * 60 + c.m;
          return `<button class="timing-chip ${hd === mins ? 'active' : ''}" data-field="hold" data-mins="${mins}">
            <span class="timing-chip-val">${c.label}</span>
            <span class="timing-chip-hint">${c.hint}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="timing-input-row">
        <input class="timing-h-input" id="hold-h" type="number" inputmode="numeric" min="0" max="24" value="${hdH}"><span class="timing-unit">h</span>
        <input class="timing-m-input" id="hold-m" type="number" inputmode="numeric" min="0" max="59" value="${String(hdM).padStart(2,'0')}"><span class="timing-unit">m</span>
      </div>
    </div>

    <div class="flow-footer">
      <button class="btn-primary" id="s4-next">Continue → Calibration</button>
    </div>
  `;
  hdr(el, 5, '← Back', () => replaceFlow(el => step3(el)));

  const preH = el.querySelector('#pre-h');
  const preM = el.querySelector('#pre-m');
  const holdH = el.querySelector('#hold-h');
  const holdM = el.querySelector('#hold-m');

  const syncFromInputs = () => {
    const ph = (parseInt(preH.value) || 0) * 60 + (parseInt(preM.value) || 0);
    const hd = (parseInt(holdH.value) || 0) * 60 + (parseInt(holdM.value) || 0);
    _draft.preheatMins = Math.max(0, ph);
    _draft.holdMins    = Math.max(0, hd);
    el.querySelectorAll('.timing-chip[data-field="pre"]').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.mins) === _draft.preheatMins);
    });
    el.querySelectorAll('.timing-chip[data-field="hold"]').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.mins) === _draft.holdMins);
    });
  };

  preH.addEventListener('input', syncFromInputs);
  preM.addEventListener('input', syncFromInputs);
  holdH.addEventListener('input', syncFromInputs);
  holdM.addEventListener('input', syncFromInputs);

  el.querySelectorAll('.timing-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = Number(btn.dataset.mins);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (btn.dataset.field === 'pre') {
        _draft.preheatMins = mins;
        preH.value = h;
        preM.value = String(m).padStart(2, '0');
      } else {
        _draft.holdMins = mins;
        holdH.value = h;
        holdM.value = String(m).padStart(2, '0');
      }
      el.querySelectorAll(`.timing-chip[data-field="${btn.dataset.field}"]`).forEach(b => {
        b.classList.toggle('active', b === btn);
      });
    });
  });

  el.querySelector('#s4-next').addEventListener('click', () => {
    syncFromInputs();
    replaceFlow(el => step5(el));
  });
}

// ── Step 5: Offset ────────────────────────────────────────────

async function step5(el) {
  let suggested = null;
  let suggestionBasis = 0;
  try {
    const { user } = getState();
    if (user) {
      const snap = await userCol(db, user.uid, 'firings')
        .orderBy('startedAt', 'desc').limit(5).get();
      const history = snap.docs.map(d => d.data()).filter(f => f.witnessRead);
      suggestionBasis = history.length;
      suggested = suggestOffset(history);
    }
  } catch (_) {}

  renderOffsetStep(el, suggested, suggestionBasis);
}

function renderOffsetStep(el, suggested, basisCount = 0) {
  const INCREMENTS = [-10, -5, null, 5, 10];
  const v = _draft.offsetF;
  const desc = v > 0 ? 'Kiln runs cool' : v < 0 ? 'Kiln runs hot' : 'Kiln runs on target';

  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step six · Calibration</div>
      <h2 class="flow-title">Does your kiln run <em>hot<br>or cold?</em></h2>
      <p class="flow-sub">Add a temperature offset to nudge the schedule. We'll learn from each firing.</p>
    </div>
    <div class="offset-card">
      <span class="offset-label">Offset</span>
      <div class="offset-controls">
        <button class="offset-stepper" id="ominus">−</button>
        <div class="offset-value" id="oval">${v >= 0 ? '+' : ''}${v}<span class="offset-unit">°F</span></div>
        <button class="offset-stepper" id="oplus">+</button>
      </div>
      <span class="offset-desc" id="odesc">${desc}</span>
      <div class="offset-increments">
        ${INCREMENTS.map(d => d === null
          ? `<button class="offset-increment offset-increment-reset" data-delta="reset">Reset</button>`
          : `<button class="offset-increment" data-delta="${d}">${d > 0 ? '+' : ''}${d}</button>`
        ).join('')}
      </div>
    </div>
    ${suggested !== null
      ? `<div class="suggest-card">
           <div class="suggest-head">Suggested · Based on ${basisCount === 1 ? 'last firing' : `last ${basisCount} firings`}</div>
           <div class="suggest-value">${suggested >= 0 ? '+' : ''}${suggested}°F</div>
           <button class="btn-ghost" id="use-suggest" style="text-align:left;width:auto;padding:4px 0">Use this →</button>
         </div>`
      : `<div class="suggest-card"><div class="suggest-sub" style="font-size:13px;color:var(--soft)">New kilns usually need +0 to +15°F as elements age. After each firing we'll read your witness cone and adjust.</div></div>`
    }
    <div class="flow-footer">
      <button class="btn-primary" id="s5-next">Continue → Pre-flight</button>
    </div>
  `;
  hdr(el, 6, '← Back', () => replaceFlow(el => step4(el)));

  const refresh = () => {
    const nv = _draft.offsetF;
    el.querySelector('#oval').innerHTML = `${nv >= 0 ? '+' : ''}${nv}<span class="offset-unit">°F</span>`;
    el.querySelector('#odesc').textContent = nv > 0 ? 'Kiln runs cool' : nv < 0 ? 'Kiln runs hot' : 'Kiln runs on target';
  };

  let _lastTap = 0;
  const tap = (fn) => {
    const now = Date.now();
    if (now - _lastTap < 200) return;
    _lastTap = now;
    fn();
    refresh();
  };

  el.querySelector('#ominus').addEventListener('click', () => tap(() => { _draft.offsetF -= 1; }));
  el.querySelector('#oplus').addEventListener('click',  () => tap(() => { _draft.offsetF += 1; }));
  el.querySelectorAll('.offset-increment').forEach(btn => {
    btn.addEventListener('click', () => tap(() => {
      if (btn.dataset.delta === 'reset') { _draft.offsetF = 0; } else { _draft.offsetF += Number(btn.dataset.delta); }
    }));
  });
  el.querySelector('#use-suggest')?.addEventListener('click', () => { _draft.offsetF = suggested; refresh(); });
  el.querySelector('#s5-next').addEventListener('click', () => replaceFlow(el => step6(el)));
}

// ── Step 6: Preflight ─────────────────────────────────────────

function step6(el) {
  const prog = KILN.programs.find(p => p.id === _draft.programId);
  const cone = KILN.cones.find(c => c.c === _draft.coneC);
  const openAt = openAtStr({ toDate: () => new Date() }, _draft.hours);

  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Step seven · Pre-flight</div>
      <h2 class="flow-title">One last <em>look.</em></h2>
      <p class="flow-sub">Check each item before we hand it to the kiln.</p>
    </div>
    <div class="check-list">
      ${DEFAULT_PREFLIGHT.map(item => {
        const checked = !!_draft.checks[item.id];
        return `
          <div class="check-item">
            <div class="check-circle ${checked ? 'checked' : ''}" data-ck="${item.id}">
              ${checked ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
            </div>
            <span class="check-label">${item.label}</span>
          </div>
        `;
      }).join('')}
    </div>
    <div class="preflight-summary" style="margin:var(--sp-5) var(--sp-6)">
      <div class="preflight-summary-label">Schedule</div>
      <div class="preflight-summary-name">${_draft.firingType === 'bisque' ? 'Bisque' : 'Glaze'} · ${prog?.name} · Δ${_draft.coneC} · ${fmtOffset(_draft.offsetF)}</div>
      <div class="preflight-summary-meta">
        ~${_draft.hours}h (peak → ${fmtTemp(cone?.tempF)})
        ${_draft.preheatMins ? ` · Preheat ${fmtMins(_draft.preheatMins)}` : ''}
        ${_draft.holdMins    ? ` · Hold ${fmtMins(_draft.holdMins)}`       : ''}
        · Open by ${openAt}
      </div>
    </div>
    <div class="flow-footer">
      <button class="btn-primary" id="s6-next">Confirm &amp; start →</button>
    </div>
  `;
  hdr(el, 7, '← Back', () => replaceFlow(el => step5(el)));

  el.querySelectorAll('.check-circle').forEach(circle => {
    circle.addEventListener('click', () => {
      _draft.checks[circle.dataset.ck] = !_draft.checks[circle.dataset.ck];
      replaceFlow(el => step6(el));
    });
  });
  el.querySelector('#s6-next').addEventListener('click', () => replaceFlow(el => step7(el)));
}

// ── Step 7: Confirm & Start ───────────────────────────────────

function step7(el) {
  const prog  = KILN.programs.find(p => p.id === _draft.programId);
  const pcs   = _draft.pieces.reduce((s, p) => s + (p.count || 0), 0);
  const eta   = etaStr({ toDate: () => new Date() }, _draft.hours);
  const openAt = openAtStr({ toDate: () => new Date() }, _draft.hours);
  const allOk = DEFAULT_PREFLIGHT.every(i => _draft.checks[i.id]);
  const typeLabel = _draft.firingType === 'bisque' ? 'Bisque' : 'Glaze';

  el.innerHTML = `
    <div class="flow-step" style="margin-top:72px">
      <div class="flow-step-eyebrow">Ready</div>
      <h2 class="flow-title">Light it up?</h2>
    </div>
    <div class="confirm-card">
      <div style="position:absolute;top:var(--sp-5);right:var(--sp-5);width:52px;height:52px;border-radius:50%;background:var(--terra);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:18px;color:#fff">Δ${_draft.coneC}</div>
      <div class="confirm-name">${typeLabel} · ${prog?.name}</div>
      <div class="confirm-times">
        <div class="confirm-time-item"><div class="confirm-time-val">~${_draft.hours}h</div><div class="confirm-time-label">Program</div></div>
        <div class="confirm-time-item"><div class="confirm-time-val">~5h 45m</div><div class="confirm-time-label">Natural cool</div></div>
        <div class="confirm-time-item"><div class="confirm-time-val">${openAt}</div><div class="confirm-time-label">Open by</div></div>
      </div>
      <div class="confirm-meta-grid" style="margin-top:var(--sp-4)">
        <div class="confirm-meta-item"><div class="confirm-meta-label">Pieces</div><div class="confirm-meta-val">${pcs || '—'}</div></div>
        <div class="confirm-meta-item"><div class="confirm-meta-label">Offset</div><div class="confirm-meta-val">${fmtOffset(_draft.offsetF)}</div></div>
        <div class="confirm-meta-item"><div class="confirm-meta-label">Fire end</div><div class="confirm-meta-val">${eta}</div></div>
        <div class="confirm-meta-item"><div class="confirm-meta-label">Preheat</div><div class="confirm-meta-val">${_draft.preheatMins ? fmtMins(_draft.preheatMins) : '—'}</div></div>
        <div class="confirm-meta-item"><div class="confirm-meta-label">Hold</div><div class="confirm-meta-val">${_draft.holdMins ? fmtMins(_draft.holdMins) : '—'}</div></div>
      </div>
      ${allOk ? `<div class="confirm-checks" style="margin-top:var(--sp-5);padding-top:var(--sp-4);border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:rgba(255,255,255,.55);display:flex;align-items:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a8c50" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        All ${DEFAULT_PREFLIGHT.length} pre-flight checks done
      </div>` : ''}
    </div>
    <div class="flow-footer">
      <button class="btn-primary" id="s7-start">• Start firing</button>
    </div>
  `;
  hdr(el, 8, '← Back', () => replaceFlow(el => step6(el)));

  el.querySelector('#s7-start').addEventListener('click', () => doStart(el));
}

async function doStart(el) {
  const btn = el.querySelector('#s7-start');
  if (btn) { btn.disabled = true; btn.textContent = 'Starting…'; }
  const { user, profile } = getState();
  if (!user) return;

  try {
    const activeSnap = await userCol(db, user.uid, 'firings')
      .where('status', '==', 'active').limit(1).get();
    if (!activeSnap.empty) {
      const existing = { id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() };
      setState({ activeFiring: existing });
      closeFlow();
      openLiveFlow(existing);
      return;
    }

    const newCount = (profile?.firingCount || 0) + 1;
    const data = {
      no: newCount, programId: _draft.programId, coneC: _draft.coneC,
      firingType: _draft.firingType,
      offsetF: _draft.offsetF, hours: _draft.hours,
      preheatMins: _draft.preheatMins, holdMins: _draft.holdMins,
      pieces: _draft.pieces, checks: _draft.checks,
      status: 'active', outcome: null, witnessRead: null, notes: '',
      currentSegment: 'Pre-warm',
      startedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const batch = db.batch();
    const ref = userCol(db, user.uid, 'firings').doc();
    batch.set(ref, data);
    batch.update(userDoc(db, user.uid), { firingCount: newCount, offsetF: _draft.offsetF });
    await batch.commit();

    const firing = { id: ref.id, ...data, startedAt: { toDate: () => new Date() } };
    setState({ activeFiring: firing, profile: { ...profile, firingCount: newCount } });
    closeFlow();
    openLiveFlow(firing);
  } catch (e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.textContent = '• Start firing'; }
  }
}

function fmtMins(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
