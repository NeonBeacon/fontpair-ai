import React, { useState } from 'react';
import type { FontSuggestionResult } from '../types';
import { suggestFonts } from '../services/geminiService';
import CategorySelector from './CategorySelector';
import FontSuggestionCard from './FontSuggestionCard';
import IndieSpotlight from './IndieSpotlight';
import Loader from './Loader';

interface FontSuggestionViewProps {
    onAnalyzeFont: (fontName: string) => void;
}

// Category options
const USAGE_TYPES = ['Headers', 'Body Text', 'Display', 'Logo', 'UI Elements', 'Monospace'];
const BUSINESS_TYPES = ['Corporate', 'Creative', 'Tech', 'Healthcare', 'Education', 'Retail', 'Finance', 'Hospitality', 'Non-profit'];
const THEMES = ['Modern', 'Classic', 'Elegant', 'Playful', 'Bold', 'Minimal', 'Vintage', 'Industrial', 'Nature-inspired', 'Futuristic'];
const FONT_CATEGORIES = ['Serif', 'Sans-Serif', 'Display', 'Handwriting', 'Monospace'];

const FontSuggestionView: React.FC<FontSuggestionViewProps> = ({ onAnalyzeFont }) => {
    const [description, setDescription] = useState('');
    const [selectedUsageTypes, setSelectedUsageTypes] = useState<string[]>([]);
    const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
    const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
    const [selectedFontCategories, setSelectedFontCategories] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<FontSuggestionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        // Validation
        if (!description.trim() && selectedUsageTypes.length === 0 && selectedBusinessTypes.length === 0 && selectedThemes.length === 0 && selectedFontCategories.length === 0) {
            setError('Please provide a description or select at least one category.');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResults(null);

        try {
            // Build request
            const request = {
                description: description.trim(),
                usageTypes: selectedUsageTypes,
                businessTypes: selectedBusinessTypes,
                themes: selectedThemes,
                fontCategories: selectedFontCategories.map(c => c.toLowerCase().replace('-', '')),
                maxResults: 5
            };

            // Call AI service (no longer restricted to Google Fonts list)
            const suggestionsResult = await suggestFonts(request);
            setResults(suggestionsResult);

        } catch (err) {
            console.error('Error getting font suggestions:', err);
            setError(err instanceof Error ? err.message : 'Failed to get font suggestions. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleClear = () => {
        setDescription('');
        setSelectedUsageTypes([]);
        setSelectedBusinessTypes([]);
        setSelectedThemes([]);
        setSelectedFontCategories([]);
        setResults(null);
        setError(null);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl heading-embossed mb-2">Find Perfect Fonts</h1>
                <p className="text-text-dark">
                    Describe your project and let AI recommend professional typefaces from Google Fonts, Adobe, and beyond
                </p>
            </div>

            {/* Search Form */}
            <div className="teal-card-raised p-6 mb-8">
                {/* Text Input */}
                <div className="mb-6">
                    <label htmlFor="description" className="block text-sm font-medium text-text-light mb-2">
                        Project Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your project, e.g., 'I need fonts for a luxury hotel website with elegant headers and readable body text'"
                        className="w-full warm-input border border-border p-3 text-text-dark placeholder-text-secondary focus:ring-2 focus:ring-accent focus:border-accent transition resize-none"
                        rows={4}
                        maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-teal-light">
                            Be specific about your needs for better results
                        </p>
                        <p className="text-xs text-teal-light">
                            {description.length}/500
                        </p>
                    </div>
                </div>

                {/* Category Selectors */}
                <CategorySelector
                    title="Usage Types"
                    categories={USAGE_TYPES}
                    selected={selectedUsageTypes}
                    onChange={setSelectedUsageTypes}
                />

                <CategorySelector
                    title="Business Types"
                    categories={BUSINESS_TYPES}
                    selected={selectedBusinessTypes}
                    onChange={setSelectedBusinessTypes}
                />

                <CategorySelector
                    title="Themes & Mood"
                    categories={THEMES}
                    selected={selectedThemes}
                    onChange={setSelectedThemes}
                />

                <CategorySelector
                    title="Font Categories"
                    categories={FONT_CATEGORIES}
                    selected={selectedFontCategories}
                    onChange={setSelectedFontCategories}
                />

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="flex-1 px-6 py-3 bg-accent text-text-light font-semibold rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isSearching ? 'Searching...' : 'Get Font Suggestions'}
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={isSearching}
                        className="px-6 py-3 bg-teal-medium border border-teal-light text-text-light font-medium rounded-md hover:bg-accent hover:text-text-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Clear All
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {isSearching && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader />
                    <p className="text-text-dark mt-4">Analyzing fonts and finding perfect matches...</p>
                </div>
            )}

            {/* Results */}
            {results && !isSearching && (
                <div>
                    {/* Search Summary */}
                    <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-md">
                        <h2 className="text-sm font-semibold text-accent mb-1">Search Summary</h2>
                        <p className="text-sm text-text-dark">{results.searchSummary}</p>
                        {results.additionalNotes && (
                            <p className="text-sm text-text-secondary mt-2 italic">
                                {results.additionalNotes}
                            </p>
                        )}
                    </div>

                    {/* Font Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.suggestions.map((suggestion, index) => (
                            <FontSuggestionCard
                                key={index}
                                suggestion={suggestion}
                                onAnalyze={onAnalyzeFont}
                            />
                        ))}
                    </div>

                    {/* Indie Foundry Spotlight - "Still haven't found it?" catcher */}
                    {selectedThemes.length > 0 && (
                        <IndieSpotlight activeMoods={selectedThemes} />
                    )}

                    {results.suggestions.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-text-dark">
                                No font suggestions found. Try adjusting your criteria.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!results && !isSearching && !error && (
                <div className="text-center py-12 bg-paper-light border border-border rounded-lg">
                    <svg className="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-text-dark text-lg mb-2">
                        Ready to find your perfect fonts?
                    </p>
                    <p className="text-text-secondary text-sm max-w-md mx-auto">
                        Describe your project or select categories above, then click "Get Font Suggestions" to receive AI-powered recommendations
                    </p>
                </div>
            )}
        </div>
    );
};

export default FontSuggestionView;
