import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { ArrowRight, Building2, Landmark, LayoutDashboard, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { createCustomerIdentity, getInstitutionSettings, normalizeUsername, validateUsername } from './customer/customerService.js';
import CustomerPortal from './customer/CustomerPortal.jsx';
import './styles.css';
import './customer/phase2b.css';
import './banking/phase3.css';
import './progression/phase4.css';

const config = {
  apiKey: 'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',
  authDomain: 'afg-game.firebaseapp.com',
  projectId: 'afg-game',
  storageBucket: 'afg-game.firebasestorage.app',
  messagingSenderId: '779966850290',
  appId: '1:779966850290:web:24f48af23a2e6cae2d9c6b',
};

const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
const baseName = import.meta.env.BASE_URL.replace(/\/$/, '');
const portalUrl = (path) => `${baseName}${path}`;

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (next) => {
    setUser(next);
    setLoading(false);
  }), []);
  return <AuthContext.Provider value={useMemo(() => ({ user, loading }), [user, loading])}>{children}</AuthContext.Provider>;
}

function Brand() {
  return <NavLink to="/" className="brand"><span className="brand-mark"><Landmark /></span><span className="brand-copy"><strong>Apex Financial Group</strong><small>Building Tomorrow&apos;s Success.</small></span></NavLink>;
}

function Header() {
  const { user } = useAuth();
  return <header className="site-header"><div className="container header-inner"><Brand/><nav className="main-nav"><div className="nav-links"><NavLink to="/">Home</NavLink><NavLink to="/about">About</NavLink><NavLink to="/services">Services</NavLink><NavLink to="/rules">Rules</NavLink></div><div className="nav-actions">{user ? <><NavLink className="button button-dark" to="/dashboard"><LayoutDashboard size={17}/> Dashboard</NavLink><button className="button button-ghost" onClick={() => signOut(auth)}>Sign out</button></> : <><NavLink className="button button-ghost" to="/signin"><LogIn size={17}/> Sign in</NavLink><NavLink className="button button-gold" to="/register"><UserPlus size={17}/> Create account</NavLink></>}</div></nav></div></header>;
}

function Shell({ children }) {
  return <><Header/><main>{children}</main><footer className="site-footer"><div className="container footer-bottom"><p>© 2026 Apex Financial Group.</p><p><strong>Fictional simulation:</strong> No real financial services are offered.</p></div></footer></>;
}

function Home() {
  return <Shell><section className="hero-section"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow">FULL INSTITUTION PLATFORM</span><h1>Build your fictional financial future.</h1><p>Banking, lending, careers, departments, education, businesses, property, investments, insurance, and institution management—all connected to one permanent AFG identity.</p><div className="hero-actions"><NavLink className="button button-gold button-large" to="/register">Create customer account <ArrowRight size={18}/></NavLink><NavLink className="button button-light button-large" to="/signin">Sign in</NavLink></div><div className="trust-row"><span><ShieldCheck size={17}/> Fictional information only</span><span><Building2 size={17}/> Fourteen completed phases</span></div></div><div className="hero-panel"><div className="panel-topline"><span>APEX FINANCIAL GROUP</span><span className="live-pill">LIVE</span></div><div className="balance-card"><span>Connected institution</span><strong>Customer + Staff + Economy</strong><small>One account. Multiple portals. Permanent IDs.</small></div><div className="metric-grid"><div><small>Banking</small><strong>Active</strong></div><div><small>Lending</small><strong>Active</strong></div><div><small>Careers</small><strong>Active</strong></div><div><small>Economy</small><strong>Active</strong></div></div></div></div></section><section className="section section-white"><div className="container"><div className="section-heading centered"><span className="eyebrow">EXPLORE AFG</span><h2>Every major system is connected.</h2></div><div className="card-grid three-columns">{[['Financial Academy','/academy-center'],['Applications','/applications'],['Progression & Trust','/progression'],['Business & Economy','/economy-center'],['Careers & Branches','/career-center'],['Loan Center','/loans']].map(([title,path]) => <a className="feature-card" href={portalUrl(path)} key={path}><h3>{title}</h3><p>Open the secure AFG portal.</p></a>)}</div></div></section></Shell>;
}

