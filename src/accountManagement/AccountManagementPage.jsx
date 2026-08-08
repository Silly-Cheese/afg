import React, { useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  BadgeDollarSign,
  CheckCircle2,
  KeyRound,
  Landmark,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCog,
  Users,
} from 'lucide-react';
import {
  adjustAccountBalance,
  getAccountManagementAccess,
  loadAccountRecord,
  loadAllAccounts,
  saveAccountManagementChanges,
  saveAccountPermissions,
  searchAccounts,
} from './accountManagementService.js';
import '../styles.css';
import './accountManagement.css';

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

const COMMON_PERMISSIONS = [
  'staff.portal.access',
  'tasks.view',
  'policies.view',
  'academy.staff.view',
  'applications.view',
  'applications.review',
  'applications.claim',
  'applications.approve',
  'applications.deny',
  'loans.view',
  'loans.modify',
  'collections.manage',
  'staff.applications.view',
  'staff.applications.review',
  'staff.applications.decide',
  'staff.manage',
  'hr.manage',
  'training.manage',
  'academy.manage',
  'business.manage',
  'property.manage',
  'investments.manage',
  'insurance.manage',
  'support.view',
  'support.manage',
  'fraud.view',
  'investigations.manage',
  'compliance.view',
  'compliance.manage',
  'audit.view',
  'audit.manage',
  'technology.view',
  'systems.manage',
];

function defaultForm(record) {
  return {
    displayName: record?.user?.displayName || '',
    discordUsername: record?.user?.discordUsername || '',
    accountStatus: record?.user?.accountStatus || record?.customer?.accountStatus || 'active',
    trustScore: String(record?.credit?.trustScore ?? 600),
    reputation: String(record?.customer?.reputation ?? 50),
    classificationOverride: record?.customer?.classificationOverride || '',
    standingOverride: record?.customer?.standingOverride || '',
  };
}

