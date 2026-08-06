# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 12

Earlier phases established the public website, Owner Bootstrap, customer identities, banking, progression, applications, lending, loan servicing, staff hiring, the Staff Workspace, permissions, department operations, and the Apex Financial Academy.

## Phase 12 — Careers, Branches, and Performance

Phase 12 adds the long-term staff career and institutional management layer at `/career-center`.

### Career center

Staff can review:

- Permanent Staff ID
- Current rank and position
- Department and branch assignments
- Probation status
- Completed Academy certificates
- Required training progress
- Promotion readiness
- Performance-review history
- Career-request history

### Promotion readiness

The portal evaluates four readiness categories:

- Required training completion
- Probation completion
- Performance standard
- Clear disciplinary standing

Readiness is advisory. Promotions are never granted automatically.

### Career requests

Staff can submit structured requests for:

- Leave
- Temporary inactivity
- Branch transfer
- Department transfer
- Promotion
- Resignation
- Return from leave

Requests may include a requested branch, department, or rank. Managers and the Owner can approve or deny pending requests.

### Performance reviews

Authorized managers can create reviews covering:

- Activity
- Accuracy
- Communication
- Compliance
- Customer service
- Teamwork
- Department knowledge
- Leadership
- Training completion

Reviews include an overall score, comments, outcome, promotion recommendation, and training recommendation. Review records are immutable.

### Career events

Approved promotions, transfers, leave actions, resignations, and returns create immutable career-history events and audit records.

### Branch competition

The Branch Board ranks branches using a current operational score based on:

- Loan quality
- Completed application activity
- Staff capacity
- Current branch operations

Each branch card displays its score, staffing, loans, and applications. Phase 14 can expand these scorecards with customer satisfaction, compliance, recovery, and award controls.

## Owner authority

The Founder and Owner can:

- View all staff career records
- Issue performance reviews
- Approve or deny every career request
- Promote staff
- Transfer staff between branches or departments
- Place staff on leave
- Restore staff from leave
- Record resignations
- Override ordinary career workflows

Owner overrides must include a reason and remain audited.

## Firestore authorization

Phase 12 includes `firestore.phase12.rules`, containing the new rule matches for:

- `performanceReviews`
- `careerRequests`
- `careerEvents`

Merge those matches into the existing `firestore.rules` database block before deploying the Phase 12 career-write features. The separate module prevents the existing minified rule file from being replaced incorrectly.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Merge `firestore.phase12.rules` into `firestore.rules`.
4. Deploy the resulting Firestore rules.
5. Add the website host under **Authentication → Authorized domains**.
6. Complete the Institution Bootstrap exactly once.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, résumés, or attachments. All AFG balances, applications, careers, reviews, branches, roles, and products are fictional and have no cash value.
