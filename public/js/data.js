export const KILN = {
  id: 'pf8',
  model: 'L&L Plug-n-Fire PF8',
  controller: 'Genesis Mini',
  volumeCuFt: 0.33,
  maxCone: '10',
  programs: [
    { id:'fast',   name:'Fast',   sub:'Thin, bone-dry glaze ware',             hoursMin:4,  hoursMax:5,  hours:4.5,
      bullets:['For glaze firings on thin, bone-dry bisqueware','Also used for china paint and decal firings','Not ideal for thick glaze layers — can blister or crawl if heated too fast'],
      segments:[{label:'Climb',r:570,t:2232,h:0}] },
    { id:'medium', name:'Medium', sub:'Glaze on thicker ware · thin bisque',   hoursMin:6,  hoursMax:8,  hours:7,
      bullets:['Good all-around glaze speed for wheel-thrown mugs, bowls, and plates','For bisque only if pieces are very thin — pinch pots, thin slab work','Thicker applied glazes benefit from this slower ramp'],
      segments:[{label:'Pre-warm',r:150,t:250,h:0},{label:'Climb',r:400,t:2232,h:0}] },
    { id:'medslo', name:'MedSlo', sub:'Bisque of medium-thickness pieces',     hoursMin:9,  hoursMax:11, hours:10,
      bullets:['Most common bisque speed for typical studio pottery — mugs, bowls, small vases','Gives extra time for water smoking (200–400°F) and carbon burn-out (900–1100°F)','Safer than Medium if pieces are slightly damp or mixed thicknesses'],
      segments:[{label:'Pre-warm',r:120,t:250,h:0},{label:'Initial heat',r:300,t:1000,h:0},{label:'Carbon burn-out',r:150,t:1100,h:0},{label:'Final climb',r:180,t:1945,h:0}] },
    { id:'slow',   name:'Slow',   sub:'Thick, hand-thrown or hand-built ware', hoursMin:13, hoursMax:17, hours:15,
      bullets:['For thick walls (over ½ inch), sculptural pieces, or unevenly thick work','Essential if pieces are not fully bone-dry — slow ramp lets residual moisture escape without cracking','Hand-built slabs and coil-built pieces often have stress points that benefit from slow heat rise'],
      segments:[{label:'Pre-warm',r:80,t:250,h:0},{label:'Initial heat',r:200,t:1000,h:0},{label:'Carbon burn-out',r:100,t:1100,h:0},{label:'Final climb',r:150,t:1945,h:0}] },
  ],
  cones: [
    { c:'06', tempF:1828, tempC:998,  label:'Low-fire bisque' },
    { c:'04', tempF:1945, tempC:1063, label:'Standard bisque' },
    { c:'6',  tempF:2232, tempC:1222, label:'Mid-range glaze' },
    { c:'10', tempF:2345, tempC:1285, label:'High-fire stoneware' },
  ],
  maintenance: {
    thermocouple: { label:'Thermocouple', intervalFirings:100 },
    elements:     { label:'Elements',     intervalFirings:150 },
    relays:       { label:'Relays',       intervalFirings:200 },
  },
};

export const CLAY_RANGES = [
  { id: 'low',  label: 'Low-fire',  cones: '04–06' },
  { id: 'mid',  label: 'Mid-fire',  cones: '5–6'   },
  { id: 'high', label: 'High-fire', cones: '9–12'  },
];

