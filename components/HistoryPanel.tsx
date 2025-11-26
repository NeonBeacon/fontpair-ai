import React, { useState, useEffect } from 'react';
import type { FontAnalysis, FontSuggestionResult } from '../types';
import { 
  getHistory, 
  deleteFromHistory, 
  clearHistory, 
  getSearchHistory,
  deleteSearchFromHistory,
  clearSearchHistory,
  formatTimeAgo, 
  type HistoryItem,
  type SearchHistoryItem 
} from '../historyService';
import { CloseIcon, HistoryIcon } from './Icons';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAnalysis: (item: HistoryItem, target: 'left' | 'right') => void;
  onLoadSearch?: (item: SearchHistoryItem) => void;
}

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

type TabType = 'analyses' | 'searches';

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onLoadAnalysis, onLoadSearch }) => {
  const [activeTab, setActiveTab] = useState<TabType>('analyses');
  const [analysisHistory, setAnalysisHistory] = useState<HistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState<'left' | 'right'>('left');

  useEffect(() => {
    if (isOpen) {
      setAnalysisHistory(getHistory());
      setSearchHistory(getSearchHistory());
    }
  }, [isOpen]);

  const handleDeleteAnalysis = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteFromHistory(id);
    setAnalysisHistory(getHistory());
  };

  const handleDeleteSearch = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteSearchFromHistory(id);
    setSearchHistory(getSearchHistory());
  };

  const handleClearAnalyses = () => {
    if (window.confirm('Are you sure you want to clear all analysis history?')) {
      clearHistory();
      setAnalysisHistory([]);
    }
  };

  const handleClearSearches = () => {
    if (window.confirm('Are you sure you want to clear all search history?')) {
      clearSearchHistory();
      setSearchHistory([]);
    }
  };

  const handleLoadAnalysis = (item: HistoryItem) => {
    onLoadAnalysis(item, targetColumn);
    onClose();
  };

  const handleLoadSearch = (item: SearchHistoryItem) => {
    if (onLoadSearch) {
      onLoadSearch(item);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentHistory = activeTab === 'analyses' ? analysisHistory : searchHistory;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="paper-modal rounded-lg w-full max-w-3xl max-h-[80vh] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-bold text-text-light">History</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Tab Selector */}
            <div className="flex bg-teal-dark rounded-lg p-1 border border-teal-light/10">
              <button
                onClick={() => setActiveTab('analyses')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'analyses' ? 'bg-accent text-white' : 'text-teal-light hover:text-white'
                }`}
              >
                <HistoryIcon className="w-3 h-3" />
                Analyses
              </button>
              <button
                onClick={() => setActiveTab('searches')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'searches' ? 'bg-accent text-white' : 'text-teal-light hover:text-white'
                }`}
              >
                <SearchIcon className="w-3 h-3" />
                Searches
              </button>
            </div>

            {/* Column Toggle (only for analyses) */}
            {activeTab === 'analyses' && (
              <div className="flex bg-teal-dark rounded-lg p-1 border border-teal-light/10">
                <button
                  onClick={() => setTargetColumn('left')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    targetColumn === 'left' ? 'bg-accent text-white' : 'text-teal-light hover:text-white'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => setTargetColumn('right')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    targetColumn === 'right' ? 'bg-accent text-white' : 'text-teal-light hover:text-white'
                  }`}
                >
                  Right
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'analyses' ? (
            // Analysis History
            analysisHistory.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <p className="text-secondary text-lg">No analysis history yet</p>
                <p className="text-secondary/70 text-sm mt-2">Your font analyses will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisHistory.map((item) => (
                  <div
                    key={item.id}
                    className="paper-card-inset rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer relative group"
                    onClick={() => handleLoadAnalysis(item)}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-32 h-24 bg-surface rounded border border-border/50 overflow-hidden flex items-center justify-center">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.analysis.fontName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-secondary/50 text-center p-2">
                            <HistoryIcon className="w-8 h-8 mx-auto mb-1" />
                            <p className="text-xs">No preview</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-text-dark truncate">{item.analysis.fontName}</h3>
                            <p className="text-accent text-sm">{item.analysis.fontType}</p>
                          </div>
                          <span className="text-xs text-secondary/70 flex-shrink-0">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        <p className="text-secondary text-sm mt-2 line-clamp-2">{item.analysis.analysis}</p>
                      </div>
                      {hoveredItemId === item.id && (
                        <button
                          onClick={(e) => handleDeleteAnalysis(item.id, e)}
                          className="absolute top-2 right-2 bg-danger text-primary p-2 rounded-lg hover:opacity-90 transition-opacity"
                          aria-label="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Search History
            searchHistory.length === 0 ? (
              <div className="text-center py-12">
                <SearchIcon className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <p className="text-secondary text-lg">No search history yet</p>
                <p className="text-secondary/70 text-sm mt-2">Your font searches will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="paper-card-inset rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer relative group"
                    onClick={() => handleLoadSearch(item)}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-32 h-24 bg-teal-dark rounded border border-teal-light/20 flex items-center justify-center">
                        <div className="text-center p-2">
                          <SearchIcon className="w-8 h-8 mx-auto mb-1 text-accent" />
                          <p className="text-xs text-teal-light">{item.fontNames.length} fonts</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-text-dark truncate">
                              {item.searchCriteria.description || 'Category Search'}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[...item.searchCriteria.usageTypes, ...item.searchCriteria.themes].slice(0, 4).map((tag, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-secondary/70 flex-shrink-0">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        <p className="text-secondary text-sm mt-2 line-clamp-1">
                          Found: {item.fontNames.join(', ')}
                        </p>
                      </div>
                      {hoveredItemId === item.id && (
                        <button
                          onClick={(e) => handleDeleteSearch(item.id, e)}
                          className="absolute top-2 right-2 bg-danger text-primary p-2 rounded-lg hover:opacity-90 transition-opacity"
                          aria-label="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {currentHistory.length > 0 && (
          <div className="p-4 border-t border-border flex justify-between items-center">
            <span className="text-sm text-secondary">
              {currentHistory.length} {currentHistory.length === 1 ? 'item' : 'items'}
            </span>
            <button
              onClick={activeTab === 'analyses' ? handleClearAnalyses : handleClearSearches}
              className="px-4 py-2 text-sm bg-danger/80 text-primary font-semibold rounded-lg hover:bg-danger transition-colors"
            >
              Clear All {activeTab === 'analyses' ? 'Analyses' : 'Searches'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;