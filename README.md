# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Current release — Phase 2A

### Phase 1 foundation

- Responsive public website
- AFG black, white, platinum, and gold design system
- Home, About, Services, Academy, Rules, Privacy, and Terms pages
- Firebase 12.17.1 integration
- Firebase email/password authentication
- Protected customer dashboard shell
- Loading, error, access, and 404 states
- Mobile navigation and responsive portal layout

### Phase 2A owner bootstrap

- One-time Institution Bootstrap gate before the public application loads
- Institution identity and financial-default setup
- Protected Founder and Owner Firebase account
- Permanent Customer ID `CUS-OWNER`
- Permanent Staff ID `STF-000001`
- Founder checking and savings records
- Five default branches
- Twelve default departments with accent colors
- Thirteen-level staff rank structure
- Global Owner permission package and override authority
- Initial system settings and public-registration flag
- First immutable audit record
- Atomic Firestore initialization
- Permanently locked bootstrap record after successful completion
- No document upload capability

## Required Firebase preparation

Before opening the deployed website for the first time:

1. Open the Firebase Console for `afg-game`.
2. Enable **Authentication → Email/Password**.
3. Create the Cloud Firestore database.
4. Deploy the included `firestore.rules`.
5. Add the website host under **Authentication → Authorized domains**.
6. Open the website and complete the Institution Bootstrap exactly once.

The bootstrap uses a generated internal Firebase authentication email based on the selected owner username. The user-facing platform will move to username sign-in during Phase 2B.

## Bootstrap security model

The first institution records must be committed in one atomic batch. Firestore permits that batch only when:

- No bootstrap record already exists.
- The authenticated Firebase user is named as the Owner.
- The same batch creates a completed and locked bootstrap record.

Afterward, the bootstrap record cannot be updated or deleted. The protected Owner may access all initialized records. Phase 2B will add narrowly scoped customer registration and profile rules.

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

The project is a Vite single-page application. It can be deployed to any static host that supports SPA route fallback to `index.html`. Firebase Hosting is not required.

## Safety

Users must never submit:

- Real bank or card details
- Social Security numbers or government identification
- Real financial statements or income records
- Real addresses or employer records
- Uploaded documents

All financial records and products are fictional and have no cash value.
