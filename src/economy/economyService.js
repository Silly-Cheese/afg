import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

const docs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const code = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const BUSINESS_LEVELS = ['startup', 'developing', 'established', 'regional', 'national', 'institutional-partner'];
export const PROPERTY_TYPES = ['apartment', 'house', 'luxury-residence', 'farm', 'retail-store', 'office', 'warehouse', 'restaurant', 'hotel', 'factory', 'commercial-complex'];
export const POLICY_STATUSES = ['active', 'suspended', 'lapsed', 'expired', 'claim-restricted', 'cancelled'];
export const INVESTMENT_PRODUCTS = [
  ['afg-bond', 'AFG Institutional Bond', 'low'],
  ['savings-bond', 'Savings Bond', 'low'],
  ['index-fund', 'Apex Index Fund', 'moderate'],
  ['growth-fund', 'Apex Growth Fund', 'high'],
  ['property-fund', 'Property Fund', 'moderate'],
  ['business-fund', 'Business Enterprise Fund', 'high'],
].map(([id, name, risk]) => ({ id, name, risk }));

export const INSURANCE_PRODUCTS = [
  ['property', 'Property Coverage'],
  ['business', 'Business Coverage'],
  ['loan', 'Loan Protection'],
  ['income', 'Income Protection'],
  ['vehicle', 'Vehicle Coverage'],
].map(([id, name]) => ({ id, name }));

export const DEFAULT_ECONOMY_PRICING = {
  businessBasePrice: 500,
  propertyBasePrice: 5000,
  insuranceSetupFee: 100,
  insurancePremiumRate: 0.02,
};

function pricing(settings = {}) {
  return {
    businessBasePrice: Math.max(0, Number(settings.businessBasePrice ?? DEFAULT_ECONOMY_PRICING.businessBasePrice)),
    propertyBasePrice: Math.max(1, Number(settings.propertyBasePrice ?? DEFAULT_ECONOMY_PRICING.propertyBasePrice)),
    insuranceSetupFee: Math.max(0, Number(settings.insuranceSetupFee ?? DEFAULT_ECONOMY_PRICING.insuranceSetupFee)),
    insurancePremiumRate: Math.max(0, Number(settings.insurancePremiumRate ?? DEFAULT_ECONOMY_PRICING.insurancePremiumRate)),
  };
}

export function policyCost(settings, coverage) {
  const values = pricing(settings);
  const premium = Math.max(1, Math.round(Number(coverage || 0) * values.insurancePremiumRate * 100) / 100);
  return { setupFee: values.insuranceSetupFee, premium, total: values.insuranceSetupFee + premium };
}

export function eligibleInsuranceAssets(data, productType) {
  if (!data) return [];
  if (productType === 'property') return data.properties.map((item) => ({ id: item.id, permanentId: item.propertyId, name: item.name, type: 'property' }));
  if (productType === 'business') return data.businesses.map((item) => ({ id: item.id, permanentId: item.businessId, name: item.name, type: 'business' }));
  if (productType === 'loan') return data.loans.map((item) => ({ id: item.id, permanentId: item.loanId, name: item.productName || item.loanType || 'AFG Loan', type: 'loan' }));
  if (productType === 'income') return [{ id: data.user.uid, permanentId: data.user.customerId, name: data.user.displayName || data.user.username || 'Customer income', type: 'customer' }];
  return [];
}

