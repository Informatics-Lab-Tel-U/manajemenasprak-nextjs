


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."Hari" AS ENUM (
    'SENIN',
    'SELASA',
    'RABU',
    'KAMIS',
    'JUMAT',
    'SABTU'
);


ALTER TYPE "public"."Hari" OWNER TO "postgres";


CREATE TYPE "public"."Jenis_Pelanggaran" AS ENUM (
    'tidak hadir',
    'telat nilai',
    'telat hadir'
);


ALTER TYPE "public"."Jenis_Pelanggaran" OWNER TO "postgres";


CREATE TYPE "public"."Program_Studi" AS ENUM (
    'IF',
    'IT',
    'DS',
    'SE',
    'IF-PJJ'
);


ALTER TYPE "public"."Program_Studi" OWNER TO "postgres";


CREATE TYPE "public"."Ruangan" AS ENUM (
    'TULT 0604',
    'TULT 0605',
    'TULT 0617',
    'TULT 0618',
    'TULT 0704',
    'TULT 0705',
    'TULT 0712',
    'TULT 0713'
);


ALTER TYPE "public"."Ruangan" OWNER TO "postgres";


CREATE TYPE "public"."asprak_roles" AS ENUM (
    'ASLAB',
    'ASPRAK'
);


ALTER TYPE "public"."asprak_roles" OWNER TO "postgres";


CREATE TYPE "public"."blog_content_format" AS ENUM (
    'markdown',
    'tiptap_json',
    'html'
);


ALTER TYPE "public"."blog_content_format" OWNER TO "postgres";


CREATE TYPE "public"."blog_post_status" AS ENUM (
    'draft',
    'published',
    'scheduled',
    'archived'
);


ALTER TYPE "public"."blog_post_status" OWNER TO "postgres";


CREATE TYPE "public"."roles" AS ENUM (
    'ADMIN',
    'ASLAB',
    'ASPRAK_KOOR',
    'MAHASISWA',
    'INTERN'
);


ALTER TYPE "public"."roles" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'PENDING',
    'ACTIVE',
    'REJECTED'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_existing_target INT;
    v_inserted_praktikum INT := 0;
    v_inserted_mata_kuliah INT := 0;
    v_inserted_asprak INT := 0;
BEGIN
    -- 1. Validasi
    IF p_source_term = p_target_term THEN
        RAISE EXCEPTION 'Source dan Target Term tidak boleh sama.';
    END IF;

    -- Cek apakah data targetTerm sudah ada
    SELECT count(*) INTO v_existing_target
    FROM praktikum
    WHERE tahun_ajaran = p_target_term;

    IF v_existing_target > 0 THEN
        RAISE EXCEPTION 'Tahun Ajaran % sudah ada di database.', p_target_term;
    END IF;

    -- 2. Buat Temporary Table untuk pemetaan ID lama -> ID baru
    CREATE TEMP TABLE tmp_praktikum_map (
        old_id UUID,
        new_id UUID
    ) ON COMMIT DROP;

    CREATE TEMP TABLE tmp_matkul_map (
        old_id UUID,
        new_id UUID
    ) ON COMMIT DROP;

    -- 3. Copy Praktikum
    IF p_copy_praktikum THEN
        -- Menggunakan Loop agar mapping ID akurat:
        DECLARE
            rec RECORD;
            v_new_prak_id UUID;
        BEGIN
            FOR rec IN (SELECT id, nama FROM praktikum WHERE tahun_ajaran = p_source_term) LOOP
                v_new_prak_id := gen_random_uuid();
                
                INSERT INTO praktikum (id, nama, tahun_ajaran)
                VALUES (v_new_prak_id, rec.nama, p_target_term);
                
                INSERT INTO tmp_praktikum_map (old_id, new_id)
                VALUES (rec.id, v_new_prak_id);
                
                v_inserted_praktikum := v_inserted_praktikum + 1;
            END LOOP;
        END;

        -- 4. Copy Mata Kuliah
        IF p_copy_mata_kuliah THEN
            DECLARE
                rec_mk RECORD;
                v_new_mk_id UUID;
                v_mapped_prak_id UUID;
            BEGIN
                FOR rec_mk IN (
                    SELECT m.* 
                    FROM mata_kuliah m
                    JOIN praktikum p ON p.id = m.id_praktikum
                    WHERE p.tahun_ajaran = p_source_term
                ) LOOP
                    v_new_mk_id := gen_random_uuid();
                    
                    SELECT new_id INTO v_mapped_prak_id 
                    FROM tmp_praktikum_map 
                    WHERE old_id = rec_mk.id_praktikum;

                    IF v_mapped_prak_id IS NOT NULL THEN
                        INSERT INTO mata_kuliah (id, id_praktikum, nama_lengkap, program_studi, dosen_koor, warna)
                        VALUES (v_new_mk_id, v_mapped_prak_id, rec_mk.nama_lengkap, rec_mk.program_studi, rec_mk.dosen_koor, rec_mk.warna);

                        INSERT INTO tmp_matkul_map (old_id, new_id)
                        VALUES (rec_mk.id, v_new_mk_id);
                        
                        v_inserted_mata_kuliah := v_inserted_mata_kuliah + 1;
                    END IF;
                END LOOP;
            END;
        END IF;

        -- 5. Copy Penugasan Asprak Koordinator
        IF p_copy_asprak_assignments THEN
            DECLARE
                rec_ak RECORD;
                v_mapped_prak_id UUID;
                v_mapped_mk_id UUID;
            BEGIN
                FOR rec_ak IN (
                    SELECT a.*
                    FROM asprak_koordinator a
                    JOIN praktikum p ON p.id = a.id_praktikum
                    WHERE p.tahun_ajaran = p_source_term
                ) LOOP
                    SELECT new_id INTO v_mapped_prak_id FROM tmp_praktikum_map WHERE old_id = rec_ak.id_praktikum;
                    
                    v_mapped_mk_id := rec_ak.id_mata_kuliah;
                    IF p_copy_mata_kuliah THEN
                        SELECT new_id INTO v_mapped_mk_id FROM tmp_matkul_map WHERE old_id = rec_ak.id_mata_kuliah;
                    END IF;

                    IF v_mapped_prak_id IS NOT NULL THEN
                        INSERT INTO asprak_koordinator (id, id_pengguna, id_mata_kuliah, id_praktikum, tahun_ajaran, is_active)
                        VALUES (gen_random_uuid(), rec_ak.id_pengguna, v_mapped_mk_id, v_mapped_prak_id, p_target_term, rec_ak.is_active);
                        
                        v_inserted_asprak := v_inserted_asprak + 1;
                    END IF;
                END LOOP;
            END;
        END IF;
    END IF;

    -- Return JSON summary
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Berhasil menyalin data Tahun Ajaran.',
        'data', jsonb_build_object(
            'praktikumCount', v_inserted_praktikum,
            'mataKuliahCount', v_inserted_mata_kuliah,
            'asprakCount', v_inserted_asprak
        )
    );
EXCEPTION WHEN OTHERS THEN
    -- Postgres secara otomatis akan me-rollback semua statement 
    -- yang dijalankan dalam fungsi ini jika terjadi EXCEPTION.
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_generic_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO audit_log (
    table_name, 
    record_id, 
    operation, 
    old_values, 
    new_values, 
    id_pengguna
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(
      to_jsonb(NEW) ->> 'id',
      to_jsonb(NEW) ->> 'key',
      to_jsonb(NEW) ->> 'post_id',
      to_jsonb(OLD) ->> 'id',
      to_jsonb(OLD) ->> 'key',
      to_jsonb(OLD) ->> 'post_id',
      'unknown'
    ),
    TG_OP,
    CASE 
      WHEN TG_OP = 'INSERT' THEN NULL
      ELSE to_jsonb(OLD)
    END,
    CASE 
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE to_jsonb(NEW)
    END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."fn_generic_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_filtered_pelanggaran_ids"("p_tahun_ajaran" "text", "p_target_modul" integer, "p_min_rank" integer) RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH RankedViolations AS (
        SELECT 
            p.id,
            p.modul,
            ROW_NUMBER() OVER (
                PARTITION BY p.id_asprak 
                ORDER BY p.modul ASC, p.created_at ASC
            ) as global_rank
        FROM pelanggaran p
        INNER JOIN jadwal j ON p.id_jadwal = j.id
        INNER JOIN mata_kuliah mk ON j.id_mk = mk.id
        INNER JOIN praktikum pr ON mk.id_praktikum = pr.id
        WHERE pr.tahun_ajaran = p_tahun_ajaran
    )
    SELECT rv.id
    FROM RankedViolations rv
    WHERE (p_target_modul IS NULL OR p_target_modul = 0 OR rv.modul = p_target_modul)
      AND rv.global_rank >= p_min_rank;
END;
$$;


ALTER FUNCTION "public"."get_filtered_pelanggaran_ids"("p_tahun_ajaran" "text", "p_target_modul" integer, "p_min_rank" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_praktikan_options"() RETURNS TABLE("kelas" "text"[], "mata_kuliah" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(array_agg(DISTINCT p.kelas ORDER BY p.kelas), ARRAY[]::varchar[])::text[] AS kelas,
    COALESCE(
      array_agg(DISTINCT p.mata_kuliah ORDER BY p.mata_kuliah),
      ARRAY[]::varchar[]
    )::text[] AS mata_kuliah
  FROM public.praktikan p;
END;
$$;


ALTER FUNCTION "public"."get_praktikan_options"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- Do nothing to prevent automatic profile creation and privilege escalation.
  -- Profiles are now inserted directly via Next.js server-side admin APIs.
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pengguna 
    WHERE id = auth.uid() AND role = 'ADMIN' AND deleted_at IS NULL
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_aslab"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pengguna 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'ASLAB') AND deleted_at IS NULL
  );
$$;


ALTER FUNCTION "public"."is_admin_or_aslab"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_koor_for_jadwal"("jadwal_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.jadwal j
    JOIN public.mata_kuliah mk ON mk.id = j.id_mk
    JOIN public.asprak_koordinator ak ON ak.id_praktikum = mk.id_praktikum
    WHERE j.id = jadwal_id
      AND ak.id_pengguna = auth.uid()
      AND ak.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_koor_for_jadwal"("jadwal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_koor_for_praktikum"("praktikum_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.asprak_koordinator 
    WHERE id_pengguna = auth.uid() 
      AND id_praktikum = praktikum_id 
      AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_koor_for_praktikum"("praktikum_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Jika kolom 'role' diubah, pastikan yang mengubah adalah service_role (backend) atau Admin asli
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.role() != 'service_role' THEN
    -- Periksa apakah user yang melakukan request adalah ADMIN
    IF NOT EXISTS (
      SELECT 1 FROM public.pengguna 
      WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'Hanya Administrator yang dapat mengubah role pengguna.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_role_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_intern_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'INTERN') = 'INTERN' THEN
    INSERT INTO "public"."logbook_interns" (id, name, email, code)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'code'
    )
    ON CONFLICT (id) DO UPDATE SET
        name       = EXCLUDED.name,
        email      = EXCLUDED.email,
        code       = COALESCE(EXCLUDED.code, logbook_interns.code),
        updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_intern_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_logbook_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_logbook_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_role"() RETURNS "public"."roles"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.pengguna WHERE id = auth.uid() AND deleted_at IS NULL;
$$;


ALTER FUNCTION "public"."user_role"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."asprak" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama_lengkap" character varying NOT NULL,
    "nim" character varying NOT NULL,
    "kode" character varying NOT NULL,
    "angkatan" integer,
    "role" "public"."asprak_roles" DEFAULT 'ASPRAK'::"public"."asprak_roles" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "rfid_uid" character varying
);


