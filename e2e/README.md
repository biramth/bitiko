# E2E — DEV ONLY, never production

The suite (`npx playwright test`, or `npm run test:e2e`) runs the Vite dev
server on port 5174 in `e2e` mode, which loads `.env.e2e.local` pointing at
the **dev** Supabase project (`tlqgcmbdethmhqrablcy`). Specs create real
users/shops there and delete them in `finally` blocks — nothing must ever run
these against production.

## Required environment

```bash
# .env.e2e.local (gitignored) provides the dev URL + anon key.
# Additionally, per shell session (service role = needed to create/delete
# the throwaway test users; get it from the Supabase dashboard, dev project):
$env:E2E_SUPABASE_URL = "https://tlqgcmbdethmhqrablcy.supabase.co"
$env:E2E_SERVICE_ROLE_KEY = "<dev service_role — never commit>"
npm run test:e2e
```

## Conventions

- One spec file per journey (`marketing`, `auth`, `onboarding`).
- Real UI flows (login through the form, onboarding step by step) — no
  session injection, so the specs prove the product works, not just the API.
- Every created user/shop is deleted in `finally` (see `fixtures.ts`).
- Vercel Hobby note: no new `api/*` files for E2E (12-function cap) — the
  suite only drives the existing app + Supabase client-side APIs.
