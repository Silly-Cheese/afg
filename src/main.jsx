import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import './styles.css';

const firebaseConfig = {
  apiKey: 'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',
  authDomain: 'afg-game.firebaseapp.com',
  projectId: 'afg-game',
  storageBucket: 'afg-game.firebasestorage.app',
  messagingSenderId: '779966850290',
  appId: '1:779966850290:web:24f48af23a2e6cae2d9c6b',
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
  }), []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const primaryNav = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/services', 'Services'],
  ['/academy', 'Academy'],
  ['/rules', 'Rules'],
];

function Brand({ compact = false }) {
  return (
    <NavLink to="/" className="brand" aria-label="Apex Financial Group home">
      <span className="brand-mark"><Landmark size={compact ? 20 : 24} /></span>
      <span className="brand-copy">
        <strong>{compact ? 'AFG' : 'Apex Financial Group'}</strong>
        {!compact && <small>Building Tomorrow's Success.</small>}
      </span>
    </NavLink>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <button className="icon-button menu-button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
        <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
          <div className="nav-links">
            {primaryNav.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
            ))}
          </div>
          <div className="nav-actions">
            {user ? (
              <NavLink className="button button-dark" to="/dashboard"><LayoutDashboard size={17} /> Dashboard</NavLink>
            ) : (
              <>
                <NavLink className="button button-ghost" to="/signin"><LogIn size={17} /> Sign in</NavLink>
                <NavLink className="button button-gold" to="/register"><UserPlus size={17} /> Create account</NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand compact />
          <p>A fictional financial institution and economy simulation built for entertainment, education, and Discord community roleplay.</p>
        </div>
        <div>
          <h3>Institution</h3>
          <NavLink to="/about">About AFG</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/academy">Financial Academy</NavLink>
        </div>
        <div>
          <h3>Safety</h3>
          <NavLink to="/rules">Rules</NavLink>
          <NavLink to="/privacy">Privacy & safety</NavLink>
          <NavLink to="/terms">Simulation terms</NavLink>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© 2026 Apex Financial Group.</p>
        <p><strong>Fictional simulation:</strong> No real money, banking, lending, credit, insurance, or investment services are offered.</p>
      </div>
    </footer>
  );
}

function PageShell({ children }) {
  return <><Header /><main>{children}</main><Footer /></>;
}

function Hero() {
  return (
    <section className="hero-section">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> A financial world built for your community</span>
          <h1>Build your financial future inside a living institution.</h1>
          <p>Apex Financial Group combines fictional banking, lending, business ownership, staff careers, education, branches, and an evolving economy in one polished roleplay platform.</p>
          <div className="hero-actions">
            <NavLink className="button button-gold button-large" to="/register">Create your account <ArrowRight size={18} /></NavLink>
            <NavLink className="button button-light button-large" to="/services">Explore the institution</NavLink>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> Fictional information only</span>
            <span><BadgeCheck size={17} /> Customer-first registration</span>
            <span><LockKeyhole size={17} /> Protected access</span>
          </div>
        </div>
        <div className="hero-panel" aria-label="Apex Financial Group platform preview">
          <div className="panel-topline">
            <span>INSTITUTION OVERVIEW</span>
            <span className="live-pill">FOUNDATION LIVE</span>
          </div>
          <div className="balance-card">
            <span>Future customer dashboard</span>
            <strong>$24,850.00</strong>
            <small>Illustrative fictional balance</small>
          </div>
          <div className="metric-grid">
            <div><small>Trust Score</small><strong>720</strong><span>Excellent</span></div>
            <div><small>Open Applications</small><strong>2</strong><span>In review</span></div>
            <div><small>Academy Level</small><strong>4</strong><span>1,850 XP</span></div>
            <div><small>Branch Standing</small><strong>#1</strong><span>Capital Branch</span></div>
          </div>
          <div className="preview-list">
            <div><span className="preview-icon"><Banknote /></span><span><strong>Banking simulation</strong><small>Accounts, transactions, payments, and progression</small></span><ChevronRight /></div>
            <div><span className="preview-icon"><BriefcaseBusiness /></span><span><strong>Institution careers</strong><small>Applications, departments, ranks, and branches</small></span><ChevronRight /></div>
            <div><span className="preview-icon"><BookOpen /></span><span><strong>Financial Academy</strong><small>Courses, certifications, and staff training</small></span><ChevronRight /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

const serviceCards = [
  { icon: WalletCards, title: 'Personal Banking', body: 'Manage fictional checking, savings, transfers, transactions, balances, and financial goals.' },
  { icon: CircleDollarSign, title: 'Lending & Credit', body: 'Submit applications, build a Financial Trust Score, accept terms, and manage repayment.' },
  { icon: Building2, title: 'Business Economy', body: 'Register businesses, manage commercial accounts, seek financing, and build institutional reputation.' },
  { icon: BriefcaseBusiness, title: 'Staff Careers', body: 'Apply for staff, complete training, join departments, earn promotions, and lead branches.' },
  { icon: BookOpen, title: 'Financial Academy', body: 'Complete customer education and required staff certifications directly within the platform.' },
  { icon: TrendingUp, title: 'Evolving Economy', body: 'Participate in events, branch competitions, achievements, and changing fictional economic conditions.' },
];

function HomePage() {
  return (
    <PageShell>
      <Hero />
      <section className="section section-white">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">ONE CONNECTED PLATFORM</span>
            <h2>More than a loan database.</h2>
            <p>Every system is designed to connect customers, staff, branches, departments, and leadership into one institution.</p>
          </div>
          <div className="card-grid three-columns">
            {serviceCards.map(({ icon: Icon, title, body }) => (
              <article className="feature-card" key={title}>
                <span className="feature-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-dark">
        <div className="container split-section">
          <div>
            <span className="eyebrow eyebrow-dark">THE AFG DIFFERENCE</span>
            <h2>Built like an institution. Played like a game.</h2>
            <p>Customers begin with accessible financial tools, then progress into businesses, assets, academy achievements, staff careers, and leadership opportunities.</p>
          </div>
          <div className="check-list">
            {['Open customer registration', 'Department-specific staff workspaces', 'Branch and career progression', 'Owner-controlled administration', 'No document uploads or real financial data'].map((item) => (
              <div key={item}><CheckCircle2 /> <span>{item}</span></div>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-platinum">
        <div className="container cta-panel">
          <div>
            <span className="eyebrow">FOUNDING ACCESS</span>
            <h2>Join Apex Financial Group from the beginning.</h2>
            <p>Create an account now. Every user begins as a customer, and staff access is awarded through the institution.</p>
          </div>
          <NavLink className="button button-dark button-large" to="/register">Begin registration <ArrowRight size={18} /></NavLink>
        </div>
      </section>
    </PageShell>
  );
}

function InfoPage({ eyebrow, title, description, children }) {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="container narrow">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="section section-white"><div className="container narrow rich-content">{children}</div></section>
    </PageShell>
  );
}

function AboutPage() {
  return <InfoPage eyebrow="ABOUT THE INSTITUTION" title="A fictional economy with real structure." description="Apex Financial Group is being designed as a community platform where financial simulation, professional roleplay, education, and institutional management work together.">
    <h2>Our purpose</h2><p>AFG gives Discord community members a shared environment where they can create fictional customer identities, participate in banking and lending systems, build businesses, complete courses, and pursue staff careers.</p>
    <div className="info-callout"><ShieldCheck /><div><strong>Simulation only</strong><p>AFG does not provide real financial services. Real addresses, income, account details, identification numbers, or financial documents must never be submitted.</p></div></div>
    <h2>How the institution is organized</h2><p>Rank determines authority, department determines responsibility, branch determines assignment, permissions determine access, and performance determines advancement.</p>
  </InfoPage>;
}

function ServicesPage() {
  return <InfoPage eyebrow="SERVICES" title="An entire institution under one roof." description="Phase 1 introduces the platform. Future phases activate each major financial, career, educational, and management system.">
    <div className="card-grid two-columns">
      {serviceCards.map(({ icon: Icon, title, body }) => <article className="feature-card" key={title}><span className="feature-icon"><Icon /></span><h3>{title}</h3><p>{body}</p><span className="coming-soon">Planned module</span></article>)}
    </div>
  </InfoPage>;
}

function AcademyPage() {
  return <InfoPage eyebrow="AFG FINANCIAL ACADEMY" title="Learn, certify, and advance." description="The Academy will support both customer education and staff career development.">
    <div className="card-grid two-columns">
      <article className="feature-card"><span className="feature-icon"><Users /></span><h3>Customer Academy</h3><p>Courses covering budgeting, saving, credit, responsible borrowing, investment basics, business finance, and fraud awareness.</p></article>
      <article className="feature-card"><span className="feature-icon"><BriefcaseBusiness /></span><h3>Staff Academy</h3><p>Required orientation, privacy, conduct, department training, certification, monthly training, and leadership development.</p></article>
    </div>
    <div className="info-callout"><Sparkles /><div><strong>Integrated progression</strong><p>Course completion will later unlock achievements, customer benefits, staff eligibility, and promotion pathways.</p></div></div>
  </InfoPage>;
}

function RulesPage() {
  return <InfoPage eyebrow="COMMUNITY RULES" title="Keep the simulation safe and fair." description="These foundation rules apply to every customer, applicant, staff member, manager, and executive.">
    <ol className="rule-list">
      <li><strong>Use fictional information only.</strong><span>Never submit real banking details, income, addresses, identification numbers, passwords, or private documents.</span></li>
      <li><strong>Keep all activity inside the simulation.</strong><span>No AFG balance, loan, investment, insurance policy, or asset represents real value.</span></li>
      <li><strong>Respect account boundaries.</strong><span>Do not attempt to access another user’s private information or privileged staff tools.</span></li>
      <li><strong>Do not exploit the economy.</strong><span>Abuse, duplicate-account manipulation, unauthorized adjustments, and intentional system exploitation are prohibited.</span></li>
      <li><strong>Staff actions are accountable.</strong><span>Privileged actions will be logged, reviewed, and subject to institutional oversight.</span></li>
      <li><strong>Owner authority is final.</strong><span>The Founder and Owner may override institutional workflows, with overrides recorded in the audit system.</span></li>
    </ol>
  </InfoPage>;
}

function PrivacyPage() {
  return <InfoPage eyebrow="PRIVACY & SAFETY" title="Designed to avoid sensitive financial data." description="Apex Financial Group will not support document uploads, real financial records, or real identity verification.">
    <h2>Information permitted</h2><p>Usernames, display names, Discord usernames, fictional profile fields, platform activity, and simulation records.</p>
    <h2>Information prohibited</h2><p>Real account numbers, card numbers, Social Security numbers, government identification, real income records, real addresses, real employer records, or uploaded documents.</p>
    <h2>Authentication</h2><p>Phase 1 uses Firebase Authentication. Users should create a password unique to AFG and should not reuse their Discord or email password.</p>
  </InfoPage>;
}

function TermsPage() {
  return <InfoPage eyebrow="SIMULATION TERMS" title="No real financial relationship is created." description="Using AFG means acknowledging that every financial product and balance is fictional.">
    <p>Apex Financial Group is a game and community-management platform. Registration does not create a bank account, credit relationship, investment account, insurance contract, employment relationship, or entitlement to real currency.</p>
    <p>Platform balances, awards, titles, staff appointments, and assets have no cash value and cannot be redeemed.</p>
  </InfoPage>;
}

function AuthLayout({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ displayName: '', username: '', discord: '', email: '', password: '', confirm: '', accepted: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (isRegister && form.password !== form.confirm) return setError('The passwords do not match.');
    if (isRegister && !form.accepted) return setError('You must accept the simulation rules.');
    setSubmitting(true);
    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        await updateProfile(credential.user, { displayName: form.displayName.trim() || form.username.trim() });
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      }
      navigate('/dashboard');
    } catch (authError) {
      const messages = {
        'auth/email-already-in-use': 'That email is already connected to an account.',
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/weak-password': 'Use a password containing at least six characters.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password sign-in must be enabled in Firebase Authentication.',
      };
      setError(messages[authError.code] || 'We could not complete that request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <Brand />
        <div className="auth-message">
          <span className="eyebrow eyebrow-dark">APEX FINANCIAL GROUP</span>
          <h1>{isRegister ? 'Your financial story starts here.' : 'Welcome back to the institution.'}</h1>
          <p>{isRegister ? 'Every new member begins as a customer. Staff access, departments, ranks, and branches are assigned through the institution.' : 'Sign in to access your protected AFG portal.'}</p>
          <div className="check-list compact">
            <div><CheckCircle2 /><span>Fictional financial simulation</span></div>
            <div><CheckCircle2 /><span>No document uploads</span></div>
            <div><CheckCircle2 /><span>Staff appointed by leadership</span></div>
          </div>
        </div>
        <small>Building Tomorrow's Success.</small>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <NavLink to="/" className="back-link">← Return to website</NavLink>
          <span className="eyebrow">{isRegister ? 'CREATE AN ACCOUNT' : 'SECURE SIGN IN'}</span>
          <h2>{isRegister ? 'Join Apex Financial Group' : 'Access your account'}</h2>
          <p className="form-intro">{isRegister ? 'Phase 1 creates your Firebase authentication account. Full customer IDs and profiles arrive in Phase 2.' : 'Enter the email and password connected to your account.'}</p>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <form onSubmit={submit} className="auth-form">
            {isRegister && <>
              <label>Display name<input name="displayName" value={form.displayName} onChange={updateField} required placeholder="How you should appear" /></label>
              <label>Preferred username<input name="username" value={form.username} onChange={updateField} required minLength="3" placeholder="Your AFG username" /></label>
              <label>Discord username<input name="discord" value={form.discord} onChange={updateField} required placeholder="Your Discord username" /></label>
            </>}
            <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} required autoComplete="email" placeholder="you@example.com" /></label>
            <label>Password<input name="password" type="password" value={form.password} onChange={updateField} required minLength="6" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="At least 6 characters" /></label>
            {isRegister && <>
              <label>Confirm password<input name="confirm" type="password" value={form.confirm} onChange={updateField} required minLength="6" autoComplete="new-password" placeholder="Enter the password again" /></label>
              <label className="checkbox-row"><input name="accepted" type="checkbox" checked={form.accepted} onChange={updateField} /><span>I agree to use fictional information only and accept the <NavLink to="/rules">community rules</NavLink> and <NavLink to="/terms">simulation terms</NavLink>.</span></label>
            </>}
            <button className="button button-dark button-large full-width" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : isRegister ? 'Create customer account' : 'Sign in'} <ArrowRight size={18} /></button>
          </form>
          <p className="auth-switch">{isRegister ? 'Already registered?' : 'New to AFG?'} <NavLink to={isRegister ? '/signin' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</NavLink></p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/signin" replace />;
}

function LoadingScreen() {
  return <div className="loading-screen"><Landmark /><strong>Apex Financial Group</strong><span>Loading secure portal…</span></div>;
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await signOut(auth);
    navigate('/');
  }

  return (
    <div className="portal-shell">
      <aside className={`portal-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Brand compact />
        <nav>
          <NavLink to="/dashboard" className="active"><LayoutDashboard /> Overview</NavLink>
          <span className="portal-group">Phase 1</span>
          <NavLink to="/services"><WalletCards /> Future services</NavLink>
          <NavLink to="/academy"><BookOpen /> Academy preview</NavLink>
          <NavLink to="/rules"><Scale /> Policies & rules</NavLink>
        </nav>
        <div className="sidebar-footer"><small>Foundation release</small><strong>Phase 1 of 14</strong></div>
      </aside>
      <div className="portal-main">
        <header className="portal-header">
          <button className="icon-button portal-menu" onClick={() => setMenuOpen((value) => !value)}><Menu /></button>
          <div><small>SECURE PORTAL</small><strong>{user?.displayName || 'AFG Customer'}</strong></div>
          <button className="button button-ghost" onClick={logout}><LogOut size={17} /> Sign out</button>
        </header>
        <main className="portal-content">
          <section className="portal-welcome">
            <div><span className="eyebrow">WELCOME TO AFG</span><h1>Your foundation account is active.</h1><p>Authentication is operational. Phase 2 will create your permanent customer identity, customer profile, starting accounts, and Owner Bootstrap system.</p></div>
            <span className="status-badge"><CheckCircle2 /> Authenticated</span>
          </section>
          <div className="dashboard-metrics">
            <article><small>Account status</small><strong>Active</strong><span>Firebase Authentication</span></article>
            <article><small>Platform release</small><strong>Phase 1</strong><span>Foundation</span></article>
            <article><small>Customer ID</small><strong>Pending</strong><span>Created in Phase 2</span></article>
            <article><small>Portal access</small><strong>Customer</strong><span>Default registration role</span></article>
          </div>
          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <div className="panel-heading"><div><small>PHASE 1 STATUS</small><h2>Foundation systems</h2></div><span className="status-badge neutral">Complete</span></div>
              <div className="milestone-list">
                {['Public website and navigation', 'Firebase project connection', 'Email/password authentication', 'Protected customer dashboard', 'Responsive black, white, platinum, and gold design', 'Public rules, privacy, terms, and disclaimer pages'].map((item) => <div key={item}><CheckCircle2 /><span>{item}</span></div>)}
              </div>
            </section>
            <section className="dashboard-panel next-panel">
              <small>NEXT DEVELOPMENT PHASE</small>
              <h2>Phase 2A: Owner Bootstrap</h2>
              <p>The next release installs the one-time institution setup wizard, protected Founder and Owner identity, default branches, departments, ranks, permissions, and system defaults.</p>
              <div className="next-label"><LockKeyhole /> Public registration will eventually depend on completed bootstrap.</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return <PageShell><section className="page-hero"><div className="container narrow"><span className="eyebrow">404</span><h1>That page does not exist.</h1><p>The requested AFG destination could not be located.</p><NavLink className="button button-dark" to="/">Return home</NavLink></div></section></PageShell>;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/academy" element={<AcademyPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/signin" element={<AuthLayout mode="signin" />} />
        <Route path="/register" element={<AuthLayout mode="register" />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
