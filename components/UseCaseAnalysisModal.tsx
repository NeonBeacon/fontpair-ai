import React from 'react';
import type { UseCaseAnalysisResult } from '../types';
import { CloseIcon } from './Icons';

interface UseCaseAnalysisModalProps {
  result: UseCaseAnalysisResult;
  onClose: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-400';
  if (score >= 5) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500/20 border-green-500/30';
  if (score >= 5) return 'bg-yellow-500/20 border-yellow-500/30';
  return 'bg-red-500/20 border-red-500/30';
};

const UseCaseAnalysisModal: React.FC<UseCaseAnalysisModalProps> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div className="paper-modal w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-text-light mb-1">Use Case Analysis</h2>
            <p className="text-teal-light text-sm">AI Visual Audit based on your specific project requirements</p>
          </div>
          <button onClick={onClose} className="text-teal-light hover:text-text-light transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Context Summary */}
            <div className="bg-teal-dark/30 border border-white/10 rounded-lg p-4">
                <h3 className="text-sm font-bold text-accent uppercase mb-2">Analysis Context</h3>
                <p className="text-text-light leading-relaxed">{result.analysisContext}</p>
            </div>

            {/* Top Recommendation */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">TOP PICK</div>
                    <h3 className="text-xl font-bold text-green-400 mb-2">{result.topRecommendation}</h3>
                    <p className="text-text-light text-sm leading-relaxed">{result.topRecommendationReason}</p>
                </div>

                <div className="bg-teal-dark/40 border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-text-light mb-2">Alternative</h3>
                    <h4 className="text-accent font-medium mb-2">{result.alternativeRecommendation}</h4>
                    <p className="text-text-light text-sm leading-relaxed">{result.alternativeReason}</p>
                </div>
            </div>

            {/* Rankings List */}
            <div>
                <h3 className="text-xl font-bold text-text-light mb-4">Ranked Results</h3>
                <div className="space-y-4">
                    {result.rankings.map((font, idx) => (
                        <div key={idx} className="bg-surface-dark/50 border border-white/10 rounded-lg p-5 flex flex-col md:flex-row gap-6">
                            {/* Score Column */}
                            <div className="flex flex-col items-center justify-center min-w-[100px]">
                                <div className={`text-3xl font-bold mb-1 ${getScoreColor(font.overallScore)}`}>{font.overallScore}/10</div>
                                <div className={`px-2 py-0.5 rounded text-xs font-medium border ${getScoreBgColor(font.overallScore)}`}>
                                    {font.verdict}
                                </div>
                            </div>

                            {/* Details Column */}
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-text-light mb-2">{font.fontName}</h4>
                                <div className="mb-3">
                                    <span className="text-xs font-bold text-teal-light uppercase">Visual Analysis: </span>
                                    <span className="text-text-light/90 text-sm">{font.visualAnalysis}</span>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-xs font-bold text-green-400 uppercase mb-1">Strengths</h5>
                                        <ul className="list-disc list-inside text-xs text-text-light/80 space-y-0.5">
                                            {font.strengthsForUseCase.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-bold text-red-400 uppercase mb-1">Weaknesses</h5>
                                        <ul className="list-disc list-inside text-xs text-text-light/80 space-y-0.5">
                                            {font.weaknessesForUseCase.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Avoidance Warning */}
            {result.fontsToAvoid.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-red-400 mb-2">Avoidance Warning</h3>
                    <p className="text-text-light text-sm mb-3"><span className="font-bold">Consider avoiding:</span> {result.fontsToAvoid.join(', ')}</p>
                    <p className="text-text-light/80 text-sm italic">{result.avoidanceReasons}</p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default UseCaseAnalysisModal;