# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 9

Earlier phases established the public website, Firebase authentication, Owner Bootstrap, customer identities, banking, progression, applications, lending, loan servicing, staff applications, and appointments.

### Phase 9 staff workspace and permissions

- Dedicated `/staff` workspace
- Staff-only access gate
- Owner-compatible executive staff profile
- Rank, position, department, branch, status, and probation display
- Staff overview dashboard
- Personal task queue
- Task completion workflow
- Staff directory
- Career profile
- Required-training summary
- Internal policy center
- Internal announcements
- Manager task assignment
- Protected permission manager
- Responsive desktop and mobile staff interface
- Direct links to Customer Portal, Careers, Lending, and Loan Center

## Staff workspace areas

### Overview

Shows the staff member's rank, position, department, branch, open assignments, training obligations, probation state, and recent announcements.

### My Work

Staff members can review and complete only tasks assigned to their own Staff ID and UID. Authorized managers and the Owner can assign work to staff members.

### Staff Directory

Authenticated staff can view institution-facing staff identity fields including Staff ID, rank, position, department, branch, and status. Customer-private information and HR notes are not exposed through the directory.

### My Career

Displays the permanent Staff ID, current rank, position, organizational assignments, staff standing, probation state, and onboarding or training assignments.

### Policies and Announcements

Staff can read internal policies and announcements. The Owner and staff with `staff.manage` permission can publish new policies and announcements. Ordinary staff cannot edit or delete institutional records.

### Permission Management

The Owner and authorized staff managers can update protected staff permission packages. Permissions are entered as exact capability keys, such as:

```text
applications.view
applications.review
loans.view
collections.manage
staff.manage
```

The Founder and Owner permission package is protected and cannot be replaced, reduced, or deleted through the Staff Workspace.

## Access model

Phase 9 continues the institutional access principle:

> Rank determines authority. Department determines responsibility. Branch determines assignment. Permissions determine exact capabilities.

A staff title alone does not grant every department tool. Specialized systems such as Lending and Loan Servicing continue to verify protected permission records before granting operational access.

## Conflict-of-interest boundaries

Staff and customer identities remain attached to the same login but continue to operate in separate portal contexts. Existing application, lending, and servicing safeguards prevent customers or staff members from altering protected records through ordinary customer workflows. The Owner retains global override authority, with audited privileged actions.

## Security model

- Only appointed staff or the Owner may enter `/staff`.
- Staff may read staff-directory identity records but not customer-private records.
- Staff may read only tasks assigned to them unless they hold management permission.
- Staff may complete only their own assigned tasks.
- Only the Owner or `staff.manage` users may assign tasks, publish internal content, or manage permissions.
- Permission managers cannot replace or delete the Owner permission record.
- Permission updates create immutable audit entries.
- Policies and announcements are read-only to ordinary staff.
- The Owner retains global authority.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

Deploy the Phase 9 Firestore rules before opening the Staff Workspace, assigning tasks, publishing policies, or managing permissions.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, résumés, or attachments. All AFG balances, applications, staff roles, assignments, and products are fictional and have no cash value.
