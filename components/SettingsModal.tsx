import React, { useState, useEffect } from 'react';
import { CloseIcon, CheckIcon, CopyIcon } from './Icons';
import { getAPIKey, setAPIKey, clearAPIKey, getChromeAIStatus } from '../utils/aiSettings';
import {
    getStoredLicense,
    getLicenseInfo,
    deactivateDevice,
    getDeviceFingerprint,
    type LicenseInfo
} from '../services/licenseService';
import { clearCache, getCacheStats } from '../utils/fontCache';
import { getProjectsState } from '../services/projectService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestartTour?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onRestartTour }) => {
    const [apiKey, setApiKeyState] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [chromeAIStatus, setChromeAIStatus] = useState<{
        available: boolean;
        status: string;
        message: string;
        details?: string;
    } | null>(null);
    const [isCheckingChromeAI, setIsCheckingChromeAI] = useState(false);
    const [copiedFlag, setCopiedFlag] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // License management state
    const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
    const [isLoadingLicense, setIsLoadingLicense] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [licenseMessage, setLicenseMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Cache management state
    const [cacheStats, setCacheStats] = useState<{
        totalEntries: number;
        totalSize: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    } | null>(null);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [cacheMessage, setCacheMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Data export/import state
    const [dataMessage, setDataMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
        return localStorage.getItem('cadmus_auto_save') === 'true';
    });
    const [autoSaveInterval, setAutoSaveIntervalState] = useState(() => {
        return parseInt(localStorage.getItem('cadmus_auto_save_interval') || '10', 10);
    });

    const handleAutoSaveToggle = (enabled: boolean) => {
        setAutoSaveEnabled(enabled);
        localStorage.setItem('cadmus_auto_save', enabled.toString());
        if (enabled) {
            setDataMessage({ type: 'success', text: `Auto-save enabled! Data will be saved every ${autoSaveInterval} minutes.` });
        } else {
            setDataMessage({ type: 'success', text: 'Auto-save disabled.' });
        }
        setTimeout(() => setDataMessage(null), 3000);
    };

    const handleAutoSaveIntervalChange = (minutes: number) => {
        setAutoSaveIntervalState(minutes);
        localStorage.setItem('cadmus_auto_save_interval', minutes.toString());
    };

    // Auto-save effect
    useEffect(() => {
        if (!autoSaveEnabled) return;

        const intervalMs = autoSaveInterval * 60 * 1000;
        const timer = setInterval(() => {
            try {
                const exportData = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    projects: getProjectsState(),
                    history: localStorage.getItem('cadmus_font_history'),
                    cache: localStorage.getItem('cadmus_font_cache'),
                    settings: {
                        apiKey: getAPIKey(),
                        aiMode: localStorage.getItem('cadmus_ai_mode')
                    }
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fontpair-autosave-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log('Auto-save completed:', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, [autoSaveEnabled, autoSaveInterval]);

    const handleExportAllData = () => {
        try {
            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                projects: getProjectsState(),
                history: localStorage.getItem('cadmus_font_history'),
                cache: localStorage.getItem('cadmus_font_cache'),
                settings: {
                    apiKey: getAPIKey(),
                    aiMode: localStorage.getItem('cadmus_ai_mode')
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fontpair-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDataMessage({ type: 'success', text: 'Data exported successfully!' });
            setTimeout(() => setDataMessage(null), 3000);
        } catch (error) {
            console.error('Export error:', error);
            setDataMessage({ type: 'error', text: 'Failed to export data' });
            setTimeout(() => setDataMessage(null), 3000);
        }
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target?.result as string);

                if (!importData.version || !importData.projects) {
                    throw new Error('Invalid backup file format');
                }

                // Confirm before overwriting
                if (!confirm('This will replace your current projects and settings. Continue?')) {
                    return;
                }

                // Import projects
                if (importData.projects) {
                    localStorage.setItem('cadmus_projects', JSON.stringify(importData.projects));
                }

                // Import history
                if (importData.history) {
                    localStorage.setItem('cadmus_font_history', importData.history);
                }

                // Import cache (optional)
                if (importData.cache) {
                    localStorage.setItem('cadmus_font_cache', importData.cache);
                }

                // Import settings
                if (importData.settings?.apiKey) {
                    setAPIKey(importData.settings.apiKey);
                    setApiKeyState(importData.settings.apiKey);
                }
                if (importData.settings?.aiMode) {
                    localStorage.setItem('cadmus_ai_mode', importData.settings.aiMode);
                }

                setDataMessage({ type: 'success', text: 'Data imported successfully! Refresh the page to see changes.' });
                loadCacheStats();
            } catch (error) {
                console.error('Import error:', error);
                setDataMessage({ type: 'error', text: 'Failed to import data. Invalid file format.' });
                setTimeout(() => setDataMessage(null), 3000);
            }
        };
        reader.readAsText(file);

        // Reset the input
        event.target.value = '';
    };

    useEffect(() => {
        if (isOpen) {
            // Load current API key
            const currentKey = getAPIKey();
            setApiKeyState(currentKey);

            // Check Chrome AI status
            checkChromeAI();

            // Load license information
            loadLicenseInfo();

            // Load cache statistics
            loadCacheStats();
        }
    }, [isOpen]);

    const loadLicenseInfo = async () => {
        setIsLoadingLicense(true);
        try {
            const stored = getStoredLicense();
            if (stored) {
                const fingerprint = await getDeviceFingerprint();
                setDeviceFingerprint(fingerprint);

                const info = await getLicenseInfo();
                setLicenseInfo(info);
            }
        } catch (error) {
            console.error('Error loading license info:', error);
        } finally {
            setIsLoadingLicense(false);
        }
    };

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate this device? You will need to re-enter your license key to use FontPair AI on this device again.')) {
            return;
        }

        setIsDeactivating(true);
        setLicenseMessage(null);

        try {
            const result = await deactivateDevice();
            if (result.success) {
                setLicenseMessage({ type: 'success', text: 'Device deactivated successfully. Please restart the app.' });
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setLicenseMessage({ type: 'error', text: result.error || 'Failed to deactivate device' });
            }
        } catch (error) {
            setLicenseMessage({ type: 'error', text: 'An error occurred during deactivation' });
        } finally {
            setIsDeactivating(false);
        }
    };

    const loadCacheStats = () => {
        try {
            const stats = getCacheStats();
            setCacheStats(stats);
        } catch (error) {
            console.error('Error loading cache stats:', error);
        }
    };

    const handleClearCache = () => {
        if (!confirm('Are you sure you want to clear all cached font analyses? This will make future analyses take longer until they are cached again.')) {
            return;
        }

        setIsClearingCache(true);
        setCacheMessage(null);

        try {
            clearCache();
            setCacheMessage({ type: 'success', text: 'Cache cleared successfully!' });
            loadCacheStats(); // Refresh stats
            setTimeout(() => setCacheMessage(null), 3000);
        } catch (error) {
            setCacheMessage({ type: 'error', text: 'Failed to clear cache' });
            setTimeout(() => setCacheMessage(null), 3000);
        } finally {
            setIsClearingCache(false);
        }
    };

    // Auto-refresh when downloading
    useEffect(() => {
        if (chromeAIStatus?.status === 'after-download' && isOpen) {
            const interval = setInterval(() => {
                checkChromeAI();
            }, 30000); // Check every 30 seconds

            return () => clearInterval(interval);
        }
    }, [chromeAIStatus?.status, isOpen]);

    const checkChromeAI = async () => {
        setIsCheckingChromeAI(true);
        const status = await getChromeAIStatus();
        setChromeAIStatus(status);

        // If status is 'no' (flags enabled but model not downloading), try to trigger download
        if (status.status === 'no' && window.ai?.languageModel) {
            try {
                // This "dummy call" often forces Chrome to wake up and start the download
                const session = await window.ai.languageModel.create();
                session.destroy();
                // Re-check status after triggering
                const updatedStatus = await getChromeAIStatus();
                setChromeAIStatus(updatedStatus);
            } catch (error) {
                // Expected to fail if model isn't ready, but it may trigger download
                console.log('Attempted to trigger Chrome AI download:', error);
            }
        }

        setLastChecked(new Date());
        setIsCheckingChromeAI(false);
    };

    const handleForceWake = async () => {
        if (!window.ai?.languageModel) {
            alert('Chrome AI is not available. Please enable the Chrome flags first.');
            return;
        }

        try {
            const session = await window.ai.languageModel.create();
            session.destroy();
            alert('Wake signal sent successfully! Chrome AI appears to be ready.');
            // Re-check status
            const status = await getChromeAIStatus();
            setChromeAIStatus(status);
            setLastChecked(new Date());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log('Force wake attempt:', errorMessage);

            if (errorMessage.toLowerCase().includes('download')) {
                setChromeAIStatus({
                    available: false,
                    status: 'after-download',
                    message: 'Downloading Model',
                    details: 'Model download triggered! This may take 5-10 minutes. The status will update automatically.'
                });
                alert('Wake signal sent to Chrome. The model download should now be in progress. Check for a download progress bar in chrome://components.');
            } else {
                alert('Wake signal sent to Chrome. If the model is not downloading, try visiting chrome://components and click "Check for update" on "Optimization Guide On Device Model".');
            }
            setLastChecked(new Date());
        }
    };

    const handleCopyToClipboard = (text: string, flagName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedFlag(flagName);
        setTimeout(() => setCopiedFlag(null), 2000);
    };

    const handleSaveAPIKey = () => {
        setIsSaving(true);
        try {
            setAPIKey(apiKey);
            setSaveMessage({ type: 'success', text: 'API key saved successfully!' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Failed to save API key' });
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearAPIKey = () => {
        clearAPIKey();
        setApiKeyState('');
        setSaveMessage({ type: 'success', text: 'API key cleared' });
        setTimeout(() => setSaveMessage(null), 3000);
    };

    if (!isOpen) return null;

    const hasAPIKey = apiKey.trim().length > 0;

    const flags = [
        {
            name: 'optimization-guide-on-device-model',
            url: 'chrome://flags/#optimization-guide-on-device-model',
            value: 'Enabled BypassPerfRequirement',
            description: 'Enables on-device AI model'
        },
        {
            name: 'prompt-api-for-gemini-nano',
            url: 'chrome://flags/#prompt-api-for-gemini-nano',
            value: 'Enabled',
            description: 'Enables Prompt API for Gemini Nano'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="paper-modal rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-surface/90 backdrop-blur-sm border-b border-teal-medium/30 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text-light">AI Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-teal-light hover:text-text-light transition-colors"
                        aria-label="Close settings"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* License Management Section - MOST IMPORTANT */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-semibold text-text-light">License Management</h3>
                                {licenseInfo?.found && licenseInfo.isActive && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                                        <CheckIcon className="w-3 h-3" />
                                        Active
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={loadLicenseInfo}
                                disabled={isLoadingLicense}
                                className="px-4 py-2 bg-teal-medium/50 text-text-light text-sm font-semibold rounded-md hover:bg-teal-medium/70 transition-colors disabled:opacity-50 border border-teal-light/20"
                            >
                                {isLoadingLicense ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>

                        <div className="bg-teal-dark/40 rounded-lg p-4 space-y-4 border border-teal-light/10">
                            {isLoadingLicense ? (
                                <div className="text-center py-8">
                                    <p className="text-teal-light">Loading license information...</p>
                                </div>
                            ) : licenseInfo?.found ? (
                                <>
                                    {/* License Key Display */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-text-light">License Key</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 px-4 py-2 bg-teal-dark border border-teal-medium/30 rounded-md font-mono text-sm text-teal-light">
                                                {licenseInfo.licenseKey ?
                                                    `${licenseInfo.licenseKey.slice(0, 4)}-****-****-${licenseInfo.licenseKey.slice(-4)}`
                                                    : '****-****-****-****'}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (licenseInfo.licenseKey) {
                                                        navigator.clipboard.writeText(licenseInfo.licenseKey);
                                                        setLicenseMessage({ type: 'success', text: 'License key copied to clipboard!' });
                                                        setTimeout(() => setLicenseMessage(null), 2000);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-accent text-text-light font-semibold rounded-md hover:bg-accent-dark transition-colors flex items-center gap-2 shadow-md"
                                            >
                                                <CopyIcon className="w-4 h-4" />
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Device Information */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-text-light">Device Fingerprint</label>
                                            <div className="px-4 py-2 bg-teal-dark border border-teal-medium/30 rounded-md font-mono text-xs text-teal-light">
                                                {deviceFingerprint ? `${deviceFingerprint.slice(0, 12)}...` : 'Loading...'}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-text-light">Device Status</label>
                                            <div className="px-4 py-2 bg-teal-dark border border-teal-medium/30 rounded-md text-sm text-text-light">
                                                {licenseInfo.activeDevices} of {licenseInfo.maxDevices} devices active
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expiry Information */}
                                    {licenseInfo.expiresAt && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-text-light">Expires</label>
                                            <div className="px-4 py-2 bg-teal-dark border border-teal-medium/30 rounded-md text-sm text-text-light">
                                                {new Date(licenseInfo.expiresAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Devices List */}
                                    {licenseInfo.activations && licenseInfo.activations.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-text-light">Active Devices</label>
                                            <div className="space-y-2">
                                                {licenseInfo.activations.map((activation, index) => (
                                                    <div
                                                        key={index}
                                                        className={`px-4 py-3 rounded-md border ${
                                                            activation.isCurrent
                                                                ? 'bg-accent/20 border-accent/40'
                                                                : 'bg-teal-dark border-teal-medium/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium text-text-light">
                                                                    {activation.deviceName || `Device ${index + 1}`}
                                                                    {activation.isCurrent && (
                                                                        <span className="ml-2 text-xs text-accent font-semibold">(This Device)</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-teal-light font-mono">
                                                                    {activation.deviceFingerprint}
                                                                </p>
                                                                <p className="text-xs text-teal-light">
                                                                    Last used: {new Date(activation.lastUsed).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Deactivate Button */}
                                    <div className="pt-2">
                                        <button
                                            onClick={handleDeactivate}
                                            disabled={isDeactivating}
                                            className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md border border-red-500"
                                        >
                                            {isDeactivating ? 'Deactivating...' : 'Deactivate This Device'}
                                        </button>
                                        <p className="text-xs text-teal-light mt-2 text-center">
                                            Deactivating will free up a device slot. You'll need to re-enter your license key to reactivate.
                                        </p>
                                    </div>

                                    {/* Status Messages */}
                                    {licenseMessage && (
                                        <div className={`text-sm p-3 rounded-md ${
                                            licenseMessage.type === 'success'
                                                ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-300 border border-red-500/20'
                                        }`}>
                                            {licenseMessage.text}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 space-y-3">
                                    <p className="text-secondary">No license information available</p>
                                    <p className="text-xs text-secondary/70">
                                        Your license should have been validated when you first launched the app.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="border-t border-teal-medium/30"></div>

                    {/* Cache Management Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-text-light">Cache Management</h3>
                            <button
                                onClick={loadCacheStats}
                                className="px-4 py-2 bg-teal-medium/50 text-text-light text-sm font-semibold rounded-md hover:bg-teal-medium/70 transition-colors border border-teal-light/20"
                            >
                                Refresh Stats
                            </button>
                        </div>

                        <div className="bg-teal-dark/40 rounded-lg p-4 space-y-4 border border-teal-light/10">
                            <p className="text-sm text-teal-light">
                                FontPair AI caches font analyses locally to speed up repeated analyses. Cached analyses load instantly without requiring AI processing.
                            </p>

                            {cacheStats && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-teal-dark border border-teal-medium/30 rounded-md p-3">
                                        <p className="text-xs text-teal-light mb-1">Total Cached Analyses</p>
                                        <p className="text-2xl font-bold text-text-light">{cacheStats.totalEntries}</p>
                                    </div>
                                    <div className="bg-teal-dark border border-teal-medium/30 rounded-md p-3">
                                        <p className="text-xs text-teal-light mb-1">Cache Size</p>
                                        <p className="text-2xl font-bold text-text-light">
                                            {(cacheStats.totalSize / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                            )}

                            {cacheStats && cacheStats.totalEntries > 0 && (
                                <>
                                    <div className="pt-2">
                                        <button
                                            onClick={handleClearCache}
                                            disabled={isClearingCache}
                                            className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md border border-red-500"
                                        >
                                            {isClearingCache ? 'Clearing...' : 'Clear All Cached Analyses'}
                                        </button>
                                        <p className="text-xs text-teal-light mt-2 text-center">
                                            Clearing the cache will free up storage space. Analyses will be cached again when you use them.
                                        </p>
                                    </div>

                                    {cacheMessage && (
                                        <div className={`text-sm p-3 rounded-md ${
                                            cacheMessage.type === 'success'
                                                ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-300 border border-red-500/20'
                                        }`}>
                                            {cacheMessage.text}
                                        </div>
                                    )}
                                </>
                            )}

                            {cacheStats && cacheStats.totalEntries === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-teal-light text-sm">No cached analyses yet. Analyze some fonts to see them cached here!</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="border-t border-teal-medium/30"></div>

                    {/* Help & Onboarding Section */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-semibold text-text-light">Help & Onboarding</h3>

                        <div className="bg-teal-dark/40 rounded-lg p-4 border border-teal-light/10">
                            <button
                                onClick={onRestartTour}
                                className="w-full px-4 py-3 bg-teal-medium/50 border border-teal-light/20 rounded-lg text-text-light hover:bg-teal-medium/70 hover:border-accent/40 transition-colors text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">Restart Onboarding Tour</p>
                                        <p className="text-teal-light text-sm mt-1">Show me around again</p>
                                    </div>
                                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="border-t border-teal-medium/30"></div>

                    {/* Data Backup Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-semibold text-text-light">Data Backup</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Important
                            </span>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <p className="text-sm text-yellow-200">
                                Your projects and history are stored in your browser's local storage.
                                <strong> Clearing browser data will permanently delete them.</strong>
                                Export your data regularly to keep backups safe.
                            </p>
                        </div>

                        <div className="bg-teal-dark/40 rounded-lg p-4 space-y-4 border border-teal-light/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Export Button */}
                                <button
                                    onClick={handleExportAllData}
                                    className="px-4 py-4 bg-accent text-surface font-semibold rounded-lg hover:bg-accent/90 transition-colors flex flex-col items-center gap-2 shadow-md"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Export All Data</span>
                                    <span className="text-xs opacity-80">Projects, history, settings</span>
                                </button>

                                {/* Import Button */}
                                <label className="px-4 py-4 bg-teal-medium/50 border border-teal-light/20 text-text-light font-semibold rounded-lg hover:bg-teal-medium/70 transition-colors flex flex-col items-center gap-2 cursor-pointer">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span>Import Data</span>
                                    <span className="text-xs text-teal-light">Restore from backup file</span>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportData}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {dataMessage && (
                                <div className={`text-sm p-3 rounded-md ${
                                    dataMessage.type === 'success'
                                        ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                                        : 'bg-red-500/10 text-red-300 border border-red-500/20'
                                }`}>
                                    {dataMessage.text}
                                </div>
                            )}

                            <p className="text-xs text-teal-light">
                                Exported file includes: all projects with pairings, font analysis history, cached analyses, and API settings.
                            </p>

                            {/* Auto-save Option */}
                            <div className="border-t border-teal-medium/30 pt-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-semibold text-text-light">Auto-save Backups</p>
                                        <p className="text-xs text-teal-light">Automatically download backup files periodically</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoSaveEnabled}
                                            onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-teal-dark peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                    </label>
                                </div>

                                {autoSaveEnabled && (
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm text-teal-light">Save every:</label>
                                        <select
                                            value={autoSaveInterval}
                                            onChange={(e) => handleAutoSaveIntervalChange(parseInt(e.target.value, 10))}
                                            className="px-3 py-1.5 bg-teal-dark border border-teal-medium/40 rounded-md text-text-light text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                        >
                                            <option value="5">5 minutes</option>
                                            <option value="10">10 minutes</option>
                                            <option value="15">15 minutes</option>
                                            <option value="30">30 minutes</option>
                                            <option value="60">1 hour</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="border-t border-teal-medium/30"></div>

                    {/* Gemini API Section - PRIMARY OPTION */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-semibold text-text-light">Gemini API Key (Recommended)</h3>
                            {hasAPIKey && (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                                    <CheckIcon className="w-3 h-3" />
                                    Ready
                                </span>
                            )}
                        </div>

                        <div className="bg-teal-dark/40 rounded-lg p-4 space-y-3 border border-accent/30">
                            <p className="text-sm text-text-light font-medium">
                                Cloud AI provides reliable, high-quality font analysis using Google's Gemini model.
                            </p>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-text-light">Get your free API key:</p>
                                <ol className="text-sm text-teal-light space-y-1 ml-4 list-decimal">
                                    <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">Google AI Studio</a></li>
                                    <li>Sign in with your Google account</li>
                                    <li>Click "Get API Key" or "Create API Key"</li>
                                    <li>Copy the key and paste it below</li>
                                </ol>
                            </div>

                            <div className="pt-2">
                                <label htmlFor="api-key-input" className="block text-sm font-medium text-text-light mb-2">
                                    API Key
                                </label>
                                <input
                                    id="api-key-input"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKeyState(e.target.value)}
                                    placeholder="Enter your Gemini API key..."
                                    className="w-full px-4 py-2 bg-teal-dark border border-teal-medium/40 rounded-md text-text-light placeholder-teal-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveAPIKey}
                                    disabled={isSaving || !apiKey.trim()}
                                    className="px-4 py-2 bg-accent text-text-light font-semibold rounded-md hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                                >
                                    {isSaving ? 'Saving...' : 'Save API Key'}
                                </button>
                                {hasAPIKey && (
                                    <button
                                        onClick={handleClearAPIKey}
                                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-md border border-red-500"
                                    >
                                        Clear Key
                                    </button>
                                )}
                            </div>

                            {saveMessage && (
                                <div className={`text-sm p-3 rounded-md ${
                                    saveMessage.type === 'success'
                                        ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                                        : 'bg-red-500/10 text-red-300 border border-red-500/20'
                                }`}>
                                    {saveMessage.text}
                                </div>
                            )}

                            <div className="text-xs text-teal-light pt-2 space-y-1">
                                <p>Free tier limits: 15 requests/min, 1M tokens/day</p>
                                <p>Your API key is stored locally in your browser and never sent to our servers.</p>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
