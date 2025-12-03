import React, { useState, useEffect } from 'react';
import type { FontSuggestionResult, UseCaseAnalysisResult } from '../types';
import { suggestFonts, analyzeUseCaseFit } from '../services/geminiService';
import CategorySelector from './CategorySelector';
import FontSuggestionCard from './FontSuggestionCard';
import IndieSpotlight from './IndieSpotlight';
import Loader from './Loader';
import UseCaseAnalysisModal from './UseCaseAnalysisModal';
import { saveSearchToHistory } from '../historyService';
import { canPerformFindFonts, incrementDailyFindFontsCount, isProfessional } from '../services/tierService';
import { generateFontImage } from '../utils/fontUtils';

interface FindFontsPersistedState {
  description: string;
  selectedUsageTypes: string[];
  selectedBusinessTypes: string[];
  selectedThemes: string[];
  selectedFontCategories: string[];
  previewText: string;
  temperatureLevel: number;
  results: FontSuggestionResult | null;
}

interface FontSuggestionViewProps {
  onAnalyzeFont: (fontName: string) => void;
  persistedState?: FindFontsPersistedState;
  onStateChange?: (state: FindFontsPersistedState) => void;
}

const USAGE_TYPES = ['Headers', 'Body Text', 'Display', 'Logo', 'UI Elements', 'Monospace'];
const BUSINESS_TYPES = ['Corporate', 'Creative', 'Tech', 'Healthcare', 'Education', 'Retail', 'Finance', 'Hospitality', 'Non-profit'];
const THEMES = ['Modern', 'Classic', 'Elegant', 'Playful', 'Bold', 'Minimal', 'Vintage', 'Industrial', 'Nature-inspired', 'Futuristic'];
const FONT_CATEGORIES = ['Serif', 'Sans-Serif', 'Display', 'Handwriting', 'Monospace'];

// Map user-friendly temperature levels to AI temperature values
const mapTemperatureLevel = (level: number): number => {
  const temperatureMap: Record<number, number> = {
    0: 0.2,  // Refined - Conservative, proven fonts
    1: 0.5,  // Balanced - Professional variety
    2: 0.8,  // Bold - Distinctive, expressive
    3: 1.1   // Experimental - Unique, unconventional
  };
  return temperatureMap[level] || 0.5;
};

