# PQS — File Structure Plan

## Goals

The structure should make the application's business concerns obvious, keep
navigation fast and provide clear seams without adding layers for hypothetical
future needs.

The plan uses:

- One repository and one `package.json`
- Client modules for Account, Training and Dashboard
- API modules for Account and Training
- Shared Zod contracts at the client/server boundary
- Direct imports instead of barrel files
- TanStack Query for server state
- Vue Router query parameters for training filters and pagination
- Local Vue state for forms, dialogs and transient UI state

Directories and files should be created only when their feature is implemented.
The tree below is a target layout, not a request to generate empty scaffolding.

## Planned structure

```text
.
├── src/
│   ├── main.ts
│   ├── app/
│   │   ├── App.vue
│   │   ├── router.ts
│   │   ├── query-client.ts
│   │   └── vuetify.ts
│   ├── modules/
│   │   ├── account/
│   │   │   ├── api.ts
│   │   │   ├── pages/
│   │   │   │   ├── AccountEntryPage.vue
│   │   │   │   ├── VerifyEmailPage.vue
│   │   │   │   └── ResetPasswordPage.vue
│   │   │   └── components/
│   │   │       ├── SignInForm.vue
│   │   │       ├── RegistrationForm.vue
│   │   │       ├── ProfileEditor.vue
│   │   │       └── InviteMemberDialog.vue
│   │   ├── training/
│   │   │   ├── api.ts
│   │   │   ├── events.ts
│   │   │   ├── TrainingPage.vue
│   │   │   └── components/
│   │   │       ├── TrainingFilters.vue
│   │   │       ├── TrainingEventList.vue
│   │   │       ├── BookingDialog.vue
│   │   │       └── CertificationDialog.vue
│   │   └── dashboard/
│   │       ├── DashboardPage.vue
│   │       ├── UpcomingBookingsCard.vue
│   │       └── UpcomingExpirationsCard.vue
│   └── shared/
│       ├── http.ts
│       └── components/
│           └── AppShell.vue
├── server/
│   ├── index.ts
│   ├── app.ts
│   ├── config.ts
│   ├── db/
│   │   ├── connection.ts
│   │   ├── schema.sql
│   │   └── seed.ts
│   ├── modules/
│   │   ├── account/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   └── training/
│   │       ├── routes.ts
│   │       └── service.ts
│   └── shared/
│       ├── auth.ts
│       ├── errors.ts
│       └── mailer.ts
├── shared/
│   ├── dates.ts
│   └── contracts/
│       ├── account.ts
│       └── training.ts
├── public/
├── data/
│   └── .gitkeep
├── .env.example
├── compose.yaml
├── Dockerfile
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Business modules

### Account

Account owns:

- Registration
- Email normalisation and company-domain association
- Email verification
- Sign in, sessions and sign out
- Password reset and password change
- Current-user profile
- Company display
- Same-domain invitations

Company association remains part of Account for now. A separate Company module
would contain almost no independent behaviour and would make the registration
flow harder to follow.

Client files:

- `api.ts` contains account request functions, TanStack Query keys/options and
  mutation invalidation.
- Pages own route-level orchestration.
- Components own forms and account-specific interaction.

Server files:

- `routes.ts` handles HTTP input/output, Zod validation and authentication
  requirements.
- `service.ts` owns account rules, database operations and email-domain
  decisions.

### Training

Training owns:

- Topics
- Bookings
- Booking completion and cancellation
- Certifications
- Certification quick create
- Training-event projection
- Filters, sorting and pagination

Client files:

- `api.ts` fetches and mutates raw training data and owns query invalidation.
- `events.ts` is a pure module that projects raw records into events, applies
  URL filters, sorts and paginates.
- `TrainingPage.vue` coordinates URL state, queries and dialogs.
- Components render and edit feature-owned data.

Server files:

- `routes.ts` validates requests and exposes only current-user operations.
- `service.ts` enforces ownership, state transitions and date invariants while
  reading and writing SQLite.

### Dashboard

Dashboard is a client composition module rather than an API domain.

It reads the same Account and Training queries used elsewhere, derives the two
five-item summaries and renders them. It does not introduce a dashboard API or
duplicate training rules.

Dashboard may depend on Account and Training. Account and Training must not
depend on Dashboard.

## Dependency direction

```text
Client app
    -> Dashboard
        -> Account
        -> Training
    -> Account
    -> Training
    -> Client shared

Server app
    -> Account service
    -> Training service
    -> Server shared
    -> Database

Client modules and server modules
    -> Shared contracts
