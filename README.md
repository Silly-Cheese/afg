# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, property, business, or employment services.

## Current release — Phase 13

Earlier phases established the public website, Owner Bootstrap, customer identities, banking, progression, applications, lending, loan servicing, staff hiring, the Staff Workspace, department operations, the Financial Academy, careers, branches, and performance management.

## Phase 13 — Business, Property, Investment, and Insurance

Phase 13 adds the expanded customer economy at `/economy-center`.

### Business economy

Customers can register fictional businesses with:

- Permanent Business IDs
- Business name and industry
- Description
- Home branch
- Ownership type
- Startup level
- Business reputation
- Revenue
- Expenses
- Cash reserves
- Employee count

Customers can record structured fictional revenue and expense activity. Every activity creates an immutable business-transaction record. Starting capital and individual activity amounts are capped to limit abuse.

### Business progression

The data model supports these business levels:

- Startup
- Developing Business
- Established Business
- Regional Business
- National Enterprise
- Institutional Partner

Later administrative controls can advance a business based on performance, reputation, commercial lending, and policy requirements.

### Property system

Customers can add fictional residential and commercial property records including:

- Permanent Property ID
- Property type
- Purchase value
- Current value
- Condition
- Rental income
- Maintenance cost
- Mortgage connection
- Business ownership connection
- Insurance status

Supported property categories include apartments, houses, farms, stores, offices, warehouses, restaurants, hotels, factories, and commercial complexes.

### Investment system

Customers can purchase fictional investments from an owned AFG account.

Launch products include:

- AFG Institutional Bond
- Savings Bond
- Apex Index Fund
- Apex Growth Fund
- Property Fund
- Business Enterprise Fund

Investment purchases use an atomic transaction that:

1. Verifies account ownership and available funds.
2. Debits the selected account.
3. Creates an investment record.
4. Creates an immutable investment operation.
5. Creates a customer banking transaction.

Investment records track principal, current value, total return, risk category, status, and funding account.

### Insurance system

Customers can create fictional policies for:

- Vehicle coverage
- Property coverage
- Business coverage
- Income protection
- Loan protection

Policies track premium, coverage limit, deductible, status, insured asset, and effective date.

### Claims

Customers can submit structured claims containing:

- Permanent Claim ID
- Connected policy
- Incident type
- Requested amount
- Written fictional incident description
- Submission status
- Reviewer assignment
- Decision record

Claim amounts cannot exceed the associated policy limit. No supporting documents or uploads are accepted.

The Owner and authorized insurance managers can approve or deny claims, specify an approved amount, and record a required reason. Decisions generate audit entries, and Owner overrides are explicitly marked.

## Economy overview

The portal calculates a fictional portfolio summary containing:

- Customer account balances
- Business reserves
- Property values
- Investment values
- Insurance coverage
- Open claims
- Estimated fictional net worth

All values are fictional and have no cash value.

## Owner authority

The Founder and Owner retains full authority over:

- Businesses
- Business activity
- Properties
- Investment records
- Investment values
- Insurance policies
- Claims
- Claim decisions
- Economy permissions
- Corrections and overrides

Privileged claim decisions remain audited.

## Firestore authorization

Phase 13 includes `firestore.phase13.rules`, containing:

- Economy-manager permission helpers
- Business rules
- Immutable business-transaction rules
- Property rules
- Investment rules
- Immutable investment-operation rules
- Insurance-policy rules
- Insurance-claim rules
- The required account-update extension for investment debits

Phase 12 also retains `firestore.phase12.rules` for careers and performance.

Merge both phase modules into the existing `firestore.rules` database block before deploying. The separate modules prevent accidental replacement of the existing minified security-rule file.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Merge `firestore.phase12.rules` into `firestore.rules` if not already completed.
4. Merge `firestore.phase13.rules` into `firestore.rules`.
5. Extend the existing account update rule as directed in the Phase 13 module.
6. Deploy the resulting Firestore rules.
7. Add the website host under **Authentication → Authorized domains**.
8. Complete the Institution Bootstrap exactly once.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, property records, insurance documents, résumés, or attachments. All AFG balances, businesses, properties, investments, insurance policies, claims, careers, and products are fictional and have no cash value.
