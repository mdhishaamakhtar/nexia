DROP TABLE IF EXISTS email_verification_tokens;

DROP INDEX IF EXISTS idx_users_email;

ALTER TABLE users
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS email_verified,
    ADD COLUMN IF NOT EXISTS username VARCHAR(100) NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username);
