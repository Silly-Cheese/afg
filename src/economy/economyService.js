import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const docs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const code = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const BUSINESS_LEVELS = ['startup', 'developing', 'established', 'regional', 'national', 'institutional-partner'];
export const PROPERTY_TYPES = ['apartment', 'house', 'luxury-residence', 'farm', 'retail-store', 'office', 'warehouse', 'restaurant', 'hotel', 'factory', 'commercial-complex'];
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

  const ownQueries = [
    getDocs(query(collection(db, 'businesses'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'properties'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'investments'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'insurancePolicies'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'insuranceClaims'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'accounts'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'loans'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'institutionEvents'), where('propertyOwnerUid', '==', uid))),
    getDocs(query(collection(db, 'bankingOperations'), where('ownerUid', '==', uid))),
  ];
  const [businesses, properties, investments, ownPolicies, ownClaims, accounts, loans, incidents, operations] = await Promise.all(ownQueries);

  let managedClaims = ownClaims;
  let managedPolicies = ownPolicies;
  if (mayManage) {
    [managedClaims, managedPolicies] = await Promise.all([
      getDocs(collection(db, 'insuranceClaims')),
      getDocs(collection(db, 'insurancePolicies')),
    ]);
  }

  return {
    user: { uid, ...userSnap.data() },
    businesses: docs(businesses),
    properties: docs(properties),
    investments: docs(investments),
    policies: docs(ownPolicies),
    claims: docs(ownClaims),
    managedClaims: docs(managedClaims),
    managedPolicies: docs(managedPolicies),
    accounts: docs(accounts),
    loans: docs(loans),
    incidents: docs(incidents).filter((item) => item.eventType === 'property-incident'),
    payoutOperations: docs(operations).filter((item) => item.type === 'insurance-claim-payout'),
    economySettings: pricing(settingsSnap.exists() ? settingsSnap.data() : {}),
    access: { isOwner, mayManage, permissions: grants },
  };
}

async function chargeAccountAndCreate(db, user, accountId, amount, operationType, description, writer) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid setup cost.');
  if (!accountId) throw new Error('Choose a funding account.');
  const accountRef = doc(db, 'accounts', accountId);
  const operationId = code('ECO');
  await runTransaction(db, async (tx) => {
    const accountSnap = await tx.get(accountRef);
    if (!accountSnap.exists() || accountSnap.data().ownerUid !== user.uid || accountSnap.data().status !== 'active') throw new Error('Funding account is unavailable.');
    const current = accountSnap.data();
    if (Number(current.availableBalance || 0) < value) throw new Error(`Insufficient funds. This setup requires ${value.toLocaleString()} fictional currency.`);

    const newBalance = Number(current.balance || 0) - value;
    const newAvailable = Number(current.availableBalance || 0) - value;
    tx.update(accountRef, { balance: newBalance, availableBalance: newAvailable, lastOperationId: operationId, updatedAt: serverTimestamp() });
    writer(tx, operationId);
    tx.set(doc(db, 'bankingOperations', operationId), {
      operationId,
      ownerUid: user.uid,
      customerId: user.customerId,
      accountId,
      type: operationType,
      amount: value,
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
      type: operationType,
      direction: 'debit',
      amount: value,
      status: 'completed',
      description,
      createdAt: serverTimestamp(),
    });
  });
  return operationId;
}

export async function registerBusiness(db, user, data, settings) {
  const capital = Number(data.startingCapital || 0);
  if (!data.name?.trim() || data.name.trim().length < 3 || !data.description?.trim() || data.description.trim().length < 20) throw new Error('Enter a business name and complete description.');
  if (capital < 0 || capital > 100000) throw new Error('Starting capital must be between 0 and 100,000 fictional currency.');
  const setupFee = pricing(settings).businessBasePrice;
  const totalCost = setupFee + capital;
  const businessRef = doc(collection(db, 'businesses'));
  const businessId = code('BUS');

  await chargeAccountAndCreate(db, user, data.accountId, totalCost, 'business_setup', `Registered ${data.name.trim()} (${setupFee} setup fee + ${capital} starting capital)`, (tx, operationId) => {
    tx.set(businessRef, {
      businessId,
      ownerUid: user.uid,
      customerId: user.customerId,
      name: data.name.trim(),
      industry: (data.industry || '').trim(),
      description: data.description.trim(),
      homeBranchId: data.homeBranchId || 'capital',
      ownershipType: data.ownershipType || 'sole-owner',
      level: 'startup',
      status: 'active',
      reputation: 500,
      revenue: 0,
      expenses: 0,
      cashReserves: capital,
      employeeCount: 0,
      setupFee,
      acquisitionCost: totalCost,
      fundingAccountId: data.accountId,
      operationId,
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
    tx.set(doc(collection(db, 'businessTransactions')), { transactionId: code('BTX'), businessId: current.businessId, businessDocId: business.id, ownerUid: uid, type: kind, amount: value, memo: (memo || '').trim(), immutable: true, createdAt: serverTimestamp() });
  });
}

export async function acquireProperty(db, user, data, settings) {
  if (!data.propertyType) throw new Error('Choose a property type.');
  if (!data.name?.trim()) throw new Error('Enter a property name.');
  const basePrice = pricing(settings).propertyBasePrice;
  const propertyRef = doc(collection(db, 'properties'));
  const propertyId = code('PROP');

  await chargeAccountAndCreate(db, user, data.accountId, basePrice, 'property_purchase', `Purchased ${data.name.trim()} (${data.propertyType})`, (tx, operationId) => {
    tx.set(propertyRef, {
      propertyId,
      ownerUid: user.uid,
      customerId: user.customerId,
      businessId: data.businessId || null,
      name: data.name.trim(),
      propertyType: data.propertyType,
      status: 'owned',
      purchasePrice: basePrice,
      currentValue: basePrice,
      mortgageLoanId: data.mortgageLoanId || null,
      condition: 'good',
      rentalIncome: Number(data.rentalIncome || 0),
      maintenanceCost: Number(data.maintenanceCost || 0),
      acquisitionCost: basePrice,
      fundingAccountId: data.accountId,
      operationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
  const operationRef = doc(db, 'investmentOperations', operationId);
  await runTransaction(db, async (tx) => {
    const account = await tx.get(accountRef);
    if (!account.exists() || account.data().ownerUid !== user.uid || account.data().availableBalance < amount) throw new Error('Selected account has insufficient available funds.');
    const product = INVESTMENT_PRODUCTS.find((item) => item.id === data.productId);
    if (!product) throw new Error('Select a valid investment product.');
    tx.update(accountRef, { balance: account.data().balance - amount, availableBalance: account.data().availableBalance - amount, lastOperationId: operationId, updatedAt: serverTimestamp() });
    tx.set(investmentRef, { investmentId: code('INV'), ownerUid: user.uid, customerId: user.customerId, productId: product.id, productName: product.name, risk: product.risk, principal: amount, currentValue: amount, totalReturn: 0, status: 'active', purchasedFromAccountId: data.accountId, operationId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    tx.set(operationRef, { operationId, investmentDocId: investmentRef.id, ownerUid: user.uid, customerId: user.customerId, accountId: data.accountId, type: 'investment-purchase', amount, status: 'completed', immutable: true, createdAt: serverTimestamp() });
    tx.set(doc(collection(db, 'transactions')), { transactionId: code('TXN'), operationId, ownerUid: user.uid, customerId: user.customerId, accountId: data.accountId, type: 'investment_purchase', direction: 'debit', amount, status: 'completed', description: `Purchased ${product.name}`, createdAt: serverTimestamp() });
  });
}

export async function createInsurancePolicy(db, user, data, settings, economyData) {
  const coverage = Number(data.coverage);
  const deductible = Number(data.deductible || 0);
  if (!Number.isFinite(coverage) || coverage <= 0) throw new Error('Enter a valid coverage limit.');
  if (deductible < 0 || deductible >= coverage) throw new Error('Deductible must be zero or greater and less than the coverage limit.');
  const product = INSURANCE_PRODUCTS.find((item) => item.id === data.productType);
  if (!product) throw new Error('Select an insurance product.');
  const assets = eligibleInsuranceAssets(economyData, data.productType);
  const asset = assets.find((item) => item.id === data.assetId);
  if (!asset) throw new Error('Choose an eligible asset that you actually own.');
  const cost = policyCost(settings, coverage);
  const policyRef = doc(collection(db, 'insurancePolicies'));
  const policyId = code('POL');

  await chargeAccountAndCreate(db, user, data.accountId, cost.total, 'insurance_policy_setup', `Opened ${product.name} for ${asset.name}`, (tx, operationId) => {
    tx.set(policyRef, {
      policyId,
      ownerUid: user.uid,
      customerId: user.customerId,
      productType: product.id,
      productName: product.name,
      insuredAssetType: asset.type,
      insuredAssetDocId: asset.id,
      insuredAssetId: asset.permanentId,
      insuredAssetName: asset.name,
      premium: cost.premium,
      setupFee: cost.setupFee,
      initialCost: cost.total,
      coverageLimit: coverage,
      deductible,
      fundingAccountId: data.accountId,
      operationId,
      status: 'active',
      effectiveAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
  return policyId;
}

export async function submitClaim(db, user, data) {
  if (!data.description?.trim() || data.description.trim().length < 25) throw new Error('Provide a complete fictional claim description.');
  const policySnap = await getDoc(doc(db, 'insurancePolicies', data.policyDocId));
  if (!policySnap.exists() || policySnap.data().ownerUid !== user.uid || policySnap.data().status !== 'active') throw new Error('Active policy not found.');
  const policy = policySnap.data();
  const amount = Number(data.amount || 0);
  if (amount <= 0 || amount > Number(policy.coverageLimit || 0)) throw new Error('Claim amount must be positive and within the policy limit.');

  let incident = null;
  if (data.incidentEventDocId) {
    const incidentSnap = await getDoc(doc(db, 'institutionEvents', data.incidentEventDocId));
    if (!incidentSnap.exists()) throw new Error('The selected property incident no longer exists.');
    incident = incidentSnap.data();
    if (policy.insuredAssetType !== 'property' || incident.propertyDocId !== policy.insuredAssetDocId || incident.propertyOwnerUid !== user.uid) throw new Error('That incident does not belong to the insured property.');
  }

  await addDoc(collection(db, 'insuranceClaims'), {
    claimId: code('CLM'),
    policyDocId: data.policyDocId,
    policyId: policy.policyId,
    ownerUid: user.uid,
    customerId: user.customerId,
    insuredAssetType: policy.insuredAssetType,
    insuredAssetDocId: policy.insuredAssetDocId,
    insuredAssetId: policy.insuredAssetId,
    insuredAssetName: policy.insuredAssetName,
    incidentEventDocId: data.incidentEventDocId || null,
    incidentEventId: incident?.eventId || null,
    requestedAmount: amount,
    incidentType: (data.incidentType || incident?.incidentType || 'other').trim(),
    description: data.description.trim(),
    status: 'submitted',
    assignedReviewerUid: null,
    decision: null,
    uploadsAllowed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function decideClaim(db, actor, claim, decision) {
  if (!decision.reason?.trim() || decision.reason.trim().length < 10) throw new Error('Enter a decision reason.');
  if (!['approved', 'denied'].includes(decision.outcome)) throw new Error('Choose approve or deny.');
  const claimRef = doc(db, 'insuranceClaims', claim.id);
  const approvedAmount = decision.outcome === 'approved' ? Number(decision.approvedAmount || 0) : 0;
  if (decision.outcome === 'approved' && (!Number.isFinite(approvedAmount) || approvedAmount <= 0 || approvedAmount > Number(claim.requestedAmount || 0))) throw new Error('Approved amount must be greater than zero and cannot exceed the requested amount.');

  await updateDoc(claimRef, {
    status: decision.outcome,
    assignedReviewerUid: actor.uid,
    decision: {
      outcome: decision.outcome,
      approvedAmount,
      reason: decision.reason.trim(),
      decidedBy: actor.uid,
      ownerOverride: Boolean(decision.ownerOverride),
      decidedAt: new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'auditLogs'), {
    actorUid: actor.uid,
    actorType: decision.ownerOverride ? 'owner' : 'staff',
    action: 'insurance.claim.decided',
    targetType: 'insuranceClaim',
    targetId: claim.claimId,
    reason: decision.reason.trim(),
    immutable: true,
    createdAt: serverTimestamp(),
  });
}

export async function collectClaimPayout(db, user, claim, policy, accountId) {
  if (claim.ownerUid !== user.uid || claim.status !== 'approved' || !claim.decision?.approvedAmount) throw new Error('This claim does not have an approved payout.');
  if (!accountId) throw new Error('Choose an account for the insurance payout.');
  const payoutOperationId = `INS-${claim.id}`;
  const operationRef = doc(db, 'bankingOperations', payoutOperationId);
  const accountRef = doc(db, 'accounts', accountId);
  const approved = Number(claim.decision.approvedAmount || 0);
  const deductible = Number(policy?.deductible || 0);
  const payout = Math.max(0, approved - deductible);
  if (payout <= 0) throw new Error('The approved amount does not exceed the policy deductible.');

  await runTransaction(db, async (tx) => {
    const [existingOperation, accountSnap] = await Promise.all([tx.get(operationRef), tx.get(accountRef)]);
    if (existingOperation.exists()) throw new Error('This claim payout has already been collected.');
    if (!accountSnap.exists() || accountSnap.data().ownerUid !== user.uid || accountSnap.data().status !== 'active') throw new Error('Payout account is unavailable.');
    const current = accountSnap.data();
    tx.update(accountRef, {
      balance: Number(current.balance || 0) + payout,
      availableBalance: Number(current.availableBalance || 0) + payout,
      lastOperationId: payoutOperationId,
      updatedAt: serverTimestamp(),
    });
    tx.set(operationRef, {
      operationId: payoutOperationId,
      ownerUid: user.uid,
      customerId: user.customerId,
      accountId,
      type: 'insurance-claim-payout',
      claimDocId: claim.id,
      claimId: claim.claimId,
      amount: payout,
      approvedAmount: approved,
      deductible,
      status: 'completed',
      immutable: true,
      createdAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'transactions')), {
      transactionId: code('TXN'),
      operationId: payoutOperationId,
      ownerUid: user.uid,
      customerId: user.customerId,
      accountId,
      type: 'insurance_claim_payout',
      direction: 'credit',
      amount: payout,
      status: 'completed',
      description: `Insurance payout for ${claim.claimId}`,
      createdAt: serverTimestamp(),
    });
  });
  return payout;
}
