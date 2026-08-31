# Athletics Club

## Dashboard access setup

Dashboard access is stored in the shared Firestore document
`settings/siteAdmins`. A signed-in user must be on this list before the
dashboard content is shown or editable.

1. Add the email address of the first Firebase user to `VITE_INITIAL_ADMIN_EMAIL`
   in your local `.env` and in the environment settings for your deployed site.
2. In `firestore.rules`, replace `club.admin@example.com` with that exact same
   email address, then deploy the Firestore rules.
3. Sign in once with that account. This creates the shared admin list.
4. Use **Dashboard → Admin Access** to grant access to other Firebase accounts.

The initial email only bootstraps an empty list. Once it has been created, it is
an ordinary admin and can be removed by another admin. This supports a complete
handover when students graduate. Do not delete the shared admin document; it
would re-enable the bootstrap account.

The accompanying `firebase.json` points Firebase CLI at the included rules:

```bash
firebase deploy --only firestore:rules
```

## Vite + React

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
