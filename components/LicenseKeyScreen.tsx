import React, { useState } from 'react';
import { CadmusLogoIcon, CheckIcon } from './Icons';
import {
    validateLicenseKey,
    isValidLicenseFormat,
    type ValidationResult
} from '../services/licenseService';
import { setUserTier } from '../services/tierService';

interface LicenseKeyScreenProps {
    onLicenseValidated: () => void;
}

const LicenseKeyScreen: React.FC<LicenseKeyScreenProps> = ({ onLicenseValidated }) => {
    const [licenseKey, setLicenseKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    const handleContinueFree = () => {
        setUserTier('free');
        onLicenseValidated();
    };

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
                // Success! Tier is set to 'professional' inside validateLicenseKey
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
        <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-2xl w-full my-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <CadmusLogoIcon className="w-auto icon-embossed" style={{ height: '160px', color: '#8B7355' }} />
                    </div>
                    <h1 className="text-3xl font-bold text-primary mb-2">Welcome to FontPair AI</h1>
                    <p className="text-secondary">Choose how you want to proceed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Free Tier Card */}
                    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col hover:border-secondary transition-colors">
                        <h3 className="text-xl font-bold text-primary mb-2">Free Starter</h3>
                        <div className="text-3xl font-bold text-primary mb-4">£0</div>
                        <p className="text-sm text-secondary mb-6">Perfect for hobbyists and quick checks.</p>
                        
                        <ul className="space-y-3 mb-8 flex-grow">
                            <li className="flex items-center gap-2 text-sm text-primary">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <span>Single font analysis</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <span>3 analyses per day</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <span>Basic glyph comparison</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleContinueFree}
                            className="w-full py-3 bg-secondary/20 text-primary font-semibold rounded-lg hover:bg-secondary/30 transition-colors"
                        >
                            Continue with Free
                        </button>
                    </div>

                    {/* Pro Tier Card */}
                    <div className="bg-teal-dark border-2 border-accent rounded-xl p-6 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-accent text-surface text-xs font-bold px-3 py-1 rounded-bl-lg">
                            RECOMMENDED
                        </div>
                        
                        <h3 className="text-xl font-bold text-[#F2EFE8] mb-2">Professional</h3>
                        <div className="text-3xl font-bold text-[#F2EFE8] mb-4">£48.99</div>
                        <p className="text-sm text-teal-light mb-6">For designers and agencies.</p>

                        <ul className="space-y-3 mb-8 flex-grow">
                             <li className="flex items-center gap-2 text-sm text-teal-light">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>Unlimited analyses</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-teal-light">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>AI Pairing Critique & Scoring</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-teal-light">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>Batch Analysis & Projects</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-teal-light">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>No Watermark PDF Export</span>
                            </li>
                        </ul>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                type="text"
                                value={licenseKey}
                                onChange={handleKeyChange}
                                placeholder="Enter License Key"
                                disabled={isValidating}
                                className="w-full px-3 py-2 bg-black/20 border border-teal-medium rounded-md text-[#F2EFE8] placeholder-teal-light/30 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                            />
                            
                            {error && <p className="text-xs text-red-300">{error}</p>}
                            {validationResult?.valid && <p className="text-xs text-green-300">Activated! Redirecting...</p>}

                            <button
                                type="submit"
                                disabled={isValidating || !licenseKey.trim() || validationResult?.valid}
                                className="w-full py-3 bg-accent text-surface font-bold rounded-lg hover:bg-accent/90 transition-colors flex justify-center gap-2"
                            >
                                {isValidating ? 'Validating...' : 'Activate License'}
                            </button>
                        </form>
                        
                        <div className="mt-3 text-center">
                             <a
                                href="https://fontpair.ai/purchase"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-teal-light underline hover:text-white"
                            >
                                Buy a license key
                            </a>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 text-center text-xs text-secondary/60">
                    Your license status is stored locally on your device.
                </div>
            </div>
        </div>
    );
};

export default LicenseKeyScreen;