const FontSuggestionView: React.FC<FontSuggestionViewProps> = ({ 
  onAnalyzeFont,
  persistedState,
  onStateChange 
}) => {
  // Use persisted state if provided, otherwise use local state
  const [description, setDescription] = useState(persistedState?.description || '');
  const [selectedUsageTypes, setSelectedUsageTypes] = useState<string[]>(persistedState?.selectedUsageTypes || []);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>(persistedState?.selectedBusinessTypes || []);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(persistedState?.selectedThemes || []);
  const [selectedFontCategories, setSelectedFontCategories] = useState<string[]>(persistedState?.selectedFontCategories || []);
  
  const [previewText, setPreviewText] = useState(persistedState?.previewText || 'The quick brown fox jumps over the lazy dog');
  const [temperatureLevel, setTemperatureLevel] = useState(persistedState?.temperatureLevel ?? 1); // Default to Balanced

  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FontSuggestionResult | null>(persistedState?.results || null);
  const [error, setError] = useState<string | null>(null);

  // New State for Use Case Analysis
  const [selectedForAnalysis, setSelectedForAnalysis] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<UseCaseAnalysisResult | null>(null);

  // Sync state changes to parent
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        description,
        selectedUsageTypes,
        selectedBusinessTypes,
        selectedThemes,
        selectedFontCategories,
        previewText,
        temperatureLevel,
        results,
      });
    }
  }, [description, selectedUsageTypes, selectedBusinessTypes, selectedThemes, selectedFontCategories, previewText, temperatureLevel, results, onStateChange]);

  const handleSearch = async () => {
    if (!description.trim() && selectedUsageTypes.length === 0 && selectedBusinessTypes.length === 0 && selectedThemes.length === 0 && selectedFontCategories.length === 0) {
      setError('Please provide a description or select at least one category.');
      return;
    }

    // Check if user can perform search
    const searchCheck = canPerformFindFonts();
    if (!searchCheck.allowed) {
      setError(searchCheck.message || 'You have exceeded your daily search limit.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults(null);
    setSelectedForAnalysis([]); // Reset selection on new search

    try {
      const request = {
        description: description.trim(),
        usageTypes: selectedUsageTypes,
        businessTypes: selectedBusinessTypes,
        themes: selectedThemes,
        fontCategories: selectedFontCategories.map(c => c.toLowerCase().replace('-', '')),
        previewText: previewText.trim(),
        temperature: mapTemperatureLevel(temperatureLevel),
        maxResults: 8 // Increased from 5 to provide more candidates for selection
      };

      const suggestionsResult = await suggestFonts(request);
      setResults(suggestionsResult);

      // Save search to history
      saveSearchToHistory(
        {
          description: description.trim(),
          usageTypes: selectedUsageTypes,
          businessTypes: selectedBusinessTypes,
          themes: selectedThemes,
          fontCategories: selectedFontCategories,
        },
        suggestionsResult
      );

      // Track usage AFTER successful search (only for free users)
      if (!isProfessional()) {
        incrementDailyFindFontsCount();
      }

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
    setPreviewText('The quick brown fox jumps over the lazy dog');
    setTemperatureLevel(1); // Reset to Balanced
    setResults(null);
    setError(null);
    setSelectedForAnalysis([]);
    setAnalysisResult(null);
  };

  const handleToggleSelect = (fontName: string) => {
    setSelectedForAnalysis(prev => 
      prev.includes(fontName) 
        ? prev.filter(f => f !== fontName)
        : [...prev, fontName]
    );
  };

  const handleAnalyzeSelection = async () => {
    if (selectedForAnalysis.length < 2) return;
    setIsAnalyzing(true);
    try {
      const fontsToAnalyze = results?.suggestions.filter(s => selectedForAnalysis.includes(s.fontName)) || [];
      
      // Generate images for visual analysis
      const fontsWithImages = fontsToAnalyze.map(f => ({
        name: f.fontName,
        category: f.category,
        imageBase64: generateFontImage(f.fontName, previewText || 'Abc')
      }));

      const request = {
        fonts: fontsWithImages,
        userRequirements: {
          description,
          usageTypes: selectedUsageTypes,
          businessTypes: selectedBusinessTypes,
          themes: selectedThemes,
          fontCategories: selectedFontCategories
        }
      };

      const result = await analyzeUseCaseFit(request);
      setAnalysisResult(result);

    } catch (err) {
      console.error("Analysis failed", err);
      setError("Failed to analyze use case fit. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-24"> {/* Added padding bottom for sticky bar */}
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl heading-embossed mb-2">Find Perfect Fonts</h1>
        <p className="text-text-dark">
          Describe your project and let AI recommend professional typefaces from Google Fonts, Adobe, and beyond
        </p>
      </div>

      {/* Search Form */}
      <div className="teal-card-raised p-6 mb-8">
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
            <p className="text-xs text-teal-light">Be specific about your needs for better results</p>
            <p className="text-xs text-teal-light">{description.length}/500</p>
          </div>
        </div>

        {/* AI Creativity Control */}
        <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-md">
          <div className="flex items-start justify-between mb-3">
            <div>
              <label htmlFor="temperature-slider" className="text-sm font-semibold text-text-light flex items-center gap-2">
                AI Creativity Level
                <span className="text-xs text-accent font-normal">(Recommendation Style)</span>
              </label>
              <p className="text-xs text-text-secondary mt-1">
                Control how adventurous the AI's font suggestions will be
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Slider */}
            <input
              id="temperature-slider"
              type="range"
              min="0"
              max="3"
              step="1"
              value={temperatureLevel}
              onChange={(e) => setTemperatureLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-teal-medium rounded-lg appearance-none cursor-pointer accent-accent slider-custom"
              style={{
                background: `linear-gradient(to right, 
                  #2D4E4A 0%, 
                  #2D4E4A ${(temperatureLevel / 3) * 100}%, 
                  #456660 ${(temperatureLevel / 3) * 100}%, 
                  #456660 100%)`
              }}
            />
            
            {/* Labels with intelligent signposting */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTemperatureLevel(0)}
                className={`text-center p-2 rounded transition-all ${
                  temperatureLevel === 0 
                    ? 'bg-accent text-text-light font-semibold' 
                    : 'text-text-secondary hover:text-text-light hover:bg-teal-medium'
                }`}
              >
                <div className="font-semibold">Refined</div>
                <div className="text-[10px] opacity-80 mt-0.5">Safe, proven classics</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTemperatureLevel(1)}
                className={`text-center p-2 rounded transition-all ${
                  temperatureLevel === 1 
                    ? 'bg-accent text-text-light font-semibold' 
                    : 'text-text-secondary hover:text-text-light hover:bg-teal-medium'
                }`}
              >
                <div className="font-semibold">Balanced</div>
                <div className="text-[10px] opacity-80 mt-0.5">Professional variety</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTemperatureLevel(2)}
                className={`text-center p-2 rounded transition-all ${
                  temperatureLevel === 2 
                    ? 'bg-accent text-text-light font-semibold' 
                    : 'text-text-secondary hover:text-text-light hover:bg-teal-medium'
                }`}
              >
                <div className="font-semibold">Bold</div>
                <div className="text-[10px] opacity-80 mt-0.5">Distinctive character</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTemperatureLevel(3)}
                className={`text-center p-2 rounded transition-all ${
                  temperatureLevel === 3 
                    ? 'bg-accent text-text-light font-semibold' 
                    : 'text-text-secondary hover:text-text-light hover:bg-teal-medium'
                }`}
              >
                <div className="font-semibold">Experimental</div>
                <div className="text-[10px] opacity-80 mt-0.5">Unique, unconventional</div>
              </button>
            </div>
            
            {/* Dynamic description based on selection */}
            <div className="text-xs text-accent bg-accent/10 rounded p-2 border border-accent/20">
              {temperatureLevel === 0 && (
                <p><strong>Refined:</strong> Safe, time-tested typefaces with proven track records. Ideal for corporate clients, conservative brands, or when reliability is paramount. Minimal creative risk.</p>
              )}
              {temperatureLevel === 1 && (
                <p><strong>Balanced:</strong> Professional variety with subtle character. Mixes established favorites with quality alternatives. Best for most projects seeking polish with personality.</p>
              )}
              {temperatureLevel === 2 && (
                <p><strong>Bold:</strong> Distinctive fonts with strong visual presence. Explores lesser-known gems and expressive options. Great for creative industries, branding, or making a statement.</p>
              )}
              {temperatureLevel === 3 && (
                <p><strong>Experimental:</strong> Unconventional, boundary-pushing typography. Prioritizes uniqueness and originality over familiarity. Perfect for avant-garde projects or when differentiation is critical.</p>
              )}
            </div>
          </div>
        </div>

        {/* Custom Preview Text */}
        <div className="mb-6">
          <label htmlFor="preview-text" className="block text-sm font-medium text-text-light mb-2">
            Preview Text <span className="text-text-secondary font-normal">(Optional)</span>
          </label>
          <input
            id="preview-text"
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="e.g., Your Company Name, Headline Text"
            className="w-full warm-input border border-border p-3 text-text-dark placeholder-text-secondary focus:ring-2 focus:ring-accent focus:border-accent transition"
            maxLength={100}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-teal-light">See your actual text in each font preview</p>
            <p className="text-xs text-teal-light">{previewText.length}/100</p>
          </div>
        </div>

        <CategorySelector title="Usage Types" categories={USAGE_TYPES} selected={selectedUsageTypes} onChange={setSelectedUsageTypes} />
        <CategorySelector title="Business Types" categories={BUSINESS_TYPES} selected={selectedBusinessTypes} onChange={setSelectedBusinessTypes} />
        <CategorySelector title="Themes & Mood" categories={THEMES} selected={selectedThemes} onChange={setSelectedThemes} />
        <CategorySelector title="Font Categories" categories={FONT_CATEGORIES} selected={selectedFontCategories} onChange={setSelectedFontCategories} />

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

        {!isProfessional() && (
          <p className="text-xs text-secondary/70 mt-2 text-center">
            {canPerformFindFonts().remaining} of 3 searches remaining today
          </p>
        )}

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {(isSearching || isAnalyzing) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
          <Loader />
          <p className="text-text-light mt-4 text-xl font-bold">
            {isAnalyzing ? 'Conducting Visual Analysis...' : 'Searching...'}
          </p>
          <p className="text-teal-light mt-2 text-sm">
            {isAnalyzing ? 'AI is visually examining font strokes, weights, and personalities.' : 'Finding matching fonts from Google Fonts...'}
          </p>
        </div>
      )}

      {/* Results */}
      {results && !isSearching && (
        <div>
          <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-md flex justify-between items-start">
            <div>
                <h2 className="text-sm font-semibold text-accent mb-1">Candidate Selection</h2>
                <p className="text-sm text-text-dark">Select fonts below to perform a deep visual analysis.</p>
            </div>
            <div className="text-right">
                 <p className="text-sm text-text-secondary">{results.searchSummary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
            {results.suggestions.map((suggestion, index) => (
              <FontSuggestionCard 
                key={index} 
                suggestion={suggestion} 
                onAnalyze={onAnalyzeFont} 
                isSelected={selectedForAnalysis.includes(suggestion.fontName)}
                onToggleSelect={() => handleToggleSelect(suggestion.fontName)}
              />
            ))}
          </div>

          {selectedThemes.length > 0 && <IndieSpotlight activeMoods={selectedThemes} />}

          {results.suggestions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-dark">No font suggestions found. Try adjusting your criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Sticky Analysis Action Bar */}
      {selectedForAnalysis.length > 0 && !isAnalyzing && !isSearching && (
          <div className="fixed bottom-0 left-0 right-0 bg-teal-dark border-t border-teal-medium p-4 flex items-center justify-between z-50 animate-fade-in-up">
              <div>
                  <span className="text-text-light font-medium">
                    {selectedForAnalysis.length} Font{selectedForAnalysis.length !== 1 ? 's' : ''} Selected
                  </span>
                  <span className="text-teal-light text-sm ml-2">
                    (Select at least 2 fonts to compare)
                  </span>
              </div>
              <button 
                onClick={handleAnalyzeSelection}
                disabled={selectedForAnalysis.length < 2}
                className="px-6 py-3 bg-accent text-text-light font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
              >
                Analyze Fit for My Use Case
              </button>
          </div>
      )}

      {/* Analysis Modal */}
      {analysisResult && (
          <UseCaseAnalysisModal 
            result={analysisResult} 
            onClose={() => setAnalysisResult(null)} 
          />
      )}

      {/* Empty State */}
      {!results && !isSearching && !error && (
        <div className="text-center py-12 bg-paper-light border border-border rounded-lg">
          <svg className="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-dark text-lg mb-2">Ready to find your perfect fonts?</p>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Describe your project or select categories above, then click "Get Font Suggestions" to receive AI-powered recommendations
          </p>
        </div>
      )}
    </div>
  );
};

export default FontSuggestionView;