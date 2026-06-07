import { db } from '../firebase.js';
import { getState, setState } from '../state.js';
import { pushFlow, closeFlow } from '../router.js';
import { userCol, remainingStr, etaStr, elapsedPct, elapsedStr, fmtTemp, fmtOffset, KILN } from '../data.js';
import { startWitnessFlow } from './witness.js';

const CIRCUMFERENCE = 2 * Math.PI * 80; // r=80

let _unsub = null;
let _ticker = null;
let _firing = null;

export function openLiveFlow(firing) {
  _firing = firing;
  pushFlow(el => renderExpanded(el));
  subscribeToFiring(firing.id);
}

function subscribeToFiring(id) {
  const { user } = getState();
  if (!user) return;
  if (_unsub) _unsub();
  _unsub = userCol(db, user.uid, 'firings').doc(id)
    .onSnapshot(snap => {
      if (!snap.exists) return;
      _firing = { id: snap.id, ...snap.data() };
      setState({ activeFiring: _firing });
      if (_firing.status === 'done' || _firing.status === 'cooling') {
        cleanup();
        closeFlow();
        startWitnessFlow(_firing);
        return;
      }
      const el = document.getElementById('flow-root');
      if (el && !el.classList.contains('hidden')) renderExpanded(el);
    });
}

function cleanup() {
  if (_unsub)  { _unsub();               _unsub  = null; }
  if (_ticker) { clearInterval(_ticker); _ticker = null; }
}

