import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

export async function getAccountManagementAccess(db, uid) {
  const bootstrap = await getDoc(doc(db, 'system', 'bootstrap'));
  return {
    isOwner: bootstrap.exists() && bootstrap.data().ownerUid === uid,
    ownerUid: bootstrap.exists() ? bootstrap.data().ownerUid : null,
  };
}

export async function loadAllAccounts(db) {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((item) => ({ uid: item.id, ...item.data() }))
    .sort((a, b) => String(a.displayName || a.username || '').localeCompare(String(b.displayName || b.username || '')));
}

export function searchAccounts(accounts, value) {
  const needle = normalize(value);
  if (!needle) return accounts;
  return accounts.filter((account) => [
    account.customerId,
    account.staffId,
    account.username,
    account.displayName,
    account.discordUsername,
    account.authEmail,
  ].some((field) => normalize(field).includes(needle)));
}

export async function loadAccountRecord(db, uid) {
  const [userSnap, customerSnap, creditSnap, academySnap, staffSnap, permissionSnap, accountsSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'customerProfiles', uid)),
    getDoc(doc(db, 'creditProfiles', uid)),
    getDoc(doc(db, 'academyProfiles', uid)),
    getDoc(doc(db, 'staffProfiles', uid)),
    getDoc(doc(db, 'staffPermissions', uid)),
    getDocs(query(collection(db, 'accounts'), where('ownerUid', '==', uid))),
  ]);

  if (!userSnap.exists()) throw new Error('Account not found.');

  return {
    uid,
    user: userSnap.data(),
    customer: customerSnap.exists() ? customerSnap.data() : null,
    credit: creditSnap.exists() ? creditSnap.data() : null,
    academy: academySnap.exists() ? academySnap.data() : null,
    staff: staffSnap.exists() ? staffSnap.data() : null,
    permissions: permissionSnap.exists() ? permissionSnap.data() : null,
    accounts: accountsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
  };
}

export async function saveAccountManagementChanges(db, ownerUid, target, form, reason) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 10) throw new Error('Enter an audit reason of at least 10 characters.');
  if (!target?.uid) throw new Error('Choose an account first.');

  const score = Number(form.trustScore);
  const reputation = Number(form.reputation);
  if (!Number.isFinite(score) || score < 300 || score > 850) throw new Error('Trust Score must be between 300 and 850.');
  if (!Number.isFinite(reputation) || reputation < 0 || reputation > 100) throw new Error('Reputation must be between 0 and 100.');

  const userRef = doc(db, 'users', target.uid);
  const customerRef = doc(db, 'customerProfiles', target.uid);
  const creditRef = doc(db, 'creditProfiles', target.uid);
  const bootstrapRef = doc(db, 'system', 'bootstrap');
  const auditRef = doc(collection(db, 'auditLogs'));
  const overrideRef = doc(collection(db, 'ownerOverrides'));

  await runTransaction(db, async (tx) => {
    const [bootstrapSnap, userSnap, customerSnap, creditSnap] = await Promise.all([
      tx.get(bootstrapRef),
      tx.get(userRef),
      tx.get(customerRef),
      tx.get(creditRef),
    ]);

    if (!bootstrapSnap.exists() || bootstrapSnap.data().ownerUid !== ownerUid) throw new Error('Owner authority is required.');
    if (!userSnap.exists()) throw new Error('Target account no longer exists.');
    const protectedOwner = bootstrapSnap.data().ownerUid === target.uid;

    const accountStatus = protectedOwner ? 'active' : form.accountStatus;
    const oldUser = userSnap.data();
    const oldCustomer = customerSnap.exists() ? customerSnap.data() : {};
    const oldCredit = creditSnap.exists() ? creditSnap.data() : {};

    tx.update(userRef, {
      displayName: String(form.displayName || oldUser.displayName || '').trim(),
      discordUsername: String(form.discordUsername || '').trim(),
      accountStatus,
      updatedAt: serverTimestamp(),
    });

    tx.set(customerRef, {
      uid: target.uid,
      customerId: oldUser.customerId,
      displayName: String(form.displayName || oldUser.displayName || '').trim(),
      discordUsername: String(form.discordUsername || '').trim(),
      accountStatus,
      reputation,
      classificationOverride: form.classificationOverride || null,
      standingOverride: form.standingOverride || null,
      updatedAt: serverTimestamp(),
      updatedBy: ownerUid,
    }, { merge: true });

    tx.set(creditRef, {
      uid: target.uid,
      customerId: oldUser.customerId,
      trustScore: score,
      ownerOverride: true,
      updatedAt: serverTimestamp(),
      updatedBy: ownerUid,
    }, { merge: true });

    tx.set(overrideRef, {
      overrideId: overrideRef.id,
      actorUid: ownerUid,
      targetUid: target.uid,
      targetCollection: 'users/customerProfiles/creditProfiles',
      targetRecordId: oldUser.customerId || target.uid,
      field: 'account-management',
      previousValue: {
        accountStatus: oldUser.accountStatus,
        displayName: oldUser.displayName,
        discordUsername: oldUser.discordUsername,
        reputation: oldCustomer.reputation,
        trustScore: oldCredit.trustScore,
        classificationOverride: oldCustomer.classificationOverride || null,
        standingOverride: oldCustomer.standingOverride || null,
      },
      replacementValue: {
        accountStatus,
        displayName: String(form.displayName || '').trim(),
        discordUsername: String(form.discordUsername || '').trim(),
        reputation,
        trustScore: score,
        classificationOverride: form.classificationOverride || null,
        standingOverride: form.standingOverride || null,
      },
      reason: cleanReason,
      immutable: true,
      createdAt: serverTimestamp(),
    });

    tx.set(auditRef, {
      auditId: auditRef.id,
      actorUid: ownerUid,
      actorType: 'owner',
      action: 'account.management.updated',
      targetType: 'account',
      targetId: oldUser.customerId || target.uid,
      reason: cleanReason,
      immutable: true,
      createdAt: serverTimestamp(),
    });
  });
}

