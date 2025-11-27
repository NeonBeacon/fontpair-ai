import type { AIMode, AISettings } from '../types';

const AI_MODE_KEY = 'ai_mode';
const GEMINI_API_KEY = 'gemini_api_key';

/**
 * Get the current AI mode from localStorage
 * Defaults to 'cloud' (primary/recommended option)
 */
export const getAIMode = async (): Promise<AIMode> => {
    const stored = localStorage.getItem(AI_MODE_KEY) as AIMode | null;
    if (stored === 'chrome' || stored === 'cloud') {
        return stored;
    }

    // Default to cloud (recommended option)
    return 'cloud';
};

/**
 * Set the current AI mode in localStorage
 */
export const setAIMode = (mode: AIMode): void => {
    localStorage.setItem(AI_MODE_KEY, mode);
};

/**
 * Get the Gemini API key from localStorage
 */
export const getAPIKey = (): string => {
    // MUST check process.env for local .env file support
    return localStorage.getItem(GEMINI_API_KEY) || process.env.GEMINI_API_KEY || '';
};

/**
 * Set the Gemini API key in localStorage
 */
export const setAPIKey = (key: string): void => {
    if (key.trim()) {
        localStorage.setItem(GEMINI_API_KEY, key.trim());
    } else {
        localStorage.removeItem(GEMINI_API_KEY);
    }
};

/**
 * Clear the Gemini API key from localStorage
 */
export const clearAPIKey = (): void => {
    localStorage.removeItem(GEMINI_API_KEY);
};

/**
 * Get all AI settings
 */
export const getAISettings = async (): Promise<AISettings> => {
    const mode = await getAIMode();
    const apiKey = getAPIKey();
    return { mode, apiKey };
};

/**
 * Check if Chrome's built-in AI is available
 * Uses the new window.ai.languageModel API
 * This is an EXPERIMENTAL feature and may not work on all systems
 */
export const isChromeAIAvailable = async (): Promise<boolean> => {
    try {
        // Defensive checks - Chrome AI is experimental and may not exist
        if (typeof window === 'undefined') return false;
        if (!('ai' in window)) return false;
        if (!window.ai) return false;
        if (!window.ai.languageModel) return false;
        if (typeof window.ai.languageModel.capabilities !== 'function') return false;

        const capabilities = await window.ai.languageModel.capabilities();
        return capabilities.available === 'readily';
    } catch (error) {
        // Silently fail - Chrome AI is experimental and failures are expected
        console.warn('Chrome AI not available (this is normal):', error);
        return false;
    }
};

/**
 * Get Chrome AI availability status with details
 * Returns detailed status for better user feedback
 * Chrome AI is EXPERIMENTAL and may not work on all systems
 */
export const getChromeAIStatus = async (): Promise<{
    available: boolean;
    status: 'readily' | 'after-download' | 'no' | 'unsupported' | 'checking';
    message: string;
    details?: string;
}> => {
    try {
        // Defensive checks - Chrome AI is experimental
        if (typeof window === 'undefined') {
            return {
                available: false,
                status: 'unsupported',
                message: 'Not Available',
                details: 'Chrome AI is an experimental feature. For reliable results, use Cloud AI with your Gemini API key.'
            };
        }

        if (!('ai' in window) || !window.ai) {
            return {
                available: false,
                status: 'unsupported',
                message: 'Not Available',
                details: 'Chrome AI is not supported in your browser. This experimental feature requires Chrome Canary or Dev channel. Use Cloud AI for reliable results.'
            };
        }

        if (!window.ai.languageModel) {
            return {
                available: false,
                status: 'no',
                message: 'Not Enabled',
                details: 'Chrome AI flags are not enabled. This is an experimental feature. For reliable results, use Cloud AI instead.'
            };
        }

        // Try to get capabilities
        if (typeof window.ai.languageModel.capabilities !== 'function') {
            return {
                available: false,
                status: 'unsupported',
                message: 'Not Available',
                details: 'Chrome AI API is not fully available. Use Cloud AI for reliable results.'
            };
        }

        const capabilities = await window.ai.languageModel.capabilities();

        if (capabilities.available === 'readily') {
            return {
                available: true,
                status: 'readily',
                message: 'Ready',
                details: 'Chrome AI is ready! This experimental feature provides fast, local processing.'
            };
        } else if (capabilities.available === 'after-download') {
            return {
                available: false, // Not usable until download completes
                status: 'after-download',
                message: 'Downloading Model',
                details: 'Chrome AI model is downloading (5-10 minutes). You can use Cloud AI now for immediate results, or wait for the download to complete.'
            };
        } else {
            return {
                available: false,
                status: 'no',
                message: 'Not Available',
                details: 'Chrome AI setup incomplete. This is an experimental feature. Use Cloud AI for reliable results.'
            };
        }
    } catch (error) {
        // Silently handle errors - Chrome AI is experimental
        console.warn('Chrome AI detection failed (this is normal):', error);
        return {
            available: false,
            status: 'unsupported',
            message: 'Not Available',
            details: 'Chrome AI is an experimental feature and may not work on all systems. Use Cloud AI for reliable results.'
        };
    }
};

/**
 * Validate that the current mode can be used
 * Provides helpful error messages for each mode
 */
export const validateAIMode = async (mode: AIMode): Promise<{
    valid: boolean;
    error?: string;
    shouldFallback?: boolean; // Indicates should auto-switch to Cloud AI
}> => {
    if (mode === 'chrome') {
        const available = await isChromeAIAvailable();
        if (!available) {
            return {
                valid: false,
                shouldFallback: true,
                error: 'Chrome AI is not available. Switching to Cloud AI for reliable results.'
            };
        }
        return { valid: true };
    } else {
        // cloud mode - the recommended/primary option
        const apiKey = getAPIKey();
        if (!apiKey) {
            return {
                valid: false,
                shouldFallback: false,
                error: 'No API key configured. Please add your Gemini API key in settings to use Cloud AI.'
            };
        }
        return { valid: true };
    }
};