# NextSignal

Australia-first business research. The local Validate My Idea workflow creates private, versioned preview reports. Grow, paid research and checkout are planned.

## Start locally

Install Node.js 24 and npm, then start Docker Desktop with its Linux engine. From the repository root:

```sh
npm ci
npm run auth:up
npm run dev
```

1. Open [Create an account](http://127.0.0.1:3000/auth/sign-up). Enter an email address and a password of at least 12 characters.
2. Open the [local email inbox](http://127.0.0.1:55424) in the same browser and follow the verification link. The inbox also receives password reset emails.
3. Open **Validate My Idea**, submit a test idea, review and confirm its profile, then start a snapshot. Use **View report** when the run completes, or find it in [Reports](http://127.0.0.1:3000/account/reports).

Reports use a local simulated research workflow by default. The email service, original fixture database and authenticated workspace database remain local. Keep `.local/` private.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Supabase Auth at `http://127.0.0.1:3000` |
| `npm run dev:fixture` | Explicit Alice/Bob fixture environment at `http://127.0.0.1:3001`. Stop the other mode first. |
| `npm run check` | Lint, typecheck, unit tests, secret scan and build |
| `npx playwright install chromium` | Install the browser for Playwright |
| `npm run test:auth` | Auth browser tests with the local Supabase stack running |
| `npm run test:e2e` | Browser tests in fixture mode |
| `npm run test:design` | Optional layout checks and screenshots with local Supabase Auth |
| `npm run test:postgres` | Native PostgreSQL, RLS and multi-worker tests |

[Documentation index](docs/README.md) · [Local Auth and recovery](docs/operations/LOCAL_SUPABASE_AUTH.md) · [Database naming cutover](docs/operations/DATABASE_NAMING_CUTOVER.md) · [Design](DESIGN.md)
