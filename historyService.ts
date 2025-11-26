import type { FontAnalysis, FontSuggestionResult } from './types';
import { getTierLimits } from './services/tierService';

const ANALYSIS_STORAGE_KEY = 'cadmus_analysis_history';
const SEARCH_STORAGE_KEY = 'cadmus_search_history';

// Analysis History Types
export interface HistoryItem {
  id: string;
  analysis: FontAnalysis;
  timestamp: number;
  thumbnail?: string;
}

// Search History Types
export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  searchCriteria: {
    description: string;
    usageTypes: string[];
    businessTypes: string[];
    themes: string[];
    fontCategories: string[];
  };
  results: FontSuggestionResult;
  fontNames: string[]; // Quick reference for display
}

function getMaxHistoryItems(): number {
  return getTierLimits().historyLimit;
}

// ============ ANALYSIS HISTORY ============

export function saveToHistory(analysis: FontAnalysis, thumbnail?: string): void {
  try {
    const history = getAllHistory();
    const newItem: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      analysis,
      timestamp: Date.now(),
      thumbnail
    };

    history.unshift(newItem);

    // Cap storage at 100 (max pro limit) to avoid unlimited growth
    const maxStorage = 100;
    const trimmedHistory = history.slice(0, maxStorage);

    localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

// Internal helper to get all stored history without slicing by tier
function getAllHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to retrieve history:', error);
    return [];
  }
}

export function getHistory(): HistoryItem[] {
  const history = getAllHistory();
  const limit = getMaxHistoryItems();
  return history.slice(0, limit);
}

export function deleteFromHistory(id: string): void {
  try {
    const history = getAllHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete from history:', error);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(ANALYSIS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

// ============ SEARCH HISTORY ============

export function saveSearchToHistory(
  searchCriteria: SearchHistoryItem['searchCriteria'],
  results: FontSuggestionResult
): void {
  try {
    const history = getAllSearchHistory();
    const newItem: SearchHistoryItem = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      searchCriteria,
      results,
      fontNames: results.suggestions.map(s => s.fontName),
    };
    history.unshift(newItem);
    
    // Cap storage at 100 (max pro limit)
    const maxStorage = 100;
    const trimmedHistory = history.slice(0, maxStorage);
    
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save search to history:', error);
  }
}

// Internal helper for search history
function getAllSearchHistory(): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to retrieve search history:', error);
    return [];
  }
}

export function getSearchHistory(): SearchHistoryItem[] {
  const history = getAllSearchHistory();
  const limit = getMaxHistoryItems();
  return history.slice(0, limit);
}

export function deleteSearchFromHistory(id: string): void {
  try {
    const history = getAllSearchHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete search from history:', error);
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}

// ============ UTILITIES ============

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}