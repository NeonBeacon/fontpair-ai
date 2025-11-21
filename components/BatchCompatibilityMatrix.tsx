import React, { useState } from 'react';
import type { FontAnalysis, BatchCompatibilityResult, PairingScore } from '../types';
import { analyzeBatchCompatibility } from '../services/geminiService';
import Loader from './Loader';

interface BatchCompatibilityMatrixProps {
    isOpen: boolean;
    onClose: () => void;
    availableFonts: FontAnalysis[];
}

const BatchCompatibilityMatrix: React.FC<BatchCompatibilityMatrixProps> = ({
    isOpen,
    onClose,
    availableFonts
}) => {
    const [selectedFonts, setSelectedFonts] = useState<FontAnalysis[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BatchCompatibilityResult | null>(null);

    const handleAddFont = (font: FontAnalysis) => {
        if (selectedFonts.length >= 8) {
            setError('Maximum 8 fonts can be analyzed at once');
            return;
        }
        if (!selectedFonts.find(f => f.fontName === font.fontName)) {
            setSelectedFonts([...selectedFonts, font]);
            setError(null);
        }
    };

    const handleRemoveFont = (fontName: string) => {
        setSelectedFonts(selectedFonts.filter(f => f.fontName !== fontName));
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (selectedFonts.length < 2) {
            setError('Select at least 2 fonts to analyze compatibility');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const compatibilityResult = await analyzeBatchCompatibility(selectedFonts);
            setResult(compatibilityResult);
        } catch (err) {
            console.error('Batch compatibility error:', err);
            setError(err instanceof Error ? err.message : 'Failed to analyze compatibility');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedFonts([]);
        setResult(null);
        setError(null);
    };

    const getScoreColor = (score: number): string => {
        if (score >= 8) return 'bg-green-500';
        if (score >= 6) return 'bg-teal-500';
        if (score >= 4) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreTextColor = (score: number): string => {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-teal-400';
        if (score >= 4) return 'text-yellow-400';
        return 'text-red-400';
    };

    const findPairingScore = (font1: string, font2: string): PairingScore | undefined => {
        if (!result) return undefined;
        return result.pairings.find(
            p => (p.font1 === font1 && p.font2 === font2) ||
                 (p.font1 === font2 && p.font2 === font1)
        );
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden border border-border shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-primary">Decision Matrix: Shortlist Comparison</h2>
                            <p className="text-secondary text-sm mt-1">
                                Compare a shortlist of fonts to find the strongest candidate. Scores indicate absolute potential.
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
                    {/* Warning Banner */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg mb-4 text-sm text-yellow-200/80 flex gap-2 items-start">
                        <span className="mt-0.5">⚠️</span>
                        <p>These scores are a quick viability check. Always run a full <strong>"Critique Pairing"</strong> on your final choice to verify the details.</p>
                    </div>
                    {!result ? (
                        <div className="space-y-6">
                            {/* Font Selection */}
                            <div>
                                <h3 className="text-lg font-semibold text-primary mb-3">
                                    Select Fonts to Compare ({selectedFonts.length}/8)
                                </h3>

                                {/* Available Fonts */}
                                {availableFonts.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                        {availableFonts.map(font => {
                                            const isSelected = selectedFonts.some(f => f.fontName === font.fontName);
                                            return (
                                                <button
                                                    key={font.fontName}
                                                    onClick={() => isSelected ? handleRemoveFont(font.fontName) : handleAddFont(font)}
                                                    className={`p-3 rounded-lg border text-left transition-all ${
                                                        isSelected
                                                            ? 'border-accent bg-accent/20 text-primary'
                                                            : 'border-border bg-teal-dark/50 text-secondary hover:border-accent/50 hover:text-primary'
                                                    }`}
                                                >
                                                    <div className="font-medium truncate">{font.fontName}</div>
                                                    <div className="text-xs opacity-70">{font.fontType}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-teal-dark/50 rounded-lg p-6 text-center border border-border">
                                        <p className="text-secondary mb-2">No fonts analyzed yet</p>
                                        <p className="text-sm text-secondary/70">
                                            Analyze fonts in the main view first, then return here to compare them
                                        </p>
                                    </div>
                                )}

                                {/* Selected Fonts Preview */}
                                {selectedFonts.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm text-secondary mb-2">Selected fonts:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedFonts.map(font => (
                                                <span
                                                    key={font.fontName}
                                                    className="bg-accent/20 text-accent text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-2"
                                                >
                                                    {font.fontName}
                                                    <button
                                                        onClick={() => handleRemoveFont(font.fontName)}
                                                        className="hover:text-red-400 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                                    <p className="text-red-300">{error}</p>
                                </div>
                            )}

                            {/* Analyze Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={selectedFonts.length < 2 || isLoading}
                                    className="px-6 py-3 bg-accent text-surface font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader />
                                            Analyzing...
                                        </span>
                                    ) : (
                                        `Analyze ${selectedFonts.length} Font${selectedFonts.length !== 1 ? 's' : ''}`
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Matrix View */}
                            <div>
                                <h3 className="text-lg font-semibold text-primary mb-3">Compatibility Matrix</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="p-2 text-left text-secondary text-sm border-b border-border"></th>
                                                {result.fonts.map(font => (
                                                    <th key={font} className="p-2 text-center text-secondary text-sm border-b border-border whitespace-nowrap">
                                                        <div className="transform -rotate-45 origin-center h-20 flex items-end justify-center">
                                                            <span className="truncate max-w-[80px]">{font}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.fonts.map((font1, i) => (
                                                <tr key={font1}>
                                                    <td className="p-2 text-secondary text-sm border-r border-border whitespace-nowrap">
                                                        {font1}
                                                    </td>
                                                    {result.fonts.map((font2, j) => {
                                                        if (i === j) {
                                                            return (
                                                                <td key={font2} className="p-2 text-center bg-teal-dark/30">
                                                                    <span className="text-secondary">-</span>
                                                                </td>
                                                            );
                                                        }
                                                        const pairing = findPairingScore(font1, font2);
                                                        return (
                                                            <td
                                                                key={font2}
                                                                className="p-2 text-center cursor-pointer hover:bg-teal-dark/50 transition-colors"
                                                                title={pairing?.quickNote || ''}
                                                            >
                                                                {pairing && (
                                                                    <span className={`inline-block w-8 h-8 rounded-full ${getScoreColor(pairing.score)} flex items-center justify-center text-surface font-bold text-sm`}>
                                                                        {pairing.score}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Pairings */}
                            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    Best Pairings
                                </h3>
                                <div className="space-y-3">
                                    {result.topPairings.map((pairing, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <span className={`${getScoreTextColor(pairing.score)} font-bold text-lg min-w-[2rem]`}>
                                                {pairing.score}
                                            </span>
                                            <div>
                                                <div className="text-primary font-medium">
                                                    {pairing.font1} + {pairing.font2}
                                                </div>
                                                <p className="text-sm text-secondary">{pairing.quickNote}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Worst Pairings */}
                            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                                <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Avoid These Pairings
                                </h3>
                                <div className="space-y-3">
                                    {result.worstPairings.map((pairing, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <span className={`${getScoreTextColor(pairing.score)} font-bold text-lg min-w-[2rem]`}>
                                                {pairing.score}
                                            </span>
                                            <div>
                                                <div className="text-primary font-medium">
                                                    {pairing.font1} + {pairing.font2}
                                                </div>
                                                <p className="text-sm text-secondary">{pairing.quickNote}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Overall Notes */}
                            <div className="bg-teal-dark/50 rounded-lg p-4 border border-teal-medium">
                                <h3 className="text-lg font-semibold text-accent mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Overall Assessment
                                </h3>
                                <p className="text-text-light leading-relaxed">{result.overallNotes}</p>
                            </div>

                            {/* Reset Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-3 bg-teal-medium text-primary font-semibold rounded-lg hover:bg-teal-dark transition-colors"
                                >
                                    Analyze Different Fonts
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchCompatibilityMatrix;
