import { db } from '../firebase.js';
import { getState } from '../state.js';
import { pushFlow, closeFlow } from '../router.js';
import { userCol, fmtDate, elapsedStr, fmtOffset, fmtTemp, KILN } from '../data.js';
import { openOutcomeEdit } from '../flows/outcome.js';

export function openFiringDetail(firingId) {
  pushFlow(el => renderDetail(el, firingId));
}

async function renderDetail(el, id) {
  el.innerHTML = `<div style="padding:var(--sp-8);color:var(--mute);font-size:14px">Loading…</div>`;

  const { user } = getState();
  if (!user) return;

  let f;
  try {
    const snap = await userCol(db, user.uid, 'firings').doc(id).get();
    if (!snap.exists) { el.innerHTML = `<div style="padding:var(--sp-8)">Not found.</div>`; return; }
    f = { id: snap.id, ...snap.data() };
  } catch (e) {
    el.innerHTML = `<div style="padding:var(--sp-8);color:var(--rust)">Error loading firing.</div>`;
    return;
  }

  const prog   = KILN.programs.find(p => p.id === f.programId);
  const pcs    = f.pieces?.reduce((s, p) => s + (p.count || 0), 0) || 0;
  const dur    = f.startedAt ? elapsedStr(f.startedAt) : '';
  const isAborted    = f.status === 'aborted';
  const isUnrecorded = !isAborted && !f.outcome;
  const outcome      = isAborted ? 'aborted' : (f.outcome || 'success');

  el.innerHTML = `
    <div class="detail-header">
      <div class="detail-nav">
        <button class="detail-back" id="det-back">← The Fire Log</button>
        <button class="det-delete" id="det-delete" aria-label="Delete firing">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
      <div class="eyebrow">FIRING #${String(f.no||'').padStart(3,'0')} · ${fmtDate(f.startedAt)}</div>
      <h1 class="detail-title" style="font-size:28px">${prog?.name || ''} · <em>Δ${f.coneC}</em></h1>
      <div class="detail-chips" style="margin-top:var(--sp-3);display:flex;gap:var(--sp-2);flex-wrap:wrap">
        ${isUnrecorded
          ? `<span class="badge badge-unrecorded">Unrecorded</span>`
          : `<span class="badge badge-${outcome}">${outcomeLabel(outcome)}</span>`
        }
        <span class="detail-chip" style="background:var(--rule-soft);color:var(--soft)">${pcs} pieces</span>
        ${dur ? `<span class="detail-chip" style="background:var(--rule-soft);color:var(--soft)">${dur}</span>` : ''}
        <span class="detail-chip" style="background:var(--rule-soft);color:var(--soft)">${fmtOffset(f.offsetF)} offset</span>
      </div>
    </div>

    ${f.witnessRead ? `
      <div class="detail-section">
        <div class="detail-section-label">Witness cone · Δ${f.coneC}</div>
        <div class="witness-result">
          <div class="witness-result-line">${witnessLabel(f.witnessRead)}</div>
          <div class="witness-result-sub">${witnessSub(f.witnessRead)}</div>
        </div>
      </div>
    ` : ''}

    ${f.notes ? `
      <div class="detail-section">
        <div class="detail-section-label">Notes</div>
        <p style="font-size:14px;font-style:italic;color:var(--soft);line-height:1.6">"${f.notes}"</p>
      </div>
    ` : ''}

    <div class="detail-section">
      <div class="detail-section-label">Schedule · Actual</div>
      <div>
        ${(prog?.segments || []).map(seg => `
          <div class="schedule-row">
            <div class="schedule-row-dot"></div>
            <div class="schedule-row-name">${seg.label}</div>
            <div class="schedule-row-val">${seg.r}°/hr → ${fmtTemp(seg.t)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${f.pieces?.length ? `
      <div class="detail-section">
        <div class="detail-section-label">What was inside</div>
        ${f.pieces.map(p => `
          <div class="inside-row">
            <span class="inside-count">${p.count}</span>
            <div>
              <div class="inside-name">${p.description}</div>
              ${p.clay ? `<div class="inside-tags">${p.clay}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="detail-actions">
      <button class="btn-primary" id="det-edit">Edit outcome</button>
    </div>
    <div style="height:var(--sp-8)"></div>
  `;

  el.querySelector('#det-back').addEventListener('click', () => closeFlow());
  el.querySelector('#det-edit').addEventListener('click', () => openOutcomeEdit(f));
  el.querySelector('#det-delete').addEventListener('click', () => deleteFiring(f));
}

async function deleteFiring(f) {
  if (!confirm(`Delete Firing #${String(f.no||'').padStart(3,'0')}? This cannot be undone.`)) return;
  const { user } = getState();
  if (!user) return;
  try {
    await userCol(db, user.uid, 'firings').doc(f.id).delete();
    window.dispatchEvent(new CustomEvent('kilnFiringDeleted', { detail: { id: f.id } }));
    closeFlow();
  } catch (e) { console.error(e); }
}


function outcomeLabel(o) {
  return { success:'Success', underfired:'Underfired', overfired:'Overfired', aborted:'Aborted' }[o] || 'Success';
}
function witnessLabel(wr) {
  const opt = { soft:'Standing straight', tipped:'Starting to tip', leaning:'Halfway down', touched:'Tip to pad', melted:'Melted flat' };
  return opt[wr.id] || wr.id;
}
function witnessSub(wr) {
  const subs = { soft:'Underfired — kiln ran cold', tipped:'Still short of temperature', leaning:'Close — slight correction applied', touched:'Right on temperature', melted:'Overfired — kiln ran hot' };
  return subs[wr.id] || '';
}