function renderExpanded(el) {
  if (_ticker) clearInterval(_ticker);
  const f    = _firing;
  const prog = KILN.programs.find(p => p.id === f.programId);
  const segs = prog?.segments || [];
  const pct  = elapsedPct(f.startedAt, f.hours || 8);

  if (pct >= 100) {
    renderComplete(el, f, segs);
    return;
  }

  const { h, m } = remainingStr(f.startedAt, f.hours || 8);
  const eta     = etaStr(f.startedAt, f.hours || 8);
  const elapsed = elapsedStr(f.startedAt);
  const offset  = CIRCUMFERENCE * (1 - pct / 100);
  const devMode = f.pieces?.some(p => p.description?.toLowerCase().includes('developermode'));
  const currentIdx = Math.min(
    Math.floor((pct / 100) * segs.length),
    segs.length - 1
  );

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-2)">
      <button class="flow-back" id="exp-back">← Studio</button>
      <span class="header-live">Live · ${new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span>
    </div>
    <div class="eyebrow" style="padding:0 var(--sp-6) var(--sp-3)">FIRING #${String(f.no||'').padStart(3,'0')} · ${f.programId?.includes('glaz') ? 'Glaze' : 'Bisque'} Δ${f.coneC} · ${fmtOffset(f.offsetF)}</div>

    <div class="live-compact-header">
      <div style="position:relative;width:88px;height:88px;flex-shrink:0">
        <svg style="width:88px;height:88px;transform:rotate(-90deg)" viewBox="0 0 200 200">
          <circle class="ring-bg" cx="100" cy="100" r="80"/>
          <circle class="ring-fill" cx="100" cy="100" r="80"
            stroke-dasharray="${CIRCUMFERENCE}"
            stroke-dashoffset="${offset}" id="ring-fill"/>
        </svg>
      </div>
      <div class="live-compact-info">
        <div class="live-compact-remaining"><span id="ring-h">${h}h</span> <span id="ring-m">${m}m</span></div>
        <div class="live-compact-label">remaining</div>
        <div class="live-compact-eta" id="compact-eta">ETA ${eta}</div>
        <div class="live-compact-elapsed">Started ${elapsed} ago</div>
      </div>
    </div>

    <div class="live-graph">
      <svg viewBox="0 0 300 60" preserveAspectRatio="none">
        ${buildGraph(f, prog, pct)}
      </svg>
    </div>
    <div class="segment-list">
      ${segs.map((seg, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return `
          <div class="segment-row">
            <div class="segment-dot ${done ? 'done' : active ? 'active' : ''}"></div>
            <div class="segment-row-body">
              <div class="segment-row-name ${active ? 'active' : ''}">${seg.label}</div>
              <div class="segment-row-meta">${seg.r}°/hr → ${fmtTemp(seg.t)}${seg.h ? ` · hold ${seg.h}h` : ''}</div>
            </div>
            ${active ? `<span class="segment-row-badge">Now</span>` : ''}
            ${done   ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8c50" stroke-width="2.5" style="margin-left:auto"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <div class="live-actions">
      <button class="btn-secondary" id="exp-pause">Pause</button>
      <button class="btn-danger"    id="exp-abort">Abort</button>
      ${devMode ? `<button class="btn-ghost" id="exp-warp" style="font-size:12px;color:var(--mute)">⚡ warp</button>` : ''}
    </div>
    <div style="height:var(--sp-8)"></div>
  `;

  el.querySelector('#exp-back').addEventListener('click', () => { cleanup(); closeFlow(); });
  el.querySelector('#exp-abort').addEventListener('click', () => confirmAbort());
  el.querySelector('#exp-warp')?.addEventListener('click', () => completeFiring());
  _ticker = setInterval(() => patchExpanded(el), 10_000);
}

function renderComplete(el, f, segs) {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-2)">
      <button class="flow-back" id="exp-back">← Studio</button>
      <span class="header-live" style="background:var(--olive)">Complete</span>
    </div>
    <div class="eyebrow" style="padding:0 var(--sp-6) var(--sp-3)">FIRING #${String(f.no||'').padStart(3,'0')} · ${f.programId?.includes('glaz') ? 'Glaze' : 'Bisque'} Δ${f.coneC}</div>

    <div style="padding:var(--sp-6) var(--sp-6) var(--sp-4);text-align:center">
      <div style="font-size:48px;margin-bottom:var(--sp-3)">✓</div>
      <h2 style="font-family:var(--font-display);font-size:28px;font-weight:300;font-style:italic;margin-bottom:var(--sp-3)">Schedule finished.</h2>
      <p style="font-size:14px;color:var(--soft);line-height:1.6;max-width:280px;margin:0 auto">Read your witness cone and record the outcome to close out this firing.</p>
    </div>

    <div class="segment-list" style="margin-bottom:var(--sp-2)">
      ${segs.map((seg, i) => `
        <div class="segment-row">
          <div class="segment-dot done"></div>
          <div class="segment-row-body">
            <div class="segment-row-name">${seg.label}</div>
            <div class="segment-row-meta">${seg.r}°/hr → ${fmtTemp(seg.t)}${seg.h ? ` · hold ${seg.h}h` : ''}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8c50" stroke-width="2.5" style="margin-left:auto"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
      `).join('')}
    </div>

    <div class="live-actions">
      <button class="btn-danger"   id="exp-abort">Abort</button>
      <button class="btn-primary"  id="exp-wrapup">Wrap up →</button>
    </div>
    <div style="height:var(--sp-8)"></div>
  `;

  el.querySelector('#exp-back').addEventListener('click', () => { cleanup(); closeFlow(); });
  el.querySelector('#exp-abort').addEventListener('click', () => confirmAbort());
  el.querySelector('#exp-wrapup').addEventListener('click', () => completeFiring());
}

function patchExpanded(el) {
  const f = _firing;
  if (!f) return;
  const pct    = elapsedPct(f.startedAt, f.hours || 8);
  if (pct >= 100) { renderExpanded(el); return; }
  const { h, m } = remainingStr(f.startedAt, f.hours || 8);
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  const eta    = etaStr(f.startedAt, f.hours || 8);
  const hEl    = el.querySelector('#ring-h');
  const mEl    = el.querySelector('#ring-m');
  const rEl    = el.querySelector('#ring-fill');
  const etaEl  = el.querySelector('#compact-eta');
  if (hEl) hEl.textContent = `${h}h`;
  if (mEl) mEl.textContent = `${m}m`;
  if (rEl) rEl.setAttribute('stroke-dashoffset', offset);
  if (etaEl) etaEl.textContent = `ETA ${eta}`;
}

function buildGraph(f, prog, pct) {
  if (!prog?.segments?.length) return '';
  const temps = prog.segments.map(s => s.t);
  const maxT  = Math.max(...temps, 500);
  const pts   = prog.segments.map((s, i) => {
    const x = (i / (prog.segments.length - 1)) * 280 + 10;
    const y = 55 - (s.t / maxT) * 50;
    return `${x},${y}`;
  });
  const nowX = (pct / 100) * 280 + 10;

  return `
    <polyline points="${pts.join(' ')}" fill="none" stroke="#c2502a" stroke-width="1.5" opacity=".6"/>
    <line x1="${nowX}" y1="0" x2="${nowX}" y2="60" stroke="#c2502a" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${nowX + 3}" y="10" font-size="8" fill="#c2502a" font-family="sans-serif">now</text>
  `;
}

async function completeFiring() {
  if (_ticker) { clearInterval(_ticker); _ticker = null; }
  const { user } = getState();
  if (!user || !_firing) return;
  try {
    await userCol(db, user.uid, 'firings').doc(_firing.id).update({
      status: 'done',
      endedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) { console.error(e); }
  // onSnapshot handles the transition to witness flow
}

async function confirmAbort() {
  if (!confirm('Abort this firing? This cannot be undone.')) return;
  const { user } = getState();
  if (!user || !_firing) return;
  try {
    await userCol(db, user.uid, 'firings').doc(_firing.id).update({
      status: 'aborted',
      outcome: 'aborted',
      endedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setState({ activeFiring: null });
    cleanup();
    closeFlow();
  } catch (e) { console.error(e); }
}
