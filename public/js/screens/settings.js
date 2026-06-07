import { auth, db } from '../firebase.js';
import { getState, setState } from '../state.js';
import { userDoc, fmtOffset, DEFAULT_PREFLIGHT, KILN } from '../data.js';

let _container = null;

export async function mount(container) {
  _container = container;
  render();
}

export function unmount() { _container = null; }

function render() {
  if (!_container) return;
  const { user, profile } = getState();
  const initial = profile?.displayName?.[0]?.toUpperCase() || '?';
  const p = profile || {};
  const preflightOn = p.preflightOn || {};
  const tempUnit   = p.tempUnit   || 'F';
  const timeFormat = p.timeFormat || '12h';

  _container.innerHTML = `
    <div class="settings-back">
      <span class="eyebrow" style="padding:var(--sp-5) var(--sp-6) 0;display:block">Kiln</span>
    </div>
    <div class="screen-pad" style="padding-top:var(--sp-2)">
      <h1 class="page-title">Settings.</h1>
    </div>

    <div class="profile-card">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-info">
        <div class="profile-name">${p.displayName || 'Studio'}</div>
        <div class="profile-email">${p.email || ''}</div>
      </div>
      <button class="profile-signout" id="sign-out-btn">Sign out</button>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">Kiln</div>
      <div class="settings-row settings-row-static">
        <span class="settings-row-label">Model</span>
        <span class="settings-row-value-static">${KILN.model}</span>
      </div>
      <div class="settings-row settings-row-static">
        <span class="settings-row-label">Volume</span>
        <span class="settings-row-value-static">${KILN.volumeCuFt} cu ft</span>
      </div>
      <div class="settings-row" id="row-firing-num" role="button">
        <span class="settings-row-label">Firing #</span>
        <span class="settings-row-value">${p.firingCount || 0}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </span>
      </div>
      <div class="settings-row" id="row-offset" role="button">
        <span class="settings-row-label">Default offset</span>
        <span class="settings-row-value">${fmtOffset(p.offsetF)}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </span>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">Units</div>
      <div class="settings-row">
        <span class="settings-row-label">Temperature</span>
        <div class="seg-control" data-field="tempUnit">
          <button class="seg-btn ${tempUnit === 'F' ? 'active' : ''}" data-val="F">°F</button>
          <button class="seg-btn ${tempUnit === 'C' ? 'active' : ''}" data-val="C">°C</button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">Time</span>
        <div class="seg-control" data-field="timeFormat">
          <button class="seg-btn ${timeFormat === '12h' ? 'active' : ''}" data-val="12h">12h</button>
          <button class="seg-btn ${timeFormat === '24h' ? 'active' : ''}" data-val="24h">24h</button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">Pre-flight checklist</div>
      ${DEFAULT_PREFLIGHT.map(item => `
        <div class="settings-row">
          <span class="settings-row-label">${item.label}</span>
          <label class="toggle">
            <input type="checkbox" data-pref="${item.id}" ${preflightOn[item.id] ? 'checked' : ''}>
            <div class="toggle-track"></div>
            <div class="toggle-thumb"></div>
          </label>
        </div>
      `).join('')}
    </div>

    <div style="height:var(--sp-10)"></div>
  `;

  _container.querySelector('#sign-out-btn').addEventListener('click', async () => {
    await auth.signOut();
    setState({ user: null, profile: null, activeFiring: null });
    location.reload();
  });

  _container.querySelector('#row-firing-num').addEventListener('click', openFiringNumSheet);
  _container.querySelector('#row-offset').addEventListener('click', openOffsetSheet);

  _container.querySelectorAll('.seg-control').forEach(group => {
    const field = group.dataset.field;
    group.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => setProfile(field, btn.dataset.val));
    });
  });

  _container.querySelectorAll('input[data-pref]').forEach(input => {
    input.addEventListener('change', async () => {
      const { user, profile } = getState();
      if (!user) return;
      const key = input.dataset.pref;
      const updated = { ...(profile?.preflightOn || {}), [key]: input.checked };
      try {
        await userDoc(db, user.uid).update({ preflightOn: updated });
        setState({ profile: { ...profile, preflightOn: updated } });
      } catch (e) { console.error(e); }
    });
  });
}

async function setProfile(field, value) {
  const { user, profile } = getState();
  if (!user) return;
  if (profile?.[field] === value) return;
  setState({ profile: { ...profile, [field]: value } });
  render();
  try {
    await userDoc(db, user.uid).update({ [field]: value });
  } catch (e) { console.error(e); }
}

