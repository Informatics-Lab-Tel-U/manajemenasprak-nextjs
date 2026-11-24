-- Harden prevent_role_escalation() so non-admin authenticated users cannot
-- self-approve or tamper with administrative lifecycle columns on public.pengguna.

CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.role() != 'service_role' AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Hanya Administrator yang dapat mengubah role atau status akun pengguna.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
