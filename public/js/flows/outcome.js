import { db } from '../firebase.js';
import { getState, setState } from '../state.js';
import { pushFlow, replaceFlow, closeFlow, popFlow } from '../router.js';
import { userCol, userDoc } from '../data.js';
import { WITNESS_OPTIONS } from '../data.js';

let _firing = null;
let _witness = null;
let _outcome = null;
let _notes   = '';

export function startOutcomeFlow(firing, witnessOpt) {
  _firing  = firing;
  _witness = witnessOpt;
  _outcome = null;
  _notes   = '';
  pushFlow(el => render(el));
}

function render(el) {
  const offsetF = _firing?.offsetF || 0;
  const suggestedNext = _witness ? offsetF + _witness.deltaF : offsetF;

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-4)">
      <button class="flow-back" id="out-skip">Skip</button>
      <button class="flow-back" id="out-save" style="color:var(--terra);font-weight:600">Save</button>
    </div>
    <div class="flow-step">
      <div class="eyebrow">FIRING #${String(_firing?.no||'').padStart(3,'0')} · Cooled</div>
      <h2 class="flow-title">How did it <em>go?</em></h2>
      <p class="flow-sub">A line or two now will save you a re-fire later.</p>
    </div>
    ${_witness ? `
      <div class="outcome-summary" style="margin:var(--sp-4) var(--sp-6)">
        Used <strong>${offsetF >= 0 ? '+' : ''}${offsetF}°F</strong> offset. Your reading will refine the next suggestion to <strong>${suggestedNext >= 0 ? '+' : ''}${suggestedNext}°F</strong>.
      </div>
    ` : ''}
    <div class="outcome-grid">
      ${[
        { id:'success',    label:'Success',    sub:'Came out as planned' },
        { id:'underfired', label:'Underfired', sub:'Glaze stayed matte' },
        { id:'overfired',  label:'Overfired',  sub:'Run or blistered' },
      ].map(o => `
        <div class="outcome-card ${_outcome === o.id ? 'selected' : ''}" data-id="${o.id}">
          <div class="outcome-card-label">${o.label}</div>
          <div class="outcome-card-sub">${o.sub}</div>
        </div>
      `).join('')}
    </div>
    ${_witness ? `
      <div class="outcome-section">
        <div class="outcome-section-label">Witness cone</div>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
          ${WITNESS_OPTIONS.map(opt => `
            <div class="witness-card" style="flex:0 0 auto;padding:var(--sp-3) var(--sp-4);${_witness?.id === opt.id ? 'border-color:var(--terra);background:var(--cream)' : ''}">
              <div class="witness-name" style="font-size:13px">${opt.label}</div>
              <div style="font-size:11px;color:var(--mute)">${opt.clock} o'clock</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="outcome-section">
      <div class="outcome-section-label">Notes</div>
      <textarea class="notes-input" id="out-notes" placeholder="&quot;Tenmoku tea bowls came out beautifully — celadon broke nicely on rim.&quot;">${_notes}</textarea>
    </div>
    <div style="height:100px"></div>
  `;

  el.querySelector('#out-skip').addEventListener('click', () => { closeFlow(); });
  el.querySelector('#out-save').addEventListener('click', () => doSave(el));
  el.querySelector('#out-notes').addEventListener('input', e => { _notes = e.target.value; });
  el.querySelectorAll('.outcome-card').forEach(card => {
    card.addEventListener('click', () => { _outcome = card.dataset.id; replaceFlow(el => render(el)); });
  });
}

// ── Edit flow (opened from firing detail in the log) ─────────────────────────

let _editFiring   = null;
let _editWitnessId = null;
let _editOutcome  = null;
let _editNotes    = '';

export function openOutcomeEdit(firing) {
  _editFiring    = firing;
  _editWitnessId = firing.witnessRead?.id || null;
  _editOutcome   = firing.outcome || null;
  _editNotes     = firing.notes || '';
  pushFlow(el => renderEdit(el));
}

function renderEdit(el) {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-4)">
      <button class="flow-back" id="oe-back">← Back</button>
      <button class="flow-back" id="oe-save" style="color:var(--terra);font-weight:600">Save</button>
    </div>
    <div class="flow-step">
      <div class="eyebrow">FIRING #${String(_editFiring?.no||'').padStart(3,'0')}</div>
      <h2 class="flow-title">Edit <em>outcome.</em></h2>
    </div>

    <div class="outcome-section">
      <div class="outcome-section-label">Witness cone · Δ${_editFiring?.coneC || ''}</div>
      <div class="witness-list" style="padding:0">
        ${WITNESS_OPTIONS.map(opt => `
          <div class="witness-card ${_editWitnessId === opt.id ? 'selected' : ''}" data-id="${opt.id}">
            <div class="witness-icon">${editConeIcon(opt.id)}</div>
            <div class="witness-body">
              <div class="witness-name">${opt.label}</div>
              <div class="witness-desc">${opt.desc}</div>
            </div>
            <div>
              <div class="witness-delta">${opt.deltaF === 0 ? '± 0°F' : `${opt.deltaF > 0 ? '+' : ''}${opt.deltaF}°F`}</div>
              <div style="font-size:10px;color:var(--mute);margin-top:2px">${opt.clock} o'clock</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="outcome-grid">
      ${[
        { id:'success',    label:'Success',    sub:'Came out as planned' },
        { id:'underfired', label:'Underfired', sub:'Glaze stayed matte'  },
        { id:'overfired',  label:'Overfired',  sub:'Run or blistered'    },
      ].map(o => `
        <div class="outcome-card ${_editOutcome === o.id ? 'selected' : ''}" data-id="${o.id}">
          <div class="outcome-card-label">${o.label}</div>
          <div class="outcome-card-sub">${o.sub}</div>
        </div>
      `).join('')}
    </div>

    <div class="outcome-section">
      <div class="outcome-section-label">Notes</div>
      <textarea class="notes-input" id="oe-notes" placeholder="&quot;Tenmoku tea bowls came out beautifully — celadon broke nicely on rim.&quot;">${_editNotes}</textarea>
    </div>
    <div style="height:100px"></div>
  `;

  el.querySelector('#oe-back').addEventListener('click', () => popFlow());
  el.querySelector('#oe-save').addEventListener('click', () => doEditSave(el));
  el.querySelector('#oe-notes').addEventListener('input', e => { _editNotes = e.target.value; });

  el.querySelectorAll('.witness-card').forEach(card => {
    card.addEventListener('click', () => {
      _editWitnessId = card.dataset.id;
      replaceFlow(el => renderEdit(el));
    });
  });

  el.querySelectorAll('.outcome-card').forEach(card => {
    card.addEventListener('click', () => {
      _editOutcome = card.dataset.id;
      replaceFlow(el => renderEdit(el));
    });
  });
}

async function doEditSave(el) {
  const btn = el.querySelector('#oe-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const { user } = getState();
  if (!user || !_editFiring?.id) { popFlow(); return; }

  try {
    const witnessOpt = _editWitnessId ? WITNESS_OPTIONS.find(o => o.id === _editWitnessId) : null;
    await userCol(db, user.uid, 'firings').doc(_editFiring.id).update({
      outcome:     _editOutcome || 'success',
      notes:       _editNotes,
      witnessRead: witnessOpt
        ? { id: witnessOpt.id, clockPosition: witnessOpt.clock, deltaF: witnessOpt.deltaF }
        : (_editFiring.witnessRead || null),
    });
    popFlow();
  } catch (e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
}

function editConeIcon(id) {
  const shelf = `<line x1="2" y1="50" x2="42" y2="50" stroke="currentColor" stroke-width="1.5" opacity=".3" stroke-linecap="round"/>`;
  const s = `fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
  const tri = (deg) => `<polygon points="7,50 13,50 10,18" transform="rotate(${deg},10,50)" ${s}/>`;
  const shapes = {
    soft:    tri(12),
    tipped:  tri(32),
    leaning: tri(60),
    touched: tri(90),
    melted:  `<ellipse cx="22" cy="50" rx="18" ry="4" ${s}/>`,
  };
  return `<svg width="44" height="56" viewBox="0 0 44 56">${shelf}${shapes[id] || shapes.soft}</svg>`;
}

async function doSave(el) {
  const btn = el.querySelector('#out-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const { user, profile } = getState();
  if (!user || !_firing?.id) { closeFlow(); return; }

  try {
    const update = {
      status:      'done',
      outcome:     _outcome || 'success',
      notes:       _notes,
      endedAt:     firebase.firestore.FieldValue.serverTimestamp(),
      witnessRead: _witness ? { id: _witness.id, clockPosition: _witness.clock, deltaF: _witness.deltaF } : null,
    };
    await userCol(db, user.uid, 'firings').doc(_firing.id).update(update);

    // Update suggested offset on profile
    if (_witness && profile) {
      const newOffset = Math.round((_firing.offsetF + _witness.deltaF) / 5) * 5;
      await userDoc(db, user.uid).update({ offsetF: newOffset });
      setState({ profile: { ...profile, offsetF: newOffset } });
    }

    setState({ activeFiring: null });
    window.dispatchEvent(new CustomEvent('kilnFiringUpdated'));
    closeFlow();
  } catch (e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
}
