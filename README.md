# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 8

Earlier phases established the public website, Firebase authentication, Owner Bootstrap, customer identities, banking, progression, applications, lending, underwriting, loan activation, payments, and servicing.

### Phase 8 staff applications and hiring

- Dedicated `/careers` customer and HR portal
- Department and entry-position directory
- Structured staff applications with no uploads
- Preferred department, position, and branch selection
- Availability, experience, skills, motivation, and scenario responses
- Customer-visible application status and messages
- HR staff-application queue
- Initial screening
- Interview requests
- Interview completion
- Department review
- Executive review
- Conditional acceptance
- Denial workflow
- Scored internal review record
- Final appointment workflow
- Permanent randomized Staff IDs
- Staff Trainee rank assignment
- Department, branch, and position assignment
- Active probation status
- Default staff permissions
- Required onboarding-training assignment
- Immutable appointment and audit records
- Explicit Owner override appointments
- Existing customer account upgraded to customer-and-staff access

## Staff application lifecycle

Staff applications can move through Submitted, Initial Screening, Interview Requested, Interview Completed, Department Review, Executive Review, Conditionally Accepted, Accepted, Denied, Withdrawn, or Expired.

Accepted applicants retain their original Customer ID and receive a new permanent Staff ID. The same login then carries both customer and staff roles.

## Appointment package

Every standard appointment creates:

- Staff ID
- Staff profile
- Staff Trainee rank
- Department assignment
- Branch assignment
- Entry position
- Trainee staff status
- Active probation
- Initial staff permission package
- Required onboarding assignment
- Immutable appointment record
- Immutable audit event

Required onboarding begins with AFG Orientation, Professional Conduct, Customer Privacy, Fictional Information Safety, and Conflict of Interest.

## Security model

- Customers can submit only applications connected to their own UID and Customer ID.
- Staff applications use structured text fields only; uploads remain disabled.
- Customers cannot appoint themselves, assign ranks, create Staff IDs, or grant permissions.
- The protected Owner currently operates the complete HR review and appointment workflow.
- Owner decisions may bypass ordinary stages but must include a written reason and remain audited.
- Staff appointment records cannot be edited or deleted.
- Appointed staff may read their own staff profile, permission record, onboarding assignment, and appointment record.
- Phase 9 will activate the complete staff workspace and granular permission-management interface.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

Deploy the Phase 8 Firestore rules before reviewing staff applications or creating appointments.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, résumés, or attachments. All AFG balances, applications, roles, appointments, and products are fictional and have no cash value.
