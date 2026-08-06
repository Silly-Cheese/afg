# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 2B

### Phase 1 foundation

- Responsive public website
- AFG black, white, platinum, and gold design system
- Firebase 12.17.1 integration
- Firebase email/password authentication
- Protected portal routing
- Mobile navigation, public rules, privacy, terms, and disclaimers

### Phase 2A owner bootstrap

- One-time Institution Bootstrap gate
- Protected Founder and Owner identity
- Institution settings, branches, departments, ranks, permissions, and audit initialization
- Permanent bootstrap lock
- Global Owner access and override authority

### Phase 2B public customer registration

- Public registration controlled by `systemSettings/main.registrationEnabled`
- Every new account begins as a customer
- Unique normalized AFG usernames
- Random permanent Customer IDs such as `CUS-A4P8K2`
- Customer profile and protected private profile records
- Everyday Checking account with the bootstrap starting balance
- Growth Savings account
- Financial Trust Score profile using the bootstrap starting score
- Academy profile starting at Level 1
- Founding Customer achievement and points
- Opening-balance transaction record
- Welcome notification
- Immutable registration audit event
- Functional customer portal with identity, balances, accounts, score, academy level, profile progress, and notifications
- No document upload capability

## Required Firebase preparation

1. Open the Firebase Console for `afg-game`.
2. Enable **Authentication → Email/Password**.
3. Create the Cloud Firestore database.
4. Deploy the included `firestore.rules` after every security-rule update.
5. Add the deployed website host under **Authentication → Authorized domains**.
6. Complete the Institution Bootstrap exactly once.

## Phase 2B security model

Customer registration is performed in one Firestore transaction. The security rules allow customer self-creation only when:

- Institution bootstrap is complete.
- Public registration is enabled.
- The authenticated UID has no existing `users/{uid}` record.
- The same transaction creates a customer-only user record.
- Every related record uses the same UID and Customer ID.
- Starting balances and Trust Score match the protected bootstrap settings.

After registration, customers cannot use the registration permissions again to create additional accounts, opening deposits, scores, achievements, or welcome records. Customers can read their own portal data but cannot directly modify balances, scores, roles, classifications, or audit logs. The Owner retains global access.

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

Users must never submit:

- Real bank or card details
- Social Security numbers or government identification
- Real financial statements or income records
- Real addresses or employer records
- Uploaded documents

All financial records and products are fictional and have no cash value.
