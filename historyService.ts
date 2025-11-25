import type { FontAnalysis } from './types';
import { getTierLimits } from './services/tierService';

const STORAGE_KEY = 'cadmus_analysis_history';

export interface HistoryItem {
  id: string;
  analysis: FontAnalysis;
  timestamp: number;
  thumbnail?: string;
}

function getMaxHistoryItems(): number {
  return getTierLimits().historyLimit;
}

export function saveToHistory(analysis: FontAnalysis, thumbnail?: string): void {
  try {
    const history = getAllHistory(); // Get raw history
    const newItem: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      analysis,
      timestamp: Date.now(),
      thumbnail
    };

    // Add to beginning of array
    history.unshift(newItem);

    // Keep only the most recent limit
    // Note: We might want to persist more data than visible in case they upgrade later,
    // but for now we'll cap storage at 100 (max pro limit) to avoid unlimited growth,
    // and visual display will be capped by the current tier limit.
    const maxStorage = 100; 
    const trimmedHistory = history.slice(0, maxStorage);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

// Internal helper to get all stored history without slicing by tier
function getAllHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete from history:', error);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

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