// Source: https://www.armadilloclay.com (low-fire / mid-fire / high-fire pages).
// Detail data (desc/shrinkage/absorption/coe/img) harvested 2026-05-07 via scrape-clays.js.
export const ARMADILLO_CLAYS = [
  // Low-fire — cone 04–06
  { id:'longhorn-white',        name:'Longhorn White',                  maker:'Armadillo Clay', range:'low',  cones:['04','06'], img:'img/clays/longhorn-white.jpeg',        shrinkage:null,  absorption:null,  coe:null,  desc:'New Non-Talc formula of Longhorn White, a smooth clay that fires a nice snow white color. Suitable for hand-building or wheel-throwing. For the best results, bisque to Cone 04 then glaze to Cone 06.' },
  { id:'longhorn-red',          name:'Longhorn Red',                    maker:'Armadillo Clay', range:'low',  cones:['04','06'], img:'img/clays/longhorn-red.jpeg',          shrinkage:7.6,   absorption:8.74,  coe:5.4,   desc:'A smooth clay that fires a rich terracotta color. Suitable for hand-building or wheel-throwing. For the best results, bisque to Cone 04 then glaze to Cone 06.' },
  { id:'longhorn-white-grog',   name:'Longhorn White with Grog',        maker:'Armadillo Clay', range:'low',  cones:['04','06'], img:'img/clays/longhorn-white-grog.jpeg',   shrinkage:6.5,   absorption:13.82, coe:4.6,   desc:'A moderately coarse clay that fires white with grog speckles. Suitable for hand-building or wheel-throwing. For the best results, bisque to Cone 04 then glaze to Cone 06.' },
  { id:'longhorn-red-grog',     name:'Longhorn Red with Grog',          maker:'Armadillo Clay', range:'low',  cones:['04','06'], img:'img/clays/longhorn-red-grog.jpeg',     shrinkage:7.7,   absorption:9.69,  coe:5.3,   desc:'A moderately coarse clay that fires a rich terracotta color with grog speckles. Great for hand-building or large wheel-throwing. For the best results, bisque to Cone 04 then glaze to Cone 06.' },
  { id:'modeling-clay',         name:'Modeling Clay',                   maker:'Armadillo Clay', range:'low',  cones:['04','06'], img:'img/clays/modeling-clay.png',          shrinkage:null,  absorption:null,  coe:null,  desc:'Water-based modeling clay that is perfect for mold-making and maquette purposes. Can be fired to low-fire (cone 04/06) temperatures, but will have unpredictable absorption and vitrification rates. Available in red or white/gray.' },
  { id:'raku-low',              name:'Raku (low-fire)',                 maker:'Armadillo Clay', range:'low',  cones:['04','06'], img:'img/clays/raku-low.jpeg',              shrinkage:7.8,   absorption:3.95,  coe:5.0,   desc:'Contains grog and sand, great for withstanding the thermal shock of raku firing. Fires from white at Cone 06 to a light warm brown at Cone 10.' },

  // Mid-fire — cone 5–6
  { id:'buffalo-wallow',        name:'Buffalo Wallow',                  maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/buffalo-wallow.jpeg',        shrinkage:13.0,  absorption:1.73,  coe:5.5,   desc:'A light red-brown clay, has light sand for texture and strength. Great for throwing and sculpting. Fires to Cone 5/6.' },
  { id:'buffalo-wallow-grog',   name:'Buffalo Wallow with Grog',        maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/buffalo-wallow-grog.jpeg',   shrinkage:11.63, absorption:1.79,  coe:5.6,   desc:'A light red-brown clay, has grog added for texture and strength. Great for large throwing and sculpting. Fires to Cone 5/6.' },
  { id:'cinco-blanco',          name:'Cinco Blanco',                    maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/cinco-blanco.jpeg',          shrinkage:11.7,  absorption:2.80,  coe:4.8,   desc:'A strong, lightly textured clay, fires from an off white to light buff, depending on amount of reduction. Fires to Cone 5/6.' },
  { id:'cinco-rojo',            name:'Cinco Rojo',                      maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/cinco-rojo.jpeg',            shrinkage:12.88, absorption:1.00,  coe:5.3,   desc:'A deep red-brown clay with light sand for texture and strength, good for throwing and hand-building. Fires to Cone 5. Overfiring may cause bloating.' },
  { id:'cinco-rojo-grog',       name:'Cinco Rojo with Grog',            maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/cinco-rojo-grog.jpeg',       shrinkage:12.13, absorption:0.47,  coe:5.5,   desc:'A speckled red-brown clay with grog added for texture and strength. Good for large throwing and hand-building. Fires to Cone 5. Overfiring may cause bloating.' },
  { id:'cone-5-porcelain',      name:'Cone 5 Porcelain',                maker:'Armadillo Clay', range:'mid',  cones:['5'],       img:'img/clays/cone-5-porcelain.jpeg',      shrinkage:11.25, absorption:2.59,  coe:6.0,   desc:'A very smooth, off-white porcelain that is excellent for throwing on the wheel. Formulated for cone 5/6, but performs beautifully in cone 10 reduction and atmospheric firings!' },
  { id:'wc437-frost-porcelain', name:'WC437 Frost Porcelain',           maker:'Laguna',         range:'mid',  cones:['5','6'],   img:'img/clays/wc437-frost-porcelain.png',  shrinkage:11.0,  absorption:null,  coe:7.14,  desc:'An exceptionally white and translucent throwing porcelain for Cone 5–6.' },
  { id:'laguna-bmix-5',         name:'Laguna B-Mix Cone 5',             maker:'Laguna',         range:'mid',  cones:['5'],       img:'img/clays/laguna-bmix-5.jpeg',         shrinkage:12.0,  absorption:2.30,  coe:5.74,  desc:'Laguna\'s Cone 5 B-Mix has a smooth, porcelain texture and is good for hand-building and throwing.' },
  { id:'laguna-bmix-speckled',  name:'Laguna B-Mix Speckled (WC-408)',  maker:'Laguna',         range:'mid',  cones:['5'],       img:'img/clays/laguna-bmix-speckled.png',   shrinkage:12.47, absorption:2.47,  coe:6.51,  desc:'A mid temperature, smooth, porcelaneous stoneware that is very plastic and workable. Fires warm white with speckles in oxidation. Prefers slow drying and ample compression on rims and bottoms.' },
  { id:'laguna-speckled-buff',  name:'Laguna Speckled Buff (WC-403)',   maker:'Laguna',         range:'mid',  cones:['5'],       img:'img/clays/laguna-speckled-buff.png',   shrinkage:12.0,  absorption:3.00,  coe:6.12,  desc:'Low in sand and grog, smooth-textured and an excellent throwing body. Fires buff with speckles in oxidation, brown with speckles in reduction.' },
  { id:'laguna-b3-brown',       name:'Laguna B-3 Brown',                maker:'Laguna',         range:'mid',  cones:['5','6'],   img:'img/clays/laguna-b3-brown.png',        shrinkage:10.0,  absorption:3.00,  coe:7.275, desc:'A pliable clay with smooth grog. Fires almost black in oxidation. Color comes from manganese and iron. Not recommended in reduction. Do not fire past Cone 5.' },
  { id:'laguna-azabache',       name:'Laguna Azabache',                 maker:'Laguna',         range:'mid',  cones:['5','6'],   img:'img/clays/laguna-azabache.png',        shrinkage:13.0,  absorption:2.59,  coe:6.1,   desc:'Rich toned black clay at cone 5. A really smooth throwing body for mid-scale work. Glaze testing is encouraged. Do not fire past Cone 5.' },
  { id:'dark-chocolate-32',     name:'Dark Chocolate No.32',            maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/dark-chocolate-32.png',      shrinkage:13.5,  absorption:0.50,  coe:null,  desc:'Amaco\'s No.32 Dark Chocolate fired to cone 5 achieves a deep chocolatey color; cone 6 produces a deeper hue. Smooth texture and remarkable workability. Manganese free.' },
  { id:'raku-mid',              name:'Raku (mid-fire)',                 maker:'Armadillo Clay', range:'mid',  cones:['5','6'],   img:'img/clays/raku-low.jpeg',              shrinkage:7.8,   absorption:3.95,  coe:5.0,   desc:'Contains grog and sand, great for withstanding the thermal shock of raku firing. Fires from white at Cone 06 to a light warm brown at Cone 10.' },

  // High-fire — cone 9–12
  { id:'armstone',              name:'Armstone',                        maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/armstone.jpeg',              shrinkage:11.25, absorption:2.80,  coe:4.8,   desc:'A heavily textured clay ideal for throwing large pots and hand-building. Fires a light warm brown in Cone 10 reduction. Heavier reduction produces warmer, darker tones.' },
  { id:'balcones',              name:'Balcones',                        maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/balcones.jpeg',              shrinkage:10.75, absorption:2.88,  coe:5.0,   desc:'A nice plastic body, excellent for wheel-throwing or hand-building. Fires from light brown to warm orange brown, depending on the amount of reduction. Fires to cone 10.' },
  { id:'balcones-white',        name:'Balcones White',                  maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/balcones-white.jpeg',        shrinkage:13.0,  absorption:3.26,  coe:5.0,   desc:'A nice plastic body, excellent for wheel-throwing or hand-building. Fires from creamy tan to light brown, depending on the amount of reduction. Fires to cone 10.' },
  { id:'balcones-dark',         name:'Balcones Dark',                   maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/balcones-dark.jpeg',         shrinkage:11.63, absorption:2.33,  coe:5.2,   desc:'A nice plastic body, excellent for wheel-throwing or hand-building. Fires a sandy brown in oxidation, medium-to-dark brown in light reduction. Not recommended for heavy reduction due to potential bloating.' },
  { id:'grande',                name:'Grande',                          maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/grande.jpeg',                shrinkage:9.75,  absorption:1.70,  coe:5.5,   desc:'A groggy body with extra strength for big pots and sculptures, great for hand-building. Fires from warm medium brown to golden brown at Cone 10, depending on amount of reduction.' },
  { id:'gruene-butter',         name:'Gruene Butter',                   maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/gruene-butter.jpeg',         shrinkage:11.67, absorption:2.48,  coe:5.1,   desc:'A very smooth and plastic clay, superb for throwing. Very forgiving. Fires from an off-white to a toasty golden tan, depending on the amount of reduction at Cone 10.' },
  { id:'dillo-white',           name:'Dillo White',                     maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/dillo-white.jpeg',           shrinkage:11.75, absorption:2.02,  coe:5.4,   desc:'A smooth off-white clay that is quite plastic, excellent for throwing. Beautiful in reduction and atmospheric firings. Fire to Cone 10.' },
  { id:'awesome-possum',        name:'Awesome Possum',                  maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/awesome-possum.jpeg',        shrinkage:18.0,  absorption:0.09,  coe:null,  desc:'Made with Molochite, a very fine aggregate that gives porcelain strength and plasticity without sacrificing the smooth, buttery texture. Throws beautifully in reduction and atmospheric firings. Neutral white in oxidation, cool white in reduction.' },
  { id:'cone-10-porcelain',     name:'Cone 10 Porcelain',               maker:'Armadillo Clay', range:'high', cones:['10'],              img:'img/clays/cone-10-porcelain.jpeg',     shrinkage:12.0,  absorption:1.65,  coe:5.5,   desc:'A very plastic clay with excellent strength for throwing larger pieces, resists cracking and warping. Fires eggshell white at Cone 10.' },
  { id:'laguna-bmix-10',        name:'Laguna B-Mix Cone 10',            maker:'Laguna',         range:'high', cones:['10'],              img:'img/clays/laguna-bmix-10.jpeg',        shrinkage:13.0,  absorption:1.00,  coe:7.0,   desc:'Laguna\'s Cone 10 B-mix has a smooth porcelain texture and is good for throwing and hand-building.' },
  { id:'bmix-wood-fire-10',     name:'B-Mix Wood Fire Cone 10',         maker:'Laguna',         range:'high', cones:['10'],              img:'img/clays/bmix-wood-fire-10.png',      shrinkage:13.0,  absorption:null,  coe:null,  desc:'A specially formulated version of Laguna\'s popular B-mix body for wood and salt firing. Takes salt and soda well and exhibits nice flashing characteristics. Holds up well in Cone 12 atmospheric firings.' },
  { id:'laguna-lc2-sable',      name:'Laguna LC2 Sable',                maker:'Laguna',         range:'high', cones:['9','10','11','12'], img:'img/clays/laguna-lc2-sable.png',       shrinkage:10.5,  absorption:0.06,  coe:5.26,  desc:'Lightly grogged with no sand. Fires to a bluish color in bisque, deep black at cone 10. Black clays can affect glazes so testing is required. Bloating has not been an issue.' },
  { id:'seidel-clay',           name:'Seidel Clay',                     maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/seidel-clay.jpeg',           shrinkage:11.2,  absorption:1.40,  coe:null,  desc:'A very smooth and plastic clay, good for throwing and handbuilding. Very forgiving. Reduction color varies.' },
  { id:'raku-high',             name:'Raku (high-fire)',                maker:'Armadillo Clay', range:'high', cones:['9','10','11','12'], img:'img/clays/raku-low.jpeg',              shrinkage:7.8,   absorption:3.95,  coe:5.0,   desc:'Contains grog and sand, great for withstanding the thermal shock of raku firing. Fires from white at Cone 06 to a light warm brown at Cone 10.' },
];

export const DEFAULT_PREFLIGHT = [
  { id:'lid',       label:'Lid latched & power cord seated' },
  { id:'shelves',   label:'Shelves clean & kiln-washed' },
  { id:'posts',     label:'Posts seated, ware not touching elements' },
  { id:'flammable', label:'Nothing flammable within 18"' },
];

export const WITNESS_OPTIONS = [
  { id:'soft',    label:'Standing straight', clock:'2',   desc:'Underfired — kiln ran cold',       deltaF:+45 },
  { id:'tipped',  label:'Starting to tip',   clock:'3',   desc:'Still short of temperature',        deltaF:+25 },
  { id:'leaning', label:'Halfway down',      clock:'4-5', desc:'Close — slight correction needed',  deltaF:+10 },
  { id:'touched', label:'Tip to pad',        clock:'6',   desc:'Right on temperature',              deltaF:0   },
  { id:'melted',  label:'Melted flat',       clock:'7+',  desc:'Overfired — kiln ran hot',          deltaF:-30 },
];

const CLOCK_TO_DELTA = { '2':+45, '3':+25, '4-5':+10, '6':0, '7+':-30 };

export function suggestOffset(history) {
  // history arrives most-recent-first (Firestore orderBy desc).
  // Ideal offset for each past firing = what was applied + correction the witness indicated.
  // Weight decay: i=0 (most recent) gets 1.0; each older firing is multiplied by 0.7.
  if (!history.length) return null;
  let wSum = 0, dSum = 0;
  history.forEach((f, i) => {
    const w     = Math.pow(0.7, i);
    const delta = f.witnessRead?.deltaF ?? 0;
    dSum += w * ((f.offsetF || 0) + delta);
    wSum += w;
  });
  return Math.round((dSum / wSum) / 5) * 5;
}

export function getProgramById(id) {
  return KILN.programs.find(p => p.id === id);
}

export function getConeByC(c) {
  return KILN.cones.find(cone => cone.c === c);
}

// Firestore path helpers
export function userDoc(db, uid)                { return db.collection('users').doc(uid); }
export function userCol(db, uid, col)           { return db.collection('users').doc(uid).collection(col); }
export function userSubDoc(db, uid, col, id)    { return db.collection('users').doc(uid).collection(col).doc(id); }

import { getState } from './state.js';

// Display preferences (read at call time so changes take effect immediately)
function timeOpts() {
  const fmt = getState().profile?.timeFormat || '12h';
  return fmt === '24h'
    ? { hour: '2-digit', minute: '2-digit', hour12: false }
    : { hour: 'numeric', minute: '2-digit', hour12: true };
}

export function fmtTemp(f) {
  if (f == null) return '';
  const unit = getState().profile?.tempUnit || 'F';
  if (unit === 'C') return `${Math.round((f - 32) * 5 / 9)}°C`;
  return `${f}°F`;
}

// Offset always renders in °F — matches the kiln controller's calibration dial,
// regardless of the user's preferred display unit.
export function fmtOffset(f) {
  const v = f || 0;
  return `${v >= 0 ? '+' : ''}${v}°F`;
}

// Time helpers
export function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
export function fmtTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-US', timeOpts());
}
export function fmtDayDate() {
  const d = new Date();
  const day = d.toLocaleDateString('en-US', { weekday:'short' }).toUpperCase();
  const mo  = String(d.getMonth() + 1).padStart(2,'0');
  const da  = String(d.getDate()).padStart(2,'0');
  return `${day} · ${mo}.${da}`;
}
export function toMs(ts) {
  if (!ts) return Date.now();
  return ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
}
export function elapsedPct(startedAt, totalHours) {
  return Math.min(100, Math.round(((Date.now() - toMs(startedAt)) / (totalHours * 3_600_000)) * 100));
}
export function remainingStr(startedAt, totalHours) {
  const rem = Math.max(0, totalHours * 3_600_000 - (Date.now() - toMs(startedAt)));
  const h = Math.floor(rem / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  return { h, m };
}
export function etaStr(startedAt, totalHours) {
  const end = new Date(toMs(startedAt) + totalHours * 3_600_000);
  return end.toLocaleTimeString('en-US', timeOpts());
}
export function openAtStr(startedAt, totalHours) {
  const open = new Date(toMs(startedAt) + (totalHours + 5.75) * 3_600_000);
  return open.toLocaleTimeString('en-US', timeOpts());
}
export function elapsedStr(startedAt) {
  const ms = Date.now() - toMs(startedAt);
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
