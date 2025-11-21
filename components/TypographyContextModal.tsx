import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FontAnalysis, TypographyContextResult } from '../types';
import { getTypographyContext } from '../services/geminiService';
import Loader from './Loader';

interface TypographyContextModalProps {
    isOpen: boolean;
    onClose: () => void;
    fontAnalysis: FontAnalysis;
}

const TypographyContextModal: React.FC<TypographyContextModalProps> = ({
    isOpen,
    onClose,
    fontAnalysis
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TypographyContextResult | null>(null);

    useEffect(() => {
        if (isOpen && !result && !isLoading) {
            setIsLoading(true);
            setError(null);

            getTypographyContext(fontAnalysis)
                .then(setResult)
                .catch(err => {
                    console.error('Typography context error:', err);
                    setError(err.message || 'Failed to get typography context');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, fontAnalysis, result, isLoading]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 flex items-start justify-center z-[9999] animate-fade-in p-4 pt-8 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden border border-border shadow-2xl flex flex-col my-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-primary">Typography Context & Trends</h2>
                            <p className="text-secondary text-sm mt-1">
                                Historical usage and current trends for <span className="text-accent font-semibold">{fontAnalysis.fontName}</span>
                            </p>
                            <p className="text-yellow-500/80 text-xs mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                AI-generated insights - verify before using in professional work
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-secondary hover:text-primary transition-colors p-2"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader />
                            <p className="text-secondary mt-4">Researching typography history and trends...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                            <p className="text-red-300">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setResult(null);
                                }}
                                className="mt-3 px-4 py-2 bg-accent text-surface font-semibold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-6">
                            {/* Historical Usage */}
                            <Section title="Historical Usage" icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }>
                                <p className="text-text-light leading-relaxed">{result.historicalUsage}</p>
                            </Section>

                            {/* Current Trends */}
                            <Section title="Current Trends (2025)" icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            }>
                                <p className="text-text-light leading-relaxed">{result.currentTrends}</p>
                            </Section>

                            {/* Common Pairings */}
                            <Section title="Commonly Paired With" icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            }>
                                <div className="flex flex-wrap gap-2">
                                    {result.pairingTrends.map((font, index) => (
                                        <span
                                            key={index}
                                            className="bg-teal-medium/30 text-text-light text-sm font-medium px-3 py-1.5 rounded-full"
                                        >
                                            {font}
                                        </span>
                                    ))}
                                </div>
                            </Section>

                            {/* Professional Recommendations */}
                            <Section title="Professional Recommendations" icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }>
                                <p className="text-text-light leading-relaxed">{result.recommendations}</p>
                            </Section>

                            {/* Cultural Context */}
                            <Section title="Cultural Context" icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }>
                                <p className="text-text-light leading-relaxed">{result.culturalContext}</p>
                            </Section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

// Helper component for sections
const Section: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, icon, children }) => (
    <div className="bg-teal-dark/50 rounded-lg p-4 border border-teal-medium">
        <div className="flex items-center gap-2 mb-3">
            <span className="text-accent">{icon}</span>
            <h3 className="text-lg font-semibold text-accent">{title}</h3>
        </div>
        {children}
    </div>
);

export default TypographyContextModal;
