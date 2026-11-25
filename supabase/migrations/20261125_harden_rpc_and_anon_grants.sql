-- Security Hardening Migration (2026-11-25)
-- 1. Revoke unauthenticated anon/authenticated execution of SECURITY DEFINER RPC `copy_tahun_ajaran`
-- 2. Revoke anon execution of `get_praktikan_options` and remove dangerous default anon function grants
-- 3. Close direct PostgREST `anon` read exposure on `praktikan` & `presensi_jaga`
-- 4. Revoke non-SELECT privileges (TRUNCATE/TRIGGER/REFERENCES/MAINTAIN) from `anon` on catalog tables

-- 1. Restrict copy_tahun_ajaran strictly to service_role and pin search_path
REVOKE ALL ON FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) TO "service_role";
ALTER FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) SET "search_path" TO 'public';

-- 2. Restrict get_praktikan_options from anon and harden default function grants
REVOKE ALL ON FUNCTION "public"."get_praktikan_options"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_praktikan_options"() TO "authenticated", "service_role";
ALTER FUNCTION "public"."get_praktikan_options"() SET "search_path" TO 'public';

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

-- 3. Drop direct anon/public SELECT policies on praktikan and presensi_jaga
-- Admin/Aslab continue accessing via "Admin dan Aslab dapat mengelola praktikan" and backend API.
-- Authenticated users continue accessing Realtime presensi_jaga via "Authenticated user dapat melihat presensi jaga".
DROP POLICY IF EXISTS "Allow public read access" ON "public"."praktikan";
DROP POLICY IF EXISTS "Enable select for public" ON "public"."praktikan";
DROP POLICY IF EXISTS "Anon dapat melihat presensi jaga untuk live view" ON "public"."presensi_jaga";

-- 4. Strip excessive table privileges (notably TRUNCATE/TRIGGER/REFERENCES/MAINTAIN) from anon
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."jadwal" FROM "anon";
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."jadwal_jaga" FROM "anon";
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."jadwal_pengganti" FROM "anon";
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."mata_kuliah" FROM "anon";
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."praktikum" FROM "anon";
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."konfigurasi_modul" FROM "anon";
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE "public"."praktikan" FROM "anon";
