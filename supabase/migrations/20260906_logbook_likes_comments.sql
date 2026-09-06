-- =============================================================
-- Migration: Add Likes and Comments for Logbook Posts
-- =============================================================

-- 1. Tabel likes untuk post
CREATE TABLE IF NOT EXISTS "public"."logbook_post_likes" (
    "post_id"    UUID  NOT NULL REFERENCES "public"."logbook_posts"("id") ON DELETE CASCADE,
    "user_id"    UUID  NOT NULL REFERENCES "public"."logbook_interns"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("post_id", "user_id")
);

-- 2. Tabel komentar untuk post
CREATE TABLE IF NOT EXISTS "public"."logbook_post_comments" (
    "id"                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "post_id"           UUID        NOT NULL REFERENCES "public"."logbook_posts"("id") ON DELETE CASCADE,
    "user_id"           UUID        NOT NULL REFERENCES "public"."logbook_interns"("id") ON DELETE CASCADE,
    "parent_comment_id" UUID        REFERENCES "public"."logbook_post_comments"("id") ON DELETE CASCADE,
    "content"           TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
    "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabel likes untuk komentar
CREATE TABLE IF NOT EXISTS "public"."logbook_comment_likes" (
    "comment_id" UUID  NOT NULL REFERENCES "public"."logbook_post_comments"("id") ON DELETE CASCADE,
    "user_id"    UUID  NOT NULL REFERENCES "public"."logbook_interns"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("comment_id", "user_id")
);

-- 4. Kolom denormalized counter di logbook_posts & logbook_post_comments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logbook_posts' AND column_name = 'like_count') THEN
        ALTER TABLE "public"."logbook_posts" ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logbook_posts' AND column_name = 'comment_count') THEN
        ALTER TABLE "public"."logbook_posts" ADD COLUMN "comment_count" INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logbook_post_comments' AND column_name = 'like_count') THEN
        ALTER TABLE "public"."logbook_post_comments" ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 5. Trigger auto sync like_count di logbook_posts
CREATE OR REPLACE FUNCTION "public"."sync_post_like_count"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE "public"."logbook_posts" SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE "public"."logbook_posts" SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "trg_sync_post_like_count" ON "public"."logbook_post_likes";
CREATE TRIGGER "trg_sync_post_like_count"
    AFTER INSERT OR DELETE ON "public"."logbook_post_likes"
    FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_like_count"();

-- 6. Trigger auto sync comment_count di logbook_posts
CREATE OR REPLACE FUNCTION "public"."sync_post_comment_count"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE "public"."logbook_posts" SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE "public"."logbook_posts" SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "trg_sync_post_comment_count" ON "public"."logbook_post_comments";
CREATE TRIGGER "trg_sync_post_comment_count"
    AFTER INSERT OR DELETE ON "public"."logbook_post_comments"
    FOR EACH ROW EXECUTE FUNCTION "public"."sync_post_comment_count"();

-- 7. Trigger auto sync like_count di logbook_post_comments
CREATE OR REPLACE FUNCTION "public"."sync_comment_like_count"()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE "public"."logbook_post_comments" SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE "public"."logbook_post_comments" SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "trg_sync_comment_like_count" ON "public"."logbook_comment_likes";
CREATE TRIGGER "trg_sync_comment_like_count"
    AFTER INSERT OR DELETE ON "public"."logbook_comment_likes"
    FOR EACH ROW EXECUTE FUNCTION "public"."sync_comment_like_count"();

-- 8. Trigger touch updated_at untuk komentar
DROP TRIGGER IF EXISTS "trg_logbook_post_comments_updated_at" ON "public"."logbook_post_comments";
CREATE TRIGGER "trg_logbook_post_comments_updated_at"
    BEFORE UPDATE ON "public"."logbook_post_comments"
    FOR EACH ROW EXECUTE FUNCTION "public"."touch_logbook_updated_at"();

-- 9. Indexes untuk performa kueri
CREATE INDEX IF NOT EXISTS "idx_post_likes_post_id"        ON "public"."logbook_post_likes" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_likes_user_id"        ON "public"."logbook_post_likes" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_post_comments_post_id"     ON "public"."logbook_post_comments" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_comments_created_at"   ON "public"."logbook_post_comments" ("created_at" ASC);
CREATE INDEX IF NOT EXISTS "idx_post_comments_parent_id"   ON "public"."logbook_post_comments" ("parent_comment_id");
CREATE INDEX IF NOT EXISTS "idx_comment_likes_comment_id"  ON "public"."logbook_comment_likes" ("comment_id");
CREATE INDEX IF NOT EXISTS "idx_comment_likes_user_id"     ON "public"."logbook_comment_likes" ("user_id");
