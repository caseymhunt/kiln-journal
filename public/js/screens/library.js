import { db } from '../firebase.js';
import { getState, setState } from '../state.js';
import { userCol, userDoc, ARMADILLO_CLAYS, CLAY_RANGES } from '../data.js';
import { openGlazeDetail } from '../detail/glaze.js';

let _glazes = [];
let _activeTab = 'glazes';
let _manageClay = false;
let _unsub = null;
let _container = null;

export function mount(container) {
  _activeTab = 'glazes';
  _manageClay = false;
  _container = container;
  renderShell(container);

  const { user } = getState();
  if (!user) return;

  if (_unsub) _unsub();
  _unsub = userCol(db, user.uid, 'glazes').orderBy('name')
    .onSnapshot(snap => {
      _glazes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (_container) renderContent(_container);
    }, () => { _glazes = []; });

  attachHandlers(container);
}

export function unmount() {
  if (_unsub) { _unsub(); _unsub = null; }
  _container = null;
}

function renderShell(container) {
  container.innerHTML = `
    <div class="screen-header" style="padding-bottom:0">
      <div>
        <div class="eyebrow">Pantry · Materials</div>
        <h1 class="page-title">Clay &amp; <em>glaze.</em></h1>
      </div>
      <button id="lib-action-btn" style="font-size:13px;font-weight:600;color:var(--terra)">+ Add</button>
    </div>
    <div class="tab-strip">
      <button class="tab-strip-btn active" data-tab="glazes">Glazes</button>
      <button class="tab-strip-btn" data-tab="clay">Clay</button>
    </div>
    <div class="material-list" id="material-list"></div>
  `;
}

function renderContent(container) {
  const list = container.querySelector('#material-list');
  const actionBtn = container.querySelector('#lib-action-btn');

  if (_activeTab === 'glazes') {
    actionBtn.textContent = '+ Add';
    actionBtn.style.display = '';
    if (!_glazes.length) {
      list.innerHTML = `<p style="padding:var(--sp-6);color:var(--mute);font-size:14px">No glazes yet. Tap + Add to get started.</p>`;
      return;
    }
    list.innerHTML = _glazes.map(g => `
      <div class="material-row" data-id="${g.id}">
        <div class="glaze-swatch" style="background:${g.color || '#c8c0b0'}"></div>
        <div class="material-body">
          <div class="material-name">${g.name}</div>
          <div class="material-sub">${g.type || ''}</div>
        </div>
        <span class="material-cone">Δ${g.cones?.join(', Δ') || ''}</span>
      </div>
    `).join('');
  } else {
    actionBtn.textContent = _manageClay ? 'Done' : 'Manage';
    actionBtn.style.display = '';

    const hidden  = new Set(getState().profile?.hiddenClayIds || []);
    const sections = CLAY_RANGES.map(rng => {
      const all = ARMADILLO_CLAYS.filter(c => c.range === rng.id);
      const visible = _manageClay ? all : all.filter(c => !hidden.has(c.id));
      if (!visible.length) return '';
      return `
        <div class="clay-section">
          <div class="clay-section-head">
            <span class="clay-section-label">${rng.label}</span>
            <span class="clay-section-cone">cone ${rng.cones}</span>
          </div>
          ${visible.map(c => clayRow(c, hidden.has(c.id))).join('')}
        </div>
      `;
    }).join('');

    const visibleCount = ARMADILLO_CLAYS.filter(c => !hidden.has(c.id)).length;
    const intro = _manageClay
      ? `<div class="clay-intro">Tap a clay to hide it. Hidden clays won't appear in the list when you're done.</div>`
      : (hidden.size > 0
          ? `<div class="clay-intro">${visibleCount} of ${ARMADILLO_CLAYS.length} clays · ${hidden.size} hidden. Tap Manage to show or hide.</div>`
          : '');

    const source = `<a class="clay-source" href="https://www.armadilloclay.com" target="_blank" rel="noopener">Clay catalog from armadilloclay.com →</a>`;

    list.innerHTML = source + intro + sections;
  }
}

function clayRow(c, isHidden) {
  return `
    <div class="material-row clay-row ${_manageClay && isHidden ? 'is-hidden' : ''}" data-clay-id="${c.id}">
      <div class="material-body">
        <div class="material-name">${c.name}</div>
        <div class="material-sub">${c.maker}</div>
      </div>
      ${_manageClay
        ? `<button class="clay-eye" aria-label="${isHidden ? 'Show' : 'Hide'} clay">${eyeIcon(isHidden)}</button>`
        : `<div style="display:flex;align-items:center;gap:var(--sp-2)"><span class="material-cone">Δ${c.cones.join(', Δ')}</span><span class="row-chevron">›</span></div>`
      }
    </div>
  `;
}

function eyeIcon(off) {
  if (off) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  }
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function attachHandlers(container) {
  container.querySelectorAll('.tab-strip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-strip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeTab = btn.dataset.tab;
      _manageClay = false;
      renderContent(container);
    });
  });

  container.querySelector('#lib-action-btn').addEventListener('click', () => {
    if (_activeTab === 'glazes') {
      import('../detail/glaze.js').then(m => m.openAddGlaze());
    } else {
      _manageClay = !_manageClay;
      renderContent(container);
    }
  });

  container.querySelector('#material-list').addEventListener('click', e => {
    if (_activeTab === 'glazes') {
      const row = e.target.closest('.material-row');
      if (row) openGlazeDetail(row.dataset.id);
      return;
    }
    if (_manageClay) {
      const row = e.target.closest('.clay-row');
      if (row) toggleHidden(container, row.dataset.clayId);
    } else {
      const row = e.target.closest('.clay-row');
      if (row) import('../detail/clay.js').then(m => m.openClayDetail(row.dataset.clayId));
    }
  });
}

async function toggleHidden(container, clayId) {
  const { user, profile } = getState();
  if (!user) return;
  const current = new Set(profile?.hiddenClayIds || []);
  if (current.has(clayId)) current.delete(clayId); else current.add(clayId);
  const next = [...current];
  setState({ profile: { ...profile, hiddenClayIds: next } });
  renderContent(container);
  try {
    await userDoc(db, user.uid).update({ hiddenClayIds: next });
  } catch (e) { console.error(e); }
}