ALTER TABLE "public"."asprak" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asprak_koordinator" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_pengguna" "uuid",
    "id_praktikum" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."asprak_koordinator" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asprak_praktikum" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_asprak" "uuid" NOT NULL,
    "id_praktikum" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."asprak_praktikum" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "id_pengguna" "uuid",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "slug" character varying NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."blog_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_post_tags" (
    "post_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."blog_post_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying NOT NULL,
    "slug" character varying NOT NULL,
    "excerpt" "text",
    "content" "jsonb" NOT NULL,
    "content_format" "public"."blog_content_format" DEFAULT 'tiptap_json'::"public"."blog_content_format" NOT NULL,
    "cover_image_url" character varying,
    "cover_image_alt" character varying,
    "category_id" "uuid",
    "author_id" "uuid" NOT NULL,
    "status" "public"."blog_post_status" DEFAULT 'draft'::"public"."blog_post_status" NOT NULL,
    "published_at" timestamp without time zone,
    "meta_title" character varying,
    "meta_description" "text",
    "og_image_url" character varying,
    "view_count" integer DEFAULT 0 NOT NULL,
    "reading_time_minutes" integer,
    "deleted_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "slug" character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."blog_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jadwal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_mk" "uuid" NOT NULL,
    "kelas" character varying NOT NULL,
    "hari" character varying NOT NULL,
    "sesi" integer,
    "jam" time without time zone NOT NULL,
    "ruangan" character varying,
    "total_asprak" integer DEFAULT 0 NOT NULL,
    "dosen" character varying,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."jadwal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jadwal_jaga" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_asprak" "uuid" NOT NULL,
    "tahun_ajaran" character varying NOT NULL,
    "modul" integer NOT NULL,
    "hari" character varying NOT NULL,
    "shift" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."jadwal_jaga" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jadwal_pengganti" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_jadwal" "uuid" NOT NULL,
    "modul" integer NOT NULL,
    "tanggal" "date" NOT NULL,
    "hari" character varying NOT NULL,
    "sesi" integer,
    "jam" time without time zone NOT NULL,
    "ruangan" character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."jadwal_pengganti" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mata_kuliah" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_praktikum" "uuid" NOT NULL,
    "nama_lengkap" character varying NOT NULL,
    "program_studi" character varying NOT NULL,
    "dosen_koor" character varying,
    "warna" character varying(10),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."mata_kuliah" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."praktikum" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama" character varying NOT NULL,
    "tahun_ajaran" character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."praktikum" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."web_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."web_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."jadwal_public_view" AS
 SELECT "j"."id",
    "j"."hari",
    "j"."jam",
    "j"."sesi",
    "j"."ruangan",
    "j"."kelas",
    "j"."total_asprak",
    "j"."dosen",
    "mk"."nama_lengkap" AS "mata_kuliah",
    "mk"."program_studi",
    "mk"."warna",
    "p"."nama" AS "praktikum"
   FROM (("public"."jadwal" "j"
     JOIN "public"."mata_kuliah" "mk" ON (("j"."id_mk" = "mk"."id")))
     JOIN "public"."praktikum" "p" ON (("mk"."id_praktikum" = "p"."id")))
  WHERE (("p"."tahun_ajaran")::"text" = ( SELECT "web_config"."value"
           FROM "public"."web_config"
          WHERE ("web_config"."key" = 'active_schedule_term'::"text")
         LIMIT 1));


ALTER VIEW "public"."jadwal_public_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."konfigurasi_modul" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tahun_ajaran" character varying NOT NULL,
    "modul" integer NOT NULL,
    "tanggal_mulai" "date" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."konfigurasi_modul" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_interns" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "code" "text",
    "image" "text",
    "streak" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logbook_interns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logbook_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_post_tags" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."logbook_post_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pic_id" "uuid",
    "title" "text" NOT NULL,
    "description" "jsonb",
    "is_public" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "activity_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logbook_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monitoring_heartbeat_log" (
    "id" bigint NOT NULL,
    "lab_id" "text" NOT NULL,
    "kelas" "text",
    "status" "text" DEFAULT 'online'::"text" NOT NULL,
    "response_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monitoring_heartbeat_log" OWNER TO "postgres";


ALTER TABLE "public"."monitoring_heartbeat_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."monitoring_heartbeat_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."monitoring_lab" (
    "lab_id" "text" NOT NULL,
    "kelas" "text" NOT NULL,
    "status" "text" DEFAULT 'online'::"text" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_timestamp" bigint
);


ALTER TABLE "public"."monitoring_lab" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pelanggaran" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_asprak" "uuid" NOT NULL,
    "id_jadwal" "uuid" NOT NULL,
    "modul" integer NOT NULL,
    "jenis" character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pelanggaran" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pelanggaran_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_praktikum" "uuid" NOT NULL,
    "modul" integer NOT NULL,
    "is_finalized" boolean DEFAULT false NOT NULL,
    "finalized_at" timestamp without time zone,
    "finalized_by" "uuid",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pelanggaran_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pengguna" (
    "id" "uuid" NOT NULL,
    "nama_lengkap" character varying NOT NULL,
    "role" "public"."roles" NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."user_status" DEFAULT 'PENDING'::"public"."user_status",
    "nim" character varying(20),
    "catatan_request" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text"
);


ALTER TABLE "public"."pengguna" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."praktikan" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nama" character varying NOT NULL,
    "kode_asprak" character varying,
    "kelas" character varying NOT NULL,
    "mata_kuliah" character varying NOT NULL
);


