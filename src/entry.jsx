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
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const appPath = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.slice(basePath.length) || '/'
  : window.location.pathname;
const pageUrl = (path = '/') => `${basePath}${path.startsWith('/') ? path : `/${path}`}`;

document.addEventListener('click', (event) => {
  const anchor = event.target.closest?.('a');
  if (!anchor || event.defaultPrevented || event.button !== 0) return;
  const href = anchor.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith(`${basePath}/`) || href.startsWith('//')) return;
  event.preventDefault();
  window.location.assign(pageUrl(href));
});

function Loading() {
  return (
    <main className="bootstrap-loading">
      <div className="bootstrap-spinner" />
      <strong>Apex Financial Group</strong>
      <span>Checking institution status…</span>
    </main>
  );
}

function installPortalNavigation() {
  const inject = () => {
    const nav = document.querySelector('.portal-sidebar nav');
    if (!nav) return;
    const links = [
      ['phase14', '/owner-control', '◆', 'Owner Control Center'],
      ['phase13', '/economy-center', '◇', 'Business & Economy'],
      ['phase12', '/career-center', '▲', 'Careers & Branches'],
      ['phase11', '/academy-center', '●', 'Financial Academy'],
      ['phase10', '/departments', '▦', 'Department Operations'],
      ['phase9', '/staff', '■', 'Staff Workspace'],
      ['phase8', '/careers', '◆', 'Careers & Staff'],
      ['phase7', '/loans', '◈', 'Loan Center'],
      ['phase6', '/lending', '▣', 'Lending workspace'],
      ['phase5', '/applications', '▤', 'Applications'],
      ['phase4', '/progression', '★', 'Progression & Trust'],
    ];
    links.forEach(([key, href, icon, text]) => {
      if (nav.querySelector(`[data-${key}-link]`)) return;
      const link = document.createElement('a');
      link.href = pageUrl(href);
      link.dataset[`${key}Link`] = 'true';
      link.innerHTML = `<span aria-hidden="true">${icon}</span> ${text}`;
      const group = Array.from(nav.querySelectorAll('.portal-group')).find(
        (item) => item.textContent?.trim() === 'CUSTOMER',
      );
      if (group) group.insertAdjacentElement('afterend', link);
      else nav.appendChild(link);
    });
  };
  inject();
  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
}

async function start() {
  root.render(<Loading />);
  try {
    const snap = await getDoc(doc(db, 'system', 'bootstrap'));
    if (!snap.exists() || snap.data()?.status !== 'complete') {
      root.render(<BootstrapApp firebaseApp={app} db={db} />);
      return;
    }

    root.unmount();
    await deleteApp(app);

    if (appPath === '/signin') return import('./auth/loginEntry.jsx');
    if (appPath === '/progression') return import('./progression/progressionEntry.jsx');
    if (appPath === '/applications') return import('./applications/applicationEntry.jsx');
    if (appPath === '/lending') return import('./lending/lendingEntry.jsx');
    if (appPath === '/loans') return import('./servicing/servicingEntry.jsx');
    if (appPath === '/careers') return import('./staffing/staffingEntry.jsx');
    if (appPath === '/staff') return import('./staff/staffEntry.jsx');
    if (appPath === '/departments') return import('./departments/departmentEntry.jsx');
    if (appPath === '/academy-center') return import('./academy/academyEntry.jsx');
    if (appPath === '/career-center') return import('./careers/careerEntry.jsx');
    if (appPath === '/economy-center') return import('./economy/economyEntry.jsx');
    if (appPath === '/owner-control') return import('./admin/adminEntry.jsx');

    await import('./main.jsx');
    installPortalNavigation();
  } catch (error) {
    root.render(
      <main className="bootstrap-loading bootstrap-error-screen">
        <strong>Institution status unavailable</strong>
        <span>{error?.message || 'The bootstrap status could not be checked.'}</span>
        <button className="button button-gold" onClick={() => location.reload()}>
          Try again
        </button>
      </main>,
    );
  }
}

start();
