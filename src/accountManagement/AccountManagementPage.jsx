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
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  Users,
  X,
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

const PERMISSION_GROUPS = [
  {
    label: 'Staff Core',
    permissions: [
      ['staff.portal.access', 'Access Staff Workspace'],
      ['tasks.view', 'View Assigned Tasks'],
      ['policies.view', 'View Internal Policies'],
      ['staff.manage', 'Manage Staff'],
    ],
  },
  {
    label: 'Applications & Lending',
    permissions: [
      ['applications.view', 'View Financial Applications'],
      ['applications.review', 'Review Financial Applications'],
      ['applications.claim', 'Claim Financial Applications'],
      ['applications.approve', 'Approve Financial Applications'],
      ['applications.deny', 'Deny Financial Applications'],
      ['loans.view', 'View Loans'],
      ['loans.modify', 'Modify / Service Loans'],
      ['collections.manage', 'Manage Collections'],
    ],
  },
  {
    label: 'Human Resources',
    permissions: [
      ['staff.applications.view', 'View Staff Applications'],
      ['staff.applications.review', 'Review Staff Applications'],
      ['staff.applications.decide', 'Decide Staff Applications'],
      ['hr.manage', 'Manage Human Resources'],
    ],
  },
  {
    label: 'Academy & Training',
    permissions: [
      ['academy.staff.view', 'Access Staff Academy'],
      ['training.manage', 'Manage Staff Training'],
      ['academy.manage', 'Manage Financial Academy'],
    ],
  },
  {
    label: 'Business & Economy',
    permissions: [
      ['business.manage', 'Manage Businesses'],
      ['property.manage', 'Manage Property'],
      ['investments.manage', 'Manage Investments'],
      ['insurance.manage', 'Manage Insurance'],
    ],
  },
  {
    label: 'Customer Support',
    permissions: [
      ['support.view', 'View Support Cases'],
      ['support.manage', 'Manage Support Cases'],
    ],
  },
  {
    label: 'Fraud & Investigations',
    permissions: [
      ['fraud.view', 'View Fraud Records'],
      ['investigations.manage', 'Manage Investigations'],
    ],
  },
  {
    label: 'Risk & Compliance',
    permissions: [
      ['compliance.view', 'View Compliance Records'],
      ['compliance.manage', 'Manage Compliance Cases'],
    ],
  },
  {
    label: 'Internal Audit',
    permissions: [
      ['audit.view', 'View Audit Records'],
      ['audit.manage', 'Manage Internal Audit'],
    ],
  },
  {
    label: 'Technology & Systems',
    permissions: [
      ['technology.view', 'View Technology Records'],
      ['systems.manage', 'Manage Technology & Systems'],
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map(([key]) => key));
const PERMISSION_LABELS = Object.fromEntries(PERMISSION_GROUPS.flatMap((group) => group.permissions));

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
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionChoice, setPermissionChoice] = useState('');
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
      setSelectedPermissions([...(record.permissions?.permissions || [])].sort());
      setPermissionChoice('');
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
  const availablePermissions = useMemo(() => new Set(ALL_PERMISSIONS.filter((key) => !selectedPermissions.includes(key))), [selectedPermissions]);

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
      await saveAccountPermissions(db, user.uid, selected, selectedPermissions, permissionReason);
      setSuccess('Permission package updated and audited. Navigation access will reflect the new permissions after the user refreshes.');
      setPermissionReason('');
      await openAccount(selected.uid);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  function addPermission() {
    if (!permissionChoice || selectedPermissions.includes(permissionChoice)) return;
    setSelectedPermissions((current) => [...current, permissionChoice].sort());
    setPermissionChoice('');
  }

  function removePermission(permission) {
    setSelectedPermissions((current) => current.filter((item) => item !== permission));
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
                <div className="am-permission-picker">
                  <label>
                    Add permission
                    <select value={permissionChoice} onChange={(e) => setPermissionChoice(e.target.value)}>
                      <option value="">Choose a permission…</option>
                      {PERMISSION_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>
                        {group.permissions.map(([key, name]) => <option key={key} value={key} disabled={!availablePermissions.has(key)}>{name}</option>)}
                      </optgroup>)}
                    </select>
                  </label>
                  <button type="button" className="am-add-permission" disabled={!permissionChoice} onClick={addPermission}><Plus/> Add</button>
                </div>

                <div className="am-permission-actions">
                  <button type="button" onClick={() => setSelectedPermissions([...ALL_PERMISSIONS])}><CheckCircle2/> Grant all permissions</button>
                  <button type="button" onClick={() => setSelectedPermissions([])}><Trash2/> Clear all</button>
                </div>

                <div className="am-selected-permissions">
                  <div className="am-permission-summary"><strong>Selected permissions</strong><span>{selectedPermissions.length} of {ALL_PERMISSIONS.length}</span></div>
                  {selectedPermissions.length ? <div className="am-permission-chips">
                    {selectedPermissions.map((permission) => <span key={permission} className="am-permission-chip">
                      <span><strong>{PERMISSION_LABELS[permission] || permission}</strong><small>{permission}</small></span>
                      <button type="button" aria-label={`Remove ${permission}`} onClick={() => removePermission(permission)}><X/></button>
                    </span>)}
                  </div> : <p>No staff permissions assigned. The account will retain customer-only access unless its rank grants separate management authority.</p>}
                </div>

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
