import type { GoogleFontMetadata } from '../types';

const FONTS_API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY || '';

// A curated list of popular Google Fonts (fallback).
const popularFonts = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Roboto Condensed', 'Source Sans Pro', 'Oswald',
  'Raleway', 'PT Sans', 'Merriweather', 'Noto Sans', 'Slabo 27px', 'Poppins', 'Playfair Display',
  'Ubuntu', 'Lora', 'Nunito', 'PT Serif', 'Titillium Web', 'Fira Sans', 'Work Sans', 'Inter',
  'Quicksand', 'Karla', 'Arimo', 'Dosis', 'Oxygen', 'Inconsolata', 'Josefin Sans', 'Cabin',
  'Bitter', 'Anton', 'Yanone Kaffeesatz', 'Lobster', 'Pacifico', 'Bebas Neue', 'Exo 2',
  'Crimson Text', 'Fjalla One', 'Vollkorn', 'Dancing Script', 'Shadows Into Light', 'Amatic SC',
  'Indie Flower', 'Caveat', 'Comfortaa', 'Righteous', 'Archivo', 'Zilla Slab', 'Barlow'
];

const CACHE_KEY = 'google_fonts_cache';
const CACHE_EXPIRY_DAYS = 7;

interface CachedFonts {
    fonts: GoogleFontMetadata[];
    timestamp: number;
}

/**
 * Fetches the complete list of Google Fonts from the API.
 * Uses caching to minimize API calls (7-day expiry).
 */
export const getAllGoogleFonts = async (): Promise<GoogleFontMetadata[]> => {
    if (!FONTS_API_KEY) {
        console.warn('Google Fonts API key is missing. Using fallback fonts.');
        return getFallbackFonts();
    }
    // Check cache first
    const cached = getCachedFonts();
    if (cached) {
        console.log('Using cached Google Fonts list');
        return cached;
    }

    try {
        // Fetch from Google Fonts API
        // Append &key=${FONTS_API_KEY} to the fetch URL
        const apiUrl = `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${FONTS_API_KEY}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Google Fonts API error: ${response.status}`);
        }

        const data = await response.json();
        const fonts: GoogleFontMetadata[] = data.items.map((item: any, index: number) => ({
            family: item.family,
            category: item.category,
            variants: item.variants || [],
            subsets: item.subsets || [],
            popularity: index + 1  // Index in popularity-sorted list
        }));

        // Cache the results
        cacheFonts(fonts);
        console.log(`Fetched ${fonts.length} Google Fonts from API`);

        return fonts;
    } catch (error) {
        // Falls back to curated list if API fails or key is invalid for Fonts API
        console.warn('Failed to fetch Google Fonts from API:', error); // Use console.warn
        // Fallback to static list silently
        return getFallbackFonts();
    }
};

/**
 * Gets the top N most popular fonts.
 */
export const getPopularGoogleFonts = async (limit: number = 800): Promise<GoogleFontMetadata[]> => {
    const allFonts = await getAllGoogleFonts();
    return allFonts.slice(0, limit);
};

/**
 * Gets just the font names (for backwards compatibility).
 */
export const getGoogleFonts = async (): Promise<string[]> => {
    return Promise.resolve(popularFonts.sort());
};

/**
 * Filters fonts by category.
 */
export const getFontsByCategory = async (categories: string[]): Promise<GoogleFontMetadata[]> => {
    if (!categories.length) return getAllGoogleFonts();

    const allFonts = await getAllGoogleFonts();
    return allFonts.filter(font => categories.includes(font.category));
};

// Cache management functions
function getCachedFonts(): GoogleFontMetadata[] | null {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data: CachedFonts = JSON.parse(cached);
        const now = Date.now();
        const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        if (now - data.timestamp > expiryTime) {
            // Cache expired
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return data.fonts;
    } catch (error) {
        console.error('Error reading font cache:', error); // Keep error for cache read issues
        return null;
    }
}

function cacheFonts(fonts: GoogleFontMetadata[]): void {
    try {
        const data: CachedFonts = {
            fonts,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error caching fonts:', error); // Keep error for cache write issues
    }
}

function getFallbackFonts(): GoogleFontMetadata[] {
    // Convert static list to metadata format
    return popularFonts.map((family, index) => ({
        family,
        category: 'sans-serif', // Default category
        variants: ['regular'],
        subsets: ['latin'],
        popularity: index + 1
    }));
}