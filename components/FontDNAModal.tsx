import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FontAnalysis, FontDNAResult, FontDNAMatch } from '../types';
import { findSimilarFonts } from '../services/geminiService';
import { ExternalLinkIcon, CopyIcon, CheckIcon } from './Icons';
import Loader from './Loader';

interface FontDNAModalProps {
    isOpen: boolean;
    onClose: () => void;
    referenceFont: FontAnalysis;
}

const FontDNAModal: React.FC<FontDNAModalProps> = ({ isOpen, onClose, referenceFont }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<FontDNAResult | null>(null);
    const [loadedGoogleFonts, setLoadedGoogleFonts] = useState<Set<string>>(new Set());
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const loadGoogleFont = (fontName: string) => {
        if (!fontName || loadedGoogleFonts.has(fontName)) return;
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
        if (document.querySelector(`link[href="${fontUrl}"]`)) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
        setLoadedGoogleFonts(prev => new Set(prev).add(fontName));
    };

    useEffect(() => {
        if (isOpen && !result && !isLoading) {
            setIsLoading(true);
            setError(null);

            findSimilarFonts(referenceFont)
                .then(dnaResult => {
                    setResult(dnaResult);
                    // Load Google Fonts for preview
                    dnaResult.matches.forEach(match => {
                        if (match.source.toLowerCase().includes('google')) {
                            loadGoogleFont(match.fontName);
                        }
                    });
                })
                .catch(err => {
                    console.error('Font DNA matching error:', err);
                    setError(err.message || 'Failed to find similar fonts');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, referenceFont, result, isLoading]);

    const handleCopyFontName = (fontName: string, index: number) => {
        navigator.clipboard.writeText(fontName).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400 bg-green-500/20 border-green-500/40';
        if (score >= 60) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
        return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    };

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
                            <h2 className="text-2xl font-bold text-primary">Font DNA Matching</h2>
                            <p className="text-secondary text-sm mt-1">
                                Finding fonts similar to <span className="text-accent font-semibold">{referenceFont.fontName}</span>
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
                            <p className="text-secondary mt-4">Analyzing font DNA and finding matches...</p>
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
                            {/* DNA Characteristics */}
                            <div className="bg-teal-dark/50 rounded-lg p-4 border border-teal-medium">
                                <h3 className="text-lg font-semibold text-accent mb-3">Font DNA Characteristics</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {result.characteristics.map((char, index) => (
                                        <span
                                            key={index}
                                            className="bg-accent/20 text-accent text-sm font-medium px-3 py-1.5 rounded-full"
                                        >
                                            {char}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-text-light text-sm leading-relaxed">{result.analysisNotes}</p>
                            </div>

                            {/* Matches */}
                            <div>
                                <h3 className="text-lg font-semibold text-primary mb-4">
                                    {result.totalMatches} Similar Fonts Found
                                </h3>
                                <div className="space-y-4">
                                    {result.matches.map((match, index) => (
                                        <FontDNAMatchCard
                                            key={index}
                                            match={match}
                                            index={index}
                                            onCopy={() => handleCopyFontName(match.fontName, index)}
                                            isCopied={copiedIndex === index}
                                            getScoreColor={getScoreColor}
                                            loadGoogleFont={loadGoogleFont}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

interface FontDNAMatchCardProps {
    match: FontDNAMatch;
    index: number;
    onCopy: () => void;
    isCopied: boolean;
    getScoreColor: (score: number) => string;
    loadGoogleFont: (fontName: string) => void;
}

const FontDNAMatchCard: React.FC<FontDNAMatchCardProps> = ({
    match,
    index,
    onCopy,
    isCopied,
    getScoreColor,
    loadGoogleFont
}) => {
    const isGoogleFont = match.source.toLowerCase().includes('google');

    // Load font if it's from Google Fonts
    React.useEffect(() => {
        if (isGoogleFont) {
            loadGoogleFont(match.fontName);
        }
    }, [match.fontName, isGoogleFont, loadGoogleFont]);

    return (
        <div className="bg-teal-dark/30 rounded-lg p-4 border border-teal-medium hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {/* Font Name and Score */}
                    <div className="flex items-center gap-3 mb-2">
                        <h4
                            className="text-xl font-bold text-primary"
                            style={isGoogleFont ? { fontFamily: `'${match.fontName}', sans-serif` } : undefined}
                        >
                            {match.fontName}
                        </h4>
                        <span className={`text-sm font-bold px-2 py-1 rounded border ${getScoreColor(match.matchScore)}`}>
                            {match.matchScore}%
                        </span>
                        {match.isPremium && (
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                                Premium
                            </span>
                        )}
                    </div>

                    {/* Source Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-secondary/30 text-secondary">
                            {match.source}
                        </span>
                        <button
                            onClick={onCopy}
                            className="text-xs flex items-center gap-1 text-secondary hover:text-accent transition-colors"
                            title="Copy font name"
                        >
                            {isCopied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        {match.directLink && (
                            <a
                                href={match.directLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1 text-secondary hover:text-accent transition-colors"
                            >
                                <ExternalLinkIcon className="w-3 h-3" />
                                View
                            </a>
                        )}
                    </div>

                    {/* Preview (for Google Fonts) */}
                    {isGoogleFont && (
                        <div className="bg-paper-light rounded p-3 mb-3">
                            <p
                                className="text-lg text-text-dark"
                                style={{ fontFamily: `'${match.fontName}', sans-serif` }}
                            >
                                The quick brown fox jumps over the lazy dog
                            </p>
                        </div>
                    )}

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="text-accent font-semibold">Visual Similarity: </span>
                            <span className="text-text-light">{match.visualSimilarity}</span>
                        </div>
                        <div>
                            <span className="text-accent font-semibold">Key Differences: </span>
                            <span className="text-text-light">{match.differingCharacteristics}</span>
                        </div>
                        <div>
                            <span className="text-accent font-semibold">Best For: </span>
                            <span className="text-text-light">{match.bestUseCase}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FontDNAModal;
