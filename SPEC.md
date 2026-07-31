# PQS — Training Certification

## Purpose

PQS Training Certification is an example web application for an individual to manage their own training
bookings and certifications.

Users are associated with a company by their verified email domain. Company
membership does not grant access to any other user's profile or training data.
There are no user roles and no company-wide training views.

## Stack

- Vue 3
- Vue Router
- Vuetify
- Tailwind CSS 4
- TanStack Query
- TypeScript
- Zod
- Node API
- SQLite
- Docker
- PWA

Vuetify owns interactive components, their behaviour and component-level
styling. Tailwind CSS owns page layout, responsive composition, spacing and
small utility adjustments. Shared colours, typography and breakpoints must be
defined consistently so the two systems do not introduce competing design
tokens. Tailwind utilities should not override Vuetify component internals.

The implementation layout and module boundaries are defined in
[STRUCTURE.md](./STRUCTURE.md).

## Scope

### Included

- Registration using a company email address
- Email verification
- Sign in and cookie-based sessions
- Password reset by email
- Automatic company association by verified email domain
- Convenience invitations for people at the same company
- Personal training bookings
- Personal certifications
- A combined, filterable training timeline
- Dashboard summaries
- Responsive layouts and loading placeholders
- Installable PWA shell

### Deliberate non-goals

- Roles or company administrators
- Viewing or managing another user's data
- Company-wide training reports
- Multiple company membership
- Deleting bookings or certifications
- Comprehensive production security hardening
- Automated test coverage
- Production deployment
- Database migrations, backups or production operations
- Server-side training filters or pagination
- Offline mutations

## Core rules

1. Email matching and uniqueness are case-insensitive.
2. `gmail.com` and `outlook.com` are blocked as registration domains.
3. The first successfully verified user for an unclaimed domain creates its
   company.
4. Every later verified user with that domain is linked to the existing company.
5. A domain can belong to exactly one company.
6. A user can belong to exactly one company.
7. A user can view and mutate only their own profile and training data.
8. An invitation does not grant access. It only sends a registration link to
   another email address on the inviter's company domain.
9. Bookings never turn into certifications automatically.
10. A certification is created either manually or through the optional quick
    create shown when a booking is completed.
11. Bookings and certifications may be edited but never deleted.
12. An uncompleted booking may be completed or cancelled.
13. Completed and cancelled bookings move to the archive immediately.
14. Today is considered upcoming.
15. Expirations more than 90 days in the future are hidden by default.
16. Certifications without an expiration date do not produce expiration events.

## Data model

The schema is intentionally simple. Fields ending in `_id` imply their foreign
key relationship. No additional indexes are required for this example.

```text
table Companies
    id INT PRIMARY
    name VARCHAR(250)
    email_domain VARCHAR(250) UNIQUE

table Users
    id INT PRIMARY
    name VARCHAR(250)
    email VARCHAR(250) UNIQUE
    password_hash VARCHAR(250)
    email_verified_at DATETIME NULL
    company_id INT NULL
    pending_company_name VARCHAR(250) NULL

table Topics
    id INT PRIMARY
    name VARCHAR(250)

table TrainingRecords
    id INT PRIMARY
    user_id INT
    topic_id INT
    awarded_at DATE
    expires_at DATE NULL

table TrainingBookings
    id INT PRIMARY
    user_id INT
    topic_id INT
    commencing_at DATE
    completed_at DATE NULL
    cancelled_at DATE NULL

table Sessions
    id VARCHAR(250) PRIMARY
    user_id INT
    expires_at DATETIME

table EmailVerificationTokens
    id INT PRIMARY
    user_id INT
    token_hash VARCHAR(250)
    expires_at DATETIME
    used_at DATETIME NULL

table PasswordResetTokens
    id INT PRIMARY
    user_id INT
    token_hash VARCHAR(250)
    expires_at DATETIME
    used_at DATETIME NULL
```

### Derived booking states

- **Open:** `completed_at` and `cancelled_at` are null.
- **Completed:** `completed_at` is set and `cancelled_at` is null.
- **Cancelled:** `cancelled_at` is set and `completed_at` is null.

