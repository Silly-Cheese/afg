# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, property, business, or employment services.

## Current release — Stabilization Update

This release consolidates the completed Phase 1–14 platform and applies the production fixes requested after mobile testing.

### Included in this release

- Mobile navigation and modal stabilization
- Visible Android account selectors
- Legacy Founder account-name compatibility
- Academy Firestore transaction-order repair
- Customer and Owner loan-payment controls
- Account dropdowns for loan payments
- Owner payroll for one customer or all active customers
- Payroll audit records and customer transaction history
- GitHub Pages project-path routing
- Username-based sign-in
- One authoritative `firestore.rules` file

### Major portals

- `/dashboard` — Customer banking
- `/progression` — Trust Score and progression
- `/applications` — Financial and staff applications
- `/lending` — Lending and underwriting
- `/loans` — Loan payments, servicing, and collections
- `/careers` — Staff applications
- `/staff` — Staff Workspace
- `/departments` — Department operations
- `/academy-center` — Apex Financial Academy
- `/career-center` — Careers, branches, and performance
- `/economy-center` — Businesses, property, investments, and insurance
- `/owner-control` — Owner administration and payroll

## Firestore authorization

The repository uses one complete root-level file:

```text
firestore.rules
```

Do not merge or deploy phase fragments. Publish the entire root `firestore.rules` file in Firebase.

## Deployment

GitHub Pages is deployed through GitHub Actions. In Repository Settings → Pages, the source must be set to **GitHub Actions**.

## Local development

```bash
npm install
npm run dev
npm run build
```

## Safety

No document uploads are available. Users must never submit real banking details, government identification, real addresses, real income records, financial statements, property records, insurance documents, résumés, or attachments. All AFG records and balances are fictional and have no cash value.
