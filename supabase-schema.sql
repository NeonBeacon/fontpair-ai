-- FontPair AI - License Key System
-- Supabase Database Schema
-- Note: License keys use CADMUS- prefix for database compatibility

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Licenses table - stores license keys and their metadata
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    max_devices INTEGER DEFAULT 3 NOT NULL,
    purchase_email TEXT,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL means no expiry
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT
);

-- Activations table - tracks device activations per license
CREATE TABLE IF NOT EXISTS public.activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key TEXT NOT NULL REFERENCES public.licenses(license_key) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT, -- Optional: User-friendly device name
    activated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_used TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address TEXT, -- Optional: Track IP for security
    user_agent TEXT, -- Optional: Browser info
    is_active BOOLEAN DEFAULT true NOT NULL,
    UNIQUE(license_key, device_fingerprint)
);

-- Validation attempts table - for security and rate limiting
CREATE TABLE IF NOT EXISTS public.validation_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address TEXT,
    error_message TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON public.licenses(is_active);
CREATE INDEX IF NOT EXISTS idx_activations_license ON public.activations(license_key);
CREATE INDEX IF NOT EXISTS idx_activations_fingerprint ON public.activations(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_validation_attempts_key ON public.validation_attempts(license_key);
CREATE INDEX IF NOT EXISTS idx_validation_attempts_time ON public.validation_attempts(attempted_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON public.licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read licenses (needed for validation)
CREATE POLICY "Allow public read access to licenses"
    ON public.licenses FOR SELECT
    USING (true);

-- Policy: Anyone can read activations for their license key
CREATE POLICY "Allow read access to activations with valid key"
    ON public.activations FOR SELECT
    USING (true);

-- Policy: Anyone can insert activations (for new device activation)
CREATE POLICY "Allow insert access to activations"
    ON public.activations FOR INSERT
    WITH CHECK (true);

-- Policy: Anyone can update their own activation's last_used
CREATE POLICY "Allow update access to activations"
    ON public.activations FOR UPDATE
    USING (true);

-- Policy: Anyone can insert validation attempts
CREATE POLICY "Allow insert access to validation attempts"
    ON public.validation_attempts FOR INSERT
    WITH CHECK (true);

-- Stored Procedure: Validate License Key
CREATE OR REPLACE FUNCTION validate_license_key(
    p_license_key TEXT,
    p_device_fingerprint TEXT,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_license RECORD;
    v_activation RECORD;
    v_active_count INTEGER;
    v_result JSON;
BEGIN
    -- Check if license exists and is active
    SELECT * INTO v_license
    FROM public.licenses
    WHERE license_key = p_license_key;

    -- License not found
    IF NOT FOUND THEN
        INSERT INTO public.validation_attempts (license_key, device_fingerprint, success, error_message, ip_address)
        VALUES (p_license_key, p_device_fingerprint, false, 'License key not found', p_ip_address);

        RETURN json_build_object(
            'valid', false,
            'error', 'Invalid license key',
            'code', 'KEY_NOT_FOUND'
        );
    END IF;

    -- Check if license is active
    IF v_license.is_active = false THEN
        INSERT INTO public.validation_attempts (license_key, device_fingerprint, success, error_message, ip_address)
        VALUES (p_license_key, p_device_fingerprint, false, 'License is inactive', p_ip_address);

        RETURN json_build_object(
            'valid', false,
            'error', 'This license key has been deactivated',
            'code', 'KEY_INACTIVE'
        );
    END IF;

    -- Check if license has expired
    IF v_license.expires_at IS NOT NULL AND v_license.expires_at < NOW() THEN
        INSERT INTO public.validation_attempts (license_key, device_fingerprint, success, error_message, ip_address)
        VALUES (p_license_key, p_device_fingerprint, false, 'License expired', p_ip_address);

        RETURN json_build_object(
            'valid', false,
            'error', 'This license key has expired',
            'code', 'KEY_EXPIRED',
            'expires_at', v_license.expires_at
        );
    END IF;

    -- Check if this device is already activated
    SELECT * INTO v_activation
    FROM public.activations
    WHERE license_key = p_license_key
      AND device_fingerprint = p_device_fingerprint
      AND is_active = true;

    -- Device already activated - update last_used
    IF FOUND THEN
        UPDATE public.activations
        SET last_used = NOW(),
            user_agent = COALESCE(p_user_agent, user_agent),
            ip_address = COALESCE(p_ip_address, ip_address)
        WHERE id = v_activation.id;

        INSERT INTO public.validation_attempts (license_key, device_fingerprint, success, ip_address)
        VALUES (p_license_key, p_device_fingerprint, true, p_ip_address);

        RETURN json_build_object(
            'valid', true,
            'license_key', v_license.license_key,
            'max_devices', v_license.max_devices,
            'expires_at', v_license.expires_at,
            'activated_at', v_activation.activated_at
        );
    END IF;

    -- Count active devices for this license
    SELECT COUNT(*) INTO v_active_count
    FROM public.activations
    WHERE license_key = p_license_key
      AND is_active = true;

    -- Check if max devices reached
    IF v_active_count >= v_license.max_devices THEN
        INSERT INTO public.validation_attempts (license_key, device_fingerprint, success, error_message, ip_address)
        VALUES (p_license_key, p_device_fingerprint, false, 'Max devices reached', p_ip_address);

        RETURN json_build_object(
            'valid', false,
            'error', 'Maximum number of devices reached',
            'code', 'MAX_DEVICES_REACHED',
            'max_devices', v_license.max_devices,
            'current_devices', v_active_count
        );
    END IF;

    -- Activate new device
    INSERT INTO public.activations (
        license_key,
        device_fingerprint,
        user_agent,
        ip_address
    ) VALUES (
        p_license_key,
        p_device_fingerprint,
        p_user_agent,
        p_ip_address
    );

    INSERT INTO public.validation_attempts (license_key, device_fingerprint, success, ip_address)
    VALUES (p_license_key, p_device_fingerprint, true, p_ip_address);

    RETURN json_build_object(
        'valid', true,
        'license_key', v_license.license_key,
        'max_devices', v_license.max_devices,
        'expires_at', v_license.expires_at,
        'activated_at', NOW(),
        'message', 'Device activated successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'valid', false,
        'error', 'An error occurred during validation',
        'code', 'VALIDATION_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored Procedure: Deactivate Device
CREATE OR REPLACE FUNCTION deactivate_device(
    p_license_key TEXT,
    p_device_fingerprint TEXT
)
RETURNS JSON AS $$
DECLARE
    v_activation RECORD;
BEGIN
    -- Find the activation
    SELECT * INTO v_activation
    FROM public.activations
    WHERE license_key = p_license_key
      AND device_fingerprint = p_device_fingerprint
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Activation not found'
        );
    END IF;

    -- Deactivate the device
    UPDATE public.activations
    SET is_active = false
    WHERE id = v_activation.id;

    RETURN json_build_object(
        'success', true,
        'message', 'Device deactivated successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'An error occurred during deactivation'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored Procedure: Get License Info
CREATE OR REPLACE FUNCTION get_license_info(
    p_license_key TEXT,
    p_device_fingerprint TEXT
)
RETURNS JSON AS $$
DECLARE
    v_license RECORD;
    v_active_count INTEGER;
    v_activations JSON;
BEGIN
    -- Get license details
    SELECT * INTO v_license
    FROM public.licenses
    WHERE license_key = p_license_key;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'found', false,
            'error', 'License key not found'
        );
    END IF;

    -- Count active devices
    SELECT COUNT(*) INTO v_active_count
    FROM public.activations
    WHERE license_key = p_license_key
      AND is_active = true;

    -- Get activations list (only if requesting from activated device)
    SELECT json_agg(json_build_object(
        'device_fingerprint', SUBSTRING(device_fingerprint, 1, 8) || '...',
        'device_name', device_name,
        'activated_at', activated_at,
        'last_used', last_used,
        'is_current', device_fingerprint = p_device_fingerprint
    )) INTO v_activations
    FROM public.activations
    WHERE license_key = p_license_key
      AND is_active = true;

    RETURN json_build_object(
        'found', true,
        'license_key', v_license.license_key,
        'is_active', v_license.is_active,
        'max_devices', v_license.max_devices,
        'active_devices', v_active_count,
        'expires_at', v_license.expires_at,
        'activations', COALESCE(v_activations, '[]'::json)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'found', false,
        'error', 'An error occurred'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample/test licenses
INSERT INTO public.licenses (license_key, max_devices, purchase_email, notes)
VALUES
    ('CADMUS-TEST-2024-ABCD', 3, 'test@example.com', 'Test license key - 3 devices'),
    ('CADMUS-DEMO-2024-WXYZ', 1, 'demo@example.com', 'Demo license key - 1 device'),
    ('CADMUS-PREMIUM-QRST', 5, 'premium@example.com', 'Premium license key - 5 devices')
ON CONFLICT (license_key) DO NOTHING;

-- Grant necessary permissions (adjust as needed)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.licenses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.activations TO anon, authenticated;
GRANT INSERT ON public.validation_attempts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_license_key TO anon, authenticated;
GRANT EXECUTE ON FUNCTION deactivate_device TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_license_info TO anon, authenticated;
