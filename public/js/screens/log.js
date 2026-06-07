import { db } from '../firebase.js';
import { getState } from '../state.js';
import { userCol, fmtDate, elapsedStr } from '../data.js';
import { openFiringDetail } from '../detail/firing.js';

let _all = [];
let _container = null;
let _filter = 'all';
let _deleteHandler = null;

export async function mount(container) {
  _container = container;
  _filter = 'all';
  container.innerHTML = `
    <div class="screen-header" style="padding-bottom:0">
      <div>
        <div class="eyebrow">The Fire Log</div>
        <h1 class="page-title">Every <em>firing.</em></h1>
      </div>
    </div>
    <div class="filter-chips">
      <button class="chip active" data-filter="all">All</button>
      <button class="chip" data-filter="bisque">Bisque</button>
      <button class="chip" data-filter="glaze">Glaze</button>
      <button class="chip" data-filter="issues">Issues</button>
    </div>
    <div class="firing-list" id="firing-list"><p style="padding:var(--sp-6);color:var(--mute);font-size:14px">Loading…</p></div>
  `;

  const { user } = getState();
  if (!user) return;

  try {
    const snap = await userCol(db, user.uid, 'firings')
      .orderBy('startedAt', 'desc')
      .get();
    _all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    _all = [];
  }

  renderList(container, 'all');

  // Filter chips
  container.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _filter = btn.dataset.filter;
      renderList(container, _filter);
    });
  });

  _deleteHandler = e => {
    _all = _all.filter(f => f.id !== e.detail.id);
    renderList(_container, _filter);
  };
  window.addEventListener('kilnFiringDeleted', _deleteHandler);

  // Tap row
  container.querySelector('#firing-list').addEventListener('click', e => {
    const row = e.target.closest('.firing-row');
    if (row) openFiringDetail(row.dataset.id);
  });
}

export function unmount() {
  if (_deleteHandler) { window.removeEventListener('kilnFiringDeleted', _deleteHandler); _deleteHandler = null; }
}

function renderList(container, filter) {
  const list = container.querySelector('#firing-list');
  let items = _all;

  const isBisque = f => f.firingType === 'bisque' || (!f.firingType && (f.programId?.startsWith('bisq') || (!f.programId?.startsWith('glaz') && ['06','04'].includes(f.coneC))));
  const isGlaze  = f => f.firingType === 'glaze'  || (!f.firingType && (f.programId?.startsWith('glaz') || (!f.programId?.startsWith('bisq') && ['6','10'].includes(f.coneC))));
  if (filter === 'bisque') items = items.filter(isBisque);
  if (filter === 'glaze')  items = items.filter(isGlaze);
  if (filter === 'issues') items = items.filter(f =>
    f.status !== 'active' && f.status !== 'cooling' &&
    (!f.outcome || f.outcome !== 'success')
  );

  if (!items.length) {
    list.innerHTML = `<p style="padding:var(--sp-6);color:var(--mute);font-size:14px">No firings yet.</p>`;
    return;
  }

  list.innerHTML = items.map(f => {
    const name    = programName(f.programId);
    const pieces  = f.pieces?.reduce((s, p) => s + (p.count || 0), 0) || 0;
    const dur     = f.startedAt ? elapsedStr(f.startedAt) : '';
    const isActive     = f.status === 'active' || f.status === 'cooling';
    const isAborted    = f.status === 'aborted';
    const isUnrecorded = !isActive && !isAborted && !f.outcome;
    const outcome      = f.outcome || 'success';
    const badge = isActive
      ? `<span class="badge" style="background:var(--terra);color:#fff;animation:pulse 1.5s ease-in-out infinite">● Live</span>`
      : isAborted
      ? `<span class="badge badge-aborted">Aborted</span>`
      : isUnrecorded
      ? `<span class="badge badge-unrecorded">Unrecorded</span>`
      : `<span class="badge badge-${outcome}">${outcomeLabel(outcome)}</span>`;
    return `
      <div class="firing-row" data-id="${f.id}">
        <span class="firing-no">${String(f.no || '').padStart(3,'0')}</span>
        <div class="firing-body">
          <div class="firing-head">
            ${badge}
            <span class="firing-name">${name}</span>
            <span class="firing-cone">Δ${f.coneC || ''}</span>
          </div>
          <div class="firing-meta">${fmtDate(f.startedAt)} · ${dur} · ${pieces} pcs · cone ${f.coneC || ''} ${f.flat ? 'flat' : ''}</div>
          ${f.notes ? `<div class="firing-note">${f.notes}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function programName(id) {
  const map = {
    'bisq-slow':'Slow Bisque','bisq-med':'Medium Bisque','bisq-fast':'Fast Bisque',
    'glaz-slow':'Slow Glaze','glaz-med':'Medium Glaze','glaz-fast':'Fast Glaze',
    'fast':'Fast','medium':'Medium','medslo':'MedSlo','slow':'Slow',
  };
  return map[id] || id || '';
}

function outcomeLabel(o) {
  const map = { success:'Success', underfired:'Underfired', overfired:'Overfired', aborted:'Aborted' };
  return map[o] || 'Success';
}
