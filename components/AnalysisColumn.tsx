import React, { useState, useCallback, useRef } from 'react';
import { analyzeFont, generateFunnySentence } from '../services/geminiService';
import type { FontAnalysis } from '../types';
import FileUpload from './FileUpload';
import AnalysisResult from './AnalysisResult';
import Loader from './Loader';
import FontPreview from './FontPreview';
import { fileToBase64 } from '../utils/fileUtils';
import GoogleFontSearch from './GoogleFontSearch';
import { saveToHistory } from '../historyService';
import {
    generateFileCacheKey,
    generateGoogleFontCacheKey,
    generateImageCacheKey,
    getCachedAnalysis,
    setCachedAnalysis
} from '../utils/fontCache';
import { canPerformAnalysis, incrementDailyAnalysisCount, isProfessional } from '../services/tierService';

declare var html2canvas: any;

interface AnalysisColumnProps {
    analysisResult: FontAnalysis | null;
    onAnalysisComplete: (result: FontAnalysis | null) => void;
    isSharedView?: boolean;
    onPreviewCaptured?: (previewBase64: string) => void;
    savedPreviewImage?: string | null;
}

const AnalysisColumn: React.FC<AnalysisColumnProps> = ({ analysisResult, onAnalysisComplete, isSharedView = false, onPreviewCaptured, savedPreviewImage }) => {
    const [mode, setMode] = useState<'upload' | 'google'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [googleFont, setGoogleFont] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fontPreviewRef = useRef<any>(null);
    const parsedFontRef = useRef<any>(null);
    const [previewImageBase64, setPreviewImageBase64] = useState<string | undefined>(undefined);
    const [isCachedResult, setIsCachedResult] = useState<boolean>(false);

    const [aiSentence, setAiSentence] = useState<string>("The quick brown fox jumps over the lazy dog.");
    const [isGeneratingSentence, setIsGeneratingSentence] = useState<boolean>(false);

    const [previewColors, setPreviewColors] = useState({ background: '#1A3431', text: '#EDF7F6' });

    const handleColorChange = (type: 'bg' | 'text', value: string) => {
        setPreviewColors(prev => ({ ...prev, [type === 'bg' ? 'background' : 'text']: value }));
    };

    const isFontFile = file?.type.includes('font') || file?.name.match(/\.(ttf|otf|woff|woff2)$/i);
    const canAnalyze = file || googleFont;

    const handleFileSelect = useCallback((selectedFile: File) => {
        onAnalysisComplete(null);
        setGoogleFont('');
        setFile(selectedFile);
        setError(null);
        if (selectedFile.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
            setIsGeneratingSentence(true);
            generateFunnySentence().then(setAiSentence).finally(() => setIsGeneratingSentence(false));
        }
    }, [onAnalysisComplete]);
    
    const handleGoogleFontChange = useCallback((fontName: string) => {
        onAnalysisComplete(null);
        setFile(null);
        setGoogleFont(fontName);
        setError(null);
    }, [onAnalysisComplete]);

    const handleFontParsed = useCallback((font: any) => { parsedFontRef.current = font; }, []);

    const handleAnalyzeClick = async () => {
        if (!canAnalyze) return;

        // Check daily limit for free users
        const analysisCheck = canPerformAnalysis();
        if (!analysisCheck.allowed) {
            setError(analysisCheck.message || "Daily limit reached.");
            return;
        }

        setIsLoading(true);
        setError(null);
        onAnalysisComplete(null);
        setIsCachedResult(false);

        try {
            // Generate cache key based on mode
            let cacheKey: string | null = null;

            if (mode === 'google' && googleFont) {
                // For Google Fonts, use font name
                cacheKey = generateGoogleFontCacheKey(googleFont);
            } else if (mode === 'upload' && file) {
                // For uploaded files, use file name + content sample
                const { base64: fileContent } = await fileToBase64(file);
                if (file.type.startsWith('image/')) {
                    // For images, use image cache key
                    cacheKey = generateImageCacheKey(fileContent);
                } else {
                    // For font files, use file cache key
                    cacheKey = generateFileCacheKey(file.name, fileContent);
                }
            }

            // Check cache if we have a key
            if (cacheKey) {
                const cachedResult = getCachedAnalysis(cacheKey);
                if (cachedResult) {
                    console.log('✅ Using cached analysis');
                    setIsCachedResult(true);
                    onAnalysisComplete(cachedResult);
                    setIsLoading(false);
                    return;
                }
            }

            // Not cached - proceed with analysis
            let elementToCapture = fontPreviewRef.current;
            if (fontPreviewRef.current && typeof fontPreviewRef.current.getCaptureElement === 'function') {
                elementToCapture = fontPreviewRef.current.getCaptureElement();
            }

            if (!elementToCapture) throw new Error("Preview element not found.");

            const canvas = await html2canvas(elementToCapture, { backgroundColor: previewColors.background });
            
            // Resize logic: Max width 1024px
            let finalCanvas = canvas;
            if (canvas.width > 1024) {
                const scale = 1024 / canvas.width;
                const newWidth = 1024;
                const newHeight = canvas.height * scale;
                
                const resizedCanvas = document.createElement('canvas');
                resizedCanvas.width = newWidth;
                resizedCanvas.height = newHeight;
                const ctx = resizedCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
                    finalCanvas = resizedCanvas;
                }
            }

            // Convert to JPEG with 0.8 quality for faster processing
            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            const mimeType = 'image/jpeg';

            // Save preview image for PDF export and glyph comparison
            setPreviewImageBase64(dataUrl);
            onPreviewCaptured?.(dataUrl);

            let fontMetadata: string | undefined = undefined;
            let fileName: string = 'font_preview.jpg';

            if (mode === 'upload' && isFontFile && parsedFontRef.current) {
                const font = parsedFontRef.current;
                const metadataParts: string[] = [];
                if (font.names.copyright?.en) metadataParts.push(`Copyright: ${font.names.copyright.en}`);
                if (font.names.license?.en) metadataParts.push(`License: ${font.names.license.en}`);
                if (font.names.designer?.en) metadataParts.push(`Designer: ${font.names.designer.en}`);
                fontMetadata = metadataParts.join(' | ');
                if(file) fileName = file.name;
            } else if (mode === 'upload' && file) {
                 fileName = file.name;
            } else if (mode === 'google' && googleFont) {
                 fileName = `${googleFont} (from Google Fonts)`;
            }

            const result = await analyzeFont(base64, mimeType, fileName, fontMetadata);

            // Determine font source based on current mode, file type, and AI analysis
            let fontSource: import('../types').FontSource = 'other';
            if (mode === 'google' && googleFont) {
                fontSource = 'google-fonts';
            } else if (mode === 'upload' && file) {
                if (file.type.startsWith('image/')) {
                    fontSource = 'image';
                } else if (isFontFile) {
                    // Comprehensive font source detection
                    const metadataLower = fontMetadata?.toLowerCase() || '';
                    const fileNameLower = file.name.toLowerCase();
                    const foundryLower = result.fontFoundry?.toLowerCase() || '';

                    // Check for various font sources based on metadata, filename, and foundry
                    if (metadataLower.includes('adobe') || fileNameLower.includes('adobe') || foundryLower.includes('adobe')) {
                        fontSource = 'adobe-fonts';
                    } else if (metadataLower.includes('indian type foundry') || foundryLower.includes('indian type foundry') || fileNameLower.includes('fontshare')) {
                        fontSource = 'fontshare';
                    } else if (metadataLower.includes('myfonts') || fileNameLower.includes('myfonts')) {
                        fontSource = 'myfonts';
                    } else if (metadataLower.includes('font squirrel') || fileNameLower.includes('fontsquirrel')) {
                        fontSource = 'font-squirrel';
                    } else if (metadataLower.includes('dafont') || fileNameLower.includes('dafont')) {
                        fontSource = 'dafont';
                    } else if (metadataLower.includes('fontesk') || fileNameLower.includes('fontesk')) {
                        fontSource = 'fontesk';
                    } else if (metadataLower.includes('velvetyne') || foundryLower.includes('velvetyne')) {
                        fontSource = 'velvetyne';
                    } else if (metadataLower.includes('league of moveable type') || foundryLower.includes('league of moveable type')) {
                        fontSource = 'league-of-moveable-type';
                    } else if (metadataLower.includes('northern block') || foundryLower.includes('northern block')) {
                        fontSource = 'the-northern-block';
                    } else if (metadataLower.includes('atipo') || foundryLower.includes('atipo')) {
                        fontSource = 'atipo';
                    } else if (metadataLower.includes('google') || foundryLower.includes('google')) {
                        fontSource = 'google-fonts';
                    } else {
                        fontSource = 'uploaded-file';
                    }
                }
            }

            // Add fontSource to result
            result.fontSource = fontSource;

            onAnalysisComplete(result);

            // Cache the result if we have a cache key and analysis was successful
            if (cacheKey && result.status === 'success') {
                setCachedAnalysis(cacheKey, result);
                console.log('💾 Cached analysis for future use');
            }

            // Save to history if analysis was successful
            if (result.status === 'success') {
                // Increment daily count for free users
                if (!isProfessional()) {
                    incrementDailyAnalysisCount();
                }

                // Create thumbnail (200px wide)
                const thumbnailCanvas = document.createElement('canvas');
                const thumbnailWidth = 200;
                const thumbnailHeight = (canvas.height / canvas.width) * thumbnailWidth;
                thumbnailCanvas.width = thumbnailWidth;
                thumbnailCanvas.height = thumbnailHeight;
                const thumbnailCtx = thumbnailCanvas.getContext('2d');
                if (thumbnailCtx) {
                    thumbnailCtx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight);
                    const thumbnailDataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.85);
                    saveToHistory(result, thumbnailDataUrl);
                }
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred during analysis. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
  
    const resetState = () => {
        setFile(null);
        setGoogleFont('');
        onAnalysisComplete(null);
        setError(null);
        setIsLoading(false);
        setIsCachedResult(false);
        parsedFontRef.current = null;
    };

    const renderMainContent = () => {
        if (isLoading) return <div role="status" className="w-full flex justify-center items-center h-full min-h-96"><Loader /></div>;
        if (analysisResult) return <AnalysisResult result={analysisResult} onReset={resetState} isSharedView={isSharedView} previewImageBase64={previewImageBase64} isCached={isCachedResult} />;
        
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-96">
                {!isSharedView && (
                    <div className="flex w-full justify-center mb-6 border-b border-border">
                        <button onClick={() => setMode('upload')} className={`px-6 py-2 text-sm font-semibold transition-colors ${mode === 'upload' ? 'text-accent border-b-2 border-accent' : 'text-secondary hover:text-text-dark'}`}>Upload File</button>
                        <button onClick={() => setMode('google')} className={`px-6 py-2 text-sm font-semibold transition-colors ${mode === 'google' ? 'text-accent border-b-2 border-accent' : 'text-secondary hover:text-text-dark'}`}>Google Font</button>
                    </div>
                )}
                
                {mode === 'upload' ? (
                     <FileUpload onFileSelect={handleFileSelect} file={file} />
                ) : (
                     <GoogleFontSearch value={googleFont} onChange={handleGoogleFontChange} />
                )}

                <div className="mt-6 flex justify-center">
                    <button onClick={handleAnalyzeClick} disabled={!canAnalyze || isLoading} className="px-8 py-3 bg-accent text-surface font-bold rounded-lg hover:opacity-90 disabled:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-opacity-75">
                        {isLoading ? 'Analyzing...' : 'Analyze Font'}
                    </button>
                </div>
                {error && <div role="alert" aria-live="assertive" className="mt-4 text-center text-text-light bg-danger/80 p-4 rounded-lg w-full">{error}</div>}
            </div>
        );
    }
  
    const renderPreviewContent = () => {
        // If we have no live file/font but we have a saved preview (History mode), show it
        if (!file && !googleFont && savedPreviewImage && analysisResult) {
            return (
                <div className="w-full h-full min-h-[400px] p-6 border border-dashed border-white/10 rounded-lg bg-[#1A3431] flex flex-col justify-center items-center text-center relative overflow-hidden group">
                    {/* Watermark Badge */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 z-10">
                        <span className="text-xs font-medium text-white/80 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Static Snapshot
                        </span>
                    </div>
                    {/* The Image */}
                    <img
                        src={savedPreviewImage}
                        alt="Saved Analysis Preview"
                        className="w-full max-w-md h-auto rounded shadow-lg opacity-80 transition-opacity group-hover:opacity-100"
                    />
                    {/* The Disclaimer Card */}
                    <div className="mt-6 p-4 bg-black/30 rounded-lg border border-white/5 max-w-sm backdrop-blur-sm">
                        <p className="text-[#FF8E24] text-xs font-bold uppercase tracking-wide mb-1">
                            Functionality Limited
                        </p>
                        <p className="text-[#F5F2EB]/80 text-xs leading-relaxed">
                            This is a low-resolution reference image. Heavy font files are not stored in History to protect your browser storage.
                        </p>
                        <p className="text-[#F5F2EB] text-xs font-semibold mt-2 border-t border-white/10 pt-2">
                            To use the Live Type Tester, please re-upload the font file.
                        </p>
                    </div>
                </div>
            );
        }

        if (mode === 'upload' && file?.type.startsWith('image/')) {
            return (
                <div className="w-full h-full p-4 border border-dashed border-border rounded-lg bg-background/50 flex flex-col justify-center items-center">
                    <h3 className="font-semibold text-text-dark mb-2 self-start">Image Preview</h3>
                    <img src={URL.createObjectURL(file)} alt="Font preview" className="max-w-full max-h-96 rounded-md object-contain mx-auto" />
                </div>
            );
        }
        
        if (canAnalyze || analysisResult) {
            return <FontPreview 
                ref={!analysisResult ? fontPreviewRef : null} 
                file={file}
                googleFontName={googleFont}
                initialSentence={aiSentence} 
                isGeneratingSentence={isGeneratingSentence} 
                onFontParsed={handleFontParsed}
                backgroundColor={previewColors.background}
                textColor={previewColors.text}
                onColorChange={handleColorChange}
            />;
        }

        return (
            <div className="w-full h-full p-4 border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center bg-background/50 min-h-96">
                <h3 className="font-semibold text-text-dark mb-2">Preview</h3>
                <p className="text-text-secondary">Your font or image preview will appear here.</p>
            </div>
        );
    }

    const showPreview = canAnalyze || analysisResult;

    return (
        <div className="flex flex-col gap-8 w-full">
            <div className="teal-card-raised p-6 w-full flex flex-col justify-center">
                {renderMainContent()}
            </div>
            {showPreview && (
                <div className="teal-card-raised p-6 w-full">
                    {renderPreviewContent()}
                </div>
            )}
        </div>
    );
};

export default AnalysisColumn;
