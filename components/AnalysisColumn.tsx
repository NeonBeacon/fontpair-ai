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

declare var html2canvas: any;

interface AnalysisColumnProps {
    analysisResult: FontAnalysis | null;
    onAnalysisComplete: (result: FontAnalysis | null) => void;
    isSharedView?: boolean;
    onPreviewCaptured?: (previewBase64: string) => void;
}

const AnalysisColumn: React.FC<AnalysisColumnProps> = ({ analysisResult, onAnalysisComplete, isSharedView = false, onPreviewCaptured }) => {
    const [mode, setMode] = useState<'upload' | 'google'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [googleFont, setGoogleFont] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fontPreviewRef = useRef<HTMLDivElement>(null);
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
            if (!fontPreviewRef.current) throw new Error("Preview element not found.");

            const canvas = await html2canvas(fontPreviewRef.current, { backgroundColor: previewColors.background });
            // Convert to JPEG with 0.85 quality for faster processing
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
            onAnalysisComplete(result);

            // Cache the result if we have a cache key and analysis was successful
            if (cacheKey && result.status === 'success') {
                setCachedAnalysis(cacheKey, result);
                console.log('💾 Cached analysis for future use');
            }

            // Save to history if analysis was successful
            if (result.status === 'success') {
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
