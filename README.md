# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 10

Earlier phases established the public website, Firebase authentication, Owner Bootstrap, customer identities, banking, progression, applications, lending, loan servicing, staff hiring, appointments, and the Staff Workspace.

### Phase 10 departments and specialized operations

- Dedicated `/departments` operations center
- Twelve department-specific workspaces
- Permission-aware department navigation
- Department-colored visual identities
- Operational work queues
- Department work types
- Priority and critical-work indicators
- Connected-system metrics
- Department staffing totals
- Manager work assignment
- Assignee-only completion workflow
- Conflict-of-interest blocking
- Existing Lending, Loan Servicing, Hiring, and Staff Workspace connections
- Responsive desktop and mobile interface

## Departments

- Customer Services
- Banking Operations
- Lending & Underwriting
- Collections & Recovery
- Business & Commercial Services
- Fraud & Investigations
- Risk & Compliance
- Internal Audit
- Human Resources
- Training & Development
- Technology & Systems
- Executive Office

Each department has its own accent color, permission package, terminology, available work types, operational queue, metrics, and connected systems.

## Connected operations

### Lending & Underwriting

Displays the live count of open financial applications and links directly to the Phase 6 Lending Workspace.

### Collections & Recovery

Displays loans requiring specialized servicing and links directly to the Phase 7 Loan Center.

### Human Resources

Displays open staff applications and links directly to the Phase 8 Careers and Hiring Center.

### Other departments

Customer Services, Banking Operations, Commercial Services, Fraud, Compliance, Audit, Training, Technology, and Executive Operations use structured department work items. This provides usable departmental gameplay now while preserving room for deeper case systems in later releases.

## Department work items

Authorized managers can create work items containing:

- Department
- Assigned staff member
- Work type
- Title
- Instructions
- Priority
- Optional related customer UID

Work items receive permanent `OPS-` identifiers and appear in the appropriate department queue.

Assigned staff may complete only their own work. Ordinary staff cannot reassign, rewrite, or delete work items.

## Conflict-of-interest controls

A manager may enter a related Customer UID when assigning work. If the related UID matches the assigned employee's own customer identity, the work item is automatically marked conflict-restricted and cannot be completed by that staff member.

This extends the platform principle that staff may not process records connected to their own customer identity.

## Access model

- The Owner and `staff.manage` users can view all department workspaces and assign work.
- Ordinary staff see their assigned department and any additional department unlocked by exact permissions.
- Department access does not automatically grant protected lending, collections, HR, or management capabilities.
- Connected systems continue to enforce their original protected permissions.
- The Owner retains global access and override authority.

## Security model

Phase 10 uses the existing Phase 9 `staffTasks`, staff-directory, application, loan, and permission rules.

- Staff may read only their own work unless they are authorized managers.
- Only authorized managers may create department assignments.
- Staff may complete only their own assigned work.
- Conflict-restricted assignments cannot be completed.
- Financial applications and loans remain protected by their specialized permissions.
- Private customer and HR data are not exposed through the department directory.
- The Owner permission package remains protected.

No Firestore rules change is required specifically for Phase 10. The latest committed rules from Phase 9 must still be deployed.

## Required Firebase preparation

1. Enable **Authentication → Email/Password**.
2. Create Cloud Firestore.
3. Deploy the included `firestore.rules` after every rules update.
4. Add the website host under **Authentication → Authorized domains**.
5. Complete the Institution Bootstrap exactly once.

## Local development

```bash
npm install
npm run dev
npm run build
```

The application may be deployed to any static host supporting SPA fallback to `index.html`. Firebase Hosting is not required.

## Safety

No document uploads are available. Users must never submit real bank details, card details, government identification, financial statements, real addresses, real employers, real income records, résumés, or attachments. All AFG balances, applications, staff roles, department assignments, and products are fictional and have no cash value.
