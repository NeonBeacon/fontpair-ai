import React, { useState } from 'react';
import { CadmusLogoIcon, CheckIcon } from './Icons';
import {
    validateLicenseKey,
    isValidLicenseFormat,
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
                // Success! Tier is set inside validateLicenseKey
                setTimeout(() => {
                    onLicenseValidated();
                }, 2000);
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

    const getSuccessMessage = () => {
        if (!validationResult?.valid) return null;
        const tierName = validationResult.tier === 'professional' ? 'Professional License' : 'Free Starter';
        return `✓ ${tierName} activated! Redirecting...`;
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-2xl w-full my-8">
                {/* Header & Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <CadmusLogoIcon className="w-auto icon-embossed" style={{ height: '160px', color: '#8B7355' }} />
                    </div>
                    <h1 className="text-3xl font-bold text-teal-dark mb-2">Welcome to FontPair AI</h1>
                    <p className="text-secondary">Enter your license key to continue</p>
                </div>

                {/* License Key Input Section */}
                <div className="bg-teal-dark border-2 border-accent rounded-xl p-6 mb-10 shadow-lg">
                     <h3 className="text-lg font-bold text-[#F2EFE8] mb-4 text-center">Enter Your License Key</h3>
                     <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            value={licenseKey}
                            onChange={handleKeyChange}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            disabled={isValidating || (validationResult?.valid ?? false)}
                            className="flex-grow px-4 py-3 bg-black/20 border border-teal-medium rounded-md text-[#F2EFE8] placeholder-teal-light/30 focus:outline-none focus:ring-2 focus:ring-accent text-center md:text-left uppercase tracking-wider font-mono"
                        />
                        <button
                            type="submit"
                            disabled={isValidating || !licenseKey.trim() || (validationResult?.valid ?? false)}
                            className="px-8 py-3 bg-accent text-surface font-bold rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                        >
                            {isValidating ? '...' : 'Activate'}
                        </button>
                    </form>
                    
                    {error && (
                        <div className="mt-3 bg-red-500/20 border border-red-500/30 rounded p-3 text-center">
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}
                    
                    {validationResult?.valid && (
                        <div className="mt-3 bg-green-500/20 border border-green-500/30 rounded p-3 text-center">
                            <p className="text-sm text-green-200 font-bold">{getSuccessMessage()}</p>
                        </div>
                    )}
                </div>

                <div className="relative flex py-5 items-center mb-8">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="flex-shrink-0 mx-4 text-secondary">Don't have a key yet?</span>
                    <div className="flex-grow border-t border-border"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Free Tier Card */}
                    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col hover:border-secondary transition-colors shadow-sm">
                        <h3 className="text-xl font-bold text-primary mb-2">Free Starter</h3>
                        <div className="text-3xl font-bold text-primary mb-4">£0</div>
                        
                        <ul className="space-y-3 mb-8 flex-grow">
                             <li className="flex items-center gap-2 text-sm text-primary">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <span>3 analyses per day</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <span>Basic analysis</span>
                            </li>
                             <li className="flex items-center gap-2 text-sm text-primary">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <span>Requires email</span>
                            </li>
                        </ul>

                        <a
                            href="https://neonbeacon.gumroad.com/l/fontpair-free"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-secondary/10 text-primary font-bold rounded-lg hover:bg-secondary/20 transition-colors text-center block"
                        >
                            Get Free Key
                        </a>
                    </div>

                    {/* Pro Tier Card */}
                    <div className="bg-surface border-2 border-teal-medium rounded-xl p-6 flex flex-col shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-teal-medium text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            RECOMMENDED
                        </div>
                        
                        <h3 className="text-xl font-bold text-teal-dark mb-2">Professional</h3>
                        <div className="text-3xl font-bold text-teal-dark mb-4">£48.99</div>

                        <ul className="space-y-3 mb-8 flex-grow">
                             <li className="flex items-center gap-2 text-sm text-teal-dark">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>Unlimited analyses</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-teal-dark">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>Full AI Capabilities</span>
                            </li>
                             <li className="flex items-center gap-2 text-sm text-teal-dark">
                                <CheckIcon className="w-4 h-4 text-accent" />
                                <span>Commercial License</span>
                            </li>
                        </ul>

                         <a
                            href="https://neonbeacon.gumroad.com/l/fontpair-pro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-teal-dark text-white font-bold rounded-lg hover:bg-teal-dark/90 transition-colors text-center block shadow-lg transform hover:-translate-y-0.5 duration-150"
                        >
                            Get Pro Key
                        </a>
                    </div>
                </div>
                
                <div className="mt-8 text-center text-xs text-secondary/60">
                    Both options require email validation to generate a unique license key.
                </div>
            </div>
        </div>
    );
};

export default LicenseKeyScreen;