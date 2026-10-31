CREATE INDEX IF NOT EXISTS idx_iwan_devices_token
    ON public.iwan_devices (device_token);

CREATE INDEX IF NOT EXISTS idx_iwan_pair_codes_room_active
    ON public.iwan_pair_codes (room_id, created_at DESC)
    WHERE is_active = true;
