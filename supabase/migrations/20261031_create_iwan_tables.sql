-- Migration: IWAN Monitoring Tables
-- Date: 2026-10-31
-- Description: Tabel ruangan, perangkat, sesi pairing, dan token admin untuk IWAN Desktop Monitoring

CREATE TABLE IF NOT EXISTS public.iwan_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity INT DEFAULT 40 NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.iwan_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.iwan_rooms(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,
    seat_number INT NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    local_ip VARCHAR(45) NOT NULL,
    port INT DEFAULT 21118 NOT NULL,
    hostname_raw VARCHAR(100),
    device_token VARCHAR(64) NOT NULL,
    stream_password TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'offline' NOT NULL,
    active_viewer VARCHAR(100),
    last_seen TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT unique_room_seat UNIQUE (room_id, seat_number),
    CONSTRAINT unique_device_mac UNIQUE (mac_address)
);

CREATE INDEX IF NOT EXISTS idx_iwan_devices_room ON public.iwan_devices(room_id);
CREATE INDEX IF NOT EXISTS idx_iwan_devices_mac ON public.iwan_devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_iwan_devices_status ON public.iwan_devices(status);

CREATE TABLE IF NOT EXISTS public.iwan_pair_codes (
    code VARCHAR(6) PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.iwan_rooms(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iwan_pair_codes_active ON public.iwan_pair_codes(code, is_active);

CREATE TABLE IF NOT EXISTS public.iwan_admin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(6) UNIQUE NOT NULL,
    auth_token VARCHAR(64) UNIQUE,
    label VARCHAR(100) NOT NULL,
    scope_all BOOLEAN DEFAULT false NOT NULL,
    allowed_room_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_paired BOOLEAN DEFAULT false NOT NULL,
    paired_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iwan_admin_pair_code ON public.iwan_admin_tokens(pair_code);
CREATE INDEX IF NOT EXISTS idx_iwan_admin_auth_token ON public.iwan_admin_tokens(auth_token);

-- Row Level Security
ALTER TABLE public.iwan_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iwan_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iwan_pair_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iwan_admin_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iwan_rooms' AND policyname = 'service_role_iwan_rooms'
    ) THEN
        CREATE POLICY service_role_iwan_rooms ON public.iwan_rooms FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iwan_devices' AND policyname = 'service_role_iwan_devices'
    ) THEN
        CREATE POLICY service_role_iwan_devices ON public.iwan_devices FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iwan_pair_codes' AND policyname = 'service_role_iwan_pair_codes'
    ) THEN
        CREATE POLICY service_role_iwan_pair_codes ON public.iwan_pair_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'iwan_admin_tokens' AND policyname = 'service_role_iwan_admin_tokens'
    ) THEN
        CREATE POLICY service_role_iwan_admin_tokens ON public.iwan_admin_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Default rooms seed
INSERT INTO public.iwan_rooms (name, capacity, description)
VALUES 
    ('TULT 0618', 40, 'Laboratorium Komputer TULT Lantai 6'),
    ('TULT 0619', 40, 'Laboratorium Komputer TULT Lantai 6'),
    ('TULT 0620', 40, 'Laboratorium Komputer TULT Lantai 6'),
    ('TULT 0621', 40, 'Laboratorium Komputer TULT Lantai 6')
ON CONFLICT (name) DO NOTHING;