ALTER TABLE "public"."praktikan" OWNER TO "postgres";


COMMENT ON TABLE "public"."praktikan" IS 'data praktikan untuk generator kursi';



ALTER TABLE "public"."praktikan" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."praktikan_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."presensi_jaga" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_asprak" "uuid" NOT NULL,
    "tahun_ajaran" character varying NOT NULL,
    "modul" integer NOT NULL,
    "hari" character varying NOT NULL,
    "shift" integer NOT NULL,
    "tanggal" "date" DEFAULT CURRENT_DATE NOT NULL,
    "waktu_masuk" timestamp with time zone DEFAULT "now"() NOT NULL,
    "waktu_keluar" timestamp with time zone,
    "status" character varying DEFAULT 'HADIR'::character varying NOT NULL,
    "device_id" character varying,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."presensi_jaga" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "key" "text" NOT NULL,
    "value_bool" boolean DEFAULT false,
    "value_text" "text",
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_by" "uuid"
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


ALTER TABLE ONLY "public"."asprak_koordinator"
    ADD CONSTRAINT "asprak_koordinator_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asprak"
    ADD CONSTRAINT "asprak_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asprak_praktikum"
    ADD CONSTRAINT "asprak_praktikum_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."blog_post_tags"
    ADD CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_post_tags"
    ADD CONSTRAINT "blog_post_tags_post_tag_unique" UNIQUE ("post_id", "tag_id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."blog_tags"
    ADD CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_tags"
    ADD CONSTRAINT "blog_tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."jadwal_jaga"
    ADD CONSTRAINT "jadwal_jaga_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jadwal_jaga"
    ADD CONSTRAINT "jadwal_jaga_unique_shift" UNIQUE ("id_asprak", "tahun_ajaran", "modul", "hari", "shift");



ALTER TABLE ONLY "public"."jadwal_pengganti"
    ADD CONSTRAINT "jadwal_pengganti_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jadwal"
    ADD CONSTRAINT "jadwal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."konfigurasi_modul"
    ADD CONSTRAINT "konfigurasi_modul_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logbook_interns"
    ADD CONSTRAINT "logbook_interns_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."logbook_interns"
    ADD CONSTRAINT "logbook_interns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logbook_media"
    ADD CONSTRAINT "logbook_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logbook_post_tags"
    ADD CONSTRAINT "logbook_post_tags_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."logbook_posts"
    ADD CONSTRAINT "logbook_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mata_kuliah"
    ADD CONSTRAINT "mata_kuliah_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monitoring_heartbeat_log"
    ADD CONSTRAINT "monitoring_heartbeat_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monitoring_lab"
    ADD CONSTRAINT "monitoring_lab_pkey" PRIMARY KEY ("lab_id");



ALTER TABLE ONLY "public"."pelanggaran"
    ADD CONSTRAINT "pelanggaran_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pelanggaran_status"
    ADD CONSTRAINT "pelanggaran_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pengguna"
    ADD CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."praktikan"
    ADD CONSTRAINT "praktikan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."praktikum"
    ADD CONSTRAINT "praktikum_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presensi_jaga"
    ADD CONSTRAINT "presensi_jaga_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."asprak_koordinator"
    ADD CONSTRAINT "unique_koor_praktikum" UNIQUE ("id_pengguna", "id_praktikum");



ALTER TABLE ONLY "public"."pelanggaran_status"
    ADD CONSTRAINT "unique_praktikum_modul_final" UNIQUE ("id_praktikum", "modul");



ALTER TABLE ONLY "public"."presensi_jaga"
    ADD CONSTRAINT "unique_presensi_asprak_shift_date" UNIQUE ("id_asprak", "tanggal", "shift");



ALTER TABLE ONLY "public"."konfigurasi_modul"
    ADD CONSTRAINT "unique_tahun_modul" UNIQUE ("tahun_ajaran", "modul");



ALTER TABLE ONLY "public"."web_config"
    ADD CONSTRAINT "web_config_pkey" PRIMARY KEY ("key");



CREATE INDEX "idx_asprak_koor_pengguna" ON "public"."asprak_koordinator" USING "btree" ("id_pengguna");



CREATE INDEX "idx_asprak_koor_praktikum" ON "public"."asprak_koordinator" USING "btree" ("id_praktikum");



CREATE UNIQUE INDEX "idx_asprak_rfid_uid_unique" ON "public"."asprak" USING "btree" ("rfid_uid") WHERE ("rfid_uid" IS NOT NULL);



CREATE INDEX "idx_audit_log_created_at" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_operation" ON "public"."audit_log" USING "btree" ("operation");



CREATE INDEX "idx_audit_log_pengguna" ON "public"."audit_log" USING "btree" ("id_pengguna");



CREATE INDEX "idx_audit_log_table_record" ON "public"."audit_log" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_heartbeat_log_created" ON "public"."monitoring_heartbeat_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_heartbeat_log_lab_created" ON "public"."monitoring_heartbeat_log" USING "btree" ("lab_id", "created_at" DESC);



CREATE INDEX "idx_jadwal_jaga_hari_shift" ON "public"."jadwal_jaga" USING "btree" ("hari", "shift");



CREATE INDEX "idx_jadwal_jaga_id_asprak" ON "public"."jadwal_jaga" USING "btree" ("id_asprak");



CREATE INDEX "idx_jadwal_jaga_modul" ON "public"."jadwal_jaga" USING "btree" ("tahun_ajaran", "modul");



CREATE INDEX "idx_jadwal_mk" ON "public"."jadwal" USING "btree" ("id_mk");



CREATE INDEX "idx_logbook_media_post_id" ON "public"."logbook_media" USING "btree" ("post_id");



CREATE INDEX "idx_logbook_post_tags_post_id" ON "public"."logbook_post_tags" USING "btree" ("post_id");



CREATE INDEX "idx_logbook_post_tags_user_id" ON "public"."logbook_post_tags" USING "btree" ("user_id");



CREATE INDEX "idx_logbook_posts_activity_date" ON "public"."logbook_posts" USING "btree" ("activity_date" DESC);



CREATE INDEX "idx_logbook_posts_is_public" ON "public"."logbook_posts" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_logbook_posts_pic_id" ON "public"."logbook_posts" USING "btree" ("pic_id");



CREATE INDEX "idx_logbook_posts_user_id" ON "public"."logbook_posts" USING "btree" ("user_id");



CREATE INDEX "idx_mata_kuliah_praktikum" ON "public"."mata_kuliah" USING "btree" ("id_praktikum");



CREATE INDEX "idx_pelanggaran_asprak" ON "public"."pelanggaran" USING "btree" ("id_asprak");



CREATE INDEX "idx_pelanggaran_jadwal" ON "public"."pelanggaran" USING "btree" ("id_jadwal");



CREATE INDEX "idx_presensi_jaga_asprak" ON "public"."presensi_jaga" USING "btree" ("id_asprak");



CREATE INDEX "idx_presensi_jaga_lookup" ON "public"."presensi_jaga" USING "btree" ("tahun_ajaran", "modul", "hari", "shift");



CREATE INDEX "idx_presensi_jaga_tanggal" ON "public"."presensi_jaga" USING "btree" ("tanggal" DESC);



CREATE OR REPLACE TRIGGER "audit_trigger_asprak" AFTER INSERT OR DELETE OR UPDATE ON "public"."asprak" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_asprak_koordinator" AFTER INSERT OR DELETE OR UPDATE ON "public"."asprak_koordinator" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_asprak_praktikum" AFTER INSERT OR DELETE OR UPDATE ON "public"."asprak_praktikum" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_blog_categories" AFTER INSERT OR DELETE OR UPDATE ON "public"."blog_categories" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_blog_post_tags" AFTER INSERT OR DELETE OR UPDATE ON "public"."blog_post_tags" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_blog_posts" AFTER INSERT OR DELETE OR UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_blog_tags" AFTER INSERT OR DELETE OR UPDATE ON "public"."blog_tags" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_jadwal" AFTER INSERT OR DELETE OR UPDATE ON "public"."jadwal" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_jadwal_pengganti" AFTER INSERT OR DELETE OR UPDATE ON "public"."jadwal_pengganti" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_konfigurasi_modul" AFTER INSERT OR DELETE OR UPDATE ON "public"."konfigurasi_modul" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_mata_kuliah" AFTER INSERT OR DELETE OR UPDATE ON "public"."mata_kuliah" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_pelanggaran" AFTER INSERT OR DELETE OR UPDATE ON "public"."pelanggaran" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_pelanggaran_status" AFTER INSERT OR DELETE OR UPDATE ON "public"."pelanggaran_status" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_pengguna" AFTER INSERT OR DELETE OR UPDATE ON "public"."pengguna" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_praktikum" AFTER INSERT OR DELETE OR UPDATE ON "public"."praktikum" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "audit_trigger_system_config" AFTER INSERT OR DELETE OR UPDATE ON "public"."system_config" FOR EACH ROW EXECUTE FUNCTION "public"."fn_generic_audit_log"();



CREATE OR REPLACE TRIGGER "tr_prevent_role_escalation" BEFORE UPDATE ON "public"."pengguna" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_escalation"();



CREATE OR REPLACE TRIGGER "trg_logbook_interns_updated_at" BEFORE UPDATE ON "public"."logbook_interns" FOR EACH ROW EXECUTE FUNCTION "public"."touch_logbook_updated_at"();



CREATE OR REPLACE TRIGGER "trg_logbook_media_updated_at" BEFORE UPDATE ON "public"."logbook_media" FOR EACH ROW EXECUTE FUNCTION "public"."touch_logbook_updated_at"();



CREATE OR REPLACE TRIGGER "trg_logbook_posts_updated_at" BEFORE UPDATE ON "public"."logbook_posts" FOR EACH ROW EXECUTE FUNCTION "public"."touch_logbook_updated_at"();



CREATE OR REPLACE TRIGGER "update_blog_categories_updated_at" BEFORE UPDATE ON "public"."blog_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_blog_posts_updated_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."asprak_koordinator"
    ADD CONSTRAINT "asprak_koordinator_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "public"."pengguna"("id");



ALTER TABLE ONLY "public"."asprak_koordinator"
    ADD CONSTRAINT "asprak_koordinator_id_praktikum_fkey" FOREIGN KEY ("id_praktikum") REFERENCES "public"."praktikum"("id");



ALTER TABLE ONLY "public"."asprak_praktikum"
    ADD CONSTRAINT "asprak_praktikum_id_asprak_fkey" FOREIGN KEY ("id_asprak") REFERENCES "public"."asprak"("id");



ALTER TABLE ONLY "public"."asprak_praktikum"
    ADD CONSTRAINT "asprak_praktikum_id_praktikum_fkey" FOREIGN KEY ("id_praktikum") REFERENCES "public"."praktikum"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "public"."pengguna"("id");



ALTER TABLE ONLY "public"."blog_post_tags"
    ADD CONSTRAINT "blog_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_post_tags"
    ADD CONSTRAINT "blog_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."pengguna"("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id");



ALTER TABLE ONLY "public"."jadwal"
    ADD CONSTRAINT "jadwal_id_mk_fkey" FOREIGN KEY ("id_mk") REFERENCES "public"."mata_kuliah"("id");



ALTER TABLE ONLY "public"."jadwal_jaga"
    ADD CONSTRAINT "jadwal_jaga_id_asprak_fkey" FOREIGN KEY ("id_asprak") REFERENCES "public"."asprak"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jadwal_pengganti"
    ADD CONSTRAINT "jadwal_pengganti_id_jadwal_fkey" FOREIGN KEY ("id_jadwal") REFERENCES "public"."jadwal"("id");



ALTER TABLE ONLY "public"."logbook_interns"
    ADD CONSTRAINT "logbook_interns_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_media"
    ADD CONSTRAINT "logbook_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."logbook_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_post_tags"
    ADD CONSTRAINT "logbook_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."logbook_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_post_tags"
    ADD CONSTRAINT "logbook_post_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."logbook_interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_posts"
    ADD CONSTRAINT "logbook_posts_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "public"."pengguna"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logbook_posts"
    ADD CONSTRAINT "logbook_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."logbook_interns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mata_kuliah"
    ADD CONSTRAINT "mata_kuliah_id_praktikum_fkey" FOREIGN KEY ("id_praktikum") REFERENCES "public"."praktikum"("id");



ALTER TABLE ONLY "public"."pelanggaran"
    ADD CONSTRAINT "pelanggaran_id_asprak_fkey" FOREIGN KEY ("id_asprak") REFERENCES "public"."asprak"("id");



ALTER TABLE ONLY "public"."pelanggaran"
    ADD CONSTRAINT "pelanggaran_id_jadwal_fkey" FOREIGN KEY ("id_jadwal") REFERENCES "public"."jadwal"("id");



ALTER TABLE ONLY "public"."pelanggaran_status"
    ADD CONSTRAINT "pelanggaran_status_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "public"."pengguna"("id");



ALTER TABLE ONLY "public"."pelanggaran_status"
    ADD CONSTRAINT "pelanggaran_status_id_praktikum_fkey" FOREIGN KEY ("id_praktikum") REFERENCES "public"."praktikum"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pengguna"
    ADD CONSTRAINT "pengguna_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."pengguna"("id");



ALTER TABLE ONLY "public"."pengguna"
    ADD CONSTRAINT "pengguna_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."presensi_jaga"
    ADD CONSTRAINT "presensi_jaga_id_asprak_fkey" FOREIGN KEY ("id_asprak") REFERENCES "public"."asprak"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."pengguna"("id");



CREATE POLICY "Admin dan Aslab dapat melihat audit log" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat melihat semua asprak" ON "public"."asprak" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat melihat semua pelanggaran" ON "public"."pelanggaran" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat menambah pelanggaran" ON "public"."pelanggaran" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola asprak" ON "public"."asprak" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola asprak praktikum" ON "public"."asprak_praktikum" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola finalisasi" ON "public"."pelanggaran_status" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola jadwal" ON "public"."jadwal" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola jadwal jaga" ON "public"."jadwal_jaga" TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola jadwal pengganti" ON "public"."jadwal_pengganti" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola konfigurasi modul" ON "public"."konfigurasi_modul" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola koordinator" ON "public"."asprak_koordinator" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola mata kuliah" ON "public"."mata_kuliah" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola praktikan" ON "public"."praktikan" TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat mengelola praktikum" ON "public"."praktikum" TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Admin dan Aslab dapat menghapus pelanggaran" ON "public"."pelanggaran" FOR DELETE TO "authenticated" USING (("public"."is_admin_or_aslab"() AND (NOT (EXISTS ( SELECT 1
   FROM (("public"."pelanggaran_status" "ps"
     JOIN "public"."jadwal" "j" ON (("j"."id" = "pelanggaran"."id_jadwal")))
     JOIN "public"."mata_kuliah" "mk" ON (("mk"."id" = "j"."id_mk")))
  WHERE (("ps"."id_praktikum" = "mk"."id_praktikum") AND ("ps"."modul" = "pelanggaran"."modul") AND ("ps"."is_finalized" = true)))))));



