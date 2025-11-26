import React, { useState, useEffect, useRef } from 'react';
import { analyzeFont } from '../services/geminiService';
import type { FontAnalysis } from '../types';
import Loader from './Loader';
import AnalysisResult from './AnalysisResult';
import { CloseIcon } from './Icons';
import { saveToHistory } from '../historyService';
import { canPerformAnalysis, incrementDailyAnalysisCount, isProfessional } from '../services/tierService';

declare var html2canvas: any;

interface QuickAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontName: string;
  onLoadToColumn?: (analysis: FontAnalysis, target: 'left' | 'right') => void;
}

const QuickAnalysisModal: React.FC<QuickAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  fontName,
  onLoadToColumn 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FontAnalysis | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load Google Font
  useEffect(() => {
    if (!isOpen || !fontName) return;
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    link.onload = () => setFontLoaded(true);
    
    return () => {
      // Cleanup optional - fonts can stay loaded
    };
  }, [isOpen, fontName]);

  // Run analysis when font loads
  useEffect(() => {
    if (!isOpen || !fontLoaded || !previewRef.current) return;

    const runAnalysis = async () => {
      // Check daily limit for free users
      const analysisCheck = canPerformAnalysis();
      if (!analysisCheck.allowed) {
        setError(analysisCheck.message || "Daily limit reached.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // Wait a brief moment for font to render
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Capture preview
        const canvas = await html2canvas(previewRef.current, { 
          backgroundColor: '#1A3431' 
        });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        setPreviewImage(dataUrl);

        // Run AI analysis
        const result = await analyzeFont(
          base64, 
          'image/jpeg', 
          `${fontName} (from Google Fonts)`
        );
        
        result.fontSource = 'google-fonts';
        setAnalysis(result);

        // Save to history
        if (result.status === 'success') {
          // Increment daily count for free users
          if (!isProfessional()) {
            incrementDailyAnalysisCount();
          }

          const thumbnailCanvas = document.createElement('canvas');
          const thumbnailWidth = 200;
          const thumbnailHeight = (canvas.height / canvas.width) * thumbnailWidth;
          thumbnailCanvas.width = thumbnailWidth;
          thumbnailCanvas.height = thumbnailHeight;
          const ctx = thumbnailCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight);
            const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.85);
            saveToHistory(result, thumbnail);
          }
        }
      } catch (err) {
        console.error('Quick analysis failed:', err);
        setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
  }, [fontLoaded, isOpen, fontName]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAnalysis(null);
      setError(null);
      setIsLoading(true);
      setFontLoaded(false);
      setPreviewImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="paper-modal rounded-lg w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <div>
            <h2 className="text-xl font-bold text-text-light">Quick Analysis</h2>
            <p className="text-sm text-teal-light">{fontName}</p>
          </div>
          <div className="flex items-center gap-3">
            {analysis && onLoadToColumn && (
              <>
                <button
                  onClick={() => {
                    onLoadToColumn(analysis, 'left');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-teal-medium text-text-light text-sm font-medium rounded-md hover:bg-teal-dark transition-colors"
                >
                  Load to Left
                </button>
                <button
                  onClick={() => {
                    onLoadToColumn(analysis, 'right');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-teal-medium text-text-light text-sm font-medium rounded-md hover:bg-teal-dark transition-colors"
                >
                  Load to Right
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Hidden preview element for html2canvas */}
          <div 
            ref={previewRef}
            className="mb-6 p-8 rounded-lg"
            style={{ 
              backgroundColor: '#1A3431',
              display: fontLoaded && isLoading ? 'block' : 'none'
            }}
          >
            <p 
              className="text-4xl text-[#EDF7F6] leading-relaxed"
              style={{ fontFamily: `'${fontName}', sans-serif` }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
            <p 
              className="text-lg text-[#EDF7F6]/70 mt-4"
              style={{ fontFamily: `'${fontName}', sans-serif` }}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader />
              <p className="text-text-dark mt-4">
                {fontLoaded ? 'Analyzing font...' : 'Loading font...'}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
              <p className="text-red-300">{error}</p>
              <button 
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30"
              >
                Close
              </button>
            </div>
          )}

          {analysis && !isLoading && (
            <AnalysisResult 
              result={analysis} 
              onReset={onClose}
              previewImageBase64={previewImage || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickAnalysisModal;
