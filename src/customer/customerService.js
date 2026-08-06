import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

const CUSTOMER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeUsername(value = '') {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function validateUsername(value = '') {
  const normalized = normalizeUsername(value);
  if (normalized.length < 3 || normalized.length > 20) return 'Username must contain 3–20 characters.';
  if (!/^[a-z0-9_]+$/.test(normalized)) return 'Use only letters, numbers, and underscores.';
  return '';
}

function randomCode(length = 6) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => CUSTOMER_ALPHABET[value % CUSTOMER_ALPHABET.length]).join('');
}

export function createCustomerId() {
  return `CUS-${randomCode(6)}`;
}

export function createAccountId(prefix) {
  return `${prefix}-${randomCode(8)}`;
}

export async function isUsernameAvailable(db, username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  const snapshot = await getDoc(doc(db, 'usernames', normalized));
  return !snapshot.exists();
}

export async function getInstitutionSettings(db) {
  const [bootstrapSnap, settingsSnap] = await Promise.all([
    getDoc(doc(db, 'system', 'bootstrap')),
    getDoc(doc(db, 'systemSettings', 'main')),
  ]);
  return {
    bootstrap: bootstrapSnap.exists() ? bootstrapSnap.data() : null,
    settings: settingsSnap.exists() ? settingsSnap.data() : null,
  };
}

export async function createCustomerIdentity(db, authUser, form, defaults) {
  const uid = authUser.uid;
  const normalizedUsername = normalizeUsername(form.username);
  const customerId = createCustomerId();
  const checkingId = createAccountId('CHK');
  const savingsId = createAccountId('SVG');
  const initialBalance = Number(defaults?.startingBalance ?? 2500);
  const startingTrustScore = Number(defaults?.startingTrustScore ?? 600);
  const currencyName = defaults?.currencyName || 'AFG Dollar';
  const currencySymbol = defaults?.currencySymbol || '$';
  const branchId = defaults?.headquartersBranchId || 'capital';

  await runTransaction(db, async (transaction) => {
    const bootstrapRef = doc(db, 'system', 'bootstrap');
    const settingsRef = doc(db, 'systemSettings', 'main');
    const usernameRef = doc(db, 'usernames', normalizedUsername);
    const userRef = doc(db, 'users', uid);
    const customerRef = doc(db, 'customerProfiles', uid);
    const privateRef = doc(db, 'customerPrivate', uid);

    const [bootstrapSnap, settingsSnap, usernameSnap, userSnap] = await Promise.all([
      transaction.get(bootstrapRef),
      transaction.get(settingsRef),
      transaction.get(usernameRef),
      transaction.get(userRef),
    ]);

    if (!bootstrapSnap.exists() || bootstrapSnap.data().status !== 'complete') throw new Error('Institution setup is incomplete.');
    if (settingsSnap.exists() && settingsSnap.data().registrationEnabled === false) throw new Error('Public registration is currently closed.');
    if (usernameSnap.exists()) throw new Error('That username is already taken.');
    if (userSnap.exists()) throw new Error('This authentication account already has a customer identity.');

    transaction.set(usernameRef, { uid, customerId, createdAt: serverTimestamp() });
    transaction.set(userRef, {
      uid,
      username: normalizedUsername,
      displayName: form.displayName.trim(),
      discordUsername: form.discord.trim(),
      customerId,
      primaryRole: 'customer',
      roles: ['customer'],
      accountStatus: 'active',
      customerClassification: 'customer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(customerRef, {
      uid,
      customerId,
      username: normalizedUsername,
      displayName: form.displayName.trim(),
      discordUsername: form.discord.trim(),
      homeBranchId: branchId,
      classification: 'customer',
      accountStatus: 'active',
      customerSince: serverTimestamp(),
      profileCompletion: 35,
      publicVerificationEnabled: false,
      badges: ['founding-customer'],
    });
    transaction.set(privateRef, {
      uid,
      customerId,
      email: authUser.email,
      fictionalProfile: {
        legalName: '',
        birthDate: '',
        occupation: '',
        monthlyIncome: null,
        address: '',
      },
      agreements: {
        fictionalInformationOnly: true,
        communityRules: true,
        simulationTerms: true,
        acceptedAt: serverTimestamp(),
      },
    });
    transaction.set(doc(db, 'accounts', checkingId), {
      accountId: checkingId,
      ownerUid: uid,
      customerId,
      type: 'checking',
      productName: 'Everyday Checking',
      balance: initialBalance,
      availableBalance: initialBalance,
      currencyName,
      currencySymbol,
      status: 'active',
      openedAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'accounts', savingsId), {
      accountId: savingsId,
      ownerUid: uid,
      customerId,
      type: 'savings',
      productName: 'Growth Savings',
      balance: 0,
      availableBalance: 0,
      currencyName,
      currencySymbol,
      status: 'active',
      openedAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'creditProfiles', uid), {
      uid,
      customerId,
      trustScore: startingTrustScore,
      tier: scoreTier(startingTrustScore),
      paymentHistory: 100,
      debtUtilization: 0,
      accountAgePoints: 0,
      applicationImpact: 0,
      status: 'active',
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'academyProfiles', uid), {
      uid,
      customerId,
      level: 1,
      xp: 0,
      completedCourses: 0,
      certificates: 0,
      createdAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'achievementProfiles', uid), {
      uid,
      customerId,
      unlocked: ['founding-customer'],
      points: 25,
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(collection(db, 'transactions')), {
      ownerUid: uid,
      customerId,
      accountId: checkingId,
      type: 'opening_deposit',
      direction: 'credit',
      amount: initialBalance,
      description: 'AFG customer opening balance',
      status: 'completed',
      createdAt: serverTimestamp(),
    });
    transaction.set(doc(collection(db, 'notifications')), {
      recipientUid: uid,
      type: 'welcome',
      title: 'Welcome to Apex Financial Group',
      message: `Your permanent customer identity ${customerId} is active.`,
      read: false,
      createdAt: serverTimestamp(),
    });
    transaction.set(doc(collection(db, 'auditLogs')), {
      actorUid: uid,
      actorType: 'customer',
      action: 'customer.registration.completed',
      targetType: 'customer',
      targetId: customerId,
      reason: 'Public customer self-registration',
      immutable: true,
      createdAt: serverTimestamp(),
    });
  });

  return { customerId, checkingId, savingsId };
}

export async function loadCustomerPortal(db, uid) {
  const [userSnap, profileSnap, creditSnap, academySnap, accountsSnap, notificationSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'customerProfiles', uid)),
    getDoc(doc(db, 'creditProfiles', uid)),
    getDoc(doc(db, 'academyProfiles', uid)),
    getDocs(query(collection(db, 'accounts'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'notifications'), where('recipientUid', '==', uid), limit(8))),
  ]);

  return {
    user: userSnap.exists() ? userSnap.data() : null,
    profile: profileSnap.exists() ? profileSnap.data() : null,
    credit: creditSnap.exists() ? creditSnap.data() : null,
    academy: academySnap.exists() ? academySnap.data() : null,
    accounts: accountsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
    notifications: notificationSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
  };
}

export function scoreTier(score) {
  if (score >= 780) return 'Elite';
  if (score >= 720) return 'Excellent';
  if (score >= 650) return 'Strong';
  if (score >= 580) return 'Fair';
  if (score >= 500) return 'Developing';
  return 'Critical';
}
