import { db } from '../firebase.js';
import { getState, setState } from '../state.js';
import { goTo, pushFlow } from '../router.js';
import { userCol, fmtDayDate, fmtDate, remainingStr, etaStr, elapsedPct, elapsedStr } from '../data.js';
import { startNewFiringFlow } from '../flows/new-firing.js';
import { openLiveFlow } from '../flows/live.js';

let _unsub = null;
let _ticker = null;
let _container = null;
let _deleteHandler = null;
let _updateHandler = null;

export async function mount(container) {
  _container = container;
  render(container);

  const { user } = getState();
  if (!user) return;

  // Real-time listener for active firing (no orderBy = no composite index needed)
  _unsub = userCol(db, user.uid, 'firings')
    .where('status', '==', 'active')
    .limit(1)
    .onSnapshot(snap => {
      const firing = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      setState({ activeFiring: firing });
      render(_container);
    });

  _deleteHandler = () => render(_container);
  window.addEventListener('kilnFiringDeleted', _deleteHandler);
  _updateHandler = () => render(_container);
  window.addEventListener('kilnFiringUpdated', _updateHandler);

  return unmount;
}

export function unmount() {
  if (_unsub)          { _unsub();                    _unsub = null; }
  if (_ticker)         { clearInterval(_ticker);      _ticker = null; }
  if (_deleteHandler)  { window.removeEventListener('kilnFiringDeleted', _deleteHandler); _deleteHandler = null; }
  if (_updateHandler)  { window.removeEventListener('kilnFiringUpdated', _updateHandler); _updateHandler = null; }
  _container = null;
}

async function render(container) {
  if (!container) return;
  const { user, profile, activeFiring } = getState();

  // Fetch recent completed firings — orderBy only, filter client-side (avoids composite index)
  let recent = [];
  try {
    const snap = await userCol(db, user.uid, 'firings')
      .orderBy('startedAt', 'desc')
      .limit(8)
      .get();
    recent = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(f => f.status === 'done' || f.status === 'cooling' || f.status === 'aborted')
      .slice(0, 3);
  } catch (e) { /* offline ok */ }

  const initial = profile?.displayName?.split(' ')[0]?.[0]?.toUpperCase() || '?';
  const hasAny  = activeFiring || recent.length > 0;

  container.innerHTML = `
    <div class="screen-header">
      <span class="header-date">${fmtDayDate()}</span>
      ${activeFiring
        ? `<span class="header-live">Live</span>`
        : `<button class="avatar-btn" id="today-avatar">${initial}</button>`
      }
    </div>
    <div class="screen-pad" style="padding-bottom:var(--sp-4)">
      <div class="eyebrow">${activeFiring ? 'THE STUDIO TODAY' : ''}</div>
      <h1 class="page-title">${activeFiring
        ? `${profile?.displayName?.split(' ')[0] || 'Your'}'s<br><em>kiln</em> is awake.`
        : 'Today.'
      }</h1>
      ${!activeFiring && !hasAny
        ? `<p style="font-style:italic;font-size:14px;color:var(--soft);margin-top:6px">Welcome to the studio.</p>`
        : ''
      }
    </div>

    ${activeFiring ? renderLiveCard(activeFiring) : ''}
    ${!hasAny      ? renderEmptyState()           : ''}
    ${recent.length ? renderRecentLog(recent)      : ''}
  `;

  // Live card ticker
  if (_ticker) clearInterval(_ticker);
  if (activeFiring) {
    _ticker = setInterval(() => updateLiveCard(activeFiring), 10_000);
    container.querySelector('.live-card')?.addEventListener('click', () => openLiveFlow(activeFiring));
  }

  container.querySelector('#today-avatar')?.addEventListener('click', () => goTo('settings'));
}

function renderLiveCard(f) {
  const prog = getProgramName(f.programId);
  const pct  = elapsedPct(f.startedAt, f.hours || 8);

  if (pct >= 100) {
    return `
      <div class="live-card card-terra" id="live-card">
        <div class="live-card-circle" style="opacity:.25"></div>
        <div class="live-card-eyebrow">FIRING #${String(f.no || '').padStart(3,'0')} · SCHEDULE COMPLETE</div>
        <div class="live-card-name">${prog}</div>
        <div class="live-card-time" style="font-size:18px;letter-spacing:.01em">Ready to wrap up</div>
        <div class="live-card-meta">
          <span class="live-card-segment" style="opacity:.7">Tap to record the outcome →</span>
        </div>
        <div class="live-card-progress">
          <div class="live-card-bar" style="width:100%"></div>
        </div>
      </div>
    `;
  }

  const { h, m } = remainingStr(f.startedAt, f.hours || 8);
  const eta  = etaStr(f.startedAt, f.hours || 8);
  const seg  = currentSegmentName(f);

  return `
    <div class="live-card card-terra" id="live-card">
      <div class="live-card-circle"></div>
      <div class="live-card-eyebrow">FIRING #${String(f.no || '').padStart(3,'0')} · CONE Δ${f.coneC}</div>
      <div class="live-card-name">${prog}</div>
      <div class="live-card-time">
        <span class="live-card-h">${h}h</span>
        <span class="live-card-m">${m}m</span>
      </div>
      <div class="live-card-meta">
        <span class="live-card-segment">${seg}</span>
        <span class="live-card-eta">${eta}<br><small style="opacity:.6">est. arrival</small></span>
      </div>
      <div class="live-card-progress">
        <div class="live-card-bar" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function updateLiveCard(f) {
  const pct = elapsedPct(f.startedAt, f.hours || 8);
  if (pct >= 100) {
    // Schedule elapsed — re-render the whole card to show the complete state
    render(_container);
    return;
  }
  const card = document.getElementById('live-card');
  if (!card) return;
  const { h, m } = remainingStr(f.startedAt, f.hours || 8);
  const eta = etaStr(f.startedAt, f.hours || 8);
  const seg = currentSegmentName(f);
  const hEl = card.querySelector('.live-card-h');
  const mEl = card.querySelector('.live-card-m');
  const bar = card.querySelector('.live-card-bar');
  const segEl = card.querySelector('.live-card-segment');
  const etaEl = card.querySelector('.live-card-eta');
  if (hEl) hEl.textContent = `${h}h`;
  if (mEl) mEl.textContent = `${m}m`;
  if (bar) bar.style.width = `${pct}%`;
  if (segEl) segEl.textContent = seg;
  if (etaEl) etaEl.innerHTML = `${eta}<br><small style="opacity:.6">est. arrival</small>`;
}

