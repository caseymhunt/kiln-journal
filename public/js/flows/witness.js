import { pushFlow, replaceFlow, closeFlow } from '../router.js';
import { WITNESS_OPTIONS } from '../data.js';
import { startOutcomeFlow } from './outcome.js';

let _firing = null;
let _selected = null;

export function startWitnessFlow(firing) {
  _firing = firing;
  _selected = null;
  pushFlow(el => render(el));
}

function render(el) {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-5) var(--sp-6) var(--sp-4)">
      <button class="flow-back" id="wit-back">← Back</button>
    </div>
    <div class="flow-step">
      <div class="flow-step-eyebrow">After firing</div>
      <h2 class="flow-title">Read the <em>witness cone.</em></h2>
      <p class="flow-sub">What did your Δ${_firing?.coneC || ''} witness cone do? This teaches the next firing.</p>
    </div>
    <div class="witness-list">
      ${WITNESS_OPTIONS.map(opt => `
        <div class="witness-card ${_selected === opt.id ? 'selected' : ''}" data-id="${opt.id}">
          <div class="witness-icon">${coneIcon(opt.id)}</div>
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
    <div class="witness-hint">Check the witness cone on the shelf once the kiln is cool enough to open — the amount of slump tells you how hot it actually got.</div>
    <div class="flow-footer">
      <button class="btn-primary" id="wit-next" ${!_selected ? 'disabled style="opacity:.4"' : ''}>
        Continue → Log outcome
      </button>
      <button class="btn-ghost" id="wit-skip">Skip · don't record</button>
    </div>
  `;

  el.querySelector('#wit-back').addEventListener('click', () => closeFlow());
  el.querySelector('#wit-skip').addEventListener('click', () => { closeFlow(); });
  el.querySelector('#wit-next')?.addEventListener('click', () => {
    if (_selected) {
      const opt = WITNESS_OPTIONS.find(o => o.id === _selected);
      replaceFlow(el => { startOutcomeFlow(_firing, opt); });
    }
  });

  el.querySelectorAll('.witness-card').forEach(card => {
    card.addEventListener('click', () => {
      _selected = card.dataset.id;
      replaceFlow(el => render(el));
    });
  });
}

function coneIcon(id) {
  const shelf = `<line x1="2" y1="50" x2="42" y2="50" stroke="currentColor" stroke-width="1.5" opacity=".3" stroke-linecap="round"/>`;
  const s = `fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
  // Single triangle rotated around its base centre (10,50) to represent each stage
  const tri = (deg) => `<polygon points="7,50 13,50 10,18" transform="rotate(${deg},10,50)" ${s}/>`;
  const shapes = {
    soft:    tri(12),   // barely off vertical — 2 o'clock
    tipped:  tri(32),   // clear lean — 3 o'clock
    leaning: tri(60),   // pronounced lean — 4-5 o'clock
    touched: tri(90),   // tip at shelf level — 6 o'clock
    melted:  `<ellipse cx="22" cy="50" rx="18" ry="4" ${s}/>`,
  };
  return `<svg width="44" height="56" viewBox="0 0 44 56">${shelf}${shapes[id] || shapes.soft}</svg>`;
}
