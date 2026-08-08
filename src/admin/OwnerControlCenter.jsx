import React, { useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  Award,
  Banknote,
  Building2,
  CalendarDays,
  Cog,
  Database,
  Landmark,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  createAchievement,
  createInstitutionEvent,
  createPropertyIncident,
  distributePayroll,
  ECONOMIC_CLIMATES,
  loadOwnerCenter,
  PROPERTY_INCIDENT_TYPES,
  PROPERTY_SEVERITIES,
  recordOwnerOverride,
  updateEconomy,
  updateSystemControls,
  verifyRecord,
} from './adminService.js';
import '../styles.css';
import './phase14.css';

const config = {
  apiKey: 'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',
  authDomain: 'afg-game.firebaseapp.com',
  projectId: 'afg-game',
  storageBucket: 'afg-game.firebasestorage.app',
  messagingSenderId: '779966850290',
  appId: '1:779966850290:web:24f48af23a2e6cae2d9c6b',
};
const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const label = (value) => String(value || '').split('-').map((item) => item ? item[0].toUpperCase() + item.slice(1) : '').join(' ');
const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const go = (path) => `${base}${path}`;

export default function OwnerControlCenter() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verify, setVerify] = useState('');
  const [system, setSystem] = useState({ registrationEnabled: true, maintenanceMode: false, publicVerificationEnabled: true, institutionNewsEnabled: true });
  const [economy, setEconomy] = useState({ climate: 'stable-growth', baseInterestRate: 5, inflationRate: 2, propertyModifier: 1, investmentModifier: 1, businessModifier: 1, loanAvailability: 'normal', businessBasePrice: 500, propertyBasePrice: 5000, insuranceSetupFee: 100, insurancePremiumRate: 0.02 });
  const [event, setEvent] = useState({ title: '', description: '', eventType: 'institution', status: 'scheduled', startsAt: '', endsAt: '', modifierType: 'none', modifierValue: 0 });
  const [incident, setIncident] = useState({ propertyDocId: '', title: '', incidentType: 'fire', severity: 'moderate', description: '', valueLossPercent: 10, conditionAfter: 'damaged', claimEligible: true });
  const [achievement, setAchievement] = useState({ name: '', description: '', category: 'customer', points: 100, badge: 'award' });
  const [override, setOverride] = useState({ targetCollection: '', targetId: '', field: '', previousValue: '', newValue: '', reason: '' });
  const [payroll, setPayroll] = useState({ mode: 'one', target: '', amount: '', description: 'AFG payroll payment' });

  async function refresh(uid = user?.uid) {
    if (!uid) return;
    const next = await loadOwnerCenter(db, uid);
    setData(next);
    setSystem((current) => ({ ...current, ...next.settings }));
    setEconomy((current) => ({ ...current, ...next.economy }));
  }

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    if (!next) {
      location.href = go('/signin');
      return;
    }
    setUser(next);
    try { await refresh(next.uid); } catch (cause) { setError(cause.message); }
  }), []);

  const verification = useMemo(() => data ? verifyRecord(data, verify) : [], [data, verify]);

  async function act(fn, clear, message = 'Saved successfully.') {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await fn();
      if (clear) clear();
      setSuccess(typeof message === 'function' ? message(result) : message);
      await refresh();
      return result;
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user || !data) return <main className="admin-loading"><Landmark/><strong>Apex Financial Group</strong><span>Loading Owner Control Center…</span></main>;
  if (!data.allowed) return <main className="admin-loading"><ShieldCheck/><strong>Founder and Owner access required</strong><a href={go('/')}>Return home</a></main>;

  const metrics = [
    ['Customers', data.users.length, Users],
    ['Staff', data.staffProfiles.length, ShieldCheck],
    ['Applications', data.applications.length, Database],
    ['Active loans', data.loans.filter((item) => item.status === 'active').length, Activity],
    ['Businesses', data.businesses.length, Building2],
    ['Property incidents', data.propertyIncidents.length, AlertTriangle],
  ];

  const tabs = [
    ['overview', 'Overview', Activity],
    ['payroll', 'Payroll', Banknote],
    ['controls', 'System Controls', SlidersHorizontal],
    ['economy', 'Economy & Pricing', Landmark],
    ['property-incidents', 'Property Incidents', AlertTriangle],
    ['events', 'Institution Events', CalendarDays],
    ['achievements', 'Achievements', Award],
    ['verification', 'Verification', Search],
    ['overrides', 'Overrides', ShieldCheck],
  ];

  return <div className="admin-shell">
    <aside>
      <a href={go('/')} className="admin-brand"><Landmark/> AFG</a>
      {tabs.map(([id, name, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon/>{name}</button>)}
      <a href={go('/account-management')}><Cog/> Account Management</a>
      <a href={go('/staff-management')}><Users/> Staff Management</a>
      <a href={go('/staff')}><Users/> Staff Workspace</a>
      <a href={go('/departments')}><Building2/> Departments</a>
      <button onClick={() => signOut(auth).then(() => location.href = go('/'))}><LogOut/> Sign out</button>
    </aside>

    <main>
      <header>
        <div><small>AFG EXECUTIVE ADMINISTRATION</small><h1>Owner Control Center</h1><p>Institution-wide authority, pricing, incidents, payroll, oversight, and verification.</p></div>
        <button onClick={() => refresh()}><RefreshCw/> Refresh</button>
      </header>
      {error && <div className="admin-alert">{error}</div>}
      {success && <div className="banking-success">{success}</div>}

      {tab === 'overview' && <>
        <section className="admin-metrics">{metrics.map(([name, value, Icon]) => <article key={name}><Icon/><span><small>{name}</small><strong>{value}</strong></span></article>)}</section>
        <section className="admin-grid"><article><h2>Institution status</h2><p><b>Registration:</b> {system.registrationEnabled ? 'Open' : 'Closed'}</p><p><b>Maintenance:</b> {system.maintenanceMode ? 'Enabled' : 'Disabled'}</p><p><b>Economic climate:</b> {label(economy.climate)}</p><p><b>Business setup:</b> {money(economy.businessBasePrice)}</p><p><b>Property base price:</b> {money(economy.propertyBasePrice)}</p></article><article><h2>Direct systems</h2><div className="admin-links">{[['Customer Portal', '/dashboard'], ['Account Management', '/account-management'], ['Staff Management', '/staff-management'], ['Lending', '/lending'], ['Loans', '/loans'], ['Academy', '/academy-center'], ['Economy', '/economy-center'], ['Departments', '/departments']].map((item) => <a href={go(item[1])} key={item[0]}>{item[0]}</a>)}</div></article></section>
      </>}

      {tab === 'payroll' && <section className="admin-card"><h2>Customer payroll</h2><p>Credit one customer or every active customer with the same fictional payment amount.</p><label>Who should be paid?<select value={payroll.mode} onChange={(e) => setPayroll({ ...payroll, mode: e.target.value })}><option value="one">One customer</option><option value="all">All active customers</option></select></label>{payroll.mode === 'one' && <label>Customer ID, username, or exact display name<input value={payroll.target} onChange={(e) => setPayroll({ ...payroll, target: e.target.value })} placeholder="CUS-XXXXXX or username"/></label>}<label>Amount per person<input type="number" min="0.01" max="100000" step="0.01" value={payroll.amount} onChange={(e) => setPayroll({ ...payroll, amount: e.target.value })}/></label><label>Payment description<input value={payroll.description} onChange={(e) => setPayroll({ ...payroll, description: e.target.value })}/></label><div className="admin-summary"><b>Estimated distribution:</b> {payroll.mode === 'all' ? `${data.users.filter((item) => item.accountStatus === 'active').length} active customer(s)` : payroll.target || 'No customer selected'} · {money(payroll.amount || 0)} each</div><button disabled={busy || !payroll.amount || (payroll.mode === 'one' && !payroll.target.trim())} onClick={() => act(async () => distributePayroll(db, user.uid, data, payroll), null, (result) => `Payroll ${result.runId} paid ${result.count} customer(s), totaling ${money(result.total)}.`)}>Distribute payroll</button></section>}

      {tab === 'controls' && <section className="admin-card"><h2>System controls</h2>{['registrationEnabled', 'maintenanceMode', 'publicVerificationEnabled', 'institutionNewsEnabled'].map((key) => <label className="toggle" key={key}><input type="checkbox" checked={Boolean(system[key])} onChange={(e) => setSystem({ ...system, [key]: e.target.checked })}/><span>{label(key)}</span></label>)}<button disabled={busy} onClick={() => act(() => updateSystemControls(db, user.uid, system), null, 'System controls updated.')}>Save controls</button></section>}

      {tab === 'economy' && <section className="admin-card"><h2>Economy & setup pricing</h2><p>These values control what customers must actually pay from an AFG account to create economy assets.</p><label>Climate<select value={economy.climate} onChange={(e) => setEconomy({ ...economy, climate: e.target.value })}>{ECONOMIC_CLIMATES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>{['baseInterestRate', 'inflationRate', 'propertyModifier', 'investmentModifier', 'businessModifier'].map((key) => <label key={key}>{label(key)}<input type="number" step="0.1" value={economy[key]} onChange={(e) => setEconomy({ ...economy, [key]: e.target.value })}/></label>)}<div className="admin-pricing-grid"><label>Business setup base price<input type="number" min="0" step="1" value={economy.businessBasePrice} onChange={(e) => setEconomy({ ...economy, businessBasePrice: e.target.value })}/></label><label>Property base price<input type="number" min="1" step="1" value={economy.propertyBasePrice} onChange={(e) => setEconomy({ ...economy, propertyBasePrice: e.target.value })}/></label><label>Insurance setup fee<input type="number" min="0" step="1" value={economy.insuranceSetupFee} onChange={(e) => setEconomy({ ...economy, insuranceSetupFee: e.target.value })}/></label><label>Insurance premium rate<input type="number" min="0" max="1" step="0.001" value={economy.insurancePremiumRate} onChange={(e) => setEconomy({ ...economy, insurancePremiumRate: e.target.value })}/><small>Example: 0.02 = 2% of coverage for the initial premium.</small></label></div><label>Loan availability<select value={economy.loanAvailability} onChange={(e) => setEconomy({ ...economy, loanAvailability: e.target.value })}><option>expanded</option><option>normal</option><option>restricted</option></select></label><button disabled={busy} onClick={() => act(() => updateEconomy(db, user.uid, economy), null, 'Economy pricing published. New purchases will use these prices.')}>Publish economy settings</button></section>}

      {tab === 'property-incidents' && <section className="admin-card property-incident-console"><h2>Property incident & disaster console</h2><p>Select a specific customer-owned property and create a fictional incident. The event can change condition, reduce value, notify the owner, and become available as evidence for an insurance claim.</p><label>Affected property<select value={incident.propertyDocId} onChange={(e) => setIncident({ ...incident, propertyDocId: e.target.value })}><option value="">Choose a property</option>{data.properties.map((property) => <option value={property.id} key={property.id}>{property.propertyId} · {property.name} · {money(property.currentValue)} · {property.customerId}</option>)}</select></label><div className="admin-pricing-grid"><label>Incident type<select value={incident.incidentType} onChange={(e) => setIncident({ ...incident, incidentType: e.target.value })}>{PROPERTY_INCIDENT_TYPES.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label><label>Severity<select value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}>{PROPERTY_SEVERITIES.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label><label>Resulting condition<select value={incident.conditionAfter} onChange={(e) => setIncident({ ...incident, conditionAfter: e.target.value })}><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option><option value="critical">Critical</option><option value="destroyed">Destroyed</option></select></label><label>Property value loss %<input type="number" min="0" max="100" step="1" value={incident.valueLossPercent} onChange={(e) => setIncident({ ...incident, valueLossPercent: e.target.value })}/></label></div><label>Event title (optional)<input value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} placeholder="Example: Severe storm damage"/></label><label>Incident description<textarea value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} placeholder="Describe what happened to the property."/></label><label className="toggle"><input type="checkbox" checked={incident.claimEligible} onChange={(e) => setIncident({ ...incident, claimEligible: e.target.checked })}/><span>Allow this incident to support an insurance claim</span></label><button disabled={busy || !incident.propertyDocId} onClick={() => act(() => createPropertyIncident(db, user.uid, incident), () => setIncident({ propertyDocId: '', title: '', incidentType: 'fire', severity: 'moderate', description: '', valueLossPercent: 10, conditionAfter: 'damaged', claimEligible: true }), 'Property incident created, property updated, and owner notified.')}>Create property incident</button><div className="record-list incident-history">{data.propertyIncidents.slice().reverse().slice(0, 30).map((item) => <article key={item.id}><b>{item.eventId} · {item.propertyName}</b><span>{label(item.incidentType)} · {label(item.severity)} · {item.valueLossPercent || 0}% value loss · {money(item.resultingPropertyValue)}</span></article>)}</div></section>}

      {tab === 'events' && <section className="admin-card"><h2>Create institution event</h2>{['title', 'description', 'eventType', 'startsAt', 'endsAt', 'modifierType', 'modifierValue'].map((key) => <label key={key}>{label(key)}{key === 'description' ? <textarea value={event[key]} onChange={(e) => setEvent({ ...event, [key]: e.target.value })}/> : <input type={key.includes('At') ? 'datetime-local' : key === 'modifierValue' ? 'number' : 'text'} value={event[key]} onChange={(e) => setEvent({ ...event, [key]: e.target.value })}/>}</label>)}<button disabled={busy} onClick={() => act(() => createInstitutionEvent(db, user.uid, event), () => setEvent({ ...event, title: '', description: '' }), 'Institution event created.')}>Create event</button></section>}

      {tab === 'achievements' && <section className="admin-card"><h2>Achievement builder</h2>{['name', 'description', 'category', 'points', 'badge'].map((key) => <label key={key}>{label(key)}<input type={key === 'points' ? 'number' : 'text'} value={achievement[key]} onChange={(e) => setAchievement({ ...achievement, [key]: e.target.value })}/></label>)}<button disabled={busy} onClick={() => act(() => createAchievement(db, user.uid, achievement), () => setAchievement({ ...achievement, name: '', description: '' }), 'Achievement created.')}>Create achievement</button></section>}

      {tab === 'verification' && <section className="admin-card"><h2>Institution verification</h2><label>Customer, Staff, or Business ID<input value={verify} onChange={(e) => setVerify(e.target.value)} placeholder="CUS-, STF-, or BUS-"/></label><div className="record-list">{verification.map((item, index) => <article key={index}><b>{item.type}: {item.name || 'Unnamed record'}</b><span>{item.id} · {label(item.status)}</span></article>)}</div></section>}

      {tab === 'overrides' && <section className="admin-card"><h2>Global override ledger</h2>{Object.keys(override).map((key) => <label key={key}>{label(key)}{key === 'reason' ? <textarea value={override[key]} onChange={(e) => setOverride({ ...override, [key]: e.target.value })}/> : <input value={override[key]} onChange={(e) => setOverride({ ...override, [key]: e.target.value })}/>}</label>)}<button disabled={busy} onClick={() => act(() => recordOwnerOverride(db, user.uid, override), () => setOverride({ targetCollection: '', targetId: '', field: '', previousValue: '', newValue: '', reason: '' }), 'Override recorded.')}>Record override</button></section>}
    </main>
  </div>;
}