`completed_at` and `cancelled_at` must never both be set.

### Date rules

- Dates are stored as ISO `YYYY-MM-DD` calendar dates.
- Date comparisons use the application's configured local timezone.
- `expires_at`, when present, must be on or after `awarded_at`.
- Manual certification award dates may be today or in the past.
- Quick-created certifications default `awarded_at` to the booking completion
  date.
- An expiration dated today is upcoming, not archived.
- The 90-day window is inclusive: today through today plus 90 calendar days.

## Email and company association

### Normalisation

Before comparison:

1. Trim surrounding whitespace from the email.
2. Lowercase the complete email address.
3. Store the normalised lowercase email address.
4. Extract the part after the final `@` as the domain.
5. Reject malformed addresses.
6. Reject an exact domain match of `gmail.com` or `outlook.com`.

Subdomains are treated as distinct domains. Other consumer email providers are
not blocked in this example.

### New-domain registration

1. The user submits their name, email and password.
2. The API normalises the email and checks whether its domain is already owned.
3. If the domain is unclaimed, the UI asks for a company name before submitting
   registration.
4. The API creates an unverified user and sends a verification email. The
   submitted company name is stored as `pending_company_name` until verification.
5. When the user follows the verification link, the API atomically checks the
   domain again:
   - If it remains unclaimed, create the company and claim the domain.
   - If another user has claimed it in the meantime, discard the pending company
     name and link the user to the existing company.
6. Mark the user's email as verified, link the company, clear
   `pending_company_name` and create a session.

The first successfully verified account therefore owns the company-creation
step, including when two people register with the same new domain concurrently.

### Existing-domain registration

1. The user submits their name, email and password.
2. The company-name step is not shown because the domain is already claimed.
3. The API creates an unverified user and sends a verification email.
4. On successful verification, link the user to the company that owns the
   domain and create a session.

The domain is checked again at verification rather than trusting client state.

### Invitation

- Any verified user may invite another person.
- The invitee email must be valid and have the same normalised domain as the
  inviter.
- The application sends a registration link with the invitee email prefilled.
- Invitations do not need to be accepted to allow registration.
- No invitation record is required.
- Invalid or different-domain addresses receive inline validation feedback.

## Authentication

### Password rules

- Minimum length: 8 characters.
- Maximum length: 128 characters.
- No uppercase, number or symbol composition requirement.
- Password and password-confirmation fields must match during registration and
  reset.
- Passwords are stored only as password hashes.

### Sign in

- Only verified users may sign in.
- Successful sign in creates an authenticated cookie session and redirects to
  `/dashboard`.
- Invalid email and password combinations return the same generic message.
- After five failed attempts for an email address within 15 minutes, further
  attempts are rejected until the 15-minute window ends.

### Email verification

- Verification links are single-use and expire after 24 hours.
- An unverified user can request a replacement verification email.
- A replacement invalidates any earlier unused verification token.

### Password reset

- A user can request a reset email by entering their email address.
- The request always returns the same success response, whether or not the
  account exists.
- Reset links are single-use and expire after one hour.
- A successful reset updates the password and revokes the user's existing
  sessions.

### Password change

- A signed-in user supplies their current password and a new valid password.
- A successful change revokes every other session but preserves the current
  session.

### Sign out

- End the current server session.
- Clear the authentication cookie.
- Clear user-specific TanStack Query cache data.
- Set client authentication state to guest.
- Redirect to `/`.

## Data access

Every authenticated API operation derives the current `user_id` from the server
session.

- A user may read or update only their own user record.
- Every training query includes the session user's `user_id`.
- Every training mutation verifies that the target record has that `user_id`.
- A client-supplied `user_id` is never used to select another user's data.
- Company membership is used only for company display and domain validation.
- Company membership never expands data visibility.

## Training bookings

### Create

Required fields:

- Topic
- Commencing date

A newly created booking is open.

### Edit

The topic and commencing date may be edited. Editing never changes completion
or cancellation state.

### Complete

