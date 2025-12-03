import React, { useEffect, useState } from 'react';
import type { FontSuggestion } from '../types';

// AFFILIATE CONFIGURATION
const AFFILIATE_IDS = {
    MYFONTS: 'refid=YOUR_ID',
    ADOBE: 'mv=affiliate&a_id=YOUR_ID',
    CREATIVE_MARKET: 'u=YOUR_ID'
};

const getMarketplaceUrl = (name: string, source: string): string => {
    const cleanName = encodeURIComponent(name);
    const s = source.toLowerCase();
    if (s.includes('adobe') || s.includes('typekit')) return `https://fonts.adobe.com/search?query=${cleanName}&${AFFILIATE_IDS.ADOBE}`;
    if (s.includes('myfonts') || s.includes('monotype') || s.includes('linotype') || s.includes('bitstream')) return `https://www.myfonts.com/search/${cleanName}?${AFFILIATE_IDS.MYFONTS}`;
    if (s.includes('creative market') || s.includes('creativemarket')) return `https://creativemarket.com/search?q=${cleanName}&${AFFILIATE_IDS.CREATIVE_MARKET}`;
    if (s.includes('fontshare') || s.includes('itf') || s.includes('indian type')) return `https://www.fontshare.com/fonts/${cleanName.replace(/%20/g, '-')}`;
    if (s.includes('google')) return `https://fonts.google.com/specimen/${cleanName}`;
    return `https://www.google.com/search?q=${cleanName}+font+${encodeURIComponent(source)}`;
};

interface FontSuggestionCardProps {
    suggestion: FontSuggestion;
    onAnalyze: (fontName: string) => void;
    isSelected: boolean;
    onToggleSelect: () => void;
}

const FontSuggestionCard: React.FC<FontSuggestionCardProps> = ({ suggestion, onAnalyze, isSelected, onToggleSelect }) => {
    const [fontLoaded, setFontLoaded] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const isGoogleFont = suggestion.source?.toLowerCase().includes('google');

    useEffect(() => {
        if (!isGoogleFont) return;
        const fontFamily = suggestion.fontName;
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        link.onload = () => setFontLoaded(true);
        return () => {
             // Optional cleanup
        };
    }, [suggestion.fontName, isGoogleFont]);

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div 
            className={`bg-surface border rounded-lg p-4 transition-colors cursor-pointer hover:border-accent ${isSelected ? 'border-accent bg-accent/5' : 'border-border'}`}
            onClick={onToggleSelect}
        >
            {/* Compact Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div 
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent border-accent' : 'border-text-secondary/50 bg-transparent'}`}
                    >
                        {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-light leading-none mb-1">
                            {suggestion.fontName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-teal-light uppercase tracking-wide">{suggestion.category}</span>
                            <span className="text-text-secondary/50">&bull;</span>
                            <span className="text-text-secondary">{suggestion.source}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={toggleExpand}
                    className="p-1 text-text-secondary hover:text-accent transition-colors"
                >
                    <svg 
                        className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Preview - Always Visible but smaller when collapsed */}
            <div className="mt-3 bg-paper-light rounded p-3 border border-text-secondary/10 overflow-hidden">
                 {isGoogleFont ? (
                    <p
                        className="text-text-dark text-2xl leading-tight whitespace-nowrap"
                        style={{
                            fontFamily: fontLoaded ? `'${suggestion.fontName}', sans-serif` : 'sans-serif',
                            opacity: fontLoaded ? 1 : 0.5
                        }}
                    >
                        {suggestion.previewText || 'The quick brown fox jumps over the lazy dog'}
                    </p>
                ) : (
                    <p className="text-text-secondary text-sm italic">Preview unavailable for external font</p>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h4 className="text-xs font-bold text-text-secondary uppercase mb-1">Why this font?</h4>
                            <p className="text-sm text-teal-light leading-relaxed">{suggestion.rationale}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-text-secondary uppercase mb-1">Best For</h4>
                            <div className="flex flex-wrap gap-1">
                                {suggestion.useCases.map((useCase, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-surface-dark border border-border text-xs text-text-secondary rounded">
                                        {useCase}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Premium Alternatives */}
                    {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-xs font-bold text-[#FF8E24] uppercase mb-2">Pro Alternatives</h4>
                            <div className="space-y-2">
                                {suggestion.alternatives.map((alt, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-surface-dark/50 p-2 rounded border border-border">
                                        <span className="text-text-light font-medium">{alt.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-text-secondary">{alt.source}</span>
                                            <a href={getMarketplaceUrl(alt.name, alt.source)} target="_blank" rel="noopener noreferrer" className="text-[#FF8E24] hover:underline text-xs">View</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                        {isGoogleFont && (
                            <button
                                onClick={() => onAnalyze(suggestion.fontName)}
                                className="flex-1 px-3 py-2 bg-teal-medium text-text-light text-sm font-medium rounded hover:bg-accent transition-colors"
                            >
                                Deep Analysis
                            </button>
                        )}
                        <a
                            href={isGoogleFont ? `https://fonts.google.com/specimen/${suggestion.fontName.replace(/ /g, '+')}` : `https://www.google.com/search?q=${encodeURIComponent(suggestion.fontName + ' font')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 border border-teal-medium text-teal-light text-sm font-medium rounded hover:text-text-light hover:border-text-light transition-colors text-center"
                        >
                            {isGoogleFont ? 'Google Fonts' : 'Search Web'}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FontSuggestionCard;