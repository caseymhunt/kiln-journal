import { getState, setState } from './state.js';

const screenModules = {};
let currentScreen = null;
let activeUnsub = null;

const screenRoot = () => document.getElementById('screen-root');
const flowRoot   = () => document.getElementById('flow-root');
const app        = () => document.getElementById('app');

export function registerScreen(name, mod) {
  screenModules[name] = mod;
}

export async function goTo(screen) {
  if (currentScreen === screen) return;

  // Unmount current
  if (currentScreen && screenModules[currentScreen]?.unmount) {
    screenModules[currentScreen].unmount();
  }
  if (activeUnsub) { activeUnsub(); activeUnsub = null; }

  currentScreen = screen;
  setState({ activeScreen: screen });

  // Update tab active state
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === screen);
  });

  const el = screenRoot();
  el.scrollTop = 0;

  const mod = screenModules[screen];
  if (mod) {
    const unsub = await mod.mount(el);
    if (typeof unsub === 'function') activeUnsub = unsub;
  }
}

// ── Flow management ───────────────────────────────────────────

const flowStack = [];

export async function pushFlow(renderFn) {
  flowStack.push(renderFn);
  _renderFlow();
}

export function popFlow() {
  flowStack.pop();
  if (flowStack.length === 0) {
    closeFlow();
  } else {
    _renderFlow();
  }
}

export function closeFlow() {
  flowStack.length = 0;
  flowRoot().classList.add('hidden');
  app().classList.remove('hidden');
  flowRoot().innerHTML = '';
}

function _renderFlow() {
  const el = flowRoot();
  el.innerHTML = '';
  el.scrollTop = 0;
  el.classList.remove('hidden');
  app().classList.add('hidden');
  const fn = flowStack[flowStack.length - 1];
  if (fn) fn(el);
}

export function replaceFlow(renderFn) {
  flowStack[flowStack.length - 1] = renderFn;
  _renderFlow();
}
