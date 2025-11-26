import { createClient } from '@supabase/supabase-js';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { setUserTier } from './tierService';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// LocalStorage keys
const LICENSE_STORAGE_KEY = 'cadmus_license_data';
const LAST_VALIDATION_KEY = 'cadmus_last_validation';

// Types
export interface LicenseData {
    licenseKey: string;
    deviceFingerprint: string;
    validatedAt: string;
    expiresAt?: string;
    maxDevices?: number;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    code?: string;
    licenseKey?: string;
    maxDevices?: number;
    currentDevices?: number;
    expiresAt?: string;
    message?: string;
    tier?: string;
}

export interface LicenseInfo {
    found: boolean;
    licenseKey?: string;
    isActive?: boolean;
    maxDevices?: number;
    activeDevices?: number;
    expiresAt?: string;
    activations?: Array<{
        deviceFingerprint: string;
        deviceName?: string;
        activatedAt: string;
        lastUsed: string;
        isCurrent: boolean;
    }>;
    error?: string;
}

// Initialize FingerprintJS
let fpPromise: Promise<any> | null = null;

const initFingerprint = () => {
    if (!fpPromise) {
        fpPromise = FingerprintJS.load();
    }
    return fpPromise;
};

/**
 * Get device fingerprint
 */
export const getDeviceFingerprint = async (): Promise<string> => {
    try {
        const fp = await initFingerprint();
        const result = await fp.get();
        return result.visitorId;
    } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Fallback to simple browser fingerprint
        return generateSimpleFingerprint();
    }
};

/**
 * Simple fallback fingerprint based on browser characteristics
 */
const generateSimpleFingerprint = (): string => {
    const nav = window.navigator;
    const screen = window.screen;

    const data = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'fallback_' + Math.abs(hash).toString(36);
};

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean => {
    return !!supabase && !!supabaseUrl && !!supabaseAnonKey;
};

/**
 * Get stored license data from localStorage
 */
export const getStoredLicense = (): LicenseData | null => {
    try {
        const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error reading stored license:', error);
        return null;
    }
};

/**
 * Store license data in localStorage
 */
export const storeLicense = (data: LicenseData): void => {
    try {
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(LAST_VALIDATION_KEY, new Date().toISOString());
    } catch (error) {
        console.error('Error storing license:', error);
    }
};

/**
 * Clear stored license data
 */
export const clearStoredLicense = (): void => {
    try {
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        localStorage.removeItem(LAST_VALIDATION_KEY);
    } catch (error) {
        console.error('Error clearing license:', error);
    }
};

/**
 * Check if stored license needs revalidation
 * Revalidate every 7 days
 */
export const needsRevalidation = (): boolean => {
    try {
        const lastValidation = localStorage.getItem(LAST_VALIDATION_KEY);
        if (!lastValidation) return true;

        const lastDate = new Date(lastValidation);
        const now = new Date();
        const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        return daysSince > 7; // Revalidate after 7 days
    } catch (error) {
        return true;
    }
};

/**
 * Validate license key with Supabase
 */
export const validateLicenseKey = async (
    licenseKey: string,
    deviceFingerprint?: string
): Promise<ValidationResult> => {
    if (!isSupabaseConfigured()) {
        return {
            valid: false,
            error: 'License validation is not configured. Please check your environment variables.',
            code: 'NOT_CONFIGURED'
        };
    }

    try {
        // Get device fingerprint if not provided
        const fingerprint = deviceFingerprint || await getDeviceFingerprint();

        // Call Supabase RPC function
        const { data, error } = await supabase!.rpc('validate_license_key', {
            p_license_key: licenseKey.trim().toUpperCase(),
            p_device_fingerprint: fingerprint
        });

        if (error) {
            console.error('Supabase validation error:', error);
            return {
                valid: false,
                error: 'Failed to validate license key. Please try again.',
                code: 'VALIDATION_FAILED'
            };
        }

        // Parse result
        const result = typeof data === 'string' ? JSON.parse(data) : data;

        if (result.success) {
            // Store license locally
            storeLicense({
                licenseKey: result.license_key,
                deviceFingerprint: fingerprint,
                validatedAt: new Date().toISOString(),
                expiresAt: result.expires_at,
                maxDevices: result.max_devices
            });

            // Use tier from database instead of hardcoding 'professional'
            const tier = result.tier || 'professional';
            setUserTier(tier as 'free' | 'professional');

            // Convert 'success' to 'valid' for consistency with existing code
            return {
                valid: true,
                licenseKey: result.license_key,
                maxDevices: result.max_devices,
                expiresAt: result.expires_at,
                message: result.message,
                tier: tier
            };
        }

        // Update tier to free on failure
        setUserTier('free');

        // Convert 'success: false' to 'valid: false' for consistency
        return {
            valid: false,
            error: result.error,
            code: 'VALIDATION_FAILED',
            currentDevices: result.current_devices,
            maxDevices: result.max_devices
        };

    } catch (error) {
        console.error('License validation error:', error);
        return {
            valid: false,
            error: 'An unexpected error occurred. Please try again.',
            code: 'UNKNOWN_ERROR'
        };
    }
};

