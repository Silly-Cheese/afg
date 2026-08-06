# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 4

Earlier phases established the public React/Vite website, Firebase authentication, one-time Owner Bootstrap, customer registration, permanent identities, checking and savings accounts, atomic transfers, fictional income, and transaction history.

### Phase 4 customer progression

- Dedicated `/progression` customer portal
- Financial Trust Score range from 300 to 850
- Critical, Developing, Fair, Strong, Excellent, and Elite score tiers
- Customer reputation from 0 to 100
- Dynamic account standing
- Customer, Premium Customer, Business Customer, and Restricted Customer classifications
- Product-eligibility indicators for banking, personal lending, vehicle financing, mortgages, business financing, and premium products
- Transparent score-factor display
- Customer milestone system
- Progress scale and standing seal
- Restriction warnings and limited-access display
- Responsive progression interface

### Owner progression controls

The protected Founder and Owner can search an exact Customer ID and override:

- Financial Trust Score
- Customer reputation
- Account standing
- Customer classification
- Restricted or active status

Every Owner override requires a written reason and creates:

- An immutable `progressionOverrides/{overrideId}` record
- A matching immutable audit-log record
- Previous and replacement values
- Owner UID, target UID, Customer ID, reason, and timestamp

The Owner retains global authority. Customers can view their own progression information but cannot change score, reputation, standing, classification, restrictions, or override history.

## Progression model

Calculated standing considers the customer's Trust Score, reputation, restriction state, and business status. Eligibility is transparent and deterministic so customers can see why a product is available or locked.

Initial milestones include:

- Permanent customer identity
- Checking and savings activation
- Five account transactions
- 1,000 in fictional savings
- A Trust Score of 650
- Premium Customer eligibility

Future phases will connect loan performance, payment history, Academy completion, application activity, and debt utilization to this model.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create the Cloud Firestore database.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the deployed website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

Phase 4 uses the existing Phase 3 rules because customer progression records remain read-only to customers and Owner writes are already protected by the bootstrap Owner UID.

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

Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, or uploaded documents. All AFG balances, scores, classifications, and products are fictional and have no cash value.