export async function loadEconomy(db, uid) {
  const [userSnap, bootstrap, permissionSnap, settingsSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'system', 'bootstrap')),
    getDoc(doc(db, 'staffPermissions', uid)),
    getDoc(doc(db, 'economicSettings', 'current')),
  ]);
  if (!userSnap.exists()) throw new Error('Customer identity not found.');
  const isOwner = bootstrap.exists() && bootstrap.data().ownerUid === uid;
  const grants = permissionSnap.exists() ? permissionSnap.data().permissions || [] : [];
  const mayManage = isOwner || grants.some((item) => ['business.manage', 'property.manage', 'investments.manage', 'insurance.manage', 'owner.override_all'].includes(item));
  const mayInsurance = isOwner || grants.includes('insurance.manage') || grants.includes('owner.override_all');

  const [businesses, properties, investments, policies, claims, accounts, loans, incidents, operations] = await Promise.all([
    getDocs(query(collection(db, 'businesses'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'properties'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'investments'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'insurancePolicies'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'insuranceClaims'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'accounts'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'loans'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'institutionEvents'), where('propertyOwnerUid', '==', uid))),
    getDocs(query(collection(db, 'bankingOperations'), where('ownerUid', '==', uid))),
  ]);

  let managedClaims = [];
  let managedPolicies = [];
  if (mayInsurance) {
    try { managedClaims = docs(await getDocs(collection(db, 'insuranceClaims'))); } catch {}
    try { managedPolicies = docs(await getDocs(collection(db, 'insurancePolicies'))); } catch {}
  }

  const ownPolicies = docs(policies);
  return {
    user: { uid, ...userSnap.data() },
    businesses: docs(businesses),
    properties: docs(properties),
    investments: docs(investments),
    policies: ownPolicies.filter((item) => item.status !== 'cancelled'),
    policyHistory: ownPolicies,
    claims: docs(claims),
    accounts: docs(accounts),
    loans: docs(loans),
    incidents: docs(incidents).filter((item) => item.eventType === 'property-incident' && item.status !== 'cancelled'),
    operations: docs(operations),
    managedClaims,
    managedPolicies,
    economy: { ...DEFAULT_ECONOMY_PRICING, ...(settingsSnap.exists() ? settingsSnap.data() : {}) },
    access: { isOwner, mayManage, mayInsurance, permissions: grants },
  };
}

async function debitForEconomy(tx, db, user, accountId, amount, type, description, targetId) {
  const accountRef = doc(db, 'accounts', accountId);
  const accountSnap = await tx.get(accountRef);
  if (!accountSnap.exists() || accountSnap.data().ownerUid !== user.uid) throw new Error('Choose one of your AFG accounts.');
  const available = Number(accountSnap.data().availableBalance || 0);
  if (available < amount) throw new Error(`Insufficient available funds. This action costs ${amount.toLocaleString()} fictional currency.`);
  const operationId = code('ECO');
  tx.update(accountRef, {
    balance: Number(accountSnap.data().balance || 0) - amount,
    availableBalance: available - amount,
    lastOperationId: operationId,
    updatedAt: serverTimestamp(),
  });
  tx.set(doc(db, 'bankingOperations', operationId), {
    operationId,
    ownerUid: user.uid,
    customerId: user.customerId,
    accountId,
    targetId,
    type,
    amount,
    status: 'completed',
    immutable: true,
    createdAt: serverTimestamp(),
  });
  tx.set(doc(collection(db, 'transactions')), {
    transactionId: code('TXN'),
    operationId,
    ownerUid: user.uid,
    customerId: user.customerId,
    accountId,
    type,
    direction: 'debit',
    amount,
    description,
    status: 'completed',
    createdAt: serverTimestamp(),
  });
  return operationId;
}

