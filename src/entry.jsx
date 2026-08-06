import React from 'react';
import { createRoot } from 'react-dom/client';
import { deleteApp, initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import BootstrapApp from './bootstrap/BootstrapApp.jsx';
import './styles.css';
import './bootstrap/bootstrap.css';

const firebaseConfig = {
  apiKey: 'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',
  authDomain: 'afg-game.firebaseapp.com',
  projectId: 'afg-game',
  storageBucket: 'afg-game.firebasestorage.app',
  messagingSenderId: '779966850290',
  appId: '1:779966850290:web:24f48af23a2e6cae2d9c6b',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const root = createRoot(document.getElementById('root'));

function LoadingScreen() {
  return (
    <main className="bootstrap-loading">
      <div className="bootstrap-spinner" />
      <strong>Apex Financial Group</strong>
      <span>Checking institution status…</span>
    </main>
  );
}

async function start() {
  root.render(<LoadingScreen />);

  try {
    const bootstrapSnapshot = await getDoc(doc(db, 'system', 'bootstrap'));
    if (!bootstrapSnapshot.exists() || bootstrapSnapshot.data()?.status !== 'complete') {
      root.render(<BootstrapApp firebaseApp={app} db={db} />);
      return;
    }

    root.unmount();
    await deleteApp(app);
    await import('./main.jsx');
  } catch (error) {
    root.render(
      <main className="bootstrap-loading bootstrap-error-screen">
        <strong>Institution status unavailable</strong>
        <span>{error?.message || 'The bootstrap status could not be checked.'}</span>
        <button className="button button-gold" type="button" onClick={() => window.location.reload()}>Try again</button>
      </main>,
    );
  }
}

start();