CREATE POLICY "Admin dapat melihat semua asprak praktikum" ON "public"."asprak_praktikum" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin dapat melihat semua pengguna" ON "public"."pengguna" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin dapat mengelola pengguna" ON "public"."pengguna" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admin or aslab insert" ON "public"."web_config" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Allow admin or aslab update" ON "public"."web_config" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Allow insert own pengguna record" ON "public"."pengguna" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "Allow public read" ON "public"."web_config" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."praktikan" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow read access for heartbeat log" ON "public"."monitoring_heartbeat_log" FOR SELECT USING (true);



CREATE POLICY "Allow system to insert audit log" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "Anon dapat melihat mata kuliah untuk generator" ON "public"."mata_kuliah" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon dapat melihat praktikum untuk generator" ON "public"."praktikum" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon dapat melihat presensi jaga untuk live view" ON "public"."presensi_jaga" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Asprak Koor dapat melihat asprak di praktikum yang dikoordinir" ON "public"."asprak" FOR SELECT TO "authenticated" USING ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND (EXISTS ( SELECT 1
   FROM ("public"."asprak_praktikum" "ap"
     JOIN "public"."asprak_koordinator" "ak" ON (("ak"."id_praktikum" = "ap"."id_praktikum")))
  WHERE (("ap"."id_asprak" = "asprak"."id") AND ("ak"."id_pengguna" = "auth"."uid"()) AND ("ak"."is_active" = true))))));



