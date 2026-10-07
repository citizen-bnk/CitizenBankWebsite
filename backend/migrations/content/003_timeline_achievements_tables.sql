-- The achievements, progress_timeline and timeline_comments tables exist in production but their DDL is not in the
-- repository; these statements only create them where they are missing (a fresh or demo database) using the
-- columns the code reads and writes. They never alter an existing table.
CREATE TABLE IF NOT EXISTS achievements (
    id               serial PRIMARY KEY,
    title            text        NOT NULL,
    description      text        NOT NULL,
    achievement_date date        NOT NULL,
    category         text        NOT NULL,
    image_url        text,
    display_order    integer     NOT NULL DEFAULT 0,
    is_published     boolean     NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    created_by       text
);

CREATE TABLE IF NOT EXISTS progress_timeline (
    id               serial PRIMARY KEY,
    title            varchar(255) NOT NULL,
    short_story      text         NOT NULL,
    achievement_date date         NOT NULL,
    image_url        text,
    status           text         NOT NULL DEFAULT 'upcoming',
    display_order    integer      NOT NULL DEFAULT 0,
    is_published     boolean      NOT NULL DEFAULT false,
    created_by       text,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timeline_comments (
    id           serial PRIMARY KEY,
    timeline_id  integer     NOT NULL,
    user_id      text,
    user_name    text,
    user_email   text,
    comment_text varchar(128) NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    is_approved  boolean     NOT NULL DEFAULT false
);
