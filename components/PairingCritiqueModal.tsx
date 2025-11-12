import React from 'react';
import type { PairingCritique } from '../types';
import { CheckIcon, CloseIcon, StarIcon, SparklesIcon } from './Icons';

interface PairingCritiqueModalProps {
  critique: PairingCritique;
  onClose: () => void;
  font1Name?: string;
  font2Name?: string;
}

const PairingCritiqueModal: React.FC<PairingCritiqueModalProps> = ({ critique, onClose, font1Name, font2Name }) => {
  const renderStars = (score: number) => {
    return Array.from({ length: 10 }, (_, i) => (
      <StarIcon key={i} className={`w-6 h-6 ${i < score ? 'text-yellow-400' : 'text-border'}`} />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-surface rounded-lg p-6 w-full max-w-2xl border border-border shadow-2xl relative max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors" aria-label="Close critique">
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent/20 p-2 rounded-full">
                <SparklesIcon className="w-6 h-6 text-accent" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-primary">Pairing Critique</h2>
                {font1Name && font2Name && <p className="text-secondary">{font1Name} + {font2Name}</p>}
            </div>
        </div>

        <div className="bg-background/50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-secondary text-center mb-2">Overall Score: {critique.overallScore}/10</h3>
            <div className="flex justify-center gap-1">
                {renderStars(critique.overallScore)}
            </div>
        </div>
        
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold text-accent mb-2">Analysis</h4>
                <p className="text-secondary leading-relaxed">{critique.analysis}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-green-400 mb-2">Pros</h4>
                    <ul className="space-y-2">
                        {critique.pros.map((pro, index) => (
                            <li key={index} className="flex items-start">
                                <CheckIcon aria-hidden="true" className="w-5 h-5 mr-2 mt-0.5 text-green-400 flex-shrink-0" />
                                <span className="text-secondary">{pro}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-yellow-400 mb-2">Cons & Considerations</h4>
                     <ul className="space-y-2">
                        {critique.cons.map((con, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-yellow-400 mr-2 mt-0.5 font-bold flex-shrink-0">!</span>
                                <span className="text-secondary">{con}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PairingCritiqueModal;
