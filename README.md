# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 5

Earlier phases established the public React/Vite website, Firebase authentication, one-time Owner Bootstrap, customer registration, permanent identities, customer banking, transaction history, Trust Scores, reputation, classifications, milestones, and eligibility.

### Phase 5 application framework

- Dedicated `/applications` customer portal
- Shared engine for financial and staff applications
- Personal Loan, Vehicle Financing, Mortgage, Business Financing, and Staff Application templates
- Draft creation and autosafe-ready structured responses
- Customer-controlled draft saving
- Submission workflow
- Withdrawal workflow
- Application IDs and type metadata
- Status badges and application list
- Applicant-visible timeline
- Information-requested resubmission support
- Assigned-reviewer and internal-note fields reserved for staff workflows
- No document, image, PDF, résumé, or attachment uploads
- Responsive desktop and mobile interface

### Application statuses

- Draft
- Submitted
- Initial Review
- Assigned
- Information Requested
- Department Review
- Final Review
- Approved
- Denied
- Withdrawn
- Expired

### Phase 5 security model

Customers may create only their own applications and may initially create them only as drafts. Customer writes must use the permanent Customer ID attached to the authenticated account.

Customers may:

- Save a draft
- Submit a draft
- Edit and resubmit an application when more information is requested
- Withdraw an open application
- Delete their own unsubmitted draft
- Read their own applications and timelines

Customers may not:

- Assign reviewers
- Add internal notes
- Approve or deny applications
- Move applications through staff-review statuses
- Change the application owner, Customer ID, type, or category
- Enable uploads or create attachment fields
- Read another customer's applications

The Owner retains global authority over all applications and may override any decision or workflow. Later staff phases will add permission-scoped reviewer actions, internal notes, decisions, and department queues.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create the Cloud Firestore database.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the deployed website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

The updated Phase 5 Firestore rules must be deployed before customers can create or update applications.

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

Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, or uploaded documents. All AFG balances, applications, scores, classifications, and products are fictional and have no cash value.
