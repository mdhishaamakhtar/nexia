CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id                BIGSERIAL    PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name         VARCHAR(150) NOT NULL,
    bio               TEXT,
    profession        VARCHAR(150),
    long_term_goals   TEXT,
    relationship_type VARCHAR(50)  NOT NULL CHECK (relationship_type IN ('Friend','Family','Colleague','Classmate','Crush','Ex','Mentor','Other')),
    birthday          DATE,
    zodiac_sign       VARCHAR(50)  CHECK (zodiac_sign IN ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')),
    music_preference  TEXT,
    favorite_movie    VARCHAR(200),
    favorite_book     VARCHAR(200),
    favorite_memory   TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);

CREATE TABLE IF NOT EXISTS tags (
    id         BIGSERIAL    PRIMARY KEY,
    profile_id BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tag        VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_tags_profile_id ON tags (profile_id);

CREATE TABLE IF NOT EXISTS political_views (
    id         BIGSERIAL    PRIMARY KEY,
    profile_id BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    view       VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_political_views_profile_id ON political_views (profile_id);

CREATE TABLE IF NOT EXISTS food_restrictions (
    id          BIGSERIAL    PRIMARY KEY,
    profile_id  BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    restriction VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_food_restrictions_profile_id ON food_restrictions (profile_id);

CREATE TABLE IF NOT EXISTS movie_genres (
    id         BIGSERIAL    PRIMARY KEY,
    profile_id BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    genre      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_movie_genres_profile_id ON movie_genres (profile_id);

CREATE TABLE IF NOT EXISTS book_genres (
    id         BIGSERIAL    PRIMARY KEY,
    profile_id BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    genre      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_book_genres_profile_id ON book_genres (profile_id);

CREATE TABLE IF NOT EXISTS hangout_places (
    id         BIGSERIAL    PRIMARY KEY,
    profile_id BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    place      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_hangout_places_profile_id ON hangout_places (profile_id);

CREATE TABLE IF NOT EXISTS quotes (
    id         BIGSERIAL PRIMARY KEY,
    profile_id BIGINT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quote      TEXT
);

CREATE INDEX IF NOT EXISTS idx_quotes_profile_id ON quotes (profile_id);

CREATE TABLE IF NOT EXISTS top_songs (
    id         BIGSERIAL    PRIMARY KEY,
    profile_id BIGINT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name       VARCHAR(255),
    artist     VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_top_songs_profile_id ON top_songs (profile_id);

CREATE TABLE IF NOT EXISTS associated_songs (
    profile_id BIGINT       PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    name       VARCHAR(255),
    artist     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS profile_embeddings (
    profile_id BIGINT       PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL,
    embedding  vector(3072) NOT NULL,
    payload    JSONB        NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_embeddings_user_id ON profile_embeddings (user_id);