CREATE POLICY "Asprak Koor dapat melihat asprak praktikum yang dikoordinir" ON "public"."asprak_praktikum" FOR SELECT TO "authenticated" USING ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND (EXISTS ( SELECT 1
   FROM "public"."asprak_koordinator" "ak"
  WHERE (("ak"."id_praktikum" = "asprak_praktikum"."id_praktikum") AND ("ak"."id_pengguna" = "auth"."uid"()) AND ("ak"."is_active" = true))))));



CREATE POLICY "Asprak Koor dapat melihat koordinasi sendiri" ON "public"."asprak_koordinator" FOR SELECT TO "authenticated" USING (("id_pengguna" = "auth"."uid"()));



CREATE POLICY "Asprak Koor dapat melihat pelanggaran di praktikum yang dikoord" ON "public"."pelanggaran" FOR SELECT TO "authenticated" USING ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND (EXISTS ( SELECT 1
   FROM (("public"."jadwal" "j"
     JOIN "public"."mata_kuliah" "mk" ON (("mk"."id" = "j"."id_mk")))
     JOIN "public"."asprak_koordinator" "ak" ON (("ak"."id_praktikum" = "mk"."id_praktikum")))
  WHERE (("j"."id" = "pelanggaran"."id_jadwal") AND ("ak"."id_pengguna" = "auth"."uid"()) AND ("ak"."is_active" = true))))));



