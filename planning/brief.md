
- Include a README covering
  - how to run
  - login email to test

- Nice to have
  - Unit tests
  - Mobile responsiveness

### Concepts

#### User

5 Variants

```js
{
    "id": 1,
    "name": "Leanne Graham",
    "email": "user@technical.biz",
    "company": {
        "name": "Romaguera-Crona"
    }
}
```

#### Topic

10 Variants

```js
{
    "id": 1,
    "name": "Health & Safety Level 1"
}
```

#### Training Record

at least 1 per user

```js
{
    "id": 1,
    "user_id": 1,
    "topic_id": 1,
    "awarded_at": "2026-05-30",
    "expires_at": "2027-05-30" //nullable
}
```

#### Training Booking

```js
{
    "id": 1,
    "user_id": 1,
    "topic_id": 1,
    "commencing_at": "2026-04-30",
    "completed_at": "2026-05-30" //nullable
}
```

## Login Screen

- Email & password fields
- Validation with clear errors
- Real mocked data endpoints (no client app mocking)

## Dashboard

- Upcoming training bookings
- Upcoming training certifications due to expire
- Anything else that supports this

## Table Combining Data Sources

- training status for the logged in user by topic.
  - each row would relate to the topic, whether the user is booked in to undergo the training or
has a record in it or both.
  - forego pagination/filtering or concerns about volume of data
being pulled.
  - think and combine different data sources.

One of the fetch requests must deterministically fail (e.g. getTrainingBookings() always
rejects). It should function correctly after initially rejecting.

There should be empty loading state placeholders with deliberate designs and error states
A working retry mechanism should allow reloading of data

Fetch from all sources and merge/normalise into one row-per-training topic table
