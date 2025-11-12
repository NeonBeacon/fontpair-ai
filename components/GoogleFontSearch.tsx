import React, { useState, useEffect, useRef } from 'react';
import { getGoogleFonts } from '../services/googleFontsService';

interface GoogleFontSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const GoogleFontSearch: React.FC<GoogleFontSearchProps> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fontList, setFontList] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGoogleFonts().then(setFontList);
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

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
      setSuggestions(
        fontList.filter(font => font.toLowerCase().includes(text.toLowerCase())).slice(0, 10)
      );
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
        className="w-full bg-background border border-border rounded-md p-3 text-primary focus:ring-2 focus:ring-accent focus:border-accent transition"
        autoComplete="off"
      />
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