```

Rules:

1. `app/` composes modules and configures framework plugins.
2. Feature modules may import shared code.
3. Shared code never imports a feature module.
4. Account and Training do not import each other's UI or service internals.
5. Dashboard may compose Account and Training client APIs.
6. Client code never imports from `server/`.
7. Server code never imports from `src/`.
8. Only the root `shared/` directory is imported by both sides.
9. Cross-module imports use explicit file paths; do not add `index.ts` barrels.

## Seams

| Seam | Owner | Rule |
|---|---|---|
| HTTP transport | `src/shared/http.ts` | Adds credentials, parses the common error shape and contains no business rules. |
| API contract | `shared/contracts/` | Zod request and response schemas define the client/server data boundary. |
| Authentication | `server/shared/auth.ts` | Resolves the session once and exposes the current `userId`; routes never trust a body or query `user_id`. |
| Account policy | `server/modules/account/service.ts` | Owns email normalisation, blocked domains, verification and company association. |
| Training policy | `server/modules/training/service.ts` | Owns record access, booking transitions and certification invariants. |
| Database | `server/db/connection.ts` | Opens SQLite and exposes the configured connection; business SQL stays in its owning service initially. |
| Email delivery | `server/shared/mailer.ts` | Provides the small send-verification, send-reset and send-invitation boundary. |
| Date handling | `shared/dates.ts` | Pure functions centralise ISO date parsing and the inclusive 90-day calculation; callers provide today's date. |
| Training view model | `src/modules/training/events.ts` | Pure transformation from API data and URL filters to final paginated events. |
| Server state | Module `api.ts` files | TanStack Query owns remote cache, refresh and invalidation. |
| URL state | `TrainingPage.vue` | Vue Router query parameters own filters and pagination. |
| Transient UI state | Owning Vue component | Forms, open dialogs and local selection stay local. |

These are module and function boundaries, not interfaces or classes with only
one implementation.

## Client responsibilities

### `src/app`

- `main.ts` creates Vue and installs the router, Vuetify and TanStack Query.
- `App.vue` renders the router view inside `AppShell`.
- `router.ts` defines lazy-loaded routes and authentication guards.
- `query-client.ts` contains the single QueryClient configuration.
- `vuetify.ts` contains Vuetify theme and component configuration.

Framework setup belongs here rather than inside business modules.

### API access

`src/shared/http.ts` should be a small wrapper over `fetch`:

- Resolve the API base URL.
- Include cookie credentials.
- Send and receive JSON.
- Convert non-success responses into the common application error shape.

Each module's `api.ts` owns its endpoint paths, contracts, query keys and
mutation invalidation. Components do not call `fetch` directly.

Do not create a generated SDK, repository layer or generic CRUD client for this
application.

### State placement

- Remote user and training data: TanStack Query.
- Authentication status: the current-user query.
- Training filters and page: Vue Router query parameters.
- Form fields: the form component.
- Dialog visibility: the closest owning page/component.
- Vuetify theme and application layout: `app/`.

Do not add Pinia or another global store unless a concrete state requirement
cannot fit one of these owners.

## Component strategy

### Page components

Pages coordinate:

- Route parameters
- Queries and mutations
- Loading, error and empty states
- Opening feature dialogs
- Navigation after successful actions

Pages should not contain the details of several substantial forms or repeated
row/card layouts. Extract those as feature components when the page becomes
hard to scan.

### Feature components

Feature components:

- Live inside the business module that owns their meaning.
- Receive plain values and explicit callbacks where practical.
- May use their module's query/mutation functions when they are independently
  responsible for an operation.
- Use Vuetify components directly.
- Use Tailwind for surrounding layout, spacing and responsive composition.

Examples:

- `BookingDialog.vue` owns both create and edit booking form modes.
- `CertificationDialog.vue` owns manual, quick-create and edit modes.
- `TrainingEventList.vue` owns desktop table and narrow-screen card rendering
  because both present the same event collection.
- Dashboard cards stay in Dashboard because they are dashboard-specific
  projections, not reusable Training primitives.

### Shared components

Move a component to `src/shared/components/` only when:

1. It is used by at least two business modules; and
2. Its API has no business-specific vocabulary.

Start with only `AppShell.vue`. Do not wrap `VBtn`, `VDialog`, `VTextField`,
`VTable` or other Vuetify primitives in local `Base*` components. Configure
Vuetify globally and use its components directly.

Loading placeholders should normally remain feature-owned so their shapes match
the content they replace.

### Composables

Create a `use*.ts` composable only when stateful Vue logic is reused by more
than one component. Use a normal pure function for stateless transformations.

`events.ts`, for example, should export normal functions rather than a
`useTrainingEvents` composable.

## Server responsibilities

### Routes

A route should do only four things:

1. Require a session where appropriate.
2. Validate parameters and body with the shared Zod contract.
3. Call one service operation.
4. Translate the result or application error to HTTP.

No SQL or domain branching belongs in a route.

### Services

A service owns business decisions and SQLite operations for its module.

For this application, service functions may use the database connection
directly. Do not introduce repositories, interfaces, a dependency-injection
container or command/handler classes.

If a service later becomes difficult to scan because of SQL volume, extract a
module-local `queries.ts`. That is a refactor trigger, not initial scaffolding.

### Shared server utilities

- `auth.ts`: session cookie lookup and current-user enforcement.
- `errors.ts`: one small application error type and the HTTP error handler.
- `mailer.ts`: email transport and the three email templates.
- `config.ts`: validates environment variables once at startup.

Do not make a general-purpose utility folder. Every shared file must name the
capability it provides.

## Shared code

`shared/dates.ts` contains pure date functions used by both client and server.
The functions receive today's ISO date instead of reading the clock internally,
which keeps the configured date boundary explicit.

### Contracts

`shared/contracts/account.ts` contains Zod schemas and inferred DTO types for:

- Registration and domain lookup
- Verification
- Sign in
- Password reset/change
- Current user
- Invitation
- Common account responses

`shared/contracts/training.ts` contains Zod schemas and inferred DTO types for:

- Topics
- Bookings and booking mutations
- Training records and certification mutations
- Training list responses

Contracts describe data crossing HTTP. They do not contain database queries,
Vue state, HTTP calls or server-only secrets.

Avoid duplicating a TypeScript interface beside a Zod schema:

```ts
export const BookingSchema = z.object({
  id: z.number().int(),
  topicId: z.number().int(),
  commencingAt: z.string(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
})

export type Booking = z.infer<typeof BookingSchema>
```

## Naming conventions

- Vue pages: `ThingPage.vue`
- Other Vue components: business noun or action, such as
  `CertificationDialog.vue`
- Composables: `useThing.ts`
- Pure modules: nouns describing their output, such as `events.ts`
- API module: `api.ts`
- Server entry points: `routes.ts` and `service.ts`
- Shared contracts: singular business module name
- API JSON fields: camelCase
- Database fields: snake_case

Conversion between database rows and API DTOs happens in the owning server
service.

## DX requirements

The repository should provide:

- `npm run dev`: starts client and API with reload from one command
- `npm run build`: builds both client and API
- `npm run typecheck`: checks client, server and shared contracts
- `npm run lint`: checks the full repository
- `npm run format`: formats the full repository
- `npm run check`: runs typecheck and lint
- `npm run db:seed`: inserts example topics/data
- `npm run db:reset`: explicitly resets only `./data/pqs.sqlite` for local use

Additional conventions:

- `@/` resolves to `src/`.
- `@shared/` resolves to the root `shared/` directory.
- `.env.example` lists every required variable with safe example values.
- Environment variables are read only through `server/config.ts` or Vite's
  client environment boundary.
- One formatter and one linter configuration cover the whole repository.
- Route pages are lazy-loaded.
- Errors displayed to users use one predictable shape.

## Refactor triggers

Add structure only when one of these concrete conditions appears:

- Add `queries.ts` when SQL obscures service business logic.
- Add a feature `components/` directory when a module has multiple components.
- Move a component to Shared only after a second module uses it.
- Add a composable only after stateful logic is duplicated.
- Add server-side filtering and pagination when fetching all personal training
  data becomes measurably slow.
- Add a persistent invitation model only when invitation status, expiry or
  resending must be tracked.
- Add a Company module only when company settings gain independent behaviour.
- Add a repository abstraction only if the database technology actually
  changes or data access becomes independently complex.

## Structures intentionally omitted

- No monorepo workspace packages
- No domain/application/infrastructure layer hierarchy
- No repository interfaces
- No dependency-injection container
- No command bus or event bus
- No generic CRUD framework
- No client global store
- No local Vuetify wrapper design system
- No barrel exports
- No folder containing one speculative abstraction per file
- No test directory in the initial example scope

The architecture's main seams are the shared HTTP contracts, module services,
the current-user authorization boundary, the email adapter and the pure
training-event projection. Everything else stays direct until the code proves
it needs another layer.
