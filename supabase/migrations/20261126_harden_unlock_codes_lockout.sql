-- Migration: Database-backed attempt lockout for IWAN 6-digit Settings Unlock OTPs
-- Date: 2026-11-26
-- Description: Adds failed_attempts and locked_at so OTP codes burn after 5 invalid attempts across all Cloudflare PoPs/isolates.

ALTER TABLE public.iwan_settings_unlock_codes
    ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_iwan_settings_unlock_failed_attempts'
    ) THEN
        ALTER TABLE public.iwan_settings_unlock_codes
            ADD CONSTRAINT chk_iwan_settings_unlock_failed_attempts
            CHECK (failed_attempts >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_iwan_settings_unlock_unlocked
    ON public.iwan_settings_unlock_codes(expires_at)
    WHERE consumed_at IS NULL AND locked_at IS NULL;
