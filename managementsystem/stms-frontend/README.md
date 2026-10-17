# STMS Frontend

React, TypeScript, Vite, and Firebase Auth client for the Smart Trainer Management System.

## Run locally

```bash
cd stms-frontend
npm install
npm run dev
```

The development server runs at `http://localhost:5173` and proxies `/api` to `http://localhost:5000` by default. Set `VITE_API_PROXY_TARGET` in the frontend environment to change the local proxy target. Set `VITE_API_URL` when the frontend must call a separately hosted API (for the local Vite proxy, leave it empty or use `/api/v1`). Configure the Firebase web application values using the `VITE_FIREBASE_*` variables consumed in `src/services/firebase.ts`.

## Build and host

```bash
npm run build
npm run preview
```

`vercel.json` rewrites client-side routes to `index.html`, so direct navigation to authenticated screens works on Vercel. Offline workout details and completion submissions use browser IndexedDB; queued submissions sync when the device reconnects and the app is open.
