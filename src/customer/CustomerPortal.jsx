import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  ArrowDownToLine,
  ArrowRightLeft,
  BadgeCheck,
  Banknote,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { loadCustomerPortal } from './customerService.js';
import { depositFictionalIncome, loadBankingData, transferBetweenAccounts } from '../banking/bankingService.js';

const money = (value, symbol = '$') => `${symbol}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = value => value?.toDate ? value.toDate().toLocaleString() : 'Pending timestamp';

function PortalBrand() {
  return <NavLink to="/" className="brand"><span className="brand-mark"><Landmark size={20}/></span><span className="brand-copy"><strong>AFG</strong></span></NavLink>;
}

function ActionModal({ type, accounts, onClose, onComplete }) {
  const [form, setForm] = useState({ from: accounts[0]?.id || '', to: accounts[1]?.id || '', account: accounts[0]?.id || '', amount: '', source: '', description: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const transfer = type === 'transfer';
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await onComplete(form); onClose(); } catch (err) { setError(err.message || 'The banking action could not be completed.'); } finally { setBusy(false); }
  }
  return <div className="banking-modal-backdrop" role="presentation"><section className="banking-modal" role="dialog" aria-modal="true" aria-labelledby="banking-modal-title"><header><div><span className="eyebrow">PHASE 3 BANKING</span><h2 id="banking-modal-title">{transfer ? 'Transfer between accounts' : 'Record fictional income'}</h2><p>{transfer ? 'Move fictional funds between accounts you own.' : 'Add approved simulation income to one of your accounts.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X/></button></header>{error && <div className="form-alert" role="alert">{error}</div>}<form className="banking-form" onSubmit={submit}>{transfer ? <><label>From account<select name="from" value={form.from} onChange={update}>{accounts.map(a => <option key={a.id} value={a.id}>{a.productName} — {money(a.availableBalance,a.currencySymbol)}</option>)}</select></label><label>To account<select name="to" value={form.to} onChange={update}>{accounts.map(a => <option key={a.id} value={a.id}>{a.productName}</option>)}</select></label></> : <><label>Deposit account<select name="account" value={form.account} onChange={update}>{accounts.map(a => <option key={a.id} value={a.id}>{a.productName}</option>)}</select></label><label>Fictional income source<input name="source" value={form.source} onChange={update} maxLength="60" required placeholder="Example: Community job paycheck"/></label></>}<label>Amount<input name="amount" type="number" min="0.01" max={transfer ? undefined : '100000'} step="0.01" value={form.amount} onChange={update} required/></label><label>Description<textarea name="description" value={form.description} onChange={update} maxLength="160" placeholder="Optional memo"/></label><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'Processing…' : transfer ? 'Complete transfer' : 'Record income'}</button></div></form></section></div>;
}

export default function CustomerPortal({ auth, db, user }) {
  const navigate = useNavigate();
  const [portal, setPortal] = useState(null);
  const [banking, setBanking] = useState({ accounts: [], transactions: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState(null);

  async function refresh() {
    if (!user) return;
    const [portalData, bankingData] = await Promise.all([loadCustomerPortal(db, user.uid), loadBankingData(db, user.uid)]);
    setPortal(portalData); setBanking(bankingData); setSelectedAccount(current => current || bankingData.accounts[0]?.id || null);
  }
  useEffect(() => { refresh().catch(err => setError(err.message)); }, [user]);
  async function logout() { await signOut(auth); navigate('/'); }
  async function completeAction(form) {
    setSuccess('');
    if (modal === 'transfer') await transferBetweenAccounts(db, user.uid, portal.user.customerId, form.from, form.to, form.amount, form.description);
    else await depositFictionalIncome(db, user.uid, portal.user.customerId, form.account, form.amount, form.source, form.description);
    await refresh(); setSuccess(modal === 'transfer' ? 'Transfer completed successfully.' : 'Fictional income recorded successfully.');
  }

  const filteredTransactions = useMemo(() => banking.transactions.filter(item => {
    const haystack = `${item.description || ''} ${item.source || ''} ${item.transactionId || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (typeFilter === 'all' || item.type === typeFilter);
  }), [banking.transactions, search, typeFilter]);

  if (!portal && !error) return <div className="loading-screen"><Landmark/><strong>Apex Financial Group</strong><span>Loading customer banking…</span></div>;
  if (error) return <div className="loading-screen"><strong>Customer portal unavailable</strong><span>{error}</span><button className="button button-dark" onClick={() => window.location.reload()}>Try again</button></div>;
  if (!portal?.user) return <div className="loading-screen"><strong>Customer identity missing</strong><span>Contact the Owner for account recovery.</span><button className="button button-dark" onClick={logout}>Sign out</button></div>;

  const total = banking.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const checking = banking.accounts.find(account => account.type === 'checking');
  const savings = banking.accounts.find(account => account.type === 'savings');
  const symbol = checking?.currencySymbol || '$';
  const chosen = banking.accounts.find(account => account.id === selectedAccount);

  return <div className="portal-shell">{modal && <ActionModal type={modal} accounts={banking.accounts} onClose={() => setModal(null)} onComplete={completeAction}/>}<aside className={`portal-sidebar ${menuOpen ? 'is-open' : ''}`}><PortalBrand/><nav><button className={activeTab==='overview'?'active':''} onClick={() => setActiveTab('overview')}><LayoutDashboard/> Overview</button><span className="portal-group">BANKING</span><button className={activeTab==='accounts'?'active':''} onClick={() => setActiveTab('accounts')}><WalletCards/> Accounts</button><button className={activeTab==='transactions'?'active':''} onClick={() => setActiveTab('transactions')}><Banknote/> Transactions</button><span className="portal-group">CUSTOMER</span><button className={activeTab==='identity'?'active':''} onClick={() => setActiveTab('identity')}><BadgeCheck/> Identity</button><button className={activeTab==='notifications'?'active':''} onClick={() => setActiveTab('notifications')}><Bell/> Notifications</button><NavLink to="/academy"><BookOpen/> Academy</NavLink><NavLink to="/rules"><Scale/> Rules</NavLink></nav><div className="sidebar-footer"><small>Core banking release</small><strong>Phase 3</strong></div></aside><div className="portal-main"><header className="portal-header"><button className="icon-button portal-menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button><div><small>CUSTOMER PORTAL</small><strong>{portal.user.displayName}</strong></div><button className="button button-ghost" onClick={logout}><LogOut size={17}/> Sign out</button></header><main className="portal-content">{success && <div className="banking-success"><CheckCircle2 size={17}/> {success}</div>}<section className="portal-welcome"><div><span className="eyebrow">APEX PERSONAL BANKING</span><h1>{activeTab === 'overview' ? 'Your financial headquarters.' : activeTab[0].toUpperCase()+activeTab.slice(1)}</h1><p>Manage fictional accounts, move funds, record simulation income, and review every transaction.</p></div><span className="phase-chip"><Sparkles size={15}/> PHASE 3 LIVE</span></section><div className="phase3-tabs"><button className={activeTab==='overview'?'active':''} onClick={() => setActiveTab('overview')}>Overview</button><button className={activeTab==='accounts'?'active':''} onClick={() => setActiveTab('accounts')}>Accounts</button><button className={activeTab==='transactions'?'active':''} onClick={() => setActiveTab('transactions')}>Transactions</button></div>

{activeTab==='overview' && <><div className="dashboard-metrics"><article><small>Total balance</small><strong>{money(total,symbol)}</strong><span>Across {banking.accounts.length} active accounts</span></article><article><small>Available checking</small><strong>{money(checking?.availableBalance,symbol)}</strong><span>Everyday spending</span></article><article><small>Growth savings</small><strong>{money(savings?.balance,symbol)}</strong><span>Protected savings balance</span></article><article><small>Trust Score</small><strong>{portal.credit?.trustScore ?? '—'}</strong><span>{portal.credit?.tier || 'Not rated'}</span></article></div><div className="banking-actions"><button className="action-card" onClick={() => setModal('transfer')}><ArrowRightLeft/><span><strong>Transfer funds</strong><span>Move money between your own AFG accounts.</span></span></button><button className="action-card" onClick={() => setModal('income')}><ArrowDownToLine/><span><strong>Record fictional income</strong><span>Add approved roleplay earnings to an account.</span></span></button><button className="action-card" onClick={() => { setActiveTab('transactions'); setSuccess(''); }}><Search/><span><strong>Review activity</strong><span>Search and filter your complete transaction history.</span></span></button></div><div className="banking-summary"><section className="dashboard-panel"><div className="panel-heading"><div><small>ACTIVE ACCOUNTS</small><h2>Your accounts</h2></div><button className="button button-ghost" onClick={() => setActiveTab('accounts')}>View details</button></div><div className="account-list">{banking.accounts.map(account => <button className="account-row" key={account.id} onClick={() => {setSelectedAccount(account.id);setActiveTab('accounts')}}><span><strong>{account.productName}</strong><small>{account.accountId}</small></span><strong>{money(account.balance,account.currencySymbol)}</strong></button>)}</div></section><section className="dashboard-panel"><div className="panel-heading"><div><small>RECENT ACTIVITY</small><h2>Latest transactions</h2></div><button className="icon-button" onClick={() => refresh()} aria-label="Refresh"><RefreshCw/></button></div><div className="notice-list">{banking.transactions.slice(0,5).map(item => <div className="notice-item" key={item.id}><strong>{item.description}</strong><span>{money(item.amount,symbol)} · {dateText(item.createdAt)}</span></div>)}</div></section></div></>}