CREATE POLICY "Asprak Koor dapat memfinalisasi praktikum dikoordinir" ON "public"."pelanggaran_status" FOR INSERT TO "authenticated" WITH CHECK ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND "public"."is_koor_for_praktikum"("id_praktikum")));



CREATE POLICY "Asprak Koor dapat menambah pelanggaran di praktikum yang dikoor" ON "public"."pelanggaran" FOR INSERT TO "authenticated" WITH CHECK ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND (EXISTS ( SELECT 1
   FROM (("public"."jadwal" "j"
     JOIN "public"."mata_kuliah" "mk" ON (("mk"."id" = "j"."id_mk")))
     JOIN "public"."asprak_koordinator" "ak" ON (("ak"."id_praktikum" = "mk"."id_praktikum")))
  WHERE (("j"."id" = "pelanggaran"."id_jadwal") AND ("ak"."id_pengguna" = "auth"."uid"()) AND ("ak"."is_active" = true))))));



CREATE POLICY "Asprak Koor dapat mengupdate finalisasi praktikum dikoordinir" ON "public"."pelanggaran_status" FOR UPDATE TO "authenticated" USING ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND "public"."is_koor_for_praktikum"("id_praktikum"))) WITH CHECK ((("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND "public"."is_koor_for_praktikum"("id_praktikum")));



CREATE POLICY "Authenticated user dapat melihat jadwal" ON "public"."jadwal" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated user dapat melihat jadwal jaga" ON "public"."jadwal_jaga" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated user dapat melihat jadwal pengganti" ON "public"."jadwal_pengganti" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated user dapat melihat mata kuliah" ON "public"."mata_kuliah" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated user dapat melihat praktikum" ON "public"."praktikum" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated user dapat melihat presensi jaga" ON "public"."presensi_jaga" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for admins and aslab" ON "public"."blog_posts" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_aslab"());



CREATE POLICY "Enable read access for all users" ON "public"."blog_categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."blog_post_tags" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."blog_tags" FOR SELECT USING (true);



CREATE POLICY "Enable read access for published posts" ON "public"."blog_posts" FOR SELECT USING ((("status" = 'published'::"public"."blog_post_status") AND ("deleted_at" IS NULL)));



CREATE POLICY "Enable select for public" ON "public"."praktikan" FOR SELECT USING (true);



CREATE POLICY "Enable write access for admins and aslab" ON "public"."blog_categories" TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Enable write access for admins and aslab" ON "public"."blog_post_tags" TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Enable write access for admins and aslab" ON "public"."blog_posts" TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Enable write access for admins and aslab" ON "public"."blog_tags" TO "authenticated" USING ("public"."is_admin_or_aslab"()) WITH CHECK ("public"."is_admin_or_aslab"());



CREATE POLICY "Hanya Admin yang dapat mengelola config" ON "public"."system_config" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Hanya bisa update pelanggaran yang belum final" ON "public"."pelanggaran" FOR UPDATE TO "authenticated" USING ((("public"."is_admin_or_aslab"() OR (("public"."user_role"() = 'ASPRAK_KOOR'::"public"."roles") AND "public"."is_koor_for_jadwal"("id_jadwal"))) AND (NOT (EXISTS ( SELECT 1
   FROM (("public"."pelanggaran_status" "ps"
     JOIN "public"."jadwal" "j" ON (("j"."id" = "pelanggaran"."id_jadwal")))
     JOIN "public"."mata_kuliah" "mk" ON (("mk"."id" = "j"."id_mk")))
  WHERE (("ps"."id_praktikum" = "mk"."id_praktikum") AND ("ps"."modul" = "pelanggaran"."modul") AND ("ps"."is_finalized" = true)))))));



CREATE POLICY "Izinkan baca realtime heartbeat" ON "public"."monitoring_heartbeat_log" FOR SELECT USING (true);



CREATE POLICY "Izinkan baca realtime lab" ON "public"."monitoring_lab" FOR SELECT USING (true);



CREATE POLICY "Semua user dapat melihat config" ON "public"."system_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Semua user dapat melihat konfigurasi modul" ON "public"."konfigurasi_modul" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Semua user dapat melihat status finalisasi" ON "public"."pelanggaran_status" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service role full access on heartbeat log" ON "public"."monitoring_heartbeat_log" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access on presensi jaga" ON "public"."presensi_jaga" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "User can update own data" ON "public"."pengguna" FOR UPDATE TO "authenticated" USING (((("auth"."uid"() = "id") AND ("deleted_at" IS NULL)) OR "public"."is_admin"())) WITH CHECK (((("auth"."uid"() = "id") AND ("deleted_at" IS NULL)) OR "public"."is_admin"()));



CREATE POLICY "User dapat melihat data sendiri" ON "public"."pengguna" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") AND ("deleted_at" IS NULL)));



