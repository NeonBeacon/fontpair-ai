import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1); // NEW: track highlighted item
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // NEW: ref for input
  const listRef = useRef<HTMLUListElement>(null); // NEW: ref for list

  useEffect(() => {
    getPopularGoogleFonts(1000).then(fonts => setFontList(fonts.map(f => f.family)));
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Re-filter when searchMode changes
  useEffect(() => {
    if (inputValue) {
      filterSuggestions(inputValue);
    }
  }, [searchMode]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filterSuggestions = useCallback((text: string) => {
    if (text) {
      let filtered: string[];
      
      if (searchMode === 'starts') {
        const startsWithTerm = fontList.filter(font => 
          font.toLowerCase().startsWith(text.toLowerCase())
        );
        const containsTerm = fontList.filter(font => 
          !font.toLowerCase().startsWith(text.toLowerCase()) && 
          font.toLowerCase().includes(text.toLowerCase())
        );
        filtered = [...startsWithTerm, ...containsTerm];
      } else {
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
  }, [fontList, searchMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    filterSuggestions(text);
  };

  const handleSuggestionSelect = (fontName: string) => {
    onChange(fontName);
    setInputValue(fontName);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    // Keep focus on input for continued editing if needed
    inputRef.current?.focus();
  };

  // NEW: Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      // If dropdown not open, open it on arrow down
      if (e.key === 'ArrowDown' && inputValue && suggestions.length === 0) {
        filterSuggestions(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); // Prevent cursor from moving in input
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0 // Wrap to top
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault(); // Prevent cursor from moving in input
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1 // Wrap to bottom
        );
        break;
        
      case 'Enter':
        e.preventDefault(); // Prevent form submission
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[highlightedIndex]);
        } else if (suggestions.length > 0) {
          // If nothing highlighted, select first item
          handleSuggestionSelect(suggestions[0]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
        
      case 'Tab':
        // Allow natural tab behavior but close dropdown
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <label htmlFor="google-font-input" className="block text-sm font-medium text-secondary mb-2">
        Enter a Google Font Name
      </label>
      <input
        ref={inputRef}
        id="google-font-input"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue && suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="e.g., Roboto, Lato, Montserrat"
        className="w-full bg-background border border-border rounded-md p-3 text-text-dark focus:ring-2 focus:ring-accent focus:border-accent transition"
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={highlightedIndex >= 0 ? `font-option-${highlightedIndex}` : undefined}
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
        <ul 
          ref={listRef}
          className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="Font suggestions"
        >
          {suggestions.map((font, index) => (
            <li
              key={font}
              id={`font-option-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSuggestionSelect(font)}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              className={`cursor-pointer p-3 transition-colors ${
                highlightedIndex === index
                  ? 'bg-accent text-surface'
                  : 'text-secondary hover:bg-accent/10'
              }`}
            >
              {font}
            </li>
          ))}
        </ul>
      )}
      
      {/* Keyboard hint */}
      {showSuggestions && suggestions.length > 0 && (
        <p className="text-xs text-secondary/50 mt-1">
          ↑↓ to navigate • Enter to select • Esc to close
        </p>
      )}
      
      <p className="text-xs text-secondary/70 mt-2">
        Note: Analysis for Google Fonts will not include variable font controls or embedded license metadata.
      </p>
    </div>
  );
};

export default GoogleFontSearch;