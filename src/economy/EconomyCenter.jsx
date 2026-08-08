import React, { useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  ArrowLeft,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  Landmark,
  LineChart,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import {
  acquireProperty,
  addBusinessActivity,
  collectClaimPayout,
  createInsurancePolicy,
  decideClaim,
  eligibleInsuranceAssets,
  INSURANCE_PRODUCTS,
  INVESTMENT_PRODUCTS,
  loadEconomy,
  policyCost,
  PROPERTY_TYPES,
  purchaseInvestment,
  registerBusiness,
  submitClaim,
} from './economyService.js';
import '../styles.css';
import './phase13.css';

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
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const label = (value) => String(value || '').split('-').map((item) => item ? item[0].toUpperCase() + item.slice(1) : '').join(' ');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const go = (path) => `${base}${path}`;

export default function EconomyCenter() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});

  async function refresh(uid = user?.uid) {
    if (uid) setData(await loadEconomy(db, uid));
  }

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    if (!next) {
      location.href = go('/signin');
      return;
    }
    setUser(next);
    try {
      await refresh(next.uid);
    } catch (cause) {
      setError(cause.message);
    }
  }), []);

  async function act(fn, message) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await fn();
      setSuccess(typeof message === 'function' ? message(result) : message || 'Saved successfully.');
      setForm({});
      await refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  const netWorth = useMemo(() => {
    if (!data) return 0;
    return data.accounts.reduce((total, item) => total + Number(item.balance || 0), 0)
      + data.businesses.reduce((total, item) => total + Number(item.cashReserves || 0), 0)
      + data.properties.reduce((total, item) => total + Number(item.currentValue || 0), 0)
      + data.investments.reduce((total, item) => total + Number(item.currentValue || 0), 0);
  }, [data]);

  if (!data) return <main className="economy-loading"><Landmark/><strong>Apex Financial Group</strong><span>Loading economy center…</span></main>;

  const nav = [['overview', 'Overview'], ['businesses', 'Businesses'], ['properties', 'Properties'], ['investments', 'Investments'], ['insurance', 'Insurance']];
  const activeAccounts = data.accounts.filter((item) => item.status === 'active');
  const assets = eligibleInsuranceAssets(data, form.productType);
  const insuranceCost = policyCost(data.economySettings, form.coverage || 0);
  const paidClaimIds = new Set(data.payoutOperations.map((item) => item.claimDocId));
  const linkedPolicy = (claim) => data.policies.find((item) => item.id === claim.policyDocId) || data.managedPolicies.find((item) => item.id === claim.policyDocId);

  return <div className="economy-shell">
    <aside>
      <a href={go('/')} className="economy-brand"><Landmark/> AFG</a>
      <a href={go('/dashboard')}><ArrowLeft/> Customer Portal</a>
      {nav.map(([id, name]) => <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>{name}</button>)}
      <button onClick={() => signOut(auth).then(() => location.href = go('/'))}><LogOut/> Sign out</button>
    </aside>

    <main>
      <header>
        <div><small>AFG CUSTOMER ECONOMY</small><h1>{nav.find((item) => item[0] === tab)?.[1]}</h1><p>Build businesses, purchase property, invest, insure owned assets, and handle fictional claims.</p></div>
        <button onClick={() => refresh()}><RefreshCw/> Refresh</button>
      </header>
      {error && <div className="economy-alert">{error}</div>}
      {success && <div className="economy-success">{success}</div>}

      {tab === 'overview' && <>
        <section className="economy-metrics">
          <article><WalletCards/><span><small>Estimated net worth</small><strong>{money(netWorth)}</strong></span></article>
          <article><BriefcaseBusiness/><span><small>Businesses</small><strong>{data.businesses.length}</strong></span></article>
          <article><Building2/><span><small>Properties</small><strong>{data.properties.length}</strong></span></article>
          <article><LineChart/><span><small>Investments</small><strong>{money(data.investments.reduce((total, item) => total + Number(item.currentValue || 0), 0))}</strong></span></article>
        </section>
        <section className="economy-panel">
          <h2>Current economy pricing</h2>
          <div className="portfolio-grid">
            <span>Business setup <b>{money(data.economySettings.businessBasePrice)}</b></span>
            <span>Property base price <b>{money(data.economySettings.propertyBasePrice)}</b></span>
            <span>Insurance setup fee <b>{money(data.economySettings.insuranceSetupFee)}</b></span>
            <span>Insurance premium rate <b>{(Number(data.economySettings.insurancePremiumRate) * 100).toFixed(2)}%</b></span>
          </div>
        </section>
      </>}

      {tab === 'businesses' && <div className="economy-layout">
        <section className="economy-panel">
          <h2>Owned businesses</h2>
          {data.businesses.map((business) => <article className="record" key={business.id}>
            <div><strong>{business.name}</strong><small>{business.businessId} · {label(business.level)} · {label(business.industry)}</small></div>
            <p>{business.description}</p>
            <div className="record-metrics"><span>Reserves <b>{money(business.cashReserves)}</b></span><span>Revenue <b>{money(business.revenue)}</b></span><span>Expenses <b>{money(business.expenses)}</b></span><span>Setup paid <b>{money(business.setupFee)}</b></span></div>
            <div className="inline-form"><input placeholder="Amount" type="number" onChange={(event) => setForm({ ...form, activityAmount: event.target.value })}/><input placeholder="Memo" onChange={(event) => setForm({ ...form, activityMemo: event.target.value })}/><button disabled={busy} onClick={() => act(() => addBusinessActivity(db, user.uid, business, 'revenue', form.activityAmount, form.activityMemo || ''), 'Business revenue recorded.')}>Revenue</button><button disabled={busy} onClick={() => act(() => addBusinessActivity(db, user.uid, business, 'expense', form.activityAmount, form.activityMemo || ''), 'Business expense recorded.')}>Expense</button></div>
          </article>)}
          {!data.businesses.length && <p>No registered businesses.</p>}
        </section>
        <section className="economy-form">
          <h2>Register business</h2>
          <div className="price-banner">Base setup fee: <b>{money(data.economySettings.businessBasePrice)}</b> plus the starting capital you choose.</div>
          <input placeholder="Business name" onChange={(event) => setForm({ ...form, name: event.target.value })}/>
          <input placeholder="Industry" onChange={(event) => setForm({ ...form, industry: event.target.value })}/>
          <textarea placeholder="Business description" onChange={(event) => setForm({ ...form, description: event.target.value })}/>
          <input type="number" min="0" max="100000" placeholder="Starting fictional capital" onChange={(event) => setForm({ ...form, startingCapital: event.target.value })}/>
          <select value={form.accountId || ''} onChange={(event) => setForm({ ...form, accountId: event.target.value })}><option value="">Funding account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.productName || account.name || label(account.type)} · {money(account.availableBalance)}</option>)}</select>
          <div className="checkout-total">Total due now <b>{money(Number(data.economySettings.businessBasePrice) + Number(form.startingCapital || 0))}</b></div>
          <button disabled={busy} onClick={() => act(() => registerBusiness(db, data.user, form, data.economySettings), 'Business registered and setup cost paid.')}><Plus/> Pay & register business</button>
        </section>
      </div>}

      {tab === 'properties' && <div className="economy-layout">
        <section className="economy-panel">
          <h2>Owned properties</h2>
          {data.properties.map((property) => {
            const policy = data.policies.find((item) => item.insuredAssetType === 'property' && item.insuredAssetDocId === property.id && item.status === 'active');
            const propertyIncidents = data.incidents.filter((item) => item.propertyDocId === property.id);
            return <article className="record" key={property.id}>
              <strong>{property.name}</strong><small>{property.propertyId} · {label(property.propertyType)}</small>
              <div className="record-metrics"><span>Current value <b>{money(property.currentValue)}</b></span><span>Purchase price <b>{money(property.purchasePrice)}</b></span><span>Condition <b>{label(property.condition)}</b></span><span>Insurance <b>{policy ? policy.policyId : 'Not insured'}</b></span></div>
              {propertyIncidents.length > 0 && <div className="incident-list"><b>Property incidents</b>{propertyIncidents.map((incident) => <span key={incident.id}>{incident.eventId} · {label(incident.incidentType)} · {label(incident.severity)} · {incident.valueLossPercent || 0}% value loss</span>)}</div>}
            </article>;
          })}
          {!data.properties.length && <p>No owned properties.</p>}
        </section>
        <section className="economy-form">
          <h2>Purchase property</h2>
          <div className="price-banner">Current base property price: <b>{money(data.economySettings.propertyBasePrice)}</b></div>
          <input placeholder="Property name" onChange={(event) => setForm({ ...form, name: event.target.value })}/>
          <select value={form.propertyType || ''} onChange={(event) => setForm({ ...form, propertyType: event.target.value })}><option value="">Property type</option>{PROPERTY_TYPES.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select>
          <input type="number" placeholder="Monthly rental income" onChange={(event) => setForm({ ...form, rentalIncome: event.target.value })}/>
          <select value={form.accountId || ''} onChange={(event) => setForm({ ...form, accountId: event.target.value })}><option value="">Funding account</option>{activeAccounts.map((account) => <option value={account.id} key={account.id}>{account.productName || account.name || label(account.type)} · {money(account.availableBalance)}</option>)}</select>
          <div className="checkout-total">Total due now <b>{money(data.economySettings.propertyBasePrice)}</b></div>
          <button disabled={busy} onClick={() => act(() => acquireProperty(db, data.user, form, data.economySettings), 'Property purchased and recorded.')}><Plus/> Pay & purchase property</button>
        </section>
      </div>}

      {tab === 'investments' && <div className="economy-layout">
        <section className="economy-panel"><h2>Investment portfolio</h2>{data.investments.map((item) => <article className="record" key={item.id}><strong>{item.productName}</strong><small>{item.investmentId} · {label(item.risk)} risk</small><div className="record-metrics"><span>Principal <b>{money(item.principal)}</b></span><span>Current value <b>{money(item.currentValue)}</b></span><span>Return <b>{money(item.totalReturn)}</b></span><span>Status <b>{label(item.status)}</b></span></div></article>)}</section>
        <section className="economy-form"><h2>Purchase investment</h2><select onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Investment product</option>{INVESTMENT_PRODUCTS.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.risk}</option>)}</select><select onChange={(event) => setForm({ ...form, accountId: event.target.value })}><option value="">Funding account</option>{activeAccounts.map((account) => <option value={account.id} key={account.id}>{account.productName || account.name || label(account.type)} · {money(account.availableBalance)}</option>)}</select><input type="number" placeholder="Investment amount" onChange={(event) => setForm({ ...form, amount: event.target.value })}/><button disabled={busy} onClick={() => act(() => purchaseInvestment(db, data.user, form), 'Investment purchased.')}><LineChart/> Invest</button></section>
      </div>}

      {tab === 'insurance' && <>
        <div className="economy-layout">
          <section className="economy-panel">
            <h2>Your policies & claims</h2>
            {data.policies.map((policy) => {
              const eligibleIncidents = data.incidents.filter((item) => policy.insuredAssetType === 'property' && item.propertyDocId === policy.insuredAssetDocId);
              return <article className="record" key={policy.id}>
                <strong>{policy.productName}</strong><small>{policy.policyId} · {policy.insuredAssetName} · {label(policy.status)}</small>
                <div className="record-metrics"><span>Coverage <b>{money(policy.coverageLimit)}</b></span><span>Initial premium <b>{money(policy.premium)}</b></span><span>Setup fee <b>{money(policy.setupFee)}</b></span><span>Deductible <b>{money(policy.deductible)}</b></span></div>
                <div className="claim-form">
                  {eligibleIncidents.length > 0 && <select value={form.incidentEventDocId || ''} onChange={(event) => setForm({ ...form, incidentEventDocId: event.target.value })}><option value="">Link property incident (optional)</option>{eligibleIncidents.map((incident) => <option value={incident.id} key={incident.id}>{incident.eventId} · {label(incident.incidentType)} · {label(incident.severity)}</option>)}</select>}
                  <input placeholder="Incident type" value={form.incidentType || ''} onChange={(event) => setForm({ ...form, incidentType: event.target.value })}/>
                  <input type="number" placeholder="Requested amount" value={form.claimAmount || ''} onChange={(event) => setForm({ ...form, claimAmount: event.target.value })}/>
                  <textarea placeholder="Detailed fictional incident description" value={form.claimDescription || ''} onChange={(event) => setForm({ ...form, claimDescription: event.target.value })}/>
                  <button disabled={busy} onClick={() => act(() => submitClaim(db, data.user, { policyDocId: policy.id, incidentEventDocId: form.incidentEventDocId || null, incidentType: form.incidentType || '', amount: form.claimAmount, description: form.claimDescription || '' }), 'Claim submitted for officer review.')}>Submit claim</button>
                </div>
              </article>;
            })}

            {data.claims.map((claim) => {
              const policy = linkedPolicy(claim);
              const paid = paidClaimIds.has(claim.id);
              return <article className="record claim" key={claim.id}>
                <strong>Claim {claim.claimId}</strong><small>{paid ? 'Paid' : label(claim.status)} · {claim.insuredAssetName || claim.insuredAssetId} · Requested {money(claim.requestedAmount)}</small>
                <p>{claim.description}</p>
                {claim.decision && <div className="decision-box"><b>{label(claim.decision.outcome)}</b><span>Approved: {money(claim.decision.approvedAmount)} · Deductible: {money(policy?.deductible)}</span><span>{claim.decision.reason}</span></div>}
                {claim.status === 'approved' && !paid && <div className="payout-box"><select value={form.payoutAccountId || ''} onChange={(event) => setForm({ ...form, payoutAccountId: event.target.value })}><option value="">Payout account</option>{activeAccounts.map((account) => <option value={account.id} key={account.id}>{account.productName || account.name || label(account.type)} · {money(account.availableBalance)}</option>)}</select><button disabled={busy} onClick={() => act(() => collectClaimPayout(db, data.user, claim, policy, form.payoutAccountId), (amount) => `Insurance payout of ${money(amount)} deposited.`)}><BadgeDollarSign/> Collect approved payout</button></div>}
              </article>;
            })}
            {!data.policies.length && <p>No active policies yet.</p>}
          </section>

          <section className="economy-form">
            <h2>Insure an owned asset</h2>
            <div className="price-banner">Setup fee: <b>{money(data.economySettings.insuranceSetupFee)}</b> · Premium rate: <b>{(Number(data.economySettings.insurancePremiumRate) * 100).toFixed(2)}%</b> of coverage.</div>
            <select value={form.productType || ''} onChange={(event) => setForm({ ...form, productType: event.target.value, assetId: '' })}><option value="">Policy type</option>{INSURANCE_PRODUCTS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <select value={form.assetId || ''} disabled={!form.productType || assets.length === 0} onChange={(event) => setForm({ ...form, assetId: event.target.value })}><option value="">{assets.length ? 'Choose owned asset' : 'No eligible owned assets'}</option>{assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.name} · {asset.permanentId}</option>)}</select>
            <input type="number" min="1" placeholder="Coverage limit" value={form.coverage || ''} onChange={(event) => setForm({ ...form, coverage: event.target.value })}/>
            <input type="number" min="0" placeholder="Deductible" value={form.deductible || ''} onChange={(event) => setForm({ ...form, deductible: event.target.value })}/>
            <select value={form.accountId || ''} onChange={(event) => setForm({ ...form, accountId: event.target.value })}><option value="">Funding account</option>{activeAccounts.map((account) => <option value={account.id} key={account.id}>{account.productName || account.name || label(account.type)} · {money(account.availableBalance)}</option>)}</select>
            <div className="checkout-total"><span>Setup {money(insuranceCost.setupFee)} + first premium {money(insuranceCost.premium)}</span><b>Total {money(insuranceCost.total)}</b></div>
            <button disabled={busy || !form.assetId} onClick={() => act(() => createInsurancePolicy(db, data.user, form, data.economySettings, data), 'Insurance policy created and initial cost paid.')}><ShieldCheck/> Pay & create policy</button>
          </section>
        </div>

        {data.access.mayManage && <section className="economy-panel officer-queue">
          <div className="officer-title"><div><small>INSURANCE OPERATIONS</small><h2>Claim officer queue</h2></div><ShieldCheck/></div>
          {data.managedClaims.filter((claim) => !['approved', 'denied'].includes(claim.status)).map((claim) => <article className="record claim" key={claim.id}>
            <strong>{claim.claimId} · {claim.insuredAssetName || claim.insuredAssetId}</strong>
            <small>{claim.customerId} · {label(claim.insuredAssetType)} · Requested {money(claim.requestedAmount)}</small>
            <p>{claim.description}</p>
            {claim.incidentEventId && <p><b>Linked property incident:</b> {claim.incidentEventId}</p>}
            <div className="claim-review-form">
              <input placeholder="Decision reason" value={form[`reason-${claim.id}`] || ''} onChange={(event) => setForm({ ...form, [`reason-${claim.id}`]: event.target.value })}/>
              <input type="number" min="0" max={claim.requestedAmount} placeholder="Approved amount" value={form[`amount-${claim.id}`] || ''} onChange={(event) => setForm({ ...form, [`amount-${claim.id}`]: event.target.value })}/>
              <button disabled={busy} onClick={() => act(() => decideClaim(db, { uid: user.uid }, claim, { outcome: 'approved', approvedAmount: form[`amount-${claim.id}`], reason: form[`reason-${claim.id}`] || '', ownerOverride: data.access.isOwner }), 'Claim approved. The customer can now collect the authorized payout.')}>Approve</button>
              <button className="danger" disabled={busy} onClick={() => act(() => decideClaim(db, { uid: user.uid }, claim, { outcome: 'denied', approvedAmount: 0, reason: form[`reason-${claim.id}`] || '', ownerOverride: data.access.isOwner }), 'Claim denied and recorded.')}>Deny</button>
            </div>
          </article>)}
          {!data.managedClaims.some((claim) => !['approved', 'denied'].includes(claim.status)) && <p>No claims are awaiting a decision.</p>}
        </section>}
      </>}
    </main>
  </div>;
}
