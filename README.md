# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, property, business, or employment services.

## Current release — Phase 14

All fourteen planned development phases are now represented in the repository.

## Phase 14 — Administration, Economy, Overrides, and Final Polish

Phase 14 adds the protected Founder and Owner administration layer at `/owner-control`.

### Owner Control Center

The Founder and Owner can review institution-wide totals for:

- Customers
- Staff
- Applications
- Active loans
- Businesses
- Properties
- Investments
- Insurance claims
- Branches
- Departments
- Audit records
- Owner overrides

The control center also links directly to every major portal built in earlier phases.

### System controls

The Owner can control:

- Public registration
- Maintenance mode
- Public verification availability
- Institution-news availability

Every saved system-control change creates an immutable audit record.

### Economy controls

The Owner can publish institution-wide settings for:

- Economic climate
- Base interest rate
- Inflation rate
- Property-value modifier
- Investment-performance modifier
- Business-performance modifier
- Loan availability

Supported climates include stable growth, rapid growth, inflation, recession, housing changes, credit tightening, business expansion, and investment surges.

### Institution events

The Owner can create events containing:

- Permanent Event ID
- Title
- Description
- Event category
- Start and end times
- Status
- Optional modifier type and value

These records provide the foundation for savings challenges, business months, financial-literacy events, branch competitions, and economy storylines.

### Achievement builder

The Owner can create achievements containing:

- Permanent Achievement ID
- Name
- Description
- Customer or staff category
- Point value
- Badge identifier
- Active status

### Verification center

The Owner Control Center can verify exact Customer, Staff, and Business IDs and search institution-facing names. The lookup returns only limited identity and status information.

### Global override ledger

The Owner can record an override containing:

- Permanent Override ID
- Target collection
- Target record ID
- Field changed
- Previous value
- Replacement value
- Required written reason
- Owner UID
- Immutable timestamp

Owner override records and their matching audit entries cannot be edited or deleted through ordinary workflows.

## Final system structure

AFG now contains:

1. Public website and Firebase foundation
2. Owner Bootstrap
3. Customer identities and banking
4. Financial Trust Score and progression
5. Reusable applications
6. Lending and underwriting
7. Loan servicing and collections
8. Staff applications and appointments
9. Staff Workspace and permissions
10. Department operations
11. Apex Financial Academy
12. Careers, branches, and performance
13. Businesses, properties, investments, and insurance
14. Owner administration, economy controls, events, achievements, verification, and overrides

## Firestore authorization

The repository includes modular rule additions:

- `firestore.phase12.rules`
- `firestore.phase13.rules`
- `firestore.phase14.rules`

Merge them into the original `firestore.rules` database match block in that order. Phase 13 also requires the documented account-update extension for atomic investment debits.

Do not deploy a phase module by itself. Deploy only a complete Firestore rules document.

See `FINAL_DEPLOYMENT.md` for the complete production checklist.

## Required Firebase preparation

1. Enable Authentication → Email/Password.
2. Create Cloud Firestore.
3. Merge the Phase 12, 13, and 14 rule modules into `firestore.rules`.
4. Apply the Phase 13 account-update extension.
5. Deploy the completed Firestore rules.
6. Add the website host under Authentication → Authorized domains.
7. Complete the Institution Bootstrap exactly once.
8. Verify `/owner-control` using the protected Founder and Owner account.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, property records, insurance documents, résumés, or attachments. All AFG balances, applications, careers, businesses, properties, investments, insurance records, events, achievements, and products are fictional and have no cash value.
