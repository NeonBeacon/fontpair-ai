import React, { useEffect, useState } from 'react';
import type { FontSuggestion } from '../types';

interface FontSuggestionCardProps {
    suggestion: FontSuggestion;
    onAnalyze: (fontName: string) => void;
}

const FontSuggestionCard: React.FC<FontSuggestionCardProps> = ({ suggestion, onAnalyze }) => {
    const [fontLoaded, setFontLoaded] = useState(false);

    useEffect(() => {
        // Load the Google Font dynamically
        const fontFamily = suggestion.fontName;
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        link.onload = () => setFontLoaded(true);

        return () => {
            // Cleanup on unmount (optional, can keep fonts loaded for performance)
            // document.head.removeChild(link);
        };
    }, [suggestion.fontName]);

    const getScoreColor = (score: number): string => {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getScoreBgColor = (score: number): string => {
        if (score >= 8) return 'bg-green-400/10 border-green-400/20';
        if (score >= 6) return 'bg-yellow-400/10 border-yellow-400/20';
        return 'bg-orange-400/10 border-orange-400/20';
    };

    return (
        <div className="bg-surface border border-border rounded-lg p-6 hover:border-accent transition-colors">
            {/* Header with font name and score */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                        {suggestion.fontName}
                    </h3>
                    <p className="text-xs text-secondary uppercase tracking-wide">
                        {suggestion.category}
                    </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${getScoreBgColor(suggestion.matchScore)}`}>
                    <span className={`text-2xl font-bold ${getScoreColor(suggestion.matchScore)}`}>
                        {suggestion.matchScore}
                    </span>
                    <span className="text-xs text-secondary">/10</span>
                </div>
            </div>

            {/* Font Preview */}
            <div className="bg-background rounded-md p-6 mb-4" style={{ minHeight: '120px' }}>
                <p
                    className="text-primary text-3xl leading-relaxed"
                    style={{
                        fontFamily: fontLoaded ? `'${suggestion.fontName}', sans-serif` : 'sans-serif',
                        opacity: fontLoaded ? 1 : 0.5
                    }}
                >
                    {suggestion.previewText || 'The quick brown fox jumps over the lazy dog'}
                </p>
                <p
                    className="text-secondary text-sm mt-2"
                    style={{
                        fontFamily: fontLoaded ? `'${suggestion.fontName}', sans-serif` : 'sans-serif',
                        opacity: fontLoaded ? 1 : 0.5
                    }}
                >
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                </p>
            </div>

            {/* Rationale */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-primary mb-2">Why this font?</h4>
                <p className="text-sm text-secondary leading-relaxed">
                    {suggestion.rationale}
                </p>
            </div>

            {/* Use Cases */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-primary mb-2">Recommended for:</h4>
                <div className="flex flex-wrap gap-2">
                    {suggestion.useCases.map((useCase, index) => (
                        <span
                            key={index}
                            className="px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-md border border-accent/20"
                        >
                            {useCase}
                        </span>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
                <button
                    onClick={() => onAnalyze(suggestion.fontName)}
                    className="flex-1 px-4 py-2 bg-accent text-surface font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                    Analyze Font
                </button>
                <a
                    href={`https://fonts.google.com/specimen/${suggestion.fontName.replace(/ /g, '+')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-surface border border-accent text-accent font-medium rounded-md hover:bg-accent hover:text-surface transition-colors text-center"
                >
                    View on Google Fonts
                </a>
            </div>
        </div>
    );
};

export default FontSuggestionCard;
