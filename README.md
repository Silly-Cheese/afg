# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 7

Earlier phases established the public website, Firebase authentication, Owner Bootstrap, customer identities, banking, progression, applications, lending, underwriting, decisions, and approved offers.

### Phase 7 loans, payments, and collections

- Dedicated `/loans` Loan Center
- Customer loan portfolio and servicing summaries
- Staff and Owner servicing queue
- Activation of accepted pending loans
- Amortized monthly payment calculation
- Payment amount, next due date, payments remaining, and total-paid fields
- Customer payments from owned AFG accounts
- Atomic account debit and principal reduction
- Immutable loan operations and payment records
- Customer-facing banking transaction records
- Automatic paid-loan closure when principal reaches zero
- Extension requests
- Restructuring requests
- Settlement-review requests
- Staff extensions, restructures, settlement offers, delinquency stages, forgiveness, and restoration
- Delinquency stages and servicing statuses
- Immutable loan events and audit records
- Explicit Owner override marking and reasons
- Responsive customer and staff interfaces

## Loan lifecycle

Accepted offers begin as `pending-activation`. Authorized servicing staff or the Owner activate the loan, which creates the payment amount and first due date. Active loans can receive customer payments. Loans may move through Current, Extended, Restructured, Settlement Offered, Delinquent, Paid, or Forgiven servicing states.

## Security model

- Customers can read only their own loans, payments, operations, and servicing events.
- Payments must debit an account owned by the same customer.
- The payment amount cannot exceed the source account's available balance or the remaining principal.
- The account debit, loan principal reduction, immutable loan operation, payment record, and customer transaction are committed atomically.
- Customers may modify only payment fields linked to a new immutable loan operation or submit a pending assistance request.
- Servicing and collections actions require Owner authority or protected loan/collections permissions.
- Servicing events and audit entries cannot be edited or deleted.
- Owner overrides must be marked and include a written reason.
- The Founder and Owner retains global authority over all loan records and workflows.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

Deploy the Phase 7 Firestore rules before activating loans, accepting payments, or using servicing actions.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, or real income records. All AFG balances, applications, scores, decisions, loans, payments, and products are fictional and have no cash value.