export async function registerBusiness(db, user, data, settings = {}) {
  const capital = Number(data.startingCapital || 0);
  if (!data.name?.trim() || data.name.trim().length < 3 || !data.description?.trim() || data.description.trim().length < 20) throw new Error('Enter a business name and complete description.');
  if (capital < 0 || capital > 100000) throw new Error('Starting capital must be between 0 and 100,000 fictional currency.');
  if (!data.accountId) throw new Error('Choose a funding account.');
  const fee = pricing(settings).businessBasePrice;
  const total = fee + capital;
  const businessRef = doc(collection(db, 'businesses'));
  const businessId = code('BUS');
  await runTransaction(db, async (tx) => {
    await debitForEconomy(tx, db, user, data.accountId, total, 'business_setup', `Business setup: ${data.name.trim()}`, businessId);
    tx.set(businessRef, {
      businessId,
      ownerUid: user.uid,
      customerId: user.customerId,
      name: data.name.trim(),
      industry: String(data.industry || 'general').trim(),
      description: data.description.trim(),
      homeBranchId: data.homeBranchId || 'capital',
      ownershipType: data.ownershipType || 'sole-owner',
      level: 'startup',
      status: 'active',
      reputation: 500,
      revenue: 0,
      expenses: fee,
      cashReserves: capital,
      employeeCount: 0,
      setupFeePaid: fee,
      fundingAccountId: data.accountId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return businessId;
}

export async function addBusinessActivity(db, uid, business, kind, amount, memo) {
  const value = Number(amount);
  if (!value || value <= 0 || value > 100000) throw new Error('Enter a positive amount no greater than 100,000.');
  const ref = doc(db, 'businesses', business.id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().ownerUid !== uid) throw new Error('Business not found.');
    const current = snap.data();
    const revenue = Number(current.revenue || 0) + (kind === 'revenue' ? value : 0);
    const expenses = Number(current.expenses || 0) + (kind === 'expense' ? value : 0);
    const cashReserves = Number(current.cashReserves || 0) + (kind === 'revenue' ? value : -value);
    if (cashReserves < 0) throw new Error('Business reserves are insufficient.');
    tx.update(ref, { revenue, expenses, cashReserves, updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, 'businessTransactions')), {
      transactionId: code('BTX'), businessId: current.businessId, businessDocId: business.id, ownerUid: uid,
      type: kind, amount: value, memo: String(memo || '').trim(), immutable: true, createdAt: serverTimestamp(),
    });
  });
}

export async function acquireProperty(db, user, data, settings = {}) {
  if (!data.propertyType) throw new Error('Choose a property type.');
  if (!data.accountId) throw new Error('Choose a funding account.');
  const basePrice = pricing(settings).propertyBasePrice;
  const price = Number(data.purchasePrice || basePrice);
  if (!Number.isFinite(price) || price < basePrice || price > 100000000) throw new Error(`Property price must be at least the current base price of ${basePrice.toLocaleString()}.`);
  const propertyRef = doc(collection(db, 'properties'));
  const propertyId = code('PROP');
  await runTransaction(db, async (tx) => {
    await debitForEconomy(tx, db, user, data.accountId, price, 'property_purchase', `Property purchase: ${data.name || data.propertyType}`, propertyId);
    tx.set(propertyRef, {
      propertyId, ownerUid: user.uid, customerId: user.customerId, businessId: data.businessId || null,
      name: String(data.name || '').trim() || 'Unnamed Property', propertyType: data.propertyType, status: 'owned',
      purchasePrice: price, currentValue: price, mortgageLoanId: data.mortgageLoanId || null, condition: 'good',
      rentalIncome: Number(data.rentalIncome || 0), maintenanceCost: Number(data.maintenanceCost || 0), insured: false,
      fundingAccountId: data.accountId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  return propertyId;
}

export async function purchaseInvestment(db, user, data) {
  const amount = Number(data.amount);
  if (!amount || amount <= 0 || amount > 1000000) throw new Error('Enter an investment amount between 1 and 1,000,000.');
  const accountRef = doc(db, 'accounts', data.accountId);
  const investmentRef = doc(collection(db, 'investments'));
  const operationId = code('IOP');
  const product = INVESTMENT_PRODUCTS.find((item) => item.id === data.productId);
  if (!product) throw new Error('Select a valid investment product.');
  await runTransaction(db, async (tx) => {
    const account = await tx.get(accountRef);
    if (!account.exists() || account.data().ownerUid !== user.uid || Number(account.data().availableBalance || 0) < amount) throw new Error('Selected account has insufficient available funds.');
    tx.update(accountRef, { balance: Number(account.data().balance || 0) - amount, availableBalance: Number(account.data().availableBalance || 0) - amount, lastOperationId: operationId, updatedAt: serverTimestamp() });
    tx.set(investmentRef, { investmentId: code('INV'), ownerUid: user.uid, customerId: user.customerId, productId: product.id, productName: product.name, risk: product.risk, principal: amount, currentValue: amount, totalReturn: 0, status: 'active', purchasedFromAccountId: data.accountId, operationId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    tx.set(doc(db, 'investmentOperations', operationId), { operationId, investmentDocId: investmentRef.id, ownerUid: user.uid, customerId: user.customerId, accountId: data.accountId, type: 'investment-purchase', amount, status: 'completed', immutable: true, createdAt: serverTimestamp() });
    tx.set(doc(collection(db, 'transactions')), { transactionId: code('TXN'), operationId, ownerUid: user.uid, customerId: user.customerId, accountId: data.accountId, type: 'investment_purchase', direction: 'debit', amount, status: 'completed', description: `Purchased ${product.name}`, createdAt: serverTimestamp() });
  });
}

export async function createInsurancePolicy(db, user, data, economySettings = {}) {
  const coverage = Number(data.coverage);
  const deductible = Number(data.deductible || 0);
  if (!data.productType || !coverage || coverage <= 0) throw new Error('Choose a policy type and valid coverage amount.');
  if (!data.accountId) throw new Error('Choose a funding account.');
  if (!data.assetId || !data.assetType) throw new Error('Choose an eligible asset to insure.');
  const costs = policyCost(economySettings, coverage);
  const policyRef = doc(collection(db, 'insurancePolicies'));
  const policyId = code('POL');
  await runTransaction(db, async (tx) => {
    await debitForEconomy(tx, db, user, data.accountId, costs.total, 'insurance_policy_opening', `Insurance opening cost: ${policyId}`, policyId);
    tx.set(policyRef, {
      policyId, ownerUid: user.uid, customerId: user.customerId,
      productType: data.productType,
      productName: INSURANCE_PRODUCTS.find((item) => item.id === data.productType)?.name || data.productType,
      insuredAssetType: data.assetType,
      insuredAssetId: data.assetId,
      insuredAssetPermanentId: data.assetPermanentId || null,
      insuredAssetName: data.assetName || 'Insured asset',
      premium: costs.premium,
      setupFee: costs.setupFee,
      coverageLimit: coverage,
      deductible,
      status: 'active',
      lifecycleReason: 'Policy created and initial premium paid.',
      fundingAccountId: data.accountId,
      effectiveAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  if (data.productType === 'property') {
    try { await updateDoc(doc(db, 'properties', data.assetId), { insured: true, insurancePolicyId: policyId, updatedAt: serverTimestamp() }); } catch {}
  }
  return policyId;
}

export async function managePolicyLifecycle(db, actor, policy, status, reason) {
  if (!actor?.mayInsurance) throw new Error('Insurance officer permission is required.');
  if (!POLICY_STATUSES.includes(status)) throw new Error('Choose a valid policy status.');
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 10) throw new Error('Enter a lifecycle reason of at least 10 characters.');
  const ref = doc(db, 'insurancePolicies', policy.id);
  const auditRef = doc(collection(db, 'auditLogs'));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Policy no longer exists.');
    const current = snap.data();
    tx.update(ref, {
      status,
      lifecycleReason: cleanReason,
      lifecycleUpdatedBy: actor.uid,
      lifecycleUpdatedAt: serverTimestamp(),
      cancelledAt: status === 'cancelled' ? serverTimestamp() : current.cancelledAt || null,
      updatedAt: serverTimestamp(),
    });
    tx.set(auditRef, {
      auditId: auditRef.id, actorUid: actor.uid, actorType: actor.isOwner ? 'owner' : 'staff',
      action: `insurance.policy.${status}`, targetType: 'insurancePolicy', targetId: current.policyId,
      reason: cleanReason, immutable: true, createdAt: serverTimestamp(),
    });
  });
}

export async function submitClaim(db, user, data) {
  if (!data.description?.trim() || data.description.trim().length < 25) throw new Error('Provide a complete fictional claim description.');
  const policy = await getDoc(doc(db, 'insurancePolicies', data.policyDocId));
  if (!policy.exists() || policy.data().ownerUid !== user.uid) throw new Error('Policy not found.');
  if (policy.data().status !== 'active') throw new Error(`Claims cannot be submitted while this policy is ${policy.data().status}.`);
  const amount = Number(data.amount || 0);
  if (amount <= 0 || amount > Number(policy.data().coverageLimit || 0)) throw new Error('Claim amount must be positive and within the policy limit.');
  if (data.incidentEventId) {
    const incident = await getDoc(doc(db, 'institutionEvents', data.incidentEventId));
    if (!incident.exists() || incident.data().propertyOwnerUid !== user.uid || incident.data().status === 'cancelled') throw new Error('Selected property incident is unavailable.');
  }
  await addDoc(collection(db, 'insuranceClaims'), {
    claimId: code('CLM'), policyDocId: data.policyDocId, policyId: policy.data().policyId,
    ownerUid: user.uid, customerId: user.customerId, insuredAssetId: policy.data().insuredAssetId,
    insuredAssetName: policy.data().insuredAssetName || null, requestedAmount: amount,
    incidentType: String(data.incidentType || '').trim(), incidentEventId: data.incidentEventId || null,
    description: data.description.trim(), status: 'submitted', assignedReviewerUid: null, decision: null,
    payoutStatus: 'not-approved', uploadsAllowed: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function decideClaim(db, actor, claim, decision) {
  if (!actor?.mayInsurance) throw new Error('Insurance officer permission is required.');
  if (!decision.reason?.trim() || decision.reason.trim().length < 10) throw new Error('Enter a decision reason.');
  const outcome = decision.outcome;
  if (!['approved', 'denied'].includes(outcome)) throw new Error('Choose approve or deny.');
  const approvedAmount = outcome === 'approved' ? Number(decision.approvedAmount || 0) : 0;
  if (outcome === 'approved' && (approvedAmount <= 0 || approvedAmount > Number(claim.requestedAmount || 0))) throw new Error('Approved amount must be greater than zero and cannot exceed the requested amount.');
  await updateDoc(doc(db, 'insuranceClaims', claim.id), {
    status: outcome,
    assignedReviewerUid: actor.uid,
    decision: { outcome, approvedAmount, reason: decision.reason.trim(), decidedBy: actor.uid, ownerOverride: Boolean(actor.isOwner), decidedAt: new Date().toISOString() },
    payoutStatus: outcome === 'approved' ? 'available' : 'not-approved',
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'auditLogs'), { actorUid: actor.uid, actorType: actor.isOwner ? 'owner' : 'staff', action: 'insurance.claim.decided', targetType: 'insuranceClaim', targetId: claim.claimId, reason: decision.reason.trim(), immutable: true, createdAt: serverTimestamp() });
}

export async function collectClaimPayout(db, user, claim, accountId) {
  if (claim.ownerUid !== user.uid || claim.status !== 'approved' || claim.payoutStatus !== 'available') throw new Error('This claim does not have an available payout.');
  const claimRef = doc(db, 'insuranceClaims', claim.id);
  const policyRef = doc(db, 'insurancePolicies', claim.policyDocId);
  const accountRef = doc(db, 'accounts', accountId);
  const operationRef = doc(db, 'bankingOperations', `CLM-${claim.id}`);
  await runTransaction(db, async (tx) => {
    const [claimSnap, policySnap, accountSnap, operationSnap] = await Promise.all([tx.get(claimRef), tx.get(policyRef), tx.get(accountRef), tx.get(operationRef)]);
    if (!claimSnap.exists() || claimSnap.data().payoutStatus !== 'available') throw new Error('Payout is no longer available.');
    if (operationSnap.exists()) throw new Error('This claim has already been paid.');
    if (!accountSnap.exists() || accountSnap.data().ownerUid !== user.uid) throw new Error('Choose one of your AFG accounts.');
    const approved = Number(claimSnap.data().decision?.approvedAmount || 0);
    const deductible = Number(policySnap.exists() ? policySnap.data().deductible || 0 : 0);
    const payout = Math.max(0, approved - deductible);
    if (payout <= 0) throw new Error('The approved amount does not exceed the policy deductible.');
    tx.update(accountRef, { balance: Number(accountSnap.data().balance || 0) + payout, availableBalance: Number(accountSnap.data().availableBalance || 0) + payout, lastOperationId: operationRef.id, updatedAt: serverTimestamp() });
    tx.update(claimRef, { status: 'paid', payoutStatus: 'paid', payoutAmount: payout, payoutAccountId: accountId, paidAt: serverTimestamp(), updatedAt: serverTimestamp() });
    tx.set(operationRef, { operationId: operationRef.id, ownerUid: user.uid, customerId: user.customerId, accountId, claimId: claim.claimId, type: 'insurance_claim_payout', amount: payout, status: 'completed', immutable: true, createdAt: serverTimestamp() });
    tx.set(doc(collection(db, 'transactions')), { transactionId: code('TXN'), operationId: operationRef.id, ownerUid: user.uid, customerId: user.customerId, accountId, type: 'insurance_claim_payout', direction: 'credit', amount: payout, description: `Insurance payout for ${claim.claimId}`, status: 'completed', createdAt: serverTimestamp() });
  });
}
