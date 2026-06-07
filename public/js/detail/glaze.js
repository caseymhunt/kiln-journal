import { db } from '../firebase.js';
import { getState } from '../state.js';
import { pushFlow, closeFlow } from '../router.js';
import { userCol, userSubDoc, KILN } from '../data.js';

export function openGlazeDetail(glazeId) {
  pushFlow(el => renderDetail(el, glazeId));
}

export function openAddGlaze() {
  pushFlow(el => renderAddForm(el));
}

async function renderDetail(el, id) {
  el.innerHTML = `<div style="padding:var(--sp-8);color:var(--mute)">Loading…</div>`;
  const { user } = getState();
  if (!user) return;

  let g;
  try {
    const snap = await userCol(db, user.uid, 'glazes').doc(id).get();
    if (!snap.exists) { el.innerHTML = `<div style="padding:var(--sp-8)">Not found.</div>`; return; }
    g = { id: snap.id, ...snap.data() };
  } catch (e) { return; }

  // Firings that used this glaze
  let firingHistory = [];
  try {
    const snap = await userCol(db, user.uid, 'firings')
      .orderBy('startedAt', 'desc')
      .limit(15)
      .get();
    firingHistory = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(f => f.status === 'done' && f.pieces?.some(p => p.glazes?.includes(g.name)));
  } catch (_) {}

  const recipe = g.recipe || [];
  const maxPct = Math.max(...recipe.map(r => r.percent || 0), 1);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-2)">
      <button class="detail-back" id="glz-back">← Pantry</button>
      <button class="detail-action" id="glz-edit">Edit</button>
    </div>
    <div class="glaze-hero">
      <div class="glaze-hero-tile" style="background:${g.color || '#c8c0b0'}"></div>
      <div class="glaze-hero-info">
        <div class="glaze-hero-type">GLAZE · ${g.clay || 'Stoneware'}</div>
        <h2 class="glaze-hero-name">${g.name}</h2>
        ${g.notes ? `<p class="glaze-hero-desc">${g.notes}</p>` : ''}
        <div class="glaze-cone-chips" style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);flex-wrap:wrap">
          ${(g.cones || []).map(c => `<span class="badge" style="background:var(--rule-soft);color:var(--soft)">Δ${c}</span>`).join('')}
          ${firingHistory.length ? `<span class="badge" style="background:var(--rule-soft);color:var(--mute)">Used ${firingHistory.length}×</span>` : ''}
        </div>
      </div>
    </div>

    ${recipe.length ? `
      <div class="detail-section">
        <div class="detail-section-label" style="display:flex;justify-content:space-between">
          <span>Recipe · by %</span>
          <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--mute)">Base ${recipe.reduce((s,r) => s+(r.percent||0),0)}%</span>
        </div>
        ${recipe.map(r => `
          <div class="recipe-row">
            <span class="recipe-name">${r.ingredient}</span>
            <div class="recipe-bar-wrap"><div class="recipe-bar" style="width:${(r.percent/maxPct)*100}%"></div></div>
            <span class="recipe-pct">${r.percent}%</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${firingHistory.length ? `
      <div class="detail-section">
        <div class="detail-section-label">Firings using this glaze</div>
        ${firingHistory.map(f => `
          <div class="glaze-firing-row" data-id="${f.id}">
            <div class="glaze-firing-dot" style="background:${outcomeColor(f.outcome)}"></div>
            <div style="flex:1">
              <div class="glaze-firing-name">Firing #${String(f.no||'').padStart(3,'0')}</div>
              ${f.notes ? `<div class="glaze-firing-note">${f.notes.slice(0,80)}…</div>` : ''}
            </div>
            <div class="glaze-firing-meta">Δ${f.coneC}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="padding:var(--sp-6) var(--sp-6) 0">
      <button class="btn-ghost" id="glz-delete" style="color:#a23818;width:100%">Delete glaze</button>
    </div>
    <div style="height:calc(var(--sp-10) + var(--safe-bot))"></div>
  `;

  el.querySelector('#glz-back').addEventListener('click', () => closeFlow());
  el.querySelector('#glz-edit').addEventListener('click', () => {
    closeFlow();
    pushFlow(el => renderAddForm(el, g));
  });
  el.querySelector('#glz-delete').addEventListener('click', async () => {
    if (!confirm(`Delete "${g.name}"? This cannot be undone.`)) return;
    const { user } = getState();
    if (!user) return;
    try {
      await userCol(db, user.uid, 'glazes').doc(g.id).delete();
      closeFlow();
    } catch (e) { console.error(e); }
  });
}

function renderAddForm(el, existing = null) {
  const CONE_OPTIONS = KILN.cones;
  const selected = new Set(existing?.cones || []);
  let colorHex = existing?.color || '#c8c0b0';

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-4)">
      <button class="flow-back" id="af-back">← Back</button>
      <button class="flow-back" id="af-save" style="color:var(--terra);font-weight:600">${existing ? 'Save' : 'Save'}</button>
    </div>
    <div class="eyebrow" style="padding:0 var(--sp-6) var(--sp-2)">Adding to Pantry</div>
    <div class="screen-pad">
      <h2 class="page-title">New <em>glaze.</em></h2>
    </div>

    <div class="form-tabs" style="margin-top:var(--sp-4)">
      <div class="form-tab active">Glaze</div>
      <div class="form-tab">Clay</div>
    </div>

    <div class="form-field">
      <label class="form-label">Name</label>
      <input id="af-name" type="text" class="form-input" placeholder="Tenmoku, Pete's" value="${existing?.name || ''}">
    </div>
    <div class="form-field">
      <label class="form-label">Type / Description</label>
      <input id="af-type" type="text" class="form-type-input" placeholder="Iron · Glossy" value="${existing?.type || ''}">
    </div>
    <div class="form-field">
      <label class="form-label">Color (hex)</label>
      <div style="display:flex;align-items:center;gap:12px">
        <input id="af-color" type="color" value="${colorHex}" style="width:48px;height:36px;border:none;background:none;cursor:pointer;padding:0">
        <input id="af-color-hex" type="text" class="form-input" value="${colorHex}" placeholder="#c8c0b0" style="flex:1">
      </div>
    </div>
    <div class="form-field">
      <label class="form-label">Recommended cone</label>
      <div class="cone-selector">
        ${CONE_OPTIONS.map(c => `
          <div class="cone-chip ${selected.has(c.c) ? 'selected' : ''}" data-c="${c.c}">
            <div class="cone-chip-num">Δ${c.c}</div>
            <div class="cone-chip-temp">${c.tempF}°F</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="form-field">
      <label class="form-label">Notes</label>
      <textarea id="af-notes" class="notes-input" placeholder='"Breaks rust on edges, pools dark in wells."'>${existing?.notes || ''}</textarea>
    </div>
    <div style="height:80px"></div>
  `;

  el.querySelector('#af-back').addEventListener('click', () => closeFlow());

  el.querySelectorAll('.cone-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const c = chip.dataset.c;
      if (selected.has(c)) selected.delete(c); else selected.add(c);
      chip.classList.toggle('selected', selected.has(c));
    });
  });

  const colorPicker = el.querySelector('#af-color');
  const colorHexInput = el.querySelector('#af-color-hex');
  colorPicker.addEventListener('input', () => { colorHex = colorPicker.value; colorHexInput.value = colorHex; });
  colorHexInput.addEventListener('change', () => { colorHex = colorHexInput.value; colorPicker.value = colorHex; });

  el.querySelector('#af-save').addEventListener('click', async () => {
    const name  = el.querySelector('#af-name').value.trim();
    const type  = el.querySelector('#af-type').value.trim();
    const notes = el.querySelector('#af-notes').value.trim();
    if (!name) { alert('Please enter a glaze name.'); return; }

    const { user } = getState();
    if (!user) return;

    const data = { name, type, color: colorHex, cones: [...selected], notes };
    try {
      if (existing?.id) {
        await userCol(db, user.uid, 'glazes').doc(existing.id).update(data);
      } else {
        await userCol(db, user.uid, 'glazes').add(data);
      }
      closeFlow();
    } catch (e) { console.error(e); }
  });
}

function outcomeColor(o) {
  return { success:'#7a8c50', underfired:'#d99840', overfired:'#a23818', cracked:'#a23818' }[o] || '#9a8770';
}
