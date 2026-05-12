# Bas Pay (`bas_payment`)

A **single-page checkout** for the Bas merchant **SDK payment** flow. It loads a transaction from the server using a `trxToken` from the URL, guides the customer through method selection and account / OTP steps, confirms payment, and shows success, completion, or error states—with **English / Arabic** UI, **RTL** support, and a **printable receipt**.

---

## What it provides

| Area | Behavior |
|------|----------|
| **Bootstrap** | Calls **pre-initialize** with `trxToken` to load order amount, merchant (mini-app) info, commissions, and enabled payment methods. |
| **Checkout** | Step 1: choose payment method. Step 2: account / phone, optional extra fields, OTP when required, then **confirm payment**. |
| **Success** | Shows transaction id (with copy), order reference, payer name, totals, method, account, **date & time**; optional **print** layout (invoice-style). |
| **Already paid** | If the transaction is already completed, a dedicated screen with a **done** indicator and optional **continue** link when `redirecturl` is allowed. |
| **Errors** | Network / API failures and configuration issues surface with clear messaging. |
| **i18n** | `language` query param (e.g. `ar`, `en`); document `dir` / `lang` follow the active locale. |

API surface used by the app (relative to the configured API base, or same-origin `/api` in dev):

- `POST /api/v1/merchant/sdk-payment/pre-initialize-payment`
- `POST /api/v1/merchant/sdk-payment/initiate-payment`
- `POST /api/v1/merchant/sdk-payment/confirm-payment`

---

## Requirements

- **Node.js** 18+ (recommended LTS)
- **npm** (or compatible client) for installing dependencies and running scripts
- A **modern browser** (ES modules, `fetch`, CSS used by the UI)

---

## Configuration

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit **`.env`**:

   | Variable | Purpose |
   |----------|---------|
   | `VITE_API_BASE_URL` | Full API origin **without** trailing slash (e.g. `https://api.example.com`). **Leave empty in local dev** to call same-origin `/api/...` and use the Vite proxy (see below). |
   | `VITE_SDK_BEARER_TOKEN` | **Required.** Bearer token the backend expects for SDK payment endpoints. |
   | `VITE_BASGATE_*` | Optional footer links (home, privacy, terms, contact). |

3. **Local development proxy** (`vite.config.ts`): when `VITE_API_BASE_URL` is empty, requests go to `/api/...` and Vite proxies them to the target host. Override the target with:

   ```bash
   VITE_PROXY_API_TARGET=https://your-api-host.example
   ```

   Default proxy target if unset: `https://api-tst.basgate.com`.

> **Security:** Treat `VITE_SDK_BEARER_TOKEN` as a secret in real deployments; do not commit `.env`. For production builds, inject env at build time or serve the app behind your own gateway that adds auth—follow your organization’s policy.

---

## URL parameters

The app reads **query string** parameters on load:

| Parameter | Description |
|-----------|-------------|
| `trxToken` | **Required** for a valid session. Transaction token from the payment link. |
| `language` | Optional. e.g. `ar`, `en` (also accepts `ar-*` / `en-*`). If omitted, the browser locale is used. |
| `userIdentifier` | Optional. Pre-filled account / phone identifier for step 2. |
| `fullName` | Optional. Shown on receipt / success when provided. |

Example (local dev):

```text
http://localhost:5173/?trxToken=YOUR_TOKEN&language=ar&userIdentifier=777000000&fullName=Customer%20Name
```

---

## Scripts

```bash
npm install          # install dependencies
npm run dev          # Vite dev server (HMR)
npm run build        # TypeScript check + production bundle to dist/
npm run preview      # Serve the production build locally
```

---

## Project layout (high level)

```text
src/
  api/           # preInitialize, initiatePayment, confirmPayment
  locales/       # ar.json, en.json
  styles/        # app.css
  types/         # payment / API typings
  ui/            # screens, steps, layout, printable receipt
  app.ts         # state machine + orchestration
  main.ts        # entry
  urlParams.ts   # query parsing
```

Static assets used by the UI (e.g. platform logo) live under `public/` as referenced by the code.

---

## Tech stack

- **TypeScript**
- **Vite** 8
- **canvas-confetti** (success celebration)
- **lottie-web** (loading animation)

---

## License / product

Private package (`"private": true` in `package.json`). Use and distribution are governed by your Bas / merchant agreements.

---

## Developer & technical support

**Abdulelah Alasri** — application developer and technical support.

- **Email:** [alasriaj@gmail.com](mailto:alasriaj@gmail.com)
- **Phone / WhatsApp:** [+967777706727](tel:+967777706727)
