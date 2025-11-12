import React, { useState, useEffect } from 'react';
import type { FontAnalysis } from '../types';
import { CheckIcon, InfoIcon, BusinessIcon, UsageIcon, WeightIcon, LicenseIcon, PairingIcon, AccessibilityIcon, SimilarFontsIcon, VariableFontIcon, ShareIcon, ExportIcon, CopyIcon, ExternalLinkIcon, HistoryIcon } from './Icons';
import { exportAnalysisToPDF } from '../pdfExportService';

interface AnalysisResultProps {
  result: FontAnalysis;
  onReset: () => void;
  isSharedView?: boolean;
  previewImageBase64?: string;
  isCached?: boolean;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="teal-card-raised rounded-lg p-4">
        <div className="flex items-center mb-3">
            {icon}
            <h3 className="text-lg font-semibold text-accent">{title}</h3>
        </div>
        {children}
    </div>
);


const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset, isSharedView = false, previewImageBase64, isCached = false }) => {
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('css');
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [loadedGoogleFonts, setLoadedGoogleFonts] = useState<Set<string>>(new Set());
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const loadGoogleFont = (fontName: string) => {
        if (!fontName || loadedGoogleFonts.has(fontName)) return;
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
        if (document.querySelector(`link[href="${fontUrl}"]`)) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
        setLoadedGoogleFonts(prev => new Set(prev).add(fontName));
    };

    useEffect(() => {
        result.fontPairings?.forEach(p => loadGoogleFont(p.secondary));
        result.similarFonts?.forEach(f => {
            if (f.source.toLowerCase().includes('google')) {
                loadGoogleFont(f.name);
            }
        });
    }, [result.fontPairings, result.similarFonts]);
    
    const handleShare = () => {
        const jsonString = JSON.stringify(result);
        const encodedData = btoa(jsonString);
        const url = `${window.location.origin}${window.location.pathname}#${encodedData}`;
        setShareUrl(url);
    };

    const handleCopyToClipboard = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleExportPDF = async () => {
        setIsExportingPDF(true);
        setPdfError(null);
        try {
            await exportAnalysisToPDF(result, previewImageBase64);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to export PDF. Please try again.';
            setPdfError(errorMessage);
            // Auto-hide error after 5 seconds
            setTimeout(() => setPdfError(null), 5000);
        } finally {
            setIsExportingPDF(false);
        }
    };

    const generateTokens = () => {
        const fontNameSlug = result.fontName.toLowerCase().replace(/\s+/g, '-');
        if (exportFormat === 'css') {
            return `
:root {
  --font-family-${fontNameSlug}: "${result.fontName}", sans-serif;
  /* Recommended Weights */
  ${result.weightRecommendations.map(w => `--font-weight-${fontNameSlug}-${w.split(' ')[0].toLowerCase()}: ${w.match(/\d+/)?.[0] || '400'}`).join(';\n  ')};
}
        `.trim();
        }
        if (exportFormat === 'json') {
            return JSON.stringify({
                [fontNameSlug]: {
                    family: `"${result.fontName}", sans-serif`,
                    weights: result.weightRecommendations.reduce((acc, w) => {
                        acc[w.split(' ')[0].toLowerCase()] = parseInt(w.match(/\d+/)?.[0] || '400', 10);
                        return acc;
                    }, {} as Record<string, number>),
                }
            }, null, 2);
        }
        return '';
    };

    if (result.status === 'not_enough_data') {
        return (
            <div className="text-center p-8 bg-surface rounded-lg border border-border">
                <h2 className="text-2xl font-bold text-accent mb-4">Not Enough Data</h2>
                <p className="text-secondary mb-6">The AI could not confidently analyze the provided file. This can happen with low-resolution images or images with very few characters. Please try a different file.</p>
                <button onClick={onReset} className="px-6 py-2 bg-accent text-surface font-bold rounded-lg hover:opacity-90 transition-opacity">Try Again</button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-surface rounded-lg border-border">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                         <h2 className="text-3xl font-bold text-primary">{result.fontName}</h2>
                         {result.isVariable && <VariableFontIcon aria-label="Variable Font" title="Variable Font" className="w-6 h-6 text-accent"/>}
                         {isCached && (
                            <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full border border-green-500/30">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Instant (Cached)
                            </span>
                         )}
                    </div>
                     <p className="text-accent text-lg">{result.fontType}</p>
                     {result.designer && result.designer.toLowerCase() !== 'unknown designer' && (
                        <p className="text-secondary text-sm mt-1">by {result.designer}</p>
                     )}
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleExportPDF}
                            disabled={isExportingPDF}
                            className="px-4 py-2 text-sm bg-accent text-surface font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <ExportIcon className="w-4 h-4" />
                            {isExportingPDF ? 'Exporting...' : 'Export PDF'}
                        </button>
                        <button onClick={() => setShowExportModal(true)} className="px-4 py-2 text-sm bg-secondary/30 text-primary font-semibold rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"><ExportIcon className="w-4 h-4" />Design Tokens</button>
                        <button onClick={handleShare} className="px-4 py-2 text-sm bg-secondary/30 text-primary font-semibold rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-2"><ShareIcon className="w-4 h-4" />Share</button>
                        {!isSharedView && <button onClick={onReset} className="px-6 py-2 bg-secondary/50 text-primary font-semibold rounded-lg hover:bg-secondary/70 transition-colors">Analyze Another</button>}
                    </div>
                    {pdfError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                            <p className="text-sm text-red-300">{pdfError}</p>
                        </div>
                    )}
                </div>
            </div>
          
            <InfoCard title="Analysis" icon={<InfoIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                <p className="text-secondary leading-normal">{result.analysis}</p>
            </InfoCard>

            {result.historicalContext && (
            <InfoCard title="Historical Context" icon={<HistoryIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                <p className="text-secondary leading-normal text-sm">{result.historicalContext}</p>
            </InfoCard>
            )}

            <InfoCard title="Accessibility & Legibility" icon={<AccessibilityIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                 <p className="text-secondary leading-normal mb-3">{result.accessibility.analysis}</p>
                 <ul className="space-y-2">
                    {result.accessibility.notes.map((note, index) => (
                        <li key={index} className="flex items-start">
                            <CheckIcon aria-hidden="true" className="w-5 h-5 mr-2 mt-0.5 text-accent flex-shrink-0" />
                            <span className="text-secondary">{note}</span>
                        </li>
                    ))}
                 </ul>
            </InfoCard>
            
            {result.fontPairings && result.fontPairings.length > 0 && (
            <InfoCard title="Font Pairing Suggestions" icon={<PairingIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                <div className="space-y-4">
                    {result.fontPairings.map((pairing, index) => {
                        const googleFontUrl = `https://fonts.google.com/specimen/${pairing.secondary.replace(/ /g, '+')}`;
                        return (
                            <div key={index} className="border-t border-border pt-4 first:pt-0 first:border-none">
                                <div className="p-4 rounded-lg bg-background mb-3">
                                     <a href={googleFontUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 group">
                                        <h4 style={{fontFamily: `'${pairing.secondary}', sans-serif`}} className="text-3xl font-bold text-primary leading-tight group-hover:underline">{pairing.secondary}</h4>
                                        <ExternalLinkIcon className="w-5 h-5 text-secondary/70 group-hover:text-accent transition-colors" />
                                    </a>
                                    <p style={{fontFamily: `'${pairing.secondary}', sans-serif`}} className="text-base text-secondary mt-2">The quick brown fox jumps over the lazy dog.</p>
                                </div>
                                <p className="text-secondary text-sm leading-relaxed">{pairing.rationale}</p>
                            </div>
                        )
                    })}
                </div>
            </InfoCard>
            )}

            {result.similarFonts && result.similarFonts.length > 0 && (
            <InfoCard title="Similar Font Alternatives" icon={<SimilarFontsIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                <div className="space-y-4">
                    {result.similarFonts.map((font, index) => {
                        const isGoogleFont = font.source.toLowerCase().includes('google');
                        const googleFontUrl = isGoogleFont ? `https://fonts.google.com/specimen/${font.name.replace(/ /g, '+')}` : undefined;

                        return (
                            <div key={index} className="border-t border-border pt-4 first:pt-0 first:border-none">
                                <div className="flex justify-between items-baseline">
                                    {isGoogleFont ? (
                                        <a href={googleFontUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 group">
                                            <h4 style={{ fontFamily: `'${font.name}', sans-serif` }} className="font-semibold text-primary group-hover:underline">{font.name}</h4>
                                            <ExternalLinkIcon className="w-4 h-4 text-secondary/70 group-hover:text-accent transition-colors" />
                                        </a>
                                    ) : (
                                        <h4 className="font-semibold text-primary">{font.name}</h4>
                                    )}
                                    <span className="text-xs text-secondary bg-surface px-2 py-1 rounded">{font.source}</span>
                                </div>
                                <p className="text-secondary text-sm leading-relaxed mt-1">{font.rationale}</p>
                            </div>
                        )
                    })}
                </div>
            </InfoCard>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                <InfoCard title="Recommended Usage" icon={<UsageIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                    <ul className="space-y-2">{result.usageRecommendations.map((rec, index) => (<li key={index} className="flex items-start"><CheckIcon aria-hidden="true" className="w-5 h-5 mr-2 mt-0.5 text-accent flex-shrink-0" /><span className="text-secondary">{rec}</span></li>))}</ul>
                </InfoCard>
                <InfoCard title="Weight Recommendations" icon={<WeightIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                    <ul className="space-y-2">{result.weightRecommendations.map((rec, index) => (<li key={index} className="flex items-start"><CheckIcon aria-hidden="true" className="w-5 h-5 mr-2 mt-0.5 text-accent flex-shrink-0" /><span className="text-secondary">{rec}</span></li>))}</ul>
                </InfoCard>
            </div>
            
            {result.licenseInfo && (<InfoCard title="License & Usage Information" icon={<LicenseIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                <p className="text-secondary leading-normal text-sm">{result.licenseInfo}</p>
            </InfoCard>)}

            <InfoCard title="Business Suitability" icon={<BusinessIcon aria-hidden="true" className="w-6 h-6 mr-2 text-accent" />}>
                <div className="flex flex-wrap gap-2">{result.businessSuitability.map((biz, index) => (<span key={index} className="bg-accent/20 text-accent text-sm font-medium px-4 py-2 rounded-full">{biz}</span>))}</div>
            </InfoCard>
            
            {shareUrl && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShareUrl('')}>
                    <div className="bg-surface rounded-lg p-6 w-full max-w-lg border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 text-primary">Share Analysis</h3>
                        <p className="text-secondary mb-4 text-sm">Copy this link to share a read-only version of this report.</p>
                        <div className="flex items-center gap-2">
                           <input type="text" readOnly value={shareUrl} className="w-full bg-background border border-border rounded-md p-2 text-text-dark text-sm truncate"/>
                           <button onClick={() => handleCopyToClipboard(shareUrl)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${copied ? 'bg-green-500 text-primary' : 'bg-accent text-surface'}`}>
                               <CopyIcon className="w-4 h-4"/> {copied ? 'Copied!' : 'Copy'}
                           </button>
                        </div>
                    </div>
                </div>
            )}
             {showExportModal && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowExportModal(false)}>
                    <div className="bg-surface rounded-lg p-6 w-full max-w-lg border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 text-primary">Export Design Tokens</h3>
                        <div className="flex gap-2 mb-4 border border-border bg-background/50 p-1 rounded-lg">
                            <button onClick={() => setExportFormat('css')} className={`w-full rounded-md py-1 text-sm font-semibold ${exportFormat === 'css' ? 'bg-accent text-surface' : 'text-secondary hover:bg-border'}`}>CSS</button>
                            <button onClick={() => setExportFormat('json')} className={`w-full rounded-md py-1 text-sm font-semibold ${exportFormat === 'json' ? 'bg-accent text-surface' : 'text-secondary hover:bg-border'}`}>JSON</button>
                        </div>
                        <div className="relative">
                            <pre className="bg-background text-primary/80 p-4 rounded-md text-xs overflow-x-auto"><code className="whitespace-pre-wrap">{generateTokens()}</code></pre>
                            <button onClick={() => handleCopyToClipboard(generateTokens())} className={`absolute top-2 right-2 p-2 rounded-lg transition-colors ${copied ? 'bg-green-500 text-primary' : 'bg-border text-primary hover:bg-accent hover:text-surface'}`} aria-label="Copy to clipboard">
                                {copied ? <CheckIcon className="w-4 h-4"/> : <CopyIcon className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisResult;
