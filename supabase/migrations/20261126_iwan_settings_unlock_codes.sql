-- Migration: IWAN Administrator 6-Digit One-Time Settings Unlock Codes
-- Date: 2026-11-26
-- Description: One-time 6-digit codes issued by ADMIN to temporarily unlock Squid & Settings changes in distributed IWAN Administrator builds.

CREATE TABLE IF NOT EXISTS public.iwan_settings_unlock_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) NOT NULL,
    label VARCHAR(100),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    consumed_installation_id VARCHAR(128),
    consumed_mac VARCHAR(17)
);

CREATE INDEX IF NOT EXISTS idx_iwan_settings_unlock_active
    ON public.iwan_settings_unlock_codes(code)
    WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iwan_settings_unlock_created_at
    ON public.iwan_settings_unlock_codes(created_at DESC);

ALTER TABLE public.iwan_settings_unlock_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'iwan_settings_unlock_codes'
          AND policyname = 'service_role_iwan_settings_unlock_codes'
    ) THEN
        CREATE POLICY service_role_iwan_settings_unlock_codes
            ON public.iwan_settings_unlock_codes
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
