# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 3

Phase 1 established the public React/Vite website, Firebase authentication, responsive AFG design system, protected routing, safety pages, and disclaimers.

Phase 2A added the one-time Institution Bootstrap, protected Founder and Owner identity, branches, departments, ranks, permissions, institution defaults, global Owner authority, and permanent bootstrap lock.

Phase 2B added public customer registration, permanent Customer IDs, customer profiles, checking and savings accounts, Trust Scores, Academy profiles, achievements, notifications, and registration audit records.

### Phase 3 core customer banking

- Functional banking overview with live Firestore balances
- Everyday Checking and Growth Savings account cards
- Account detail panels and available-balance display
- Transfers between accounts owned by the same customer
- Fictional income entries with source and memo fields
- Maximum single fictional income entry of 100,000
- Complete transaction history
- Transaction search and type filtering
- Recent-activity dashboard
- Responsive banking action dialogs
- Immutable `bankingOperations` ledger records
- Operation-linked account updates and transaction records
- No custom Firestore index required for transaction history
- Owner retains global read, write, and override authority
- No document upload capability

## Phase 3 security model

Customer balance changes run as Firestore transactions. Each operation creates an immutable `bankingOperations/{operationId}` record in the same atomic request as the account update and customer-facing transaction record.

Firestore validates:

- The authenticated user owns every affected account.
- Both transfer accounts are active and belong to the same customer.
- A transfer debit exactly matches its corresponding credit.
- The source account has enough available funds.
- Fictional income is positive and does not exceed the configured Phase 3 cap.
- Account updates change only balance-related operation fields.
- The matching operation did not exist before the atomic request.
- Customer-facing transaction values match the immutable operation ledger.

Customers cannot directly assign arbitrary balances, edit completed transactions, delete operations, change roles, alter Trust Scores, or access another customer's records. The Owner can override all records.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create the Cloud Firestore database.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the deployed website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

## Local development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Hosting

The project is a Vite single-page application and can be deployed to any static host that supports SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, or uploaded documents. All AFG balances and products are fictional and have no cash value.
