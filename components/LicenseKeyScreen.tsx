import React, { useState } from 'react';
import { CadmusLogoIcon, CheckIcon } from './Icons';
import {
    validateLicenseKey,
    isValidLicenseFormat,
    type ValidationResult
} from '../services/licenseService';
import { signInWithMagicLink } from '../services/authService';

interface LicenseKeyScreenProps {
    onLicenseValidated: () => void;
}

const LicenseKeyScreen: React.FC<LicenseKeyScreenProps> = ({ onLicenseValidated }) => {
    // Free Tier State
    const [email, setEmail] = useState('');
    const [isSendingLink, setIsSendingLink] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [linkSent, setLinkSent] = useState(false);

    // Pro Tier State
    const [licenseKey, setLicenseKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [keyError, setKeyError] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // --- Free Tier Logic ---
    const handleFreeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError(null);
        
        if (!email || !email.includes('@')) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setIsSendingLink(true);
        try {
            await signInWithMagicLink(email);
            setLinkSent(true);
        } catch (err) {
            console.error('Auth error:', err);
            setEmailError('Failed to send access link. Please try again.');
        } finally {
            setIsSendingLink(false);
        }
    };

    // --- Pro Tier Logic ---
    const handleProSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setKeyError(null);
        setValidationResult(null);

        if (!licenseKey.trim()) {
            setKeyError('Please enter a license key');
            return;
        }

        const cleaned = licenseKey.trim().toUpperCase(); // Keeping spaces is fine for now as validate cleans it, but better to be consistent

        if (!isValidLicenseFormat(cleaned)) {
            setKeyError('Invalid license key format.');
            return;
        }

        setIsValidating(true);

        try {
            const result = await validateLicenseKey(cleaned);
            setValidationResult(result);

            if (result.valid) {
                setTimeout(() => {
                    onLicenseValidated();
                }, 2000);
            } else {
                setKeyError(getErrorMessage(result));
            }
        } catch (err) {
            setKeyError('An unexpected error occurred.');
            console.error('Validation error:', err);
        } finally {
            setIsValidating(false);
        }
    };

    const getErrorMessage = (result: ValidationResult): string => {
        switch (result.code) {
            case 'KEY_NOT_FOUND': return 'Invalid license key.';
            case 'KEY_INACTIVE': return 'License deactivated.';
            case 'KEY_EXPIRED': return 'License expired.';
            case 'MAX_DEVICES_REACHED': return 'Max devices reached.';
            default: return result.error || 'Validation failed.';
        }
    };

    const getSuccessMessage = () => {
        if (!validationResult?.valid) return null;
        return "✓ Professional activated! Redirecting...";
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-4xl w-full my-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <CadmusLogoIcon className="w-auto icon-embossed" style={{ height: '140px', color: '#8B7355' }} />
                    </div>
                    <h1 className="text-3xl font-bold text-teal-dark mb-2">Welcome to FontPair AI</h1>
                    <p className="text-secondary">Select your access method to continue</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* LEFT: FREE ACCESS */}
                    <div className="bg-surface border border-border rounded-xl p-8 flex flex-col hover:border-secondary transition-colors shadow-sm">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-primary mb-2">FREE ACCESS</h2>
                            <p className="text-sm text-secondary">For hobbyists & students</p>
                        </div>

                        {!linkSent ? (
                            <form onSubmit={handleFreeSubmit} className="flex-grow flex flex-col">
                                <div className="mb-6 flex-grow">
                                    <ul className="space-y-3 mb-6">
                                        <li className="flex items-center gap-3 text-sm text-primary">
                                            <CheckIcon className="w-5 h-5 text-teal-medium" />
                                            <span>3 AI analyses per day</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-primary">
                                            <CheckIcon className="w-5 h-5 text-teal-medium" />
                                            <span>Basic font recognition</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-primary">
                                            <CheckIcon className="w-5 h-5 text-teal-medium" />
                                            <span>Standard support</span>
                                        </li>
                                    </ul>
                        
                                    <label htmlFor="free-email-input" className="block text-xs font-bold uppercase text-secondary mb-2">
                                        Your Email
                                    </label>
                                    <input
                                        id="free-email-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full px-4 py-3 bg-[#F5F2EB] border border-border rounded-md text-[#2D3E36] placeholder-[#6B7B74] focus:outline-none focus:ring-2 focus:ring-teal-medium transition-all"
                                        disabled={isSendingLink}
                                    />
                                    <p className="text-xs text-secondary/70 mt-2">
                                        New or returning? We'll send a magic link either way.
                                    </p>
                                    {emailError && <p className="text-xs text-red-500 mt-2">{emailError}</p>}
                                </div>
                        
                                <button
                                    type="submit"
                                    disabled={isSendingLink || !email}
                                    className="w-full py-3 bg-secondary text-white font-bold rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
                                >
                                    {isSendingLink ? 'Sending...' : 'Send Access Link'}
                                </button>
                                
                                <p className="text-xs text-center text-secondary/50 mt-3">
                                    Sessions persist in this browser. Use your email to access from other devices.
                                </p>
                            </form>
                        ) : (                            <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-green-50 rounded-lg border border-green-100">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="font-bold text-green-800 mb-2">Check your inbox!</h3>
                                <p className="text-sm text-green-700 mb-4">We've sent a magic link to <strong>{email}</strong>.</p>
                                <p className="text-xs text-green-600">Click the link to sign in automatically.</p>
                                <button onClick={() => setLinkSent(false)} className="mt-4 text-xs text-green-800 underline hover:text-green-900">Use a different email</button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: PROFESSIONAL */}
                    <div className="bg-teal-dark border-2 border-accent rounded-xl p-8 flex flex-col shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-accent text-surface text-xs font-bold px-4 py-1 rounded-bl-lg">
                            RECOMMENDED
                        </div>

                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-[#F2EFE8] mb-2">PROFESSIONAL</h2>
                            <p className="text-sm text-teal-light">£48.99 One-time payment</p>
                        </div>

                        <form onSubmit={handleProSubmit} className="flex-grow flex flex-col">
                            <div className="mb-6 flex-grow">
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center gap-3 text-sm text-teal-light">
                                        <CheckIcon className="w-5 h-5 text-accent" />
                                        <span>Unlimited AI analyses</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-teal-light">
                                        <CheckIcon className="w-5 h-5 text-accent" />
                                        <span>Full AI Suite (Pairing, Critique)</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-teal-light">
                                        <CheckIcon className="w-5 h-5 text-accent" />
                                        <span>Project Management</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-teal-light">
                                        <CheckIcon className="w-5 h-5 text-accent" />
                                        <span>Priority Support</span>
                                    </li>
                                </ul>

                                <label htmlFor="license-key-input" className="block text-xs font-bold uppercase text-teal-light mb-2">Enter License Key</label>
                                <input
                                    id="license-key-input"
                                    type="text"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full px-4 py-3 bg-black/20 border border-teal-medium rounded-md text-[#F2EFE8] placeholder-teal-light/30 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-lg tracking-widest text-center uppercase"
                                    disabled={isValidating || (validationResult?.valid ?? false)}
                                />
                                {keyError && <p className="text-xs text-red-300 mt-2">{keyError}</p>}
                                {validationResult?.valid && <p className="text-xs text-green-300 mt-2 font-bold">{getSuccessMessage()}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isValidating || !licenseKey || (validationResult?.valid ?? false)}
                                className="w-full py-3 bg-accent text-surface font-bold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 mb-4"
                            >
                                {isValidating ? 'Validating...' : 'Activate License'}
                            </button>

                            <div className="text-center">
                                <a 
                                    href="https://www.fontpairai.com/pricing.html" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-teal-light underline hover:text-white"
                                >
                                    Don't have a key? Buy now
                                </a>
                            </div>
                        </form>
                    </div>

                </div>
                
                <div className="mt-8 text-center text-xs text-secondary/60 max-w-lg mx-auto">
                    By continuing, you agree to our Terms of Service and <a href="/privacy.html" target="_blank" className="underline hover:text-secondary">Privacy Policy</a>.
                </div>
            </div>
        </div>
    );
};

export default LicenseKeyScreen;