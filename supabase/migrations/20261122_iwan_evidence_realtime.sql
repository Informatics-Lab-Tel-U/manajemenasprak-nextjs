-- Enable Supabase Realtime on iwan_evidence_logs and allow ADMIN/ASLAB authenticated SELECT
-- so /iwan/evidence can read and subscribe directly without polling Cloudflare Workers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'iwan_evidence_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.iwan_evidence_logs;
  END IF;
END $$;

ALTER TABLE public.iwan_evidence_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'iwan_evidence_logs'
      AND policyname = 'admin_aslab_select_iwan_evidence_logs'
  ) THEN
    CREATE POLICY admin_aslab_select_iwan_evidence_logs
      ON public.iwan_evidence_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.pengguna p
          WHERE p.id = auth.uid()
            AND p.deleted_at IS NULL
            AND p.role IN ('ADMIN', 'ASLAB')
        )
      );
  END IF;
END $$;
