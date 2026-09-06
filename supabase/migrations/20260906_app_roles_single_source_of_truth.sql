-- ============================================================
-- Migration: App Roles Single Source of Truth
-- Date: 2026-09-06
-- Description: Menjadikan user_app_roles sebagai single source of truth,
--              membuat pengguna.role NULLABLE, dan mengalihkan fungsi RLS
--              (is_admin, is_admin_or_aslab, user_role) ke tabel user_app_roles.
-- ============================================================

-- 1. Buat kolom pengguna.role menjadi NULLABLE agar tidak lagi wajib diisi
ALTER TABLE public.pengguna ALTER COLUMN role DROP NOT NULL;

-- 2. Sinkronisasi data: pastikan semua pengguna manajemenasprak memiliki baris di user_app_roles
INSERT INTO public.user_app_roles (user_id, app_id, role)
SELECT
  p.id,
  a.id,
  p.role::text
FROM public.pengguna p
CROSS JOIN public.apps a
WHERE a.slug = 'manajemenasprak'
  AND p.deleted_at IS NULL
  AND p.role IS NOT NULL
ON CONFLICT (user_id, app_id) 
DO UPDATE SET role = EXCLUDED.role;

-- 3. Update fungsi is_admin() untuk membaca dari user_app_roles
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_app_roles uar
    JOIN public.apps a ON a.id = uar.app_id
    WHERE uar.user_id = auth.uid() 
      AND a.slug = 'manajemenasprak' 
      AND uar.role = 'ADMIN'
  );
$$;

-- 4. Update fungsi is_admin_or_aslab() untuk membaca dari user_app_roles
CREATE OR REPLACE FUNCTION "public"."is_admin_or_aslab"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_app_roles uar
    JOIN public.apps a ON a.id = uar.app_id
    WHERE uar.user_id = auth.uid() 
      AND a.slug = 'manajemenasprak' 
      AND uar.role IN ('ADMIN', 'ASLAB')
  );
$$;

-- 5. Update fungsi user_role() untuk membaca dari user_app_roles
CREATE OR REPLACE FUNCTION "public"."user_role"() RETURNS "public"."roles"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT uar.role::public.roles
  FROM public.user_app_roles uar
  JOIN public.apps a ON a.id = uar.app_id
  WHERE uar.user_id = auth.uid() 
    AND a.slug = 'manajemenasprak'
  LIMIT 1;
$$;
