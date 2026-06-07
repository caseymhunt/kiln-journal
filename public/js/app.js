import { auth, db } from './firebase.js';
import { setState, getState } from './state.js';
import { registerScreen, goTo, pushFlow, closeFlow } from './router.js';
import { userDoc, userCol } from './data.js';

import * as today    from './screens/today.js';
import * as log      from './screens/log.js';
import * as library  from './screens/library.js';
import * as settings from './screens/settings.js';
import { startNewFiringFlow } from './flows/new-firing.js';

// Register screens
registerScreen('today',    today);
registerScreen('log',      log);
registerScreen('library',  library);
registerScreen('settings', settings);

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function setBootProgress(text, pct) {
  const s = document.getElementById('boot-status');
  const b = document.getElementById('boot-bar');
  if (s) s.textContent = text;
  if (b) b.style.width = `${pct}%`;
}

function hideBoot() {
  const el = document.getElementById('boot-screen');
  if (!el) return;
  el.classList.add('fading');
  setTimeout(() => el.classList.add('hidden'), 300);
}

// Auth
auth.onAuthStateChanged(async user => {
  setBootProgress('Loading your studio…', 65);

  if (!user) {
    hideBoot();
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    return;
  }

  // Load profile + check for active firing in parallel
  let profile = null;
  let activeFiring = null;
  try {
    const [profileSnap, firingSnap] = await Promise.all([
      userDoc(db, user.uid).get(),
      userCol(db, user.uid, 'firings')
        .where('status', '==', 'active')
        .limit(1)
        .get(),
    ]);

    if (profileSnap.exists) {
      profile = profileSnap.data();
    } else {
      profile = {
        displayName: user.displayName || '',
        email:       user.email || '',
        kilnId:      'pf8',
        firingCount: 0,
        offsetF:     0,
        tempUnit:    'F',
        timeFormat:  '12h',
        preflightOn: { lid:true, shelves:true, posts:true, flammable:false },
        hiddenClayIds: [],
      };
      userDoc(db, user.uid).set(profile); // fire-and-forget
    }

    if (!firingSnap.empty) {
      activeFiring = { id: firingSnap.docs[0].id, ...firingSnap.docs[0].data() };
    }
  } catch (e) {
    console.error('Init error', e);
    profile = { displayName: user.displayName || '', email: user.email || '', kilnId:'pf8', firingCount:0, offsetF:0, tempUnit:'F', preflightOn:{} };
  }

  setState({ user, profile, activeFiring });

  setBootProgress('Ready.', 100);
  await new Promise(r => setTimeout(r, 350));

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  hideBoot();

  goTo('today');
});

// Sign in
document.getElementById('sign-in-btn').addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error('Sign in error', e);
  }
});

// Tab nav
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => goTo(btn.dataset.tab));
});

// FAB — open live view if firing active, else start new
document.getElementById('fab-btn').addEventListener('click', () => {
  const { user, activeFiring } = getState();
  if (!user) return;
  if (activeFiring) {
    import('./flows/live.js').then(m => m.openLiveFlow(activeFiring));
    return;
  }
  startNewFiringFlow();
});