export default function AccountManagementPage() {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [reason, setReason] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [balanceDrafts, setBalanceDrafts] = useState({});
  const [permissionText, setPermissionText] = useState('');
  const [permissionReason, setPermissionReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refreshDirectory() {
    const list = await loadAllAccounts(db);
    setAccounts(list);
    return list;
  }

  async function openAccount(uid) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const record = await loadAccountRecord(db, uid);
      setSelected(record);
      setForm(defaultForm(record));
      setBalanceDrafts(Object.fromEntries(record.accounts.map((account) => [account.id, String(account.balance ?? 0)])));
      setPermissionText((record.permissions?.permissions || []).join('\n'));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    if (!next) {
      location.href = '/signin';
      return;
    }
    setUser(next);
    try {
      const nextAccess = await getAccountManagementAccess(db, next.uid);
      setAccess(nextAccess);
      if (nextAccess.isOwner) await refreshDirectory();
    } catch (cause) {
      setError(cause.message);
    }
  }), []);

  const filtered = useMemo(() => searchAccounts(accounts, query), [accounts, query]);
  const currentPermissions = useMemo(
    () => permissionText.split('\n').map((item) => item.trim()).filter(Boolean),
    [permissionText],
  );

  async function saveAccount() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveAccountManagementChanges(db, user.uid, selected, form, reason);
      setSuccess('Account changes saved and audited.');
      setReason('');
      await refreshDirectory();
      await openAccount(selected.uid);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePermissions() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveAccountPermissions(db, user.uid, selected, currentPermissions, permissionReason);
      setSuccess('Permission package updated and audited. Navigation access will reflect the new permissions after the user refreshes.');
      setPermissionReason('');
      await openAccount(selected.uid);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  function togglePermission(permission) {
    const next = new Set(currentPermissions);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    setPermissionText([...next].sort().join('\n'));
  }

  async function saveBalance(account) {
    if (!selected) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adjustAccountBalance(db, user.uid, selected, account.id, balanceDrafts[account.id], balanceReason);
      setSuccess(`${account.productName || account.name || account.type} balance updated and audited.`);
      setBalanceReason('');
      await openAccount(selected.uid);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user || !access) {
    return <main className="am-loading"><Landmark/><strong>Apex Financial Group</strong><span>Loading account authority…</span></main>;
  }

  if (!access.isOwner) {
    return <main className="am-loading"><ShieldCheck/><strong>Owner access required</strong><span>Account Management is restricted to the Founder & Owner.</span><a href="/dashboard">Return to portal</a></main>;
  }

  const protectedOwner = selected?.uid === access.ownerUid;

  return <div className="am-shell">
    <aside className="am-sidebar">
      <a className="am-brand" href="/"><Landmark/> AFG</a>
      <a href="/owner-control"><ShieldCheck/> Owner Control</a>
      <a className="active" href="/account-management"><UserRoundCog/> Account Management</a>
      <a href="/staff-management"><Users/> Staff Management</a>
      <button onClick={() => signOut(auth).then(() => location.href = '/')}><LogOut/> Sign out</button>
    </aside>

    <main className="am-main">
      <header className="am-hero">
        <div><span>AFG EXECUTIVE ADMINISTRATION</span><h1>Account Management</h1><p>Search, restrict, edit, fund, and permission any AFG identity from one audited Owner console.</p></div>
        <button className="am-refresh" onClick={() => refreshDirectory()}><RefreshCw/> Refresh</button>
      </header>

      {error && <div className="form-alert">{error}</div>}
      {success && <div className="am-success"><CheckCircle2/> {success}</div>}

      <section className="am-layout">
        <article className="am-panel am-directory">
          <div className="am-panel-title"><div><small>DIRECTORY</small><h2>All accounts</h2></div><span>{accounts.length}</span></div>
          <label className="am-search"><Search/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer ID, Staff ID, username, Discord, name, or email"/></label>
          <div className="am-list">
            {filtered.map((account) => <button key={account.uid} className={selected?.uid === account.uid ? 'selected' : ''} onClick={() => openAccount(account.uid)}>
              <span><strong>{account.displayName || account.username || account.customerId}</strong><small>{account.customerId || 'No Customer ID'}{account.staffId ? ` · ${account.staffId}` : ''}</small></span>
              <span>{account.accountStatus || 'active'}</span>
            </button>)}
            {!filtered.length && <p>No matching accounts.</p>}
          </div>
        </article>

        <article className="am-panel am-workspace">
          {!selected ? <div className="am-empty"><UserRoundCog/><h2>Select an account</h2><p>Choose any customer or staff identity from the directory.</p></div> : <>
            <div className="am-identity">
              <div><small>{selected.user.customerId}</small><h2>{selected.user.displayName || selected.user.username}</h2><p>@{selected.user.username || 'unknown'} · {selected.user.discordUsername || 'No Discord username'}</p></div>
              <div className="am-badges"><span>{selected.staff ? selected.staff.rankName || 'Staff' : 'Customer'}</span><span>{form.accountStatus}</span>{protectedOwner && <span>PROTECTED OWNER</span>}</div>
            </div>

            <div className="am-grid">
              <label>Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}/></label>
              <label>Discord username<input value={form.discordUsername} onChange={(e) => setForm({ ...form, discordUsername: e.target.value })}/></label>
              <label>Account status<select value={form.accountStatus} disabled={protectedOwner} onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}><option value="active">Active</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></label>
              <label>Trust Score<input type="number" min="300" max="850" value={form.trustScore} onChange={(e) => setForm({ ...form, trustScore: e.target.value })}/></label>
              <label>Reputation<input type="number" min="0" max="100" value={form.reputation} onChange={(e) => setForm({ ...form, reputation: e.target.value })}/></label>
              <label>Classification override<select value={form.classificationOverride} onChange={(e) => setForm({ ...form, classificationOverride: e.target.value })}><option value="">Automatic</option><option>Customer</option><option>Premium Customer</option><option>Business Customer</option><option>Restricted Customer</option></select></label>
              <label>Standing override<select value={form.standingOverride} onChange={(e) => setForm({ ...form, standingOverride: e.target.value })}><option value="">Automatic</option><option>Developing</option><option>Fair</option><option>Good</option><option>Excellent</option><option>Exceptional</option><option>Restricted</option></select></label>
              <label>Staff identity<input readOnly value={selected.staff ? `${selected.staff.staffId || ''} · ${selected.staff.rankName || ''}` : 'Not staff'}/></label>
            </div>

            <label className="am-reason">Required audit reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this account is being changed."/></label>
            <button className="am-primary" disabled={busy} onClick={saveAccount}>Save account changes</button>

            <section className="am-bank-section am-permissions-section">
              <div className="am-panel-title"><div><small>AUTHORIZATION</small><h3>Permissions</h3></div><KeyRound/></div>
              {protectedOwner ? <p>The Founder & Owner permission package is protected and cannot be replaced.</p> : <>
                <div className="am-permission-grid">
                  {COMMON_PERMISSIONS.map((permission) => <label key={permission} className={currentPermissions.includes(permission) ? 'enabled' : ''}>
                    <input type="checkbox" checked={currentPermissions.includes(permission)} onChange={() => togglePermission(permission)}/>
                    <span>{permission}</span>
                  </label>)}
                </div>
                <label className="am-reason">Exact permission list<textarea value={permissionText} onChange={(e) => setPermissionText(e.target.value)} placeholder="One permission per line"/></label>
                <label className="am-reason">Permission change reason<textarea value={permissionReason} onChange={(e) => setPermissionReason(e.target.value)} placeholder="Explain why this permission package is changing."/></label>
                <button className="am-primary" disabled={busy} onClick={savePermissions}>Save permissions</button>
              </>}
            </section>

            <section className="am-bank-section">
              <div className="am-panel-title"><div><small>FICTIONAL BANKING</small><h3>Linked accounts</h3></div><BadgeDollarSign/></div>
              {selected.accounts.map((account) => <div className="am-bank-row" key={account.id}>
                <div><strong>{account.productName || account.name || account.type}</strong><small>{account.accountId || account.id} · {account.status || 'active'}</small></div>
                <input type="number" min="0" step="0.01" value={balanceDrafts[account.id] ?? ''} onChange={(e) => setBalanceDrafts({ ...balanceDrafts, [account.id]: e.target.value })}/>
                <button disabled={busy} onClick={() => saveBalance(account)}>Set balance</button>
              </div>)}
              {!selected.accounts.length && <p>No bank accounts are linked to this identity.</p>}
              <label className="am-reason">Balance override reason<textarea value={balanceReason} onChange={(e) => setBalanceReason(e.target.value)} placeholder="Required for any balance override."/></label>
            </section>
          </>}
        </article>
      </section>
    </main>
  </div>;
}
