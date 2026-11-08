-- Migration: IWAN AI Incident Evidence Logs (100% Event-Driven)
-- Date: 2026-11-08
-- Description: Menyimpan catatan insiden ketika PC praktikan terdeteksi membuka layanan GPT beserta URL bukti screenshot di Supabase Storage.

CREATE TABLE IF NOT EXISTS public.iwan_evidence_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.iwan_devices(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.iwan_rooms(id) ON DELETE CASCADE,
    device_label VARCHAR(50) NOT NULL,
    seat_number INT NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    window_title TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    screenshot_storage_path TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iwan_evidence_room_time ON public.iwan_evidence_logs(room_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_iwan_evidence_device_time ON public.iwan_evidence_logs(device_id, detected_at DESC);

ALTER TABLE public.iwan_evidence_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iwan_evidence_logs' AND policyname = 'service_role_iwan_evidence_logs'
    ) THEN
        CREATE POLICY service_role_iwan_evidence_logs ON public.iwan_evidence_logs
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