{activeTab==='accounts' && <><div className="bank-account-grid">{banking.accounts.map(account => <article className="bank-account-card" key={account.id}><header><div><small>{account.accountId}</small><h3>{account.productName}</h3></div><span className="account-type-badge">{account.type}</span></header><div className="bank-account-balance">{money(account.balance,account.currencySymbol)}</div><small>Available: {money(account.availableBalance,account.currencySymbol)}</small><footer><span className="status-badge"><CheckCircle2 size={15}/> {account.status}</span><button className="button button-ghost" onClick={() => setSelectedAccount(account.id)}>Details</button></footer></article>)}</div>{chosen && <section className="account-detail-panel"><span className="eyebrow">ACCOUNT DETAILS</span><h2>{chosen.productName}</h2><dl><div><dt>Account ID</dt><dd>{chosen.accountId}</dd></div><div><dt>Account type</dt><dd>{chosen.type}</dd></div><div><dt>Current balance</dt><dd>{money(chosen.balance,chosen.currencySymbol)}</dd></div><div><dt>Available balance</dt><dd>{money(chosen.availableBalance,chosen.currencySymbol)}</dd></div><div><dt>Status</dt><dd>{chosen.status}</dd></div></dl></section>}</>}

{activeTab==='transactions' && <section className="dashboard-panel"><div className="transaction-toolbar"><div><small>TRANSACTION HISTORY</small><h2>All account activity</h2></div><div className="transaction-filters"><label><span className="sr-only">Search transactions</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description or ID"/></label><label><span className="sr-only">Filter type</span><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">All types</option><option value="opening_deposit">Opening deposit</option><option value="fictional_income">Fictional income</option><option value="internal_transfer">Internal transfer</option></select></label></div></div><div className="transaction-list">{filteredTransactions.length ? filteredTransactions.map(item => <article className={`transaction-row ${item.direction==='credit'?'credit':item.direction==='transfer'?'transfer':''}`} key={item.id}><span className="transaction-icon">{item.direction==='transfer'?<ArrowRightLeft/>:<CircleDollarSign/>}</span><span className="transaction-copy"><strong>{item.description}</strong><small>{item.transactionId || item.id} · {dateText(item.createdAt)}</small></span><span className="transaction-amount"><strong>{item.direction==='credit'?'+':''}{money(item.amount,symbol)}</strong><small>{item.status}</small></span></article>) : <div className="empty-banking">No transactions match the selected filters.</div>}</div></section>}

{activeTab==='identity' && <><div className="customer-id-card"><div><small>PERMANENT CUSTOMER ID</small><strong>{portal.user.customerId}</strong><p>@{portal.user.username} · {portal.user.discordUsername}</p></div><span className="status-badge"><CheckCircle2/> Active customer</span></div><section className="dashboard-panel"><div className="identity-table"><div><span>Classification</span><strong>Customer</strong></div><div><span>Home branch</span><strong>{portal.profile?.homeBranchId || 'capital'}</strong></div><div><span>Profile completion</span><strong>{portal.profile?.profileCompletion ?? 35}%</strong></div><div><span>Academy level</span><strong>{portal.academy?.level ?? 1}</strong></div></div></section></>}

{activeTab==='notifications' && <section className="dashboard-panel"><div className="panel-heading"><div><small>NOTIFICATION CENTER</small><h2>Latest messages</h2></div></div><div className="notice-list">{portal.notifications.length ? portal.notifications.map(n => <div className="notice-item" key={n.id}><strong>{n.title}</strong><span>{n.message}</span></div>) : <p>No notifications yet.</p>}</div></section>}</main></div></div>;
}