function openFiringNumSheet() {
  const { profile } = getState();
  let val = profile?.firingCount || 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,18,12,.5);z-index:200;display:flex;flex-direction:column;justify-content:flex-end';
  overlay.innerHTML = `
    <div class="modal-sheet" style="background:var(--bg);border-radius:16px 16px 0 0;padding:24px 24px 48px;max-width:430px;width:100%;margin:0 auto">
      <div style="font-family:var(--font-display);font-size:20px;font-style:italic;margin-bottom:var(--sp-2)">Firing #</div>
      <div style="font-size:13px;color:var(--soft);line-height:1.5;margin-bottom:var(--sp-5)">The counter used to number new firings. Reset if you're starting a new season or correcting a mismatch.</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:var(--sp-4)">
        <button class="offset-stepper" id="fn-minus">−</button>
        <input id="fn-input" type="number" min="0" value="${val}"
          style="width:80px;text-align:center;font-size:28px;font-family:var(--font-display);border:none;border-bottom:2px solid var(--rule);background:transparent;color:var(--fg);padding:4px 0;-moz-appearance:textfield">
        <button class="offset-stepper" id="fn-plus">+</button>
      </div>
      <button class="btn-ghost" id="fn-reset" style="width:100%;margin-bottom:var(--sp-5)">Reset to 0</button>
      <div style="display:flex;gap:12px">
        <button class="btn-secondary" id="fn-cancel" style="flex:1">Cancel</button>
        <button class="btn-primary"   id="fn-save"   style="flex:1">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#fn-input');
  const syncInput = () => { input.value = val; };

  let _lastTap = 0;
  const tap = (fn) => {
    const now = Date.now();
    if (now - _lastTap < 200) return;
    _lastTap = now;
    fn();
    syncInput();
  };

  input.addEventListener('input', () => {
    const n = parseInt(input.value, 10);
    if (!isNaN(n) && n >= 0) val = n;
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
  overlay.querySelector('#fn-cancel').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.querySelector('#fn-minus').addEventListener('click', () => tap(() => { if (val > 0) val -= 1; }));
  overlay.querySelector('#fn-plus').addEventListener('click',  () => tap(() => { val += 1; }));
  overlay.querySelector('#fn-reset').addEventListener('click', () => tap(() => { val = 0; }));
  overlay.querySelector('#fn-save').addEventListener('click', async () => {
    const n = parseInt(input.value, 10);
    if (!isNaN(n) && n >= 0) val = n;
    const { user, profile } = getState();
    if (!user) { document.body.removeChild(overlay); return; }
    setState({ profile: { ...profile, firingCount: val } });
    document.body.removeChild(overlay);
    render();
    try { await userDoc(db, user.uid).update({ firingCount: val }); } catch (e) { console.error(e); }
  });
}

function openOffsetSheet() {
  const { profile } = getState();
  let val = profile?.offsetF || 0;
  const INCREMENTS = [-10, -5, null, 5, 10]; // null = Reset

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,18,12,.5);z-index:200;display:flex;flex-direction:column;justify-content:flex-end';
  overlay.innerHTML = `
    <div class="modal-sheet" style="background:var(--bg);border-radius:16px 16px 0 0;padding:24px 24px 48px;max-width:430px;width:100%;margin:0 auto">
      <div style="font-family:var(--font-display);font-size:20px;font-style:italic;margin-bottom:var(--sp-2)">Default offset</div>
      <div style="font-size:13px;color:var(--soft);line-height:1.5;margin-bottom:var(--sp-5)">Used as the starting offset for new firings. Witness-cone reads will continue to refine it after each firing.</div>
      <div class="offset-card" style="margin:0">
        <span class="offset-label">Offset</span>
        <div class="offset-controls">
          <button class="offset-stepper" id="os-minus">−</button>
          <div class="offset-value" id="os-val">${val >= 0 ? '+' : ''}${val}<span class="offset-unit">°F</span></div>
          <button class="offset-stepper" id="os-plus">+</button>
        </div>
        <span class="offset-desc" id="os-desc">${descFor(val)}</span>
        <div class="offset-increments">
          ${INCREMENTS.map(d => d === null
            ? `<button class="offset-increment offset-increment-reset" data-delta="reset">Reset</button>`
            : `<button class="offset-increment" data-delta="${d}">${d > 0 ? '+' : ''}${d}</button>`
          ).join('')}
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:var(--sp-5)">
        <button class="btn-secondary" id="os-cancel" style="flex:1">Cancel</button>
        <button class="btn-primary"   id="os-save"   style="flex:1">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const refresh = () => {
    overlay.querySelector('#os-val').innerHTML = `${val >= 0 ? '+' : ''}${val}<span class="offset-unit">°F</span>`;
    overlay.querySelector('#os-desc').textContent = descFor(val);
  };

  let _lastTap = 0;
  const tap = (fn) => {
    const now = Date.now();
    if (now - _lastTap < 200) return;
    _lastTap = now;
    fn();
    refresh();
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
  overlay.querySelector('#os-cancel').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.querySelector('#os-minus').addEventListener('click', () => tap(() => { val -= 1; }));
  overlay.querySelector('#os-plus').addEventListener('click',  () => tap(() => { val += 1; }));
  overlay.querySelectorAll('.offset-increment').forEach(btn => {
    btn.addEventListener('click', () => tap(() => {
      if (btn.dataset.delta === 'reset') { val = 0; } else { val += Number(btn.dataset.delta); }
    }));
  });
  overlay.querySelector('#os-save').addEventListener('click', async () => {
    const { user, profile } = getState();
    if (!user) { document.body.removeChild(overlay); return; }
    setState({ profile: { ...profile, offsetF: val } });
    document.body.removeChild(overlay);
    render();
    try { await userDoc(db, user.uid).update({ offsetF: val }); } catch (e) { console.error(e); }
  });
}

function descFor(v) {
  return v > 0 ? 'Kiln runs cool' : v < 0 ? 'Kiln runs hot' : 'Kiln runs on target';
}
