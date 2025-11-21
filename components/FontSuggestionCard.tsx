import React, { useEffect, useState } from 'react';
import type { FontSuggestion } from '../types';

// AFFILIATE CONFIGURATION
// TODO: Replace these with your actual IDs from Monetization_Guide.txt
const AFFILIATE_IDS = {
    MYFONTS: 'refid=YOUR_ID',
    ADOBE: 'mv=affiliate&a_id=YOUR_ID',
    CREATIVE_MARKET: 'u=YOUR_ID'
};

const getMarketplaceUrl = (name: string, source: string): string => {
    const cleanName = encodeURIComponent(name);
    const s = source.toLowerCase();

    // ADOBE / TYPEKIT
    if (s.includes('adobe') || s.includes('typekit')) {
        return `https://fonts.adobe.com/search?query=${cleanName}&${AFFILIATE_IDS.ADOBE}`;
    }

    // MYFONTS / MONOTYPE / LINOTYPE / BITSTREAM
    if (s.includes('myfonts') || s.includes('monotype') || s.includes('linotype') || s.includes('bitstream')) {
        return `https://www.myfonts.com/search/${cleanName}?${AFFILIATE_IDS.MYFONTS}`;
    }

    // CREATIVE MARKET
    if (s.includes('creative market') || s.includes('creativemarket')) {
        return `https://creativemarket.com/search?q=${cleanName}&${AFFILIATE_IDS.CREATIVE_MARKET}`;
    }

    // FONTSHARE / ITF (Free, but builds goodwill)
    if (s.includes('fontshare') || s.includes('itf') || s.includes('indian type')) {
        return `https://www.fontshare.com/fonts/${cleanName.replace(/%20/g, '-')}`;
    }

    // GOOGLE FONTS (Direct Link)
    if (s.includes('google')) {
        return `https://fonts.google.com/specimen/${cleanName}`;
    }

    // Fallback Search (Only if source is totally unknown)
    return `https://www.google.com/search?q=${cleanName}+font+${encodeURIComponent(source)}`;
};

interface FontSuggestionCardProps {
    suggestion: FontSuggestion;
    onAnalyze: (fontName: string) => void;
}

const FontSuggestionCard: React.FC<FontSuggestionCardProps> = ({ suggestion, onAnalyze }) => {
    const [fontLoaded, setFontLoaded] = useState(false);

    const isGoogleFont = suggestion.source?.toLowerCase().includes('google');

    useEffect(() => {
        // Only load fonts from Google Fonts API
        if (!isGoogleFont) {
            return;
        }

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
    }, [suggestion.fontName, isGoogleFont]);

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
                    <h3 className="text-lg font-semibold text-text-light mb-1">
                        {suggestion.fontName}
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-teal-light uppercase tracking-wide">
                            {suggestion.category}
                        </p>
                        {suggestion.source && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isGoogleFont
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                                {suggestion.source}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${getScoreBgColor(suggestion.matchScore)}`}>
                    <span className={`text-2xl font-bold ${getScoreColor(suggestion.matchScore)}`}>
                        {suggestion.matchScore}
                    </span>
                    <span className="text-xs text-teal-light">/10</span>
                </div>
            </div>

            {/* Font Preview */}
            <div className="bg-paper-light rounded-md p-6 mb-4 border border-text-secondary/20" style={{ minHeight: '120px' }}>
                {isGoogleFont ? (
                    <>
                        <p
                            className="text-text-dark text-3xl leading-relaxed"
                            style={{
                                fontFamily: fontLoaded ? `'${suggestion.fontName}', sans-serif` : 'sans-serif',
                                opacity: fontLoaded ? 1 : 0.5
                            }}
                        >
                            {suggestion.previewText || 'The quick brown fox jumps over the lazy dog'}
                        </p>
                        <p
                            className="text-text-secondary text-sm mt-2"
                            style={{
                                fontFamily: fontLoaded ? `'${suggestion.fontName}', sans-serif` : 'sans-serif',
                                opacity: fontLoaded ? 1 : 0.5
                            }}
                        >
                            ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                        </p>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[120px] bg-[#1A3431] rounded-lg border border-[#2D4E4A] p-4 text-center">
                        <span className="text-[#FF8E24] text-xs font-bold uppercase tracking-wider mb-2">
                            External Font Source
                        </span>
                        <p className="text-[#F5F2EB]/70 text-sm mb-3">
                            Preview not available for {suggestion.source || 'this font'}.
                        </p>
                        <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(suggestion.fontName + ' font')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-white underline hover:text-[#FF8E24] transition-colors"
                        >
                            Search {suggestion.fontName} on Web
                        </a>
                    </div>
                )}
            </div>

            {/* Rationale */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-text-light mb-2">Why this font?</h4>
                <p className="text-sm text-teal-light leading-relaxed">
                    {suggestion.rationale}
                </p>
            </div>

            {/* Use Cases */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-text-light mb-2">Recommended for:</h4>
                <div className="flex flex-wrap gap-2">
                    {suggestion.useCases.map((useCase, index) => (
                        <span
                            key={index}
                            className="px-2.5 py-1 bg-accent/20 text-accent text-xs rounded-md border border-accent/30 font-medium"
                        >
                            {useCase}
                        </span>
                    ))}
                </div>
            </div>

            {/* Premium Alternatives */}
            {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                <div className="mb-4 pt-4 border-t border-[#2D4E4A]">
                    <p className="text-xs text-[#FF8E24] font-bold uppercase tracking-wider mb-2">
                        Professional Alternatives
                    </p>
                    <div className="space-y-2">
                        {suggestion.alternatives.map((alt, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-[#1A3431]/50 p-2 rounded border border-[#2D4E4A] hover:border-[#FF8E24]/50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[#F5F2EB] text-sm font-medium">{alt.name}</span>
                                    <span className="text-[#F5F2EB]/60 text-xs">{alt.source} &bull; {alt.similarity}</span>
                                </div>
                                <a
                                    href={getMarketplaceUrl(alt.name, alt.source)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#FF8E24] hover:text-white transition-colors p-1"
                                    title={alt.source.toLowerCase().includes('fontshare') ? 'Get Free' : 'Buy / License'}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-teal-medium">
                {isGoogleFont && (
                    <button
                        onClick={() => onAnalyze(suggestion.fontName)}
                        className="flex-1 px-4 py-2 bg-accent text-text-light font-medium rounded-md hover:opacity-90 transition-opacity"
                    >
                        Analyze Font
                    </button>
                )}
                {isGoogleFont ? (
                    <a
                        href={`https://fonts.google.com/specimen/${suggestion.fontName.replace(/ /g, '+')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-teal-medium border border-accent text-text-light font-medium rounded-md hover:bg-accent transition-colors text-center"
                    >
                        View on Google Fonts
                    </a>
                ) : (
                    <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(suggestion.fontName + ' font ' + (suggestion.source || ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-teal-medium border border-accent text-text-light font-medium rounded-md hover:bg-accent transition-colors text-center"
                    >
                        Find {suggestion.source || 'Font'}
                    </a>
                )}
            </div>
        </div>
    );
};

export default FontSuggestionCard;
