import React, { useState, useEffect, useRef } from 'react';
import { getPopularGoogleFonts } from '../services/googleFontsService';

interface GoogleFontSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const GoogleFontSearch: React.FC<GoogleFontSearchProps> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fontList, setFontList] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMode, setSearchMode] = useState<'starts' | 'contains'>('starts');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPopularGoogleFonts(1000).then(fonts => setFontList(fonts.map(f => f.family)));
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Re-filter when searchMode changes
  useEffect(() => {
    if (inputValue) {
      const event = { target: { value: inputValue } } as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(event);
    }
  }, [searchMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    if (text) {
      let filtered: string[];
      
      if (searchMode === 'starts') {
        // Prioritize fonts that START with the search term
        const startsWithTerm = fontList.filter(font => 
          font.toLowerCase().startsWith(text.toLowerCase())
        );
        const containsTerm = fontList.filter(font => 
          !font.toLowerCase().startsWith(text.toLowerCase()) && 
          font.toLowerCase().includes(text.toLowerCase())
        );
        filtered = [...startsWithTerm, ...containsTerm];
      } else {
        // Original behavior - contains anywhere
        filtered = fontList.filter(font => 
          font.toLowerCase().includes(text.toLowerCase())
        );
      }
      
      setSuggestions(filtered.slice(0, 15));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (fontName: string) => {
    onChange(fontName);
    setInputValue(fontName);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <label htmlFor="google-font-input" className="block text-sm font-medium text-secondary mb-2">
        Enter a Google Font Name
      </label>
      <input
        id="google-font-input"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue && suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="e.g., Roboto, Lato, Montserrat"
        className="w-full bg-background border border-border rounded-md p-3 text-text-dark focus:ring-2 focus:ring-accent focus:border-accent transition"
        autoComplete="off"
      />
      
      {/* Search mode toggle */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => setSearchMode('starts')}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            searchMode === 'starts' 
              ? 'bg-accent text-surface' 
              : 'bg-surface text-secondary border border-border hover:border-accent'
          }`}
        >
          Starts with
        </button>
        <button
          type="button"
          onClick={() => setSearchMode('contains')}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            searchMode === 'contains' 
              ? 'bg-accent text-surface' 
              : 'bg-surface text-secondary border border-border hover:border-accent'
          }`}
        >
          Contains
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map(font => (
            <li
              key={font}
              onClick={() => handleSuggestionClick(font)}
              onMouseDown={(e) => e.preventDefault()} // Prevents onBlur from firing before onClick
              className="cursor-pointer p-3 text-secondary hover:bg-accent hover:text-surface transition-colors"
            >
              {font}
            </li>
          ))}
        </ul>
      )}
       <p className="text-xs text-secondary/70 mt-2">
        Note: Analysis for Google Fonts will not include variable font controls or embedded license metadata.
      </p>
    </div>
  );
};

export default GoogleFontSearch;
