PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email_domain TEXT NOT NULL UNIQUE
    CHECK (email_domain = lower(trim(email_domain)))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
    CHECK (email = lower(trim(email))),
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  company_id INTEGER REFERENCES companies(id),
  pending_company_name TEXT
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  awarded_at TEXT NOT NULL,
  expires_at TEXT,
  CHECK (expires_at IS NULL OR expires_at >= awarded_at)
);

CREATE TABLE IF NOT EXISTS training_bookings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  commencing_at TEXT NOT NULL,
  completed_at TEXT,
  cancelled_at TEXT,
  CHECK (completed_at IS NULL OR cancelled_at IS NULL)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
