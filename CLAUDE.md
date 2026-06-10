# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

> Documented against the `release-6.3.1` branch.

## Project overview

James French Photography website — a React + TypeScript single-page app backed
by an AWS Amplify (Gen 2) serverless backend. It serves two audiences:

- **Clients** browse photo collections, favorite photos, manage their profile,
  view/buy packages, and book photo-session timeslots.
- **Admins** manage collections, photo sets, tags, packages, scheduling
  (timeslots), tables, and notifications from a dedicated dashboard.

Payments (packages, no-show fees, short-notice cancellation orders) are handled
through PayPal. Email is sent via SES/SendGrid through custom Amplify functions.

## Commands

All commands run from the repo root unless noted.

```bash
npm run dev        # Start the Vite dev server
npm run build      # Type-check (tsc -b) then production build (vite build)
npm run lint       # Run ESLint over the project
npm run preview    # Preview the production build
```

There is no test runner configured. `npm run build` is the primary
correctness gate — it runs `tsc -b` before bundling, so a green build means
the TypeScript project (app + node configs) type-checks cleanly. Run
`npm run lint` and `npm run build` before considering a change done.

### Dependencies

The repo has two `package.json` files. Install both when setting up:

```bash
npm ci          # root (app + Amplify backend tooling)
cd amplify && npm ci   # amplify/ runtime deps for Lambda handlers
```

### Amplify backend

```bash
npx ampx sandbox                       # Spin up a personal cloud sandbox
npx ampx generate outputs --stack <stack-name>   # Generate amplify_outputs.json
```

`amplify_outputs.json` is **generated** and git-ignored. The app imports it at
startup (`src/main.tsx`), so you must generate outputs (sandbox or an existing
stack) before `npm run dev` / `npm run build` will work against real infra.

### Migration / utility scripts

```bash
AWS_PROFILE=<profile> npx tsx <script>     # e.g. scripts/release-6.3.0/*.ts
gcloud auth application-default login       # GCP (reCAPTCHA Enterprise)
aws sso login                               # AWS
```

Per-release data migration scripts live under `scripts/<release>/`. Required env
vars (table names, S3 buckets, prod vs non-prod) are listed in `README.md`.

## Architecture

### Frontend stack

- **React 18** + **TypeScript** + **Vite 7**
- **TanStack Router** (file-based, code-split) for routing — route tree is
  auto-generated into `src/routeTree.gen.ts` by the `@tanstack/router-plugin`
  Vite plugin. **Do not edit `routeTree.gen.ts` by hand.**
- **TanStack Query** for server-state/caching, wired into the router context.
- **Tailwind CSS** + **Flowbite React** for styling/components. Custom fonts
  (`main`, `birthstone`, `bodoni`) and an `xs` (400px) breakpoint are defined in
  `tailwind.config.js`. Color utility classes are safelisted there.
- **PayPal** (`@paypal/react-paypal-js`, `@paypal/paypal-server-sdk`) for
  checkout. **AWS Amplify** client SDK for auth/data/storage.

### App entry & providers

`src/main.tsx` configures Amplify, creates the GraphQL `client`
(`generateClient<Schema>()`) and the `QueryClient`, then mounts the router. The
provider nesting is `AuthProvider` → `QueryClientProvider` → `RouterProvider`.
The router `context` carries `{ client, queryClient, auth }`, so routes and
loaders can reach data services and auth without prop drilling.

### Authentication & authorization

- `src/auth.tsx` defines `AuthProvider` / `useAuth()` and the `AuthContext`.
  Auth state (a `UserStorage`) is persisted in `localStorage` under the key
  `jfp.auth.user`. It wraps Amplify Auth (`signIn`, `signOut`,
  `fetchAuthSession`, etc.) and resolves the user's `UserProfile` + participants
  via `UserService`.
- Cognito groups `ADMINS` and `USERS` drive authorization. `admin` on the auth
  context reflects membership in `ADMINS`.
- Route protection lives in `src/routes/_auth.tsx` (`beforeLoad`): it redirects
  unauthenticated users to `/login`, expired sessions out, and non-admins away
  from `/admin/*`. It also supports unauthenticated photo access via a
  `temporaryToken` search param (validated against `TemporaryAccessToken`).

### Routing layout (`src/routes/`)

File-based routes. The `_auth.` prefix denotes the authenticated layout:

- `index.tsx`, `login.tsx`, `register.tsx`, `orders.tsx` — public/entry routes.
- `_auth.admin/dashboard/*` — admin: `collection`, `package`, `scheduler`,
  `table`, `tagging`, `notification`.
- `_auth.client/dashboard/*` — client: `index`, `package`, `scheduler`,
  `advertise`; plus `_auth.client/profile.tsx`.
- `_auth.photo-collection.$id.tsx`, `_auth.photo-fullscreen.tsx`,
  `_auth.favorites-fullscreen.tsx` — photo viewing.

Routes use TanStack Router loaders that call into services and prime the
`queryClient` (e.g. `ensureQueryData(service.someQueryOptions(...))`).

### Data layer (`src/services/`)

Each domain has a service that wraps the Amplify GraphQL `client`. Two patterns
coexist — match whichever the file you're editing already uses:

- **Class services** (e.g. `UserService`, `CollectionService`) instantiated with
  the `client`.
- **Module-level functions** (e.g. `getAllPaths`, `mapParticipant`).

Services expose TanStack Query `queryOptions(...)` factories
(`*QueryOptions`) so routes/components share cache keys, plus `map*` helpers
that convert raw `Schema['Model']['type']` records into the app's domain types
(`src/types`). Services compose each other (e.g. collection → favorites, tags,
paths). Domains include: `collection`, `photoPath`, `photoSet`, `watermark`,
`favorite`, `tag`, `table`, `package`, `timeslot`, `notification`, `share`,
`payment`, `user`.

### Other frontend modules

- `src/functions/` — domain helper logic that isn't a service (e.g.
  `paymentFunctions`, `timeslotFunctions`, `tableFunctions`, `tagFunctions`,
  `clientFunctions`, `packageFunctions`, `photoFunctions`).
- `src/components/` — UI, grouped by area (`admin/`, `client/`, `payment/`,
  `timeslot/`, `register/`, `collection/`, `modals/`, `common/`, ...).
- `src/hooks/` — `windowDimensions`, `scrollPosition`.
- `src/types/` — `index.ts` (domain types), `backend-types.ts`, `constants.ts`
  (e.g. `StateCode` enum), `order-ref-id.ts`.
- `src/utils/` — shared helpers (`parsePathName`, etc.).

### Backend (`amplify/`)

Amplify Gen 2, composed in `amplify/backend.ts` via `defineBackend(...)`.

- **`amplify/auth/`** — `defineAuth` (email login, `ADMINS`/`USERS` groups,
  custom `verified` attribute). Triggers: `postConfirmation`, `preSignUp`,
  `customMessage`. Auth-adjacent functions: `get-auth-users`,
  `update-user-attribute`, `admin-update-user-attributes`,
  `verify-contact-challenge`.
- **`amplify/data/resource.ts`** — the single large `a.schema({...})` (~870
  lines) defining all models and custom query/mutation operations backed by
  Lambdas. Models include `PhotoCollection`, `PhotoSet`, `PhotoPaths`,
  `Watermark`, `UserFavorites`, `UserProfile`, `UserTag`/`CollectionTag`/
  `TimeslotTag`, `Package`/`PackageItem`/`PackageItemCollection`,
  `TableGroup`/`Table`/`TableColumn`, `Timeslot`, `TemporaryAccessToken`,
  notification models, and more. Authorization is per-model via
  `.authorization((allow) => [...])`, typically `allow.group('ADMINS')` plus
  scoped authenticated/guest access. (There's a `// TODO: break me out into
  different schemas` note — keep additions consistent with the existing style.)
- **`amplify/functions/`** — Lambda handlers grouped by domain: `collections/`
  (add/delete public photo, download/share, repair paths), `timeslots/`
  (register, confirmation email, no-show fee, short-notice cancellation orders),
  `users/` (register, notify, save payment info), `utils/` (auto-complete
  address, complete vault). Each function is a folder with `resource.ts`
  (`defineFunction`, Node 22, secrets/env) + `handler.ts`.
- **`amplify/custom/`** — CDK constructs (e.g. `PublicStorage`: public S3 bucket
  + CloudFront distribution wired to the photo functions; `email/`, `metrics/`).
- **`amplify/storage/`** — `defineStorage` for the (private) photo bucket.

Secrets (e.g. PayPal client id/secret/merchant id, reCAPTCHA) are injected via
`secret(...)` in function `resource.ts` files — never hard-code them.

## Conventions & gotchas

- **Never hand-edit `src/routeTree.gen.ts`** — it's regenerated on dev/build.
- **`amplify_outputs.json` is generated** and git-ignored; don't commit it.
- ESLint ignores `dist` and `amplify` (`eslint.config.js`); backend code is not
  linted by `npm run lint`.
- When adding a data operation, define it in `amplify/data/resource.ts`, back it
  with a function under `amplify/functions/<domain>/`, register the function in
  `amplify/backend.ts`, then expose a `queryOptions`/service method on the
  frontend so callers share the query cache.
- Map raw schema records to domain types in the service layer rather than
  passing `Schema[...]['type']` shapes into components.
- Two Node `package.json`s: root for the app, `amplify/` for Lambda runtime
  deps — add backend runtime dependencies to `amplify/package.json`.

## CI

`.github/workflows/main.yml` ("Validate Branch") runs on PRs and manual
dispatch: Node 22, `npm ci` (root) + `npm ci` (amplify), configure AWS via OIDC,
`npx ampx generate outputs --stack <sandbox>`, then `npm run build`. Keep the
build green — that's the gate.
