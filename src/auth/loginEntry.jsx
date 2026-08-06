import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { ArrowLeft, Landmark, LockKeyhole, ShieldCheck } from 'lucide-react';
import '../styles.css';
import './login.css';

const firebaseConfig = {
  apiKey: 'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',
  authDomain: 'afg-game.firebaseapp.com',
  projectId: 'afg-game',
  storageBucket: 'afg-game.firebasestorage.app',
  messagingSenderId: '779966850290',
  appId: '1:779966850290:web:24f48af23a2e6cae2d9c6b',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const pageUrl = (path = '/') => `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
const normalizeUsername = (value = '') => value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

async function resolveCredential(value) {
  const entered = value.trim();
  if (entered.includes('@')) return entered;

  const username = normalizeUsername(entered);
  if (username.length < 3) throw new Error('Enter a valid AFG username or email address.');

  const alias = await getDoc(doc(db, 'usernames', username));
  if (alias.exists() && alias.data()?.authEmail) return alias.data().authEmail;

  // Owner Bootstrap accounts always use this internal Firebase credential format.
  const bootstrap = await getDoc(doc(db, 'system', 'bootstrap'));
  if (bootstrap.exists()) {
    const ownerUser = await getDoc(doc(db, 'users', bootstrap.data().ownerUid));
    if (ownerUser.exists() && normalizeUsername(ownerUser.data().username) === username) {
      return ownerUser.data().authEmail || `${username}@users.afg-game.local`;
    }
  }

  throw new Error('That username could not be resolved. Existing customer accounts may sign in once with their email while their username mapping is upgraded.');
}

function LoginPage() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace(pageUrl('/dashboard'));
  }), []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const email = await resolveCredential(credential);
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace(pageUrl('/dashboard'));
    } catch (loginError) {
      const known = {
        'auth/invalid-credential': 'The username/email or password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Wait briefly and try again.',
        'permission-denied': 'Firestore rules are blocking username lookup. Deploy the consolidated rules file.',
      };
      setError(known[loginError?.code] || loginError?.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="afg-login-shell">
      <section className="afg-login-brand">
        <a className="afg-login-logo" href={pageUrl('/')}>
          <span><Landmark /></span>
          <div><strong>Apex Financial Group</strong><small>Building Tomorrow’s Success.</small></div>
        </a>
        <div className="afg-login-message">
          <span>SECURE AFG ACCESS</span>
          <h1>Welcome back to AFG.</h1>
          <p>Use your AFG username or the email connected to your account.</p>
          <div><ShieldCheck /> Fictional information only</div>
          <div><LockKeyhole /> Protected Firebase authentication</div>
        </div>
      </section>

      <section className="afg-login-form-panel">
        <div className="afg-login-form-wrap">
          <a className="afg-login-return" href={pageUrl('/')}><ArrowLeft /> Return to website</a>
          <span className="afg-login-kicker">CUSTOMER & STAFF SIGN IN</span>
          <h2>Access your account</h2>
          <p>Owner accounts may use the username selected during Institution Bootstrap.</p>
          {error && <div className="form-alert">{error}</div>}
          <form onSubmit={submit}>
            <label>
              AFG username or email
              <input
                type="text"
                autoComplete="username"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                placeholder="Executive_Eagle"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="afg-login-register">No account? <a href={pageUrl('/register')}>Create a customer account</a></p>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><LoginPage /></React.StrictMode>);
