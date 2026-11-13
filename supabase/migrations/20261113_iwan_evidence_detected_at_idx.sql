CREATE INDEX IF NOT EXISTS idx_iwan_evidence_detected_at
    ON public.iwan_evidence_logs (detected_at DESC);

