# PQS Training Certification

Example Vue and Node application for managing personal training bookings and
certifications.

- [Product specification](./SPEC.md)
- [File structure plan](./STRUCTURE.md)

## Current status

The repository contains the runnable Vue client, Node API and SQLite data
store described by the implementation specification and structure plan.

## Prerequisites

- Node.js 22.12 or newer
- npm
- Docker with Docker Compose, if using the container workflow

## Run locally

```sh
npm install
cp .env.example .env
npm run db:reset
npm run db:seed
npm run dev
```

Once started:

- Web application: `http://localhost:5173`
- API: `http://localhost:3000`
- SQLite database: `./data/pqs.sqlite`

`npm run dev` should start both the Vue client and Node API with reload enabled.

Verification, invitation and password-reset emails are written to the API
terminal with their complete content and action links. The application does not
send them through an external email provider.

After generating an email, the web interface shows a status message directing
the user to the API console. This means the API terminal must remain visible
when exercising an email flow.

## Run with Docker

```sh
cp .env.example .env
docker compose up --build
```

The Compose setup should bind-mount `./data` so the SQLite database remains
available between container runs.

Stop the application with:

```sh
docker compose down
```

Removing the containers must not remove `./data/pqs.sqlite`.

## Seed data

Run:

```sh
npm run db:seed
```

The seed is repeatable: running it again must not create duplicate companies or
users. All seeded users are email-verified and use the same development-only
password:

```text
PqsDemo123!
```

| Name | Email | Company |
|---|---|---|
| Alex Morgan | `alex.morgan@northstar.test` | Northstar Safety |
| Priya Shah | `priya.shah@northstar.test` | Northstar Safety |
| Sam Lewis | `sam.lewis@northstar.test` | Northstar Safety |
| Maya Chen | `maya.chen@oakfield.test` | Oakfield Engineering |
| Theo Evans | `theo.evans@beacon.test` | Beacon Works |

This creates three companies:

- `northstar.test` belongs to Northstar Safety and has three users.
- `oakfield.test` belongs to Oakfield Engineering and has one user.
- `beacon.test` belongs to Beacon Works and has one user.

The `.test` top-level domain is used so seed addresses cannot deliver email to
real recipients.

## Useful commands

```sh
npm run dev
npm run build
npm run typecheck
npm run lint
npm run format
npm run check
npm run db:seed
npm run db:reset
```

`npm run db:reset` is destructive and must only replace the project-local
`./data/pqs.sqlite` file.

## Reset local data

To recreate the local database and seed accounts:

```sh
npm run db:reset
npm run db:seed
```

Do not manually delete directories outside `./data`.

## Authentication development flow

1. Register with a non-blocked company-domain email.
2. Open the verification URL printed by the API process.
3. Successful verification creates a session and opens the dashboard.
4. For password reset, submit the account email and open the reset URL printed
   by the API process.

The seeded accounts skip email verification because they are already marked as
verified.

## Troubleshooting

### The database contains unexpected data

Run:

```sh
npm run db:reset
npm run db:seed
```

### The client cannot reach the API

Confirm the API is running on port `3000` and that the client API URL in `.env`
matches it.

### A verification, invitation or reset email did not arrive

No external email is sent. Check the API terminal—not the browser console—for a
block beginning with `--- EMAIL ---`.

### What I would have done with more time

It looks like certifications are being archived, this is a bug as certifications should always be visible, this would be a P0 fix.

I think there's a lot of design work that could be done to improve the user experience, I spent most of my time planning and implementing and although I did some planning early in my spec, I think I could have done a lot more.