function Info({ title, children }) {
  return <Shell><section className="page-hero"><div className="container narrow"><span className="eyebrow">APEX FINANCIAL GROUP</span><h1>{title}</h1></div></section><section className="section section-white"><div className="container narrow rich-content">{children}</div></section></Shell>;
}

function AuthPage({ mode }) {
  const register = mode === 'register';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ displayName: '', username: '', discord: '', email: '', password: '', confirm: '', accepted: false });

  useEffect(() => { getInstitutionSettings(db).then(({ settings: next }) => setSettings(next)).catch(() => setSettings({ registrationEnabled: false })); }, []);
  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (register && settings?.registrationEnabled === false) return setError('Public registration is closed.');
    if (register && validateUsername(form.username)) return setError(validateUsername(form.username));
    if (register && form.password !== form.confirm) return setError('Passwords do not match.');
    if (register && !form.accepted) return setError('Accept the fictional-information rule.');
    setBusy(true);
    let credential;
    try {
      if (register) {
        credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        await updateProfile(credential.user, { displayName: form.displayName.trim() });
        await createCustomerIdentity(db, credential.user, { ...form, username: normalizeUsername(form.username) }, settings);
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      }
      navigate('/dashboard');
    } catch (cause) {
      if (register && credential?.user) try { await deleteUser(credential.user); } catch {}
      setError(cause?.message || 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-page"><div className="auth-brand-panel"><Brand/><div className="auth-message"><span className="eyebrow eyebrow-dark">SECURE AFG ACCESS</span><h1>{register ? 'Create your financial identity.' : 'Welcome back to AFG.'}</h1><p>Use fictional information only. No document uploads are available.</p></div></div><div className="auth-form-panel"><div className="auth-form-wrap"><NavLink to="/" className="back-link">← Return to website</NavLink><h2>{register ? 'Join Apex Financial Group' : 'Access your account'}</h2>{error && <div className="form-alert">{error}</div>}<form className="auth-form" onSubmit={submit}>{register && <><label>Display name<input name="displayName" value={form.displayName} onChange={update} required/></label><label>AFG username<input name="username" value={form.username} onChange={update} required/></label><label>Discord username<input name="discord" value={form.discord} onChange={update} required/></label></>}<label>Email address<input name="email" type="email" value={form.email} onChange={update} required/></label><label>Password<input name="password" type="password" value={form.password} onChange={update} required minLength="6"/></label>{register && <><label>Confirm password<input name="confirm" type="password" value={form.confirm} onChange={update} required/></label><label className="checkbox-row"><input name="accepted" type="checkbox" checked={form.accepted} onChange={update}/><span>I will use fictional information only.</span></label></>}<button className="button button-dark button-large full-width" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create customer account' : 'Sign in'}</button></form></div></div></div>;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><Landmark/><strong>Apex Financial Group</strong><span>Loading secure portal…</span></div>;
  return user ? children : <Navigate to="/signin" replace/>;
}

function App() {
  const { user } = useAuth();
  return <Routes><Route path="/" element={<Home/>}/><Route path="/about" element={<Info title="A fictional economy with real structure."><p>AFG combines financial simulation, professional roleplay, education, progression, and institutional management.</p></Info>}/><Route path="/services" element={<Info title="An entire institution under one roof."><p>Every system connects to the same permanent customer identity.</p></Info>}/><Route path="/rules" element={<Info title="Keep the simulation safe and fair."><p>Use fictional information only. Do not exploit progression. Owner authority is final and audited.</p></Info>}/><Route path="/signin" element={user ? <Navigate to="/dashboard" replace/> : <AuthPage mode="signin"/>}/><Route path="/register" element={user ? <Navigate to="/dashboard" replace/> : <AuthPage mode="register"/>}/><Route path="/dashboard" element={<Protected><CustomerPortal auth={auth} db={db} user={user}/></Protected>}/><Route path="*" element={<Info title="Page not found"><NavLink className="button button-dark" to="/">Return home</NavLink></Info>}/></Routes>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter basename={baseName}><AuthProvider><App/></AuthProvider></BrowserRouter></React.StrictMode>);
