-- ==============================================================================
-- Migration: 20261112_caslab_plotting_config.sql
-- Description: Ensure web_config table exists and document caslab_plotting_state key
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.web_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on key if not primary key
CREATE INDEX IF NOT EXISTS idx_web_config_key ON public.web_config(key);

COMMENT ON TABLE public.web_config IS 'Key-value application state store including caslab plotting state, active terms, and configurations.';