- Only an open booking may be completed.
- Completion sets `completed_at` to today.
- The booking moves to Archive immediately.
- The UI then offers an optional certification quick create, prefilled with the
  booking topic and an award date equal to `completed_at`.
- Dismissing the quick create leaves the booking completed without creating a
  certification.
- The booking and any resulting certification remain separate records.

### Cancel

- Only an open booking may be cancelled.
- Cancellation sets `cancelled_at` to today.
- The booking moves to Archive immediately.
- Cancellation does not create a certification.

Bookings are never deleted.

## Certifications

### Create

A certification can be created:

- Manually from the training page; or
- From the optional quick create after completing a booking.

Required fields:

- Topic
- Awarded date

Optional fields:

- Expiration date

### Edit

The topic, awarded date and expiration date may be edited. The expiration date
may be added, changed or removed, provided it is not before the awarded date.

Certifications are never deleted.

## Training event projection

The API returns the current user's raw bookings, certifications and topics.
The client projects them into timeline events before filtering, sorting and
pagination.

```ts
type TrainingEvent = {
  eventId: string
  sourceId: number
  sourceType: 'booking' | 'training-record'
  type: 'booking' | 'certification' | 'expiration'
  topicId: number
  topicName: string
  relevantDate: string
  status: 'open' | 'overdue' | 'completed' | 'cancelled' | 'awarded' | 'expired'
  section: 'upcoming' | 'archive'
}
```

Event identifiers are stable client identifiers:

- `booking:{bookingId}`
- `certification:{trainingRecordId}`
- `expiration:{trainingRecordId}`

### Projection rules

Each booking produces one Booking event.

- Open booking dated today or later: Upcoming, status `open`.
- Open booking before today: Upcoming, status `overdue`.
- Completed booking: Archive, status `completed`, using `completed_at` as its
  relevant date.
- Cancelled booking: Archive, status `cancelled`, using `cancelled_at` as its
  relevant date.

Each training record produces:

- One Certification event at `awarded_at`, in Archive with status `awarded`.
- One Expiration event at `expires_at`, when `expires_at` is present.

Expiration event placement:

- Before today: Archive, status `expired`.
- Today or later: Upcoming.
- More than 90 days after today: omitted by default.
- No `expires_at`: no Expiration event is created.

The duplication of a training record into Certification and Expiration events
is intentional.

## Training filters, sorting and pagination

All filtering, sorting and pagination occur in the client after the complete
current-user training dataset has been fetched and projected into events.

### URL query parameters

- `topic`: topic identifier
- `type`: `booking`, `certification` or `expiration`
- `from`: inclusive ISO date
- `to`: inclusive ISO date
- `includeArchived`: `true` or omitted
- `includeFutureExpirations`: `true` or omitted
- `page`: positive integer, default `1`
- `pageSize`: positive integer, default `20`

The URL is the source of truth for active filters and pagination so the view is
refreshable and shareable.

### Filter rules

- Topic, type, date range, archive and future-expiration filters combine with
  AND semantics.
- Date filters apply to `relevantDate`.
- Archive events are hidden unless `includeArchived=true`.
- Expirations beyond 90 days are hidden unless
  `includeFutureExpirations=true`.
- Filter tags show every active non-default filter and allow it to be removed.
- Changing any non-page filter resets `page` to `1`.

### Sorting

Sort events by:

1. `relevantDate` ascending for Upcoming, descending for Archive.
2. Event type: Expiration, Certification, Booking.
3. `eventId` ascending as a deterministic tie-breaker.

Upcoming and Archive are rendered as distinct sections when Archive is enabled.

### Pagination

- Pagination is applied after event projection, filters and sorting.
- Duplicated Certification and Expiration events each count as one row.
- Default page size: 20 final events.
- If filtering reduces the page count below the current page, return to page 1.

## Routes and interface

### Shared navigation

- Dashboard
- Training
- Sign out

On mobile, navigation is fixed at the bottom and a content spacer prevents it
from obscuring the end of the page.

### `/`

Guest page containing:

- Sign-in form
- Registration form
- Forgot-password action

An authenticated user is redirected to `/dashboard`.

Registration dynamically shows the company-name step only when the entered,
valid email domain is not already claimed.

### `/verify-email`

- Reads the verification token from the URL.
- Shows loading, success, expired, already-used and invalid states.
- Successful verification signs the user in and redirects to `/dashboard`.

### `/reset-password`

- Reads the reset token from the URL.
- Allows entry and confirmation of a new password.
- Shows loading, success, expired, already-used and invalid states.
- Successful reset redirects to `/`.

### `/dashboard`

Authenticated users see:

- Their company name
- An invite-company-member action
- Their email and profile editor
- An Upcoming Training Bookings card
- An Upcoming Certificate Expirations card

#### Upcoming Training Bookings card

- Count all open bookings.
- List the next five by relevant date, including overdue bookings.
- Link to `/training?type=booking`.
- When empty, retain the normal card dimensions and show:
  `You have no upcoming Bookings`.

#### Upcoming Certificate Expirations card

- Count expirations from today through today plus 90 days, inclusive.
- List the next five by relevant date.
- Link to `/training?type=expiration`.
- When empty, retain the normal card dimensions and show:
  `You have no upcoming Certificate Expirations`.

### `/training`

Authenticated users see:

- Add booking action
- Add certification action
- Topic filter
- Type filter
- Date-range filter
- Include Archive filter
- Include expirations beyond 90 days filter
- Active filter tags
- Responsive combined-event table/list
- Pagination

Columns:

- Topic
- Type
- Status
- Relevant date
- Actions

Available actions depend on source type and state:

- Open booking: Edit, Complete, Cancel
- Completed booking: Edit
- Cancelled booking: Edit
- Certification or expiration event: Edit Certification

Both events from the same training record open the same certification editor.

## Responsive UX

- Every page works from narrow mobile layouts through desktop.
- The desktop training table becomes stacked event cards or a compact list on
  narrow screens.
- Initial page loads and query transitions use shape-matched loading
  placeholders.
- Forms show inline validation and a disabled submitting state.
- Mutations prevent duplicate submission.
- Empty states preserve surrounding layout.
- Failed queries show an inline error with a retry action.
- Modals return focus to their triggering control when closed.
- Interactive elements are keyboard accessible and visibly focused.

## PWA behaviour

- The application shell and static assets may be cached for installation and
  repeat loading.
- Authenticated API data and mutations require a network connection.
- The UI displays an offline state instead of pretending a mutation succeeded.
- User-specific query data is cleared on sign out.

## API responsibilities

The API provides:

- Register and company-domain lookup
- Verify email and resend verification
- Sign in and sign out
- Request and complete password reset
- Read and update current user
- Send same-domain invitation email
- List topics
- List, create and update the current user's bookings
- Complete or cancel the current user's open booking
- List, create and update the current user's training records

The API returns raw data only. Training event projection, filtering, sorting and
pagination are client responsibilities for this example.

All request bodies and responses are validated with Zod-compatible schemas.
Validation failures identify fields; unexpected failures use a generic error.

## Local Docker data

The SQLite database file lives at:

```text
./data/pqs.sqlite
```

Docker bind-mounts the project-local `./data` directory into the API container.
The directory is excluded from version control except for an optional
placeholder file.

No migration, backup or production persistence process is required.

## Acceptance summary

- A blocked consumer-domain email cannot register.
- Email and domain matching work regardless of letter case.
- The first verified account for a domain creates its company.
- Later verified accounts with that domain join the existing company.
- A user cannot access any other user's profile or training records.
- Invitations work only for the inviter's domain and confer no permissions.
- Open bookings can be edited, completed or cancelled.
- Completing a booking offers, but does not force, certification creation.
- Certifications can be created manually and edited.
- No booking or certification can be deleted.
- Today appears in Upcoming.
- Completed and cancelled bookings appear in Archive immediately.
- Undated expiration events are absent.
- Expirations beyond 90 days are hidden by default.
- URL filters combine with AND semantics and apply on the client.
- Pagination applies after training records expand into final events.
- Dashboard cards show counts, up to five events, links and fixed-size empty
  states.
- Responsive pages show loading placeholders during fetches.
