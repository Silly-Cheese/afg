# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 11

Earlier phases established the public website, Owner Bootstrap, customer identities, banking, progression, applications, lending, loan servicing, staff hiring, the Staff Workspace, permissions, and department operations.

## Phase 11 — Apex Financial Academy

Phase 11 adds the complete customer education and staff training layer at `/academy-center`.

### Customer Academy

- Course catalog
- Course enrollment
- Lesson reader
- Final assessments
- Passing-score requirements
- Academy XP
- Academy levels
- Completion history
- Permanent certificates
- Customer and staff course audiences

### Staff Academy

- Required onboarding courses
- Department training
- Staff training assignments
- Due dates
- Training status
- Certificate records
- Promotion-readiness foundation

### Academy management

The Owner and authorized academy managers can:

- Create courses
- Choose customer or staff audiences
- Add lesson content
- Build two-option assessment questions
- Set passing scores
- Set XP rewards
- Mark courses required
- Assign staff courses
- Set assignment due dates

Default launch courses include Financial Foundations, Responsible Borrowing, AFG Staff Orientation, and Customer Privacy & Safety.

## Certificate model

Passing a final assessment creates an immutable certificate containing:

- Certificate ID
- Course ID and title
- Holder UID
- Score
- XP award
- Issue timestamp
- Active status

Certificates cannot be edited or deleted through ordinary workflows.

## Progression integration

Completed courses increase Academy XP and Academy level. Required staff training and certificates are now available for Phase 12 career, performance, and promotion requirements.

## Security model

- Signed-in users may read active Academy courses.
- Customers may create and update only their own enrollments.
- Users may read only their own certificates unless they are Academy managers or the Owner.
- Certificates are immutable.
- Only the Owner or users with `training.manage`, `academy.manage`, `staff.manage`, or `owner.override_all` may create courses or assign staff training.
- Staff training assignments are visible to the assigned employee and authorized Academy managers.
- No document uploads are available.
- The Founder and Owner retains global authority.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

Deploy the Phase 11 Firestore rules before enrolling in courses, submitting assessments, issuing certificates, creating courses, or assigning staff training.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, résumés, or attachments. All AFG balances, applications, courses, certificates, roles, and products are fictional and have no cash value.
