import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

const loanDocIdFor = applicationDocId => `approved-${applicationDocId}`;
const loanIdFor = applicationId => `LN-${String(applicationId || crypto.randomUUID()).replace(/^APP-/, '').slice(0, 12).toUpperCase()}`;

export async function registerExistingApprovedLoan(db, applicationDocId, actorUid) {
  const applicationRef = doc(db, 'applications', applicationDocId);
  const loanDocId = loanDocIdFor(applicationDocId);
  const loanRef = doc(db, 'loans', loanDocId);

  await runTransaction(db, async transaction => {
    const [applicationSnap, loanSnap] = await Promise.all([
      transaction.get(applicationRef),
      transaction.get(loanRef),
    ]);

    if (!applicationSnap.exists()) throw new Error('Application not found.');
    const application = applicationSnap.data();
    if (application.status !== 'approved') throw new Error('Only approved applications can be registered.');
    if (!application.approvedTerms) throw new Error('This approval does not contain loan terms.');

    if (loanSnap.exists()) {
      transaction.update(applicationRef, {
        registeredLoanDocId: loanDocId,
        registeredLoanId: loanSnap.data().loanId,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const terms = application.approvedTerms;
    const amount = Number(terms.approvedAmount || 0);
    const termMonths = Number(terms.termMonths || 0);
    if (amount <= 0 || termMonths <= 0) throw new Error('The approved amount and term must be greater than zero.');

    const loanId = loanIdFor(application.applicationId);
    transaction.set(loanRef, {
      loanId,
      applicationId: application.applicationId,
      applicationDocId,
      ownerUid: application.applicantUid,
      customerId: application.customerId,
      productType: application.applicationType || 'approved-financing',
      productName: application.applicationName || 'Approved Financing',
      originalPrincipal: amount,
      remainingPrincipal: amount,
      interestRate: Number(terms.interestRate || 0),
      termMonths,
      paymentFrequency: terms.paymentFrequency || 'monthly',
      status: 'offer-pending',
      servicingStatus: 'awaiting-customer-acceptance',
      customerAcceptanceStatus: 'pending',
      approvedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(applicationRef, {
      registeredLoanDocId: loanDocId,
      registeredLoanId: loanId,
      updatedAt: serverTimestamp(),
      timeline: [
        ...(application.timeline || []),
        {
          status: 'approved',
          label: 'Approved loan registered in Loan Center',
          actorType: 'owner',
          actorUid,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  return loanDocId;
}