ALTER TABLE "public"."asprak" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asprak_koordinator" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asprak_praktikum" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_post_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jadwal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jadwal_jaga" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jadwal_pengganti" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."konfigurasi_modul" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logbook_interns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logbook_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logbook_post_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logbook_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mata_kuliah" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monitoring_heartbeat_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monitoring_lab" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pelanggaran" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pelanggaran_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pengguna" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."praktikan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."praktikum" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presensi_jaga" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."web_config" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."monitoring_heartbeat_log";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."monitoring_lab";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."presensi_jaga";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."copy_tahun_ajaran"("p_source_term" "text", "p_target_term" "text", "p_copy_praktikum" boolean, "p_copy_mata_kuliah" boolean, "p_copy_asprak_assignments" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_generic_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_generic_audit_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_filtered_pelanggaran_ids"("p_tahun_ajaran" "text", "p_target_modul" integer, "p_min_rank" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_pelanggaran_ids"("p_tahun_ajaran" "text", "p_target_modul" integer, "p_min_rank" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_praktikan_options"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_praktikan_options"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_praktikan_options"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_aslab"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_aslab"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_koor_for_jadwal"("jadwal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_koor_for_jadwal"("jadwal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_koor_for_praktikum"("praktikum_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_koor_for_praktikum"("praktikum_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_intern_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_intern_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_intern_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_logbook_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_logbook_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_logbook_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_role"() TO "service_role";


















GRANT ALL ON TABLE "public"."asprak" TO "authenticated";
GRANT ALL ON TABLE "public"."asprak" TO "service_role";



GRANT ALL ON TABLE "public"."asprak_koordinator" TO "authenticated";
GRANT ALL ON TABLE "public"."asprak_koordinator" TO "service_role";



GRANT ALL ON TABLE "public"."asprak_praktikum" TO "authenticated";
GRANT ALL ON TABLE "public"."asprak_praktikum" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."blog_categories" TO "anon";
GRANT ALL ON TABLE "public"."blog_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_categories" TO "service_role";



GRANT ALL ON TABLE "public"."blog_post_tags" TO "anon";
GRANT ALL ON TABLE "public"."blog_post_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_post_tags" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."blog_tags" TO "anon";
GRANT ALL ON TABLE "public"."blog_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_tags" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jadwal" TO "anon";
GRANT ALL ON TABLE "public"."jadwal" TO "authenticated";
GRANT ALL ON TABLE "public"."jadwal" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jadwal_jaga" TO "anon";
GRANT ALL ON TABLE "public"."jadwal_jaga" TO "authenticated";
GRANT ALL ON TABLE "public"."jadwal_jaga" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."jadwal_pengganti" TO "anon";
GRANT ALL ON TABLE "public"."jadwal_pengganti" TO "authenticated";
GRANT ALL ON TABLE "public"."jadwal_pengganti" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."mata_kuliah" TO "anon";
GRANT ALL ON TABLE "public"."mata_kuliah" TO "authenticated";
GRANT ALL ON TABLE "public"."mata_kuliah" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."praktikum" TO "anon";
GRANT ALL ON TABLE "public"."praktikum" TO "authenticated";
GRANT ALL ON TABLE "public"."praktikum" TO "service_role";



GRANT ALL ON TABLE "public"."web_config" TO "anon";
GRANT ALL ON TABLE "public"."web_config" TO "authenticated";
GRANT ALL ON TABLE "public"."web_config" TO "service_role";



GRANT ALL ON TABLE "public"."jadwal_public_view" TO "anon";
GRANT ALL ON TABLE "public"."jadwal_public_view" TO "authenticated";
GRANT ALL ON TABLE "public"."jadwal_public_view" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."konfigurasi_modul" TO "anon";
GRANT ALL ON TABLE "public"."konfigurasi_modul" TO "authenticated";
GRANT ALL ON TABLE "public"."konfigurasi_modul" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_interns" TO "anon";
GRANT ALL ON TABLE "public"."logbook_interns" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_interns" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_media" TO "anon";
GRANT ALL ON TABLE "public"."logbook_media" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_media" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_post_tags" TO "anon";
GRANT ALL ON TABLE "public"."logbook_post_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_post_tags" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_posts" TO "anon";
GRANT ALL ON TABLE "public"."logbook_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_posts" TO "service_role";



GRANT ALL ON TABLE "public"."monitoring_heartbeat_log" TO "anon";
GRANT ALL ON TABLE "public"."monitoring_heartbeat_log" TO "authenticated";
GRANT ALL ON TABLE "public"."monitoring_heartbeat_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."monitoring_heartbeat_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."monitoring_heartbeat_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."monitoring_heartbeat_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."monitoring_lab" TO "anon";
GRANT ALL ON TABLE "public"."monitoring_lab" TO "authenticated";
GRANT ALL ON TABLE "public"."monitoring_lab" TO "service_role";



GRANT ALL ON TABLE "public"."pelanggaran" TO "authenticated";
GRANT ALL ON TABLE "public"."pelanggaran" TO "service_role";



GRANT ALL ON TABLE "public"."pelanggaran_status" TO "authenticated";
GRANT ALL ON TABLE "public"."pelanggaran_status" TO "service_role";



GRANT ALL ON TABLE "public"."pengguna" TO "authenticated";
GRANT ALL ON TABLE "public"."pengguna" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."praktikan" TO "anon";
GRANT ALL ON TABLE "public"."praktikan" TO "authenticated";
GRANT ALL ON TABLE "public"."praktikan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."praktikan_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."praktikan_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."praktikan_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."presensi_jaga" TO "anon";
GRANT ALL ON TABLE "public"."presensi_jaga" TO "authenticated";
GRANT ALL ON TABLE "public"."presensi_jaga" TO "service_role";



GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