export async function saveAccountPermissions(db, ownerUid, target, permissions, reason) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 10) throw new Error('Enter a permission-change reason of at least 10 characters.');
  if (!target?.uid) throw new Error('Choose an account first.');

  const bootstrapRef = doc(db, 'system', 'bootstrap');
  const permissionRef = doc(db, 'staffPermissions', target.uid);
  const auditRef = doc(collection(db, 'auditLogs'));
  const overrideRef = doc(collection(db, 'ownerOverrides'));
  const normalized = [...new Set((permissions || []).map((item) => String(item).trim()).filter(Boolean))].sort();

  await runTransaction(db, async (tx) => {
    const [bootstrapSnap, permissionSnap] = await Promise.all([
      tx.get(bootstrapRef),
      tx.get(permissionRef),
    ]);

    if (!bootstrapSnap.exists() || bootstrapSnap.data().ownerUid !== ownerUid) throw new Error('Owner authority is required.');
    if (bootstrapSnap.data().ownerUid === target.uid) throw new Error('The Founder & Owner permission package is protected and cannot be replaced.');

    const previous = permissionSnap.exists() ? permissionSnap.data().permissions || [] : [];

    tx.set(permissionRef, {
      uid: target.uid,
      permissions: normalized,
      isOwner: false,
      globalOverride: false,
      updatedAt: serverTimestamp(),
      updatedBy: ownerUid,
    }, { merge: true });

    tx.set(overrideRef, {
      overrideId: overrideRef.id,
      actorUid: ownerUid,
      targetUid: target.uid,
      targetCollection: 'staffPermissions',
      targetRecordId: target.uid,
      field: 'permissions',
      previousValue: previous,
      replacementValue: normalized,
      reason: cleanReason,
      immutable: true,
      createdAt: serverTimestamp(),
    });

    tx.set(auditRef, {
      auditId: auditRef.id,
      actorUid: ownerUid,
      actorType: 'owner',
      action: 'account.permissions.updated',
      targetType: 'staff-permissions',
      targetId: target.uid,
      reason: cleanReason,
      immutable: true,
      createdAt: serverTimestamp(),
    });
  });
}

export async function adjustAccountBalance(db, ownerUid, target, accountId, newBalance, reason) {
  const amount = Number(newBalance);
  const cleanReason = String(reason || '').trim();
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Balance must be zero or greater.');
  if (cleanReason.length < 10) throw new Error('Enter an audit reason of at least 10 characters.');

  const accountRef = doc(db, 'accounts', accountId);
  const bootstrapRef = doc(db, 'system', 'bootstrap');
  const auditRef = doc(collection(db, 'auditLogs'));
  const overrideRef = doc(collection(db, 'ownerOverrides'));

  await runTransaction(db, async (tx) => {
    const [bootstrapSnap, accountSnap] = await Promise.all([tx.get(bootstrapRef), tx.get(accountRef)]);
    if (!bootstrapSnap.exists() || bootstrapSnap.data().ownerUid !== ownerUid) throw new Error('Owner authority is required.');
    if (!accountSnap.exists() || accountSnap.data().ownerUid !== target.uid) throw new Error('Bank account not found.');
    const previousBalance = Number(accountSnap.data().balance || 0);

    tx.update(accountRef, {
      balance: amount,
      availableBalance: amount,
      updatedAt: serverTimestamp(),
    });

    tx.set(overrideRef, {
      overrideId: overrideRef.id,
      actorUid: ownerUid,
      targetUid: target.uid,
      targetCollection: 'accounts',
      targetRecordId: accountId,
      field: 'balance',
      previousValue: previousBalance,
      replacementValue: amount,
      reason: cleanReason,
      immutable: true,
      createdAt: serverTimestamp(),
    });

    tx.set(auditRef, {
      auditId: auditRef.id,
      actorUid: ownerUid,
      actorType: 'owner',
      action: 'account.balance.overridden',
      targetType: 'bank-account',
      targetId: accountId,
      reason: cleanReason,
      immutable: true,
      createdAt: serverTimestamp(),
    });
  });
}
