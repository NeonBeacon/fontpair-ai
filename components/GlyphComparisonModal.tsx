import React from 'react';
import type { GlyphComparisonResult } from '../types';
import { CloseIcon } from './Icons';

interface GlyphComparisonModalProps {
  comparison: GlyphComparisonResult;
  onClose: () => void;
  font1Name: string;
  font2Name: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-500';
  if (score >= 5) return 'text-yellow-500';
  return 'text-red-500';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500/20';
  if (score >= 5) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
};

const GlyphComparisonModal: React.FC<GlyphComparisonModalProps> = ({
  comparison,
  onClose,
  font1Name,
  font2Name,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-5xl max-h-[90vh] border border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">Glyph Comparison</h2>
            <p className="text-secondary text-sm">
              Comparing <span className="text-accent font-semibold">{font1Name}</span> vs{' '}
              <span className="text-accent font-semibold">{font2Name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overall Assessment */}
          <div className="bg-background/50 rounded-lg p-4 border border-border mb-6">
            <h3 className="text-lg font-bold text-accent mb-3">Overall Assessment</h3>
            <p className="text-secondary leading-relaxed">{comparison.overallAssessment}</p>
          </div>

          {/* Character Comparisons */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-accent mb-3">Character Analysis</h3>
            {comparison.comparisons.map((glyph, index) => (
              <div
                key={index}
                className="bg-background border border-border rounded-lg p-5"
              >
                {/* Character Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-primary bg-surface px-4 py-2 rounded border border-border">
                      {glyph.character}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-primary">
                        Character: '{glyph.character}'
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-secondary">Readability Score:</span>
                        <span
                          className={`text-lg font-bold ${getScoreColor(glyph.readabilityScore)}`}
                        >
                          {glyph.readabilityScore}/10
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getScoreColor(
                            glyph.readabilityScore
                          )} ${getScoreBgColor(glyph.readabilityScore)}`}
                        >
                          {glyph.readabilityScore >= 8
                            ? 'Excellent'
                            : glyph.readabilityScore >= 5
                            ? 'Good'
                            : 'Poor'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-side Analysis */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-surface/50 rounded-lg p-4 border border-border">
                    <h5 className="font-semibold text-accent mb-2 text-sm">
                      {font1Name}
                    </h5>
                    <p className="text-secondary text-sm leading-relaxed">
                      {glyph.font1Analysis}
                    </p>
                  </div>
                  <div className="bg-surface/50 rounded-lg p-4 border border-border">
                    <h5 className="font-semibold text-accent mb-2 text-sm">
                      {font2Name}
                    </h5>
                    <p className="text-secondary text-sm leading-relaxed">
                      {glyph.font2Analysis}
                    </p>
                  </div>
                </div>

                {/* Differences */}
                {glyph.differences && glyph.differences.length > 0 && (
                  <div className="bg-surface/30 rounded-lg p-4">
                    <h5 className="font-semibold text-primary mb-2 text-sm">
                      Key Differences
                    </h5>
                    <ul className="space-y-1">
                      {glyph.differences.map((diff, diffIndex) => (
                        <li
                          key={diffIndex}
                          className="text-secondary text-sm flex items-start"
                        >
                          <span className="text-accent mr-2">•</span>
                          <span>{diff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-accent text-surface font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlyphComparisonModal;
