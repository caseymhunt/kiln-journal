import { ARMADILLO_CLAYS } from '../data.js';
import { pushFlow, closeFlow } from '../router.js';

export function openClayDetail(id) {
  pushFlow(el => render(el, id));
}

function render(el, id) {
  const clay = ARMADILLO_CLAYS.find(c => c.id === id);
  if (!clay) { el.innerHTML = `<div style="padding:var(--sp-8);color:var(--mute)">Not found.</div>`; return; }

  const rangeLabel = { low: 'Low-fire', mid: 'Mid-fire', high: 'High-fire' }[clay.range] || clay.range;
  const coneList   = clay.cones.map(c => `<span class="badge clay-detail-cone">Δ${c}</span>`).join('');

  const stats = [
    { label: 'Shrinkage', value: clay.shrinkage != null ? clay.shrinkage + '%' : null },
    { label: 'Absorption', value: clay.absorption != null ? clay.absorption + '%' : null },
    { label: 'COE ×10⁻⁶', value: clay.coe != null ? clay.coe : null },
  ].filter(s => s.value != null);

  el.innerHTML = `
    <div class="clay-detail-header">
      <button class="detail-back" id="cd-back">← Clay</button>
    </div>

    ${clay.img ? `
      <div class="clay-detail-hero">
        <img class="clay-detail-img" src="${clay.img}" alt="${clay.name}" loading="lazy">
        <div class="clay-detail-hero-overlay">
          <div class="clay-detail-eyebrow">${clay.maker} · ${rangeLabel}</div>
          <h2 class="clay-detail-name">${clay.name}</h2>
        </div>
      </div>
    ` : `
      <div class="screen-pad" style="padding-top:var(--sp-2)">
        <div class="clay-detail-eyebrow">${clay.maker} · ${rangeLabel}</div>
        <h2 class="clay-detail-name-plain">${clay.name}</h2>
      </div>
    `}

    <div class="clay-detail-body">
      <div class="clay-detail-cones">${coneList}</div>

      ${clay.desc ? `<p class="clay-detail-desc">${clay.desc}</p>` : ''}

      ${stats.length ? `
        <div class="clay-stats-grid">
          ${stats.map(s => `
            <div class="clay-stat">
              <div class="clay-stat-value">${s.value}</div>
              <div class="clay-stat-label">${s.label}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <a class="clay-source clay-detail-source" href="https://www.armadilloclay.com" target="_blank" rel="noopener">
        Clay catalog from armadilloclay.com →
      </a>
    </div>

    <div style="height:calc(var(--sp-10) + var(--safe-bot))"></div>
  `;

  el.querySelector('#cd-back').addEventListener('click', () => closeFlow());
}
