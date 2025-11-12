import type { FontAnalysis } from '../types';

// Cache configuration
const CACHE_PREFIX = 'cadmus_font_cache_';
const CACHE_EXPIRY_DAYS = 30;
const CACHE_VERSION = 'v1'; // Increment to invalidate old caches

interface CacheEntry {
  analysis: FontAnalysis;
  timestamp: number;
  version: string;
}

/**
 * Simple hash function for generating cache keys
 * Uses DJB2 hash algorithm
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Generate cache key for uploaded font file
 */
export function generateFileCacheKey(fileName: string, fileContent: string): string {
  // Use first 1KB of file content for hash
  const contentSample = fileContent.substring(0, 1024);
  const hashInput = `${fileName}_${contentSample}`;
  return `${CACHE_PREFIX}file_${simpleHash(hashInput)}`;
}

/**
 * Generate cache key for Google Font
 */
export function generateGoogleFontCacheKey(fontName: string, variant: string = 'regular'): string {
  const hashInput = `${fontName}_${variant}`;
  return `${CACHE_PREFIX}google_${simpleHash(hashInput)}`;
}

/**
 * Generate cache key for image analysis
 */
export function generateImageCacheKey(imageData: string): string {
  // Use first 2KB of base64 image data for hash
  const contentSample = imageData.substring(0, 2048);
  return `${CACHE_PREFIX}image_${simpleHash(contentSample)}`;
}

/**
 * Check if cache entry is expired
 */
function isExpired(timestamp: number): boolean {
  const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > expiryMs;
}

/**
 * Retrieve cached analysis
 * Returns null if not found, expired, or invalid
 */
export function getCachedAnalysis(cacheKey: string): FontAnalysis | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);

    // Check version
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Check expiry
    if (isExpired(entry.timestamp)) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry.analysis;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Store analysis in cache
 */
export function setCachedAnalysis(cacheKey: string, analysis: FontAnalysis): void {
  try {
    const entry: CacheEntry = {
      analysis,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing cache:', error);
    // If localStorage is full, try to clear old entries
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearExpiredCache();
      // Try again after clearing
      try {
        const entry: CacheEntry = {
          analysis,
          timestamp: Date.now(),
          version: CACHE_VERSION
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to cache even after cleanup:', retryError);
      }
    }
  }
}

/**
 * Clear all cached analyses
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear only expired cache entries
 */
export function clearExpiredCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (isExpired(entry.timestamp) || entry.version !== CACHE_VERSION) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // If parsing fails, remove the corrupted entry
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

  let totalSize = 0;
  let oldestEntry: number | null = null;
  let newestEntry: number | null = null;

  cacheKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      totalSize += value.length;
      try {
        const entry: CacheEntry = JSON.parse(value);
        if (oldestEntry === null || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }
        if (newestEntry === null || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp;
        }
      } catch (e) {
        // Ignore parse errors for stats
      }
    }
  });

  return {
    totalEntries: cacheKeys.length,
    totalSize,
    oldestEntry,
    newestEntry
  };
}
