const config = {
  apiKey:            'AIzaSyCQNK1q8uaQqD1-5sW5vHczK7ikF_pWfJk',
  authDomain:        'kiln-journal.firebaseapp.com',
  projectId:         'kiln-journal',
  storageBucket:     'kiln-journal.firebasestorage.app',
  messagingSenderId: '225879987732',
  appId:             '1:225879987732:web:3e411ca27cb3f76aa1b901',
};

firebase.initializeApp(config);

export const auth = firebase.auth();
export const db   = firebase.firestore();

db.settings({ experimentalAutoDetectLongPolling: true });
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
