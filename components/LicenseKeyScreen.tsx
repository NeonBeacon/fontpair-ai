import React, { useState } from 'react';
import { CadmusLogoIcon, CheckIcon } from './Icons';
import {
    validateLicenseKey,
    isValidLicenseFormat,
    formatLicenseKey,
    type ValidationResult
} from '../services/licenseService';

interface LicenseKeyScreenProps {
    onLicenseValidated: () => void;
}

const LicenseKeyScreen: React.FC<LicenseKeyScreenProps> = ({ onLicenseValidated }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setValidationResult(null);

        // Basic client-side validation
        if (!licenseKey.trim()) {
            setError('Please enter a license key');
            return;
        }

        // Remove only spaces, keep dashes (database keys have dashes)
        const cleaned = licenseKey.replace(/\s/g, '').toUpperCase();

        if (!isValidLicenseFormat(cleaned)) {
            setError('Invalid license key format. Please check your key and try again.');
            return;
        }

        setIsValidating(true);

        try {
            const result = await validateLicenseKey(cleaned);
            setValidationResult(result);

            if (result.valid) {
                // Success! Give user feedback then redirect
                setTimeout(() => {
                    onLicenseValidated();
                }, 1500);
            } else {
                // Show error message
                setError(getErrorMessage(result));
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('License validation error:', err);
        } finally {
            setIsValidating(false);
        }
    };

    const getErrorMessage = (result: ValidationResult): string => {
        switch (result.code) {
            case 'KEY_NOT_FOUND':
                return 'Invalid license key. Please check your key and try again.';
            case 'KEY_INACTIVE':
                return 'This license key has been deactivated. Please contact support.';
            case 'KEY_EXPIRED':
                return `This license key expired on ${result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'an earlier date'}. Please renew your license.`;
            case 'MAX_DEVICES_REACHED':
                return `This license key is already active on ${result.currentDevices || result.maxDevices} device(s). Please deactivate another device or purchase additional licenses.`;
            case 'NOT_CONFIGURED':
                return 'License validation is not configured. Please contact support.';
            default:
                return result.error || 'Failed to validate license key. Please try again.';
        }
    };

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase();
        setLicenseKey(value);
        setError(null);
        setValidationResult(null);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <CadmusLogoIcon className="h-16 w-16 text-accent" />
                    </div>
                    <h1 className="text-3xl font-bold text-primary mb-2">FontPair AI</h1>
                    <p className="text-secondary text-sm">AI-Powered Font Pairing & Analysis Tool</p>
                </div>

                {/* License Key Form */}
                <div className="bg-surface rounded-lg shadow-2xl p-8 border border-border">
                    <h2 className="text-xl font-semibold text-primary mb-2">Enter License Key</h2>
                    <p className="text-sm text-secondary mb-6">
                        Please enter your license key to activate FontPair AI on this device.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="license-key" className="block text-sm font-medium text-primary mb-2">
                                License Key
                            </label>
                            <input
                                id="license-key"
                                type="text"
                                value={licenseKey}
                                onChange={handleKeyChange}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                disabled={isValidating}
                                className="w-full px-4 py-3 bg-background border border-border rounded-md text-primary placeholder-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {validationResult?.valid && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 flex items-center gap-2">
                                <CheckIcon className="w-5 h-5 text-green-400" />
                                <div>
                                    <p className="text-sm text-green-300 font-medium">License Activated!</p>
                                    <p className="text-xs text-green-300/70 mt-1">
                                        {validationResult.message || 'Redirecting to app...'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isValidating || !licenseKey.trim() || validationResult?.valid}
                            className="w-full px-4 py-3 bg-accent text-surface font-semibold rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                        >
                            {isValidating ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    <span>Validating...</span>
                                </>
                            ) : validationResult?.valid ? (
                                <>
                                    <CheckIcon className="w-5 h-5" />
                                    <span>Activated</span>
                                </>
                            ) : (
                                <span>Activate License</span>
                            )}
                        </button>
                    </form>

                    {/* Additional Info */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="text-xs text-secondary/70 space-y-2">
                            <p>
                                <strong className="text-primary">Don't have a license?</strong>
                                <br />
                                <a
                                    href="https://fontpair.ai/purchase"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline"
                                >
                                    Purchase a license key here
                                </a>
                            </p>
                            <p>
                                <strong className="text-primary">Lost your key?</strong>
                                <br />
                                Contact support at{' '}
                                <a
                                    href="mailto:support@fontpair.ai"
                                    className="text-accent hover:underline"
                                >
                                    support@fontpair.ai
                                </a>
                            </p>
                            <p className="pt-2 text-secondary/50">
                                Each license key can be used on up to 3 devices. You can manage your devices in the settings after activation.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Privacy Notice */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-secondary/50">
                        Your license key and device information are stored securely.
                        <br />
                        We do not collect any personal data beyond what's necessary for license validation.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LicenseKeyScreen;
