# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 6

Earlier phases established the public website, Firebase authentication, Owner Bootstrap, customer identities, banking, progression, and the reusable application framework.

### Phase 6 lending and underwriting

- Dedicated `/lending` staff workspace
- Permission-aware lending access with immediate protected Owner access
- Financial application queue with open, closed, and complete filters
- Application claiming and reviewer assignment
- Applicant response review
- Financial-capacity and debt-to-income analysis
- Trust Score review field
- Risk ratings
- Collateral assessment
- Policy-exception notes
- Additional-information requests
- Underwriting recommendations
- Recommended amount, term, interest rate, conditions, and rationale
- Final approval or denial workflow
- Customer-facing decision letters
- Approved-offer terms and expiration fields
- Customer acceptance or decline
- Pending loan record creation after acceptance
- Immutable lending decision records
- Immutable audit entries
- Explicit Owner override decisions

### Financial products

- Personal Loan
- Emergency Loan
- Vehicle Financing
- Home Mortgage
- Student Loan
- Business Startup Loan
- Business Expansion Loan
- Equipment Loan
- Commercial Property Loan
- Debt Consolidation Loan

Staff applications remain part of the shared Phase 5 application engine and will receive their full HR workflow in Phase 8.

## Lending statuses

Financial applications can move through Draft, Submitted, Initial Review, Assigned, Information Requested, Department Review, Final Review, Approved, Denied, Accepted, Offer Declined, Withdrawn, and Expired.

## Customer experience

Customers can review staff messages, follow the complete application timeline, read a generated decision letter, inspect approved amount, term, interest rate, and conditions, then accept or decline an approved offer. Acceptance atomically creates a loan with `pending-activation` status for Phase 7 servicing.

## Security model

- Customers may read only their own applications and lending decisions.
- Customers cannot edit underwriting analysis, reviewer assignment, recommendations, terms, internal notes, or decision letters.
- A customer may only accept or decline an application already marked Approved.
- Offer response changes are limited to status, response metadata, timestamp, and timeline.
- The pending loan must match the approved application amount and authenticated applicant.
- Authorized lending staff may access only financial applications.
- Lending decisions and audit entries are immutable.
- Owner overrides must be explicitly marked and reasoned.
- The Founder and Owner retains global authority.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

Deploy the Phase 6 Firestore rules before using `/lending`, issuing decisions, or accepting offers.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, or real income records. All AFG balances, applications, scores, decisions, loans, and products are fictional and have no cash value.
