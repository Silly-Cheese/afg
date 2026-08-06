import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

function makeId(prefix) {
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  return `${prefix}-${Array.from(values, value => value.toString(36).slice(-1)).join('').toUpperCase()}`;
}

export async function loadBankingData(db, uid) {
  const [accountsSnap, transactionsSnap] = await Promise.all([
    getDocs(query(collection(db, 'accounts'), where('ownerUid', '==', uid))),
    getDocs(query(collection(db, 'transactions'), where('ownerUid', '==', uid), orderBy('createdAt', 'desc'))),
  ]);
  return {
    accounts: accountsSnap.docs.map(item => ({ id: item.id, ...item.data() })),
    transactions: transactionsSnap.docs.map(item => ({ id: item.id, ...item.data() })),
  };
}

export async function transferBetweenAccounts(db, uid, customerId, fromId, toId, amount, memo = '') {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Enter a transfer amount greater than zero.');
  if (fromId === toId) throw new Error('Choose two different accounts.');

  const transactionId = makeId('TXN');
  await runTransaction(db, async transaction => {
    const fromRef = doc(db, 'accounts', fromId);
    const toRef = doc(db, 'accounts', toId);
    const [fromSnap, toSnap] = await Promise.all([transaction.get(fromRef), transaction.get(toRef)]);
    if (!fromSnap.exists() || !toSnap.exists()) throw new Error('One of the selected accounts no longer exists.');
    const from = fromSnap.data();
    const to = toSnap.data();
    if (from.ownerUid !== uid || to.ownerUid !== uid) throw new Error('You can only transfer between your own accounts.');
    if (from.status !== 'active' || to.status !== 'active') throw new Error('Both accounts must be active.');
    if (Number(from.availableBalance) < numericAmount) throw new Error('Insufficient available balance.');

    transaction.update(fromRef, {
      balance: Number(from.balance) - numericAmount,
      availableBalance: Number(from.availableBalance) - numericAmount,
      updatedAt: serverTimestamp(),
    });
    transaction.update(toRef, {
      balance: Number(to.balance) + numericAmount,
      availableBalance: Number(to.availableBalance) + numericAmount,
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'transactions', transactionId), {
      transactionId,
      ownerUid: uid,
      customerId,
      type: 'internal_transfer',
      direction: 'transfer',
      amount: numericAmount,
      fromAccountId: fromId,
      toAccountId: toId,
      description: memo.trim() || `Transfer from ${from.productName} to ${to.productName}`,
      status: 'completed',
      createdAt: serverTimestamp(),
    });
  });
  return transactionId;
}

export async function depositFictionalIncome(db, uid, customerId, accountId, amount, source, description = '') {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Enter an income amount greater than zero.');
  if (numericAmount > 100000) throw new Error('A single fictional income entry cannot exceed 100,000.');
  const cleanSource = source.trim();
  if (cleanSource.length < 2) throw new Error('Enter a fictional income source.');

  const transactionId = makeId('TXN');
  await runTransaction(db, async transaction => {
    const accountRef = doc(db, 'accounts', accountId);
    const accountSnap = await transaction.get(accountRef);
    if (!accountSnap.exists()) throw new Error('The selected account no longer exists.');
    const account = accountSnap.data();
    if (account.ownerUid !== uid) throw new Error('You can only deposit into your own account.');
    if (account.status !== 'active') throw new Error('The selected account is not active.');

    transaction.update(accountRef, {
      balance: Number(account.balance) + numericAmount,
      availableBalance: Number(account.availableBalance) + numericAmount,
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(db, 'transactions', transactionId), {
      transactionId,
      ownerUid: uid,
      customerId,
      accountId,
      type: 'fictional_income',
      direction: 'credit',
      amount: numericAmount,
      source: cleanSource,
      description: description.trim() || `Fictional income from ${cleanSource}`,
      status: 'completed',
      createdAt: serverTimestamp(),
    });
  });
  return transactionId;
}