function renderEmptyState() {
  return `
    <div class="empty-card card" style="margin:0 var(--sp-6) var(--sp-6)">
      <div class="empty-icon">🔥</div>
      <p class="empty-title">Your first firing<br>starts here.</p>
      <p class="empty-sub">Pick a schedule, load your kiln, and we'll guide you through. Every firing teaches the next one.</p>
      <button class="btn-primary" id="empty-start-btn">Start a firing →</button>
    </div>
    <div style="padding:0 var(--sp-6)">
      <div class="eyebrow" style="margin-bottom:var(--sp-4)">While you're waiting</div>
    </div>
    <div class="todo-list">
      <div class="todo-item" id="todo-glazes">
        <span class="todo-no">01</span>
        <div class="todo-text"><strong>Add your glazes</strong><span>Recipes, sample tiles, notes</span></div>
        <span class="todo-arrow">→</span>
      </div>
      <div class="todo-item" id="todo-settings">
        <span class="todo-no">02</span>
        <div class="todo-text"><strong>Set kiln defaults</strong><span>Offset, units, pre-flight checklist</span></div>
        <span class="todo-arrow">→</span>
      </div>
    </div>
  `;
}

function renderRecentLog(firings) {
  const items = firings.map(f => `
    <div class="log-preview-item" data-id="${f.id}">
      <span class="log-preview-no">${String(f.no || '').padStart(2,'0')}</span>
      <div class="log-preview-body">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="log-preview-name">${getProgramName(f.programId)}</span>
          ${recentBadge(f)}
        </div>
        <div class="log-preview-meta">${fmtDate(f.startedAt)} · ${f.pieces?.reduce((s,p) => s+(p.count||0),0)||0} pcs</div>
        ${f.notes ? `<div class="log-preview-note">${f.notes}</div>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div style="padding:0 var(--sp-6) var(--sp-4)">
      <div class="section-head">
        <span class="section-label">From the log</span>
        <button class="section-action" id="today-see-all">All →</button>
      </div>
    </div>
    <div class="log-preview" id="today-log">${items}</div>
  `;
}

// ── After render, attach handlers that depend on dynamic content ──
document.addEventListener('click', e => {
  if (e.target.closest('#empty-start-btn')) startNewFiringFlow();
  if (e.target.closest('#todo-glazes'))     goTo('library');
  if (e.target.closest('#todo-settings'))   goTo('settings');
  if (e.target.closest('#today-see-all'))   goTo('log');
  const row = e.target.closest('#today-log .log-preview-item');
  if (row) {
    import('../detail/firing.js').then(m => m.openFiringDetail(row.dataset.id));
  }
});

function getProgramName(id) {
  const map = {
    'bisq-slow':'Slow Bisque','bisq-med':'Medium Bisque','bisq-fast':'Fast Bisque',
    'glaz-slow':'Slow Glaze','glaz-med':'Medium Glaze','glaz-fast':'Fast Glaze',
    'fast':'Fast','medium':'Medium','medslo':'MedSlo','slow':'Slow',
  };
  return map[id] || id;
}

function outcomeLabel(o) {
  const map = { success:'Success', underfired:'Underfired', overfired:'Overfired', aborted:'Aborted' };
  return map[o] || 'Success';
}

function recentBadge(f) {
  if (f.status === 'aborted') return `<span class="badge badge-aborted">Aborted</span>`;
  if (!f.outcome)             return `<span class="badge badge-unrecorded">Unrecorded</span>`;
  return `<span class="badge badge-${f.outcome}">${outcomeLabel(f.outcome)}</span>`;
}

function currentSegmentName(f) {
  // Simple approximation based on elapsed time
  return f.currentSegment || 'Firing';
}
