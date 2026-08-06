# Apex Financial Group — Final Deployment Checklist

## 1. Firebase Authentication

- Enable Email/Password authentication.
- Add every production and preview host under Authorized domains.
- Keep the protected Founder and Owner account available before public registration opens.

## 2. Firestore rules consolidation

The repository contains the original `firestore.rules` plus modular additions created after the base file became minified.

Merge the modules into the existing database match block in this order:

1. `firestore.phase12.rules`
2. `firestore.phase13.rules`
3. `firestore.phase14.rules`

Phase 13 also requires the documented extension to the existing `/accounts/{id}` update rule so atomic investment debits are accepted.

Do not deploy any phase module by itself. The deployable file must remain a complete Firestore rules document beginning with:

```text
rules_version = '2';
service cloud.firestore {
```

After merging, deploy the completed `firestore.rules` file.

## 3. Static hosting

The application requires SPA fallback so all routes resolve to `index.html`, including:

- `/progression`
- `/applications`
- `/lending`
- `/loans`
- `/careers`
- `/staff`
- `/departments`
- `/academy-center`
- `/career-center`
- `/economy-center`
- `/owner-control`

Firebase Hosting is not required. Any static host with SPA fallback is acceptable.

## 4. Owner verification

After deployment, sign in as the bootstrapped Founder and Owner and verify:

- `/owner-control` loads successfully.
- The Owner can see institution totals.
- Registration and maintenance controls save.
- Economic settings save.
- Events and achievements can be created.
- Override records are immutable.
- Existing customer, staff, lending, servicing, academy, career, and economy portals remain accessible.

## 5. Safety review

- Keep uploads disabled everywhere.
- Do not collect real addresses, identification, bank information, employment records, income records, insurance documents, property documents, or résumés.
- Keep the fictional-finance disclaimer visible throughout registration and customer workflows.
- Review Firestore rules after every permission or collection change.

## 6. Release status

After the merged Firestore rules are deployed and the Owner verification steps pass, all fourteen planned AFG phases are represented in the repository.