/**
 * Check activation status for stored license
 */
export const checkActivationStatus = async (): Promise<ValidationResult> => {
    const stored = getStoredLicense();

    if (!stored) {
        setUserTier('free');
        return {
            valid: false,
            error: 'No license found',
            code: 'NO_LICENSE'
        };
    }

    if (!isSupabaseConfigured()) {
        // Allow offline use if previously validated within last 30 days
        const lastValidation = localStorage.getItem(LAST_VALIDATION_KEY);
        if (lastValidation) {
            const lastDate = new Date(lastValidation);
            const now = new Date();
            const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSince < 30) {
                setUserTier('professional');
                return {
                    valid: true,
                    licenseKey: stored.licenseKey,
                    message: 'Offline mode - using cached license'
                };
            }
        }

        setUserTier('free');
        return {
            valid: false,
            error: 'Unable to verify license. Please check your internet connection.',
            code: 'OFFLINE'
        };
    }

    // Check if needs revalidation
    if (!needsRevalidation()) {
        setUserTier('professional');
        return {
            valid: true,
            licenseKey: stored.licenseKey,
            maxDevices: stored.maxDevices,
            expiresAt: stored.expiresAt
        };
    }

    // Revalidate with server
    const result = await validateLicenseKey(stored.licenseKey, stored.deviceFingerprint);
    if (result.valid) {
        setUserTier('professional');
    } else {
        setUserTier('free');
    }
    return result;
};

/**
 * Deactivate current device
 */
export const deactivateDevice = async (
    licenseKey?: string,
    deviceFingerprint?: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!isSupabaseConfigured()) {
        return {
            success: false,
            error: 'License management is not configured.'
        };
    }

    try {
        const stored = getStoredLicense();
        const key = licenseKey || stored?.licenseKey;
        const fingerprint = deviceFingerprint || stored?.deviceFingerprint || await getDeviceFingerprint();

        if (!key) {
            return {
                success: false,
                error: 'No license key provided'
            };
        }

        const { data, error } = await supabase!.rpc('deactivate_device', {
            p_license_key: key,
            p_device_fingerprint: fingerprint
        });

        if (error) {
            console.error('Deactivation error:', error);
            return {
                success: false,
                error: 'Failed to deactivate device'
            };
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;

        if (result.success) {
            clearStoredLicense();
            setUserTier('free');
        }

        return result;

    } catch (error) {
        console.error('Device deactivation error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred'
        };
    }
};

/**
 * Get detailed license information
 */
export const getLicenseInfo = async (
    licenseKey?: string,
    deviceFingerprint?: string
): Promise<LicenseInfo> => {
    if (!isSupabaseConfigured()) {
        return {
            found: false,
            error: 'License system is not configured'
        };
    }

    try {
        const stored = getStoredLicense();
        const key = licenseKey || stored?.licenseKey;

        if (!key) {
            return {
                found: false,
                error: 'No license key provided'
            };
        }

        const { data, error } = await supabase!.rpc('get_license_info', {
            p_license_key: key
        });

        if (error) {
            console.error('Get license info error:', error);
            return {
                found: false,
                error: 'Failed to retrieve license information'
            };
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;

        // Convert SQL response to LicenseInfo format
        if (result.success) {
            return {
                found: true,
                licenseKey: result.license_key,
                isActive: result.is_active,
                maxDevices: result.max_devices,
                activeDevices: result.current_devices,
                expiresAt: result.expires_at
            };
        }

        return {
            found: false,
            error: result.error || 'License not found'
        };

    } catch (error) {
        console.error('License info error:', error);
        return {
            found: false,
            error: 'An unexpected error occurred'
        };
    }
};

/**
 * Format license key for display (e.g., XXXX-XXXX-XXXX-XXXX)
 */
export const formatLicenseKey = (key: string): string => {
    return key.replace(/(.{4})/g, '$1-').replace(/-$/, '');
};

/**
 * Validate license key format (basic client-side check)
 */
export const isValidLicenseFormat = (key: string): boolean => {
    // Remove spaces and dashes
    const cleaned = key.replace(/[\s-]/g, '');
    // Check if it's alphanumeric and reasonable length
    return /^[A-Z0-9]{12,32}$/i.test(cleaned);
};
