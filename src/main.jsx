import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import {
  ArrowRight, BadgeCheck, Banknote, Bell, BookOpen, BriefcaseBusiness, Building2,
  CheckCircle2, ChevronRight, CircleDollarSign, Landmark, LayoutDashboard,
  LockKeyhole, LogIn, LogOut, Menu, Scale, ShieldCheck, Sparkles, TrendingUp,
  UserPlus, Users, WalletCards, X,
} from 'lucide-react';
import {
  createCustomerIdentity,
  getInstitutionSettings,
  loadCustomerPortal,
  normalizeUsername,
  validateUsername,
} from './customer/customerService.js';
import './styles.css';
import './customer/phase2b.css';

const firebaseConfig = {
  apiKey: 'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',
  authDomain: 'afg-game.firebaseapp.com',
  projectId: 'afg-game',
  storageBucket: 'afg-game.firebasestorage.app',
  messagingSenderId: '779966850290',
  appId: '1:779966850290:web:24f48af23a2e6cae2d9c6b',
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); }), []);
  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const primaryNav = [['/', 'Home'], ['/about', 'About'], ['/services', 'Services'], ['/academy', 'Academy'], ['/rules', 'Rules']];

function Brand({ compact = false }) {
  return <NavLink to="/" className="brand" aria-label="Apex Financial Group home">
    <span className="brand-mark"><Landmark size={compact ? 20 : 24} /></span>
    <span className="brand-copy"><strong>{compact ? 'AFG' : 'Apex Financial Group'}</strong>{!compact && <small>Building Tomorrow's Success.</small>}</span>
  </NavLink>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return <header className="site-header"><div className="container header-inner"><Brand />
    <button className="icon-button menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
    <nav className={`main-nav ${open ? 'is-open' : ''}`}><div className="nav-links">{primaryNav.map(([to,label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</div>
      <div className="nav-actions">{user ? <NavLink className="button button-dark" to="/dashboard"><LayoutDashboard size={17}/> Dashboard</NavLink> : <><NavLink className="button button-ghost" to="/signin"><LogIn size={17}/> Sign in</NavLink><NavLink className="button button-gold" to="/register"><UserPlus size={17}/> Create account</NavLink></>}</div>
    </nav></div></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="container footer-grid"><div><Brand compact/><p>A fictional financial institution and economy simulation for entertainment, education, and Discord community roleplay.</p></div><div><h3>Institution</h3><NavLink to="/about">About AFG</NavLink><NavLink to="/services">Services</NavLink><NavLink to="/academy">Financial Academy</NavLink></div><div><h3>Safety</h3><NavLink to="/rules">Rules</NavLink><NavLink to="/privacy">Privacy & safety</NavLink><NavLink to="/terms">Simulation terms</NavLink></div></div><div className="container footer-bottom"><p>© 2026 Apex Financial Group.</p><p><strong>Fictional simulation:</strong> No real financial services are offered.</p></div></footer>;
}
const PageShell = ({children}) => <><Header/><main>{children}</main><Footer/></>;

const serviceCards = [
  [WalletCards,'Personal Banking','Manage fictional checking, savings, transfers, transactions, balances, and financial goals.'],
  [CircleDollarSign,'Lending & Credit','Submit financial applications, build a Financial Trust Score, and manage repayment.'],
  [Building2,'Business Economy','Register businesses, manage commercial accounts, seek financing, and build reputation.'],
  [BriefcaseBusiness,'Staff Careers','Apply for staff, complete training, join departments, earn promotions, and lead branches.'],
  [BookOpen,'Financial Academy','Complete customer education and required staff certifications inside the platform.'],
  [TrendingUp,'Evolving Economy','Participate in events, branch competitions, achievements, and changing conditions.'],
];

function HomePage() {
  return <PageShell><section className="hero-section"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> PHASE 2B NOW ACTIVE</span><h1>Build your financial future inside a living institution.</h1><p>Create a permanent AFG customer identity, receive starting accounts, and enter a growing fictional economy built for your Discord community.</p><div className="hero-actions"><NavLink className="button button-gold button-large" to="/register">Create customer account <ArrowRight size={18}/></NavLink><NavLink className="button button-light button-large" to="/services">Explore AFG</NavLink></div><div className="trust-row"><span><ShieldCheck size={17}/> Fictional information only</span><span><BadgeCheck size={17}/> Permanent Customer ID</span><span><LockKeyhole size={17}/> Protected access</span></div></div><div className="hero-panel"><div className="panel-topline"><span>CUSTOMER IDENTITY</span><span className="live-pill">PHASE 2B LIVE</span></div><div className="balance-card"><span>Starting customer package</span><strong>2 accounts</strong><small>Everyday Checking + Growth Savings</small></div><div className="metric-grid"><div><small>Starting score</small><strong>600</strong><span>Developing</span></div><div><small>Account role</small><strong>Customer</strong><span>Default access</span></div><div><small>Academy level</small><strong>1</strong><span>Ready to learn</span></div><div><small>Badge</small><strong>Founding</strong><span>Customer</span></div></div></div></div></section><section className="section section-white"><div className="container"><div className="section-heading centered"><span className="eyebrow">ONE CONNECTED PLATFORM</span><h2>More than a loan database.</h2><p>Your identity will carry through banking, lending, business, academy, staffing, branches, and achievements.</p></div><div className="card-grid three-columns">{serviceCards.map(([Icon,title,body]) => <article className="feature-card" key={title}><span className="feature-icon"><Icon/></span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section></PageShell>;
}

function InfoPage({ eyebrow, title, description, children }) {
  return <PageShell><section className="page-hero"><div className="container narrow"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></section><section className="section section-white"><div className="container narrow rich-content">{children}</div></section></PageShell>;
}
function AboutPage(){return <InfoPage eyebrow="ABOUT AFG" title="A fictional economy with real structure." description="Financial simulation, professional roleplay, education, and institutional management in one community platform."><h2>How AFG works</h2><p>Every member begins as a customer. Staff access is assigned by leadership through the institution. Rank determines authority, department determines responsibility, branch determines assignment, and permissions determine exact access.</p><div className="info-callout"><ShieldCheck/><div><strong>Simulation only</strong><p>Never enter real banking, identity, address, employer, or income information.</p></div></div></InfoPage>}
function ServicesPage(){return <InfoPage eyebrow="SERVICES" title="An entire institution under one roof." description="Each major system will connect to the same permanent customer identity."><div className="card-grid two-columns">{serviceCards.map(([Icon,title,body]) => <article className="feature-card" key={title}><span className="feature-icon"><Icon/></span><h3>{title}</h3><p>{body}</p></article>)}</div></InfoPage>}
function AcademyPage(){return <InfoPage eyebrow="AFG FINANCIAL ACADEMY" title="Learn, certify, and advance." description="Customer education and staff career development will share one integrated academy."><div className="card-grid two-columns"><article className="feature-card"><Users/><h3>Customer Academy</h3><p>Budgeting, credit, borrowing, saving, investing, and business finance.</p></article><article className="feature-card"><BriefcaseBusiness/><h3>Staff Academy</h3><p>Orientation, department certifications, monthly training, and leadership development.</p></article></div></InfoPage>}
function RulesPage(){return <InfoPage eyebrow="COMMUNITY RULES" title="Keep the simulation safe and fair." description="These rules apply to every customer and staff member."><ol className="rule-list"><li><strong>Use fictional information only.</strong><span>No real financial or identifying data.</span></li><li><strong>Do not exploit the economy.</strong><span>Duplicate-account manipulation and unauthorized adjustments are prohibited.</span></li><li><strong>Respect account boundaries.</strong><span>Never access another user's private records.</span></li><li><strong>Owner authority is final.</strong><span>The Founder and Owner may override every workflow, with audit logging.</span></li></ol></InfoPage>}
function PrivacyPage(){return <InfoPage eyebrow="PRIVACY & SAFETY" title="No document uploads. No real financial records." description="AFG stores only what is needed for the fictional platform."><h2>Allowed information</h2><p>Display name, AFG username, Discord username, login email, and fictional game data.</p><h2>Never provide</h2><p>Government IDs, real addresses, banking details, income statements, account numbers, or documents.</p></InfoPage>}
function TermsPage(){return <InfoPage eyebrow="SIMULATION TERMS" title="No real financial relationship is created." description="Every account, balance, title, loan, and asset is fictional."><p>AFG balances have no cash value and cannot be redeemed. Staff appointments do not create real employment.</p></InfoPage>}

function AuthLayout({ mode }) {
  const register = mode === 'register';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form,setForm] = useState({displayName:'',username:'',discord:'',email:'',password:'',confirm:'',accepted:false});
  const [settings,setSettings] = useState(null);
  const [error,setError] = useState('');
  const [submitting,setSubmitting] = useState(false);
  useEffect(() => { getInstitutionSettings(db).then(({settings:s}) => setSettings(s)).catch(() => setSettings({registrationEnabled:false})); }, []);
  useEffect(() => { if(user) navigate('/dashboard',{replace:true}); },[user,navigate]);
  const update = (e) => setForm(v => ({...v,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  async function submit(e){
    e.preventDefault(); setError('');
    if(register && settings?.registrationEnabled === false) return setError('Public registration is currently closed by the institution.');
    if(register && validateUsername(form.username)) return setError(validateUsername(form.username));
    if(register && form.password!==form.confirm) return setError('The passwords do not match.');
    if(register && !form.accepted) return setError('You must accept the simulation rules.');
    setSubmitting(true); let credential;
    try{
      if(register){
        credential=await createUserWithEmailAndPassword(auth,form.email.trim(),form.password);
        await updateProfile(credential.user,{displayName:form.displayName.trim()});
        await createCustomerIdentity(db,credential.user,{...form,username:normalizeUsername(form.username)},settings);
      }else await signInWithEmailAndPassword(auth,form.email.trim(),form.password);
      navigate('/dashboard');
    }catch(err){
      if(register && credential?.user){ try{await deleteUser(credential.user);}catch{/* recovery handled on next sign-in */} }
      const known={'auth/email-already-in-use':'That email is already connected to an account.','auth/invalid-credential':'The email or password is incorrect.','auth/weak-password':'Use a password containing at least six characters.','auth/invalid-email':'Enter a valid email address.','auth/operation-not-allowed':'Email/password sign-in must be enabled in Firebase Authentication.'};
      setError(known[err.code]||err.message||'We could not complete that request.');
    }finally{setSubmitting(false)}
  }
  return <div className="auth-page"><div className="auth-brand-panel"><Brand/><div className="auth-message"><span className="eyebrow eyebrow-dark">PHASE 2B</span><h1>{register?'Create your permanent customer identity.':'Welcome back to AFG.'}</h1><p>{register?'Every new account begins as a customer and receives a permanent ID, two starting accounts, a Trust Score, an Academy profile, and a founding badge.':'Sign in to your protected customer portal.'}</p><div className="check-list compact"><div><CheckCircle2/><span>Customer by default</span></div><div><CheckCircle2/><span>No document uploads</span></div><div><CheckCircle2/><span>Staff assigned by leadership</span></div></div></div><small>Building Tomorrow's Success.</small></div><div className="auth-form-panel"><div className="auth-form-wrap"><NavLink to="/" className="back-link">← Return to website</NavLink><span className="eyebrow">{register?'CUSTOMER REGISTRATION':'SECURE SIGN IN'}</span><h2>{register?'Join Apex Financial Group':'Access your account'}</h2>{register && settings && <div className={`registration-status ${settings.registrationEnabled!==false?'available':'unavailable'}`}>{settings.registrationEnabled!==false?<><CheckCircle2 size={17}/> Public registration is open</>:<><LockKeyhole size={17}/> Public registration is closed</>}</div>}{error&&<div className="form-alert" role="alert">{error}</div>}<form onSubmit={submit} className="auth-form">{register&&<><label>Display name<input name="displayName" value={form.displayName} onChange={update} required maxLength="40" placeholder="How you appear in AFG"/></label><label>AFG username<input name="username" value={form.username} onChange={update} required minLength="3" maxLength="20" placeholder="letters_numbers_only"/></label><label>Discord username<input name="discord" value={form.discord} onChange={update} required maxLength="40" placeholder="Your Discord username"/></label></>}<label>Email address<input name="email" type="email" value={form.email} onChange={update} required autoComplete="email"/></label><label>Password<input name="password" type="password" value={form.password} onChange={update} required minLength="6" autoComplete={register?'new-password':'current-password'}/></label>{register&&<><label>Confirm password<input name="confirm" type="password" value={form.confirm} onChange={update} required minLength="6"/></label><label className="checkbox-row"><input name="accepted" type="checkbox" checked={form.accepted} onChange={update}/><span>I will use fictional information only and accept the <NavLink to="/rules">rules</NavLink> and <NavLink to="/terms">terms</NavLink>.</span></label></>}<button className="button button-dark button-large full-width" disabled={submitting||register&&settings?.registrationEnabled===false}>{submitting?'Creating secure records…':register?'Create customer account':'Sign in'} <ArrowRight size={18}/></button></form><p className="auth-switch">{register?'Already registered?':'New to AFG?'} <NavLink to={register?'/signin':'/register'}>{register?'Sign in':'Create an account'}</NavLink></p></div></div></div>;
}

function LoadingScreen(){return <div className="loading-screen"><Landmark/><strong>Apex Financial Group</strong><span>Loading secure portal…</span></div>}
function ProtectedRoute({children}){const{user,loading}=useAuth();if(loading)return <LoadingScreen/>;return user?children:<Navigate to="/signin" replace/>}

function DashboardPage(){
  const{user}=useAuth(); const navigate=useNavigate(); const[portal,setPortal]=useState(null); const[error,setError]=useState(''); const[menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{if(user)loadCustomerPortal(db,user.uid).then(setPortal).catch(e=>setError(e.message));},[user]);
  async function logout(){await signOut(auth);navigate('/')}
  if(!portal&&!error)return <LoadingScreen/>;
  if(error)return <div className="loading-screen"><strong>Customer portal unavailable</strong><span>{error}</span><button className="button button-dark" onClick={()=>location.reload()}>Try again</button></div>;
  if(!portal.user)return <div className="loading-screen"><strong>Customer identity missing</strong><span>This login exists, but no Phase 2B customer record was found. Contact the Owner for recovery.</span><button className="button button-dark" onClick={logout}>Sign out</button></div>;
  const checking=portal.accounts.find(a=>a.type==='checking'); const savings=portal.accounts.find(a=>a.type==='savings'); const total=portal.accounts.reduce((sum,a)=>sum+Number(a.balance||0),0); const symbol=checking?.currencySymbol||'$';
  return <div className="portal-shell"><aside className={`portal-sidebar ${menuOpen?'is-open':''}`}><Brand compact/><nav><NavLink to="/dashboard" className="active"><LayoutDashboard/> Overview</NavLink><span className="portal-group">CUSTOMER</span><a href="#accounts"><WalletCards/> Accounts</a><a href="#identity"><BadgeCheck/> Identity</a><a href="#notifications"><Bell/> Notifications</a><NavLink to="/academy"><BookOpen/> Academy</NavLink><NavLink to="/rules"><Scale/> Rules</NavLink></nav><div className="sidebar-footer"><small>Customer release</small><strong>Phase 2B</strong></div></aside><div className="portal-main"><header className="portal-header"><button className="icon-button portal-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><div><small>CUSTOMER PORTAL</small><strong>{portal.user.displayName}</strong></div><button className="button button-ghost" onClick={logout}><LogOut size={17}/> Sign out</button></header><main className="portal-content"><section className="portal-welcome"><div><span className="eyebrow">WELCOME TO AFG</span><h1>Your customer identity is active.</h1><p>Your permanent profile, starting accounts, Trust Score, Academy profile, achievement record, notification center, and registration audit event are now connected.</p></div><span className="phase-chip"><Sparkles size={15}/> PHASE 2B LIVE</span></section><div className="customer-id-card" id="identity"><div><small>PERMANENT CUSTOMER ID</small><strong>{portal.user.customerId}</strong><p>@{portal.user.username} · {portal.user.discordUsername}</p></div><span className="status-badge"><CheckCircle2/> Active customer</span></div><div className="dashboard-metrics"><article><small>Total balance</small><strong>{symbol}{total.toLocaleString(undefined,{minimumFractionDigits:2})}</strong><span>Across active accounts</span></article><article><small>Trust Score</small><strong>{portal.credit?.trustScore??'—'}</strong><span>{portal.credit?.tier||'Not rated'}</span></article><article><small>Academy level</small><strong>{portal.academy?.level??1}</strong><span>{portal.academy?.xp??0} XP</span></article><article><small>Home branch</small><strong>Capital</strong><span>Headquarters assignment</span></article></div><div className="portal-profile-grid"><section className="dashboard-panel" id="accounts"><div className="panel-heading"><div><small>CUSTOMER BANKING</small><h2>Your starting accounts</h2></div><span className="status-badge neutral">2 active</span></div><div className="account-list">{portal.accounts.map(account=><div className="account-row" key={account.accountId}><span><strong>{account.productName}</strong><small>{account.accountId}</small></span><strong>{account.currencySymbol}{Number(account.balance||0).toLocaleString(undefined,{minimumFractionDigits:2})}</strong></div>)}</div></section><section className="dashboard-panel"><small>PROFILE COMPLETION</small><h2>{portal.profile?.profileCompletion??35}% complete</h2><div className="profile-progress"><span style={{width:`${portal.profile?.profileCompletion??35}%`}}/></div><p>Your fictional financial profile will expand in later phases. Never enter real identifying or financial information.</p><div className="identity-table"><div><span>Classification</span><strong>Customer</strong></div><div><span>Opening checking</span><strong>{checking?.accountId||'Active'}</strong></div><div><span>Growth savings</span><strong>{savings?.accountId||'Active'}</strong></div><div><span>Founding badge</span><strong>Unlocked</strong></div></div></section></div><section className="dashboard-panel" id="notifications"><div className="panel-heading"><div><small>NOTIFICATION CENTER</small><h2>Latest messages</h2></div></div><div className="notice-list">{portal.notifications.length?portal.notifications.map(n=><div className="notice-item" key={n.id}><strong>{n.title}</strong><span>{n.message}</span></div>):<p>No notifications yet.</p>}</div></section></main></div></div>;
}

function NotFoundPage(){return <PageShell><section className="page-hero"><div className="container narrow"><span className="eyebrow">404</span><h1>That page does not exist.</h1><NavLink className="button button-dark" to="/">Return home</NavLink></div></section></PageShell>}
function App(){return <AuthProvider><Routes><Route path="/" element={<HomePage/>}/><Route path="/about" element={<AboutPage/>}/><Route path="/services" element={<ServicesPage/>}/><Route path="/academy" element={<AcademyPage/>}/><Route path="/rules" element={<RulesPage/>}/><Route path="/privacy" element={<PrivacyPage/>}/><Route path="/terms" element={<TermsPage/>}/><Route path="/signin" element={<AuthLayout mode="signin"/>}/><Route path="/register" element={<AuthLayout mode="register"/>}/><Route path="/dashboard" element={<ProtectedRoute><DashboardPage/></ProtectedRoute>}/><Route path="*" element={<NotFoundPage/>}/></Routes></AuthProvider>}

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
