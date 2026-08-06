# Apex Financial Group

Apex Financial Group (AFG) is a fictional financial institution and economy simulation for a Discord-based community. It does not provide real banking, lending, credit, insurance, investment, or employment services.

## Phase 1 — Foundation

Phase 1 includes:

- Responsive public website
- AFG black, white, platinum, and gold design system
- Home, About, Services, Academy, Rules, Privacy, and Terms pages
- Firebase 12.17.1 integration
- Firebase email/password registration and sign-in
- Protected customer dashboard
- Loading, error, access, and 404 states
- Locked Firestore rules until the Phase 2 data model is installed
- Mobile navigation and responsive portal layout

## Local development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Firebase setup required

In the Firebase Console for `afg-game`:

1. Open **Authentication**.
2. Open **Sign-in method**.
3. Enable **Email/Password**.
4. Add the domain where the site will be hosted to **Authorized domains**.
5. Create a Firestore database if one has not been created.
6. Deploy `firestore.rules` before Phase 2 begins.

Phase 1 intentionally prevents all Firestore reads and writes. Phase 2A will add the one-time Owner Bootstrap and install the initial institution data model and security rules.

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
