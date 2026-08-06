import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';

export const SCORE_TIERS = [
  { min: 780, name: 'Elite' }, { min: 720, name: 'Excellent' }, { min: 650, name: 'Strong' },
  { min: 580, name: 'Fair' }, { min: 500, name: 'Developing' }, { min: 300, name: 'Critical' },
];

export function scoreTier(score = 300) {
  return SCORE_TIERS.find(item => Number(score) >= item.min)?.name || 'Critical';
}

export function accountStanding({ score = 300, reputation = 50, restricted = false } = {}) {
  if (restricted) return 'Restricted';
  if (score >= 780 && reputation >= 90) return 'Exceptional';
  if (score >= 720 && reputation >= 80) return 'Excellent';
  if (score >= 650 && reputation >= 65) return 'Good';
  if (score >= 580 && reputation >= 45) return 'Fair';
  return 'Developing';
}

export function classificationFor({ score = 300, reputation = 50, restricted = false, business = false } = {}) {
  if (restricted) return 'Restricted Customer';
  if (business) return 'Business Customer';
  if (score >= 720 && reputation >= 80) return 'Premium Customer';
  return 'Customer';
}

export function eligibilityFor({ score = 300, reputation = 50, standing = 'Developing', restricted = false } = {}) {
  if (restricted) return { banking: true, personalLoan: false, vehicleLoan: false, mortgage: false, businessFinance: false, premiumProducts: false };
  return {
    banking: true,
    personalLoan: score >= 580 && reputation >= 45,
    vehicleLoan: score >= 650 && reputation >= 55,
    mortgage: score >= 720 && reputation >= 70,
    businessFinance: score >= 650 && reputation >= 65,
    premiumProducts: standing === 'Excellent' || standing === 'Exceptional',
  };
}

export function buildProgression(portal, banking) {
  const score = Number(portal?.credit?.trustScore || 300);
  const reputation = Number(portal?.profile?.reputation ?? 50);
  const restricted = portal?.profile?.accountStatus === 'restricted' || portal?.user?.accountStatus === 'restricted';
  const business = portal?.profile?.businessCustomer === true;
  const standing = portal?.profile?.standingOverride || accountStanding({ score, reputation, restricted });
  const classification = portal?.profile?.classificationOverride || classificationFor({ score, reputation, restricted, business });
  const transactions = banking?.transactions || [];
  const accounts = banking?.accounts || [];
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const milestones = [
    { id: 'identity', label: 'Permanent Identity', complete: Boolean(portal?.user?.customerId), detail: 'Create a permanent AFG customer identity.' },
    { id: 'banking', label: 'Banking Started', complete: accounts.length >= 2, detail: 'Open checking and savings accounts.' },
    { id: 'activity', label: 'Active Customer', complete: transactions.length >= 5, detail: 'Complete at least five account transactions.' },
    { id: 'saver', label: 'Savings Builder', complete: Number(accounts.find(a => a.type === 'savings')?.balance || 0) >= 1000, detail: 'Build savings to 1,000 fictional currency.' },
    { id: 'strong-score', label: 'Strong Financial Profile', complete: score >= 650, detail: 'Reach a Trust Score of 650.' },
    { id: 'premium', label: 'Premium Eligible', complete: classification === 'Premium Customer', detail: 'Reach premium classification requirements.' },
  ];
  return {
    score, tier: scoreTier(score), reputation, standing, classification, restricted,
    totalBalance, milestones, completedMilestones: milestones.filter(item => item.complete).length,
    eligibility: eligibilityFor({ score, reputation, standing, restricted }),
    factors: [
      { label: 'Payment history', value: Number(portal?.credit?.paymentHistory ?? 100), weight: '35%' },
      { label: 'Debt utilization', value: Number(portal?.credit?.debtUtilization ?? 0), weight: '30%', inverse: true },
      { label: 'Account age', value: Number(portal?.credit?.accountAgePoints ?? 0), weight: '15%' },
      { label: 'Application impact', value: Number(portal?.credit?.applicationImpact ?? 0), weight: '10%', inverse: true },
      { label: 'Customer reputation', value: reputation, weight: '10%' },
    ],
  };
}

export async function findCustomerById(db, customerId) {
  const snap = await getDocs(query(collection(db, 'users'), where('customerId', '==', customerId.trim().toUpperCase()), limit(1)));
  if (snap.empty) throw new Error('No customer was found with that Customer ID.');
  const userDoc = snap.docs[0];
  const [profileSnap, creditSnap] = await Promise.all([
    getDoc(doc(db, 'customerProfiles', userDoc.id)), getDoc(doc(db, 'creditProfiles', userDoc.id)),
  ]);
  return { uid: userDoc.id, user: userDoc.data(), profile: profileSnap.data() || {}, credit: creditSnap.data() || {} };
}

export async function applyOwnerProgressionOverride(db, ownerUid, target, values, reason) {
  if (!reason?.trim() || reason.trim().length < 8) throw new Error('Enter a clear override reason of at least eight characters.');
  const score = Number(values.trustScore);
  const reputation = Number(values.reputation);
  if (!Number.isFinite(score) || score < 300 || score > 850) throw new Error('Trust Score must be between 300 and 850.');
  if (!Number.isFinite(reputation) || reputation < 0 || reputation > 100) throw new Error('Reputation must be between 0 and 100.');
  const overrideId = `OVR-${Date.now().toString(36).toUpperCase()}`;
  await runTransaction(db, async transaction => {
    const profileRef = doc(db, 'customerProfiles', target.uid);
    const creditRef = doc(db, 'creditProfiles', target.uid);
    const [profileSnap, creditSnap] = await Promise.all([transaction.get(profileRef), transaction.get(creditRef)]);
    if (!profileSnap.exists() || !creditSnap.exists()) throw new Error('The customer progression records are incomplete.');
    const previous = { trustScore: creditSnap.data().trustScore, reputation: profileSnap.data().reputation ?? 50, accountStatus: profileSnap.data().accountStatus, classificationOverride: profileSnap.data().classificationOverride || null, standingOverride: profileSnap.data().standingOverride || null };
    transaction.update(creditRef, { trustScore: score, tier: scoreTier(score), ownerOverride: true, updatedAt: serverTimestamp(), updatedBy: ownerUid });
    transaction.update(profileRef, { reputation, accountStatus: values.restricted ? 'restricted' : 'active', classificationOverride: values.classification || null, standingOverride: values.standing || null, updatedAt: serverTimestamp(), updatedBy: ownerUid });
    transaction.set(doc(db, 'progressionOverrides', overrideId), { overrideId, ownerUid, targetUid: target.uid, customerId: target.user.customerId, previous, replacement: { trustScore: score, reputation, restricted: Boolean(values.restricted), classification: values.classification || null, standing: values.standing || null }, reason: reason.trim(), immutable: true, createdAt: serverTimestamp() });
    transaction.set(doc(db, 'auditLogs', overrideId), { auditId: overrideId, actorUid: ownerUid, actorType: 'owner', action: 'progression.owner_override', targetType: 'customer', targetId: target.user.customerId, reason: reason.trim(), immutable: true, createdAt: serverTimestamp() });
  });
  return overrideId;
}
