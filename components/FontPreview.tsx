import React, { useState, useEffect, forwardRef, useLayoutEffect, useRef } from 'react';
import type { VariableAxis } from '../types';
import { getAxisDescription } from '../utils/fontUtils';
import { TooltipInfoIcon, LineChartIcon } from './Icons';

declare var opentype: any;

interface FontPreviewProps {
  file: File | null;
  googleFontName?: string;
  initialSentence: string;
  isGeneratingSentence: boolean;
  onFontParsed: (font: any) => void;
  backgroundColor: string;
  textColor: string;
  onColorChange: (type: 'bg' | 'text', value: string) => void;
}

const FontPreview = forwardRef<HTMLDivElement, FontPreviewProps>(({ file, googleFontName, initialSentence, isGeneratingSentence, onFontParsed, backgroundColor, textColor, onColorChange }, ref) => {
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState(initialSentence);
  const [isGoogleFontLoading, setIsGoogleFontLoading] = useState<boolean>(false);
  
  const [lineHeight, setLineHeight] = useState(1.1);
  const [letterSpacing, setLetterSpacing] = useState(0);

  const [weightAxis, setWeightAxis] = useState<VariableAxis | null>(null);
  const [variableAxes, setVariableAxes] = useState<VariableAxis[]>([]);
  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  
  const [parsedFont, setParsedFont] = useState<any>(null);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);
  const [metricLines, setMetricLines] = useState<Record<string, number>>({});

  const charSetContainerRef = useRef<HTMLDivElement>(null);
  const upperCaseRef = useRef<HTMLParagraphElement>(null);
  const lowerCaseRef = useRef<HTMLParagraphElement>(null);
  const symbolsRef = useRef<HTMLParagraphElement>(null);
  const metricsTargetRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { setPreviewText(initialSentence); }, [initialSentence]);

  const resetState = () => {
    setError(null);
    setFontFamily(null);
    setWeightAxis(null);
    setVariableAxes([]);
    setAxisValues({});
    setParsedFont(null);
    setShowMetrics(false);
    setIsGoogleFontLoading(false);
  };

  useEffect(() => {
    resetState();

    if (googleFontName) {
        const loadFont = async () => {
            setIsGoogleFontLoading(true);
            try {
                const sanitizedFontName = googleFontName.replace(/ /g, '+');
                const fontUrl = `https://fonts.googleapis.com/css2?family=${sanitizedFontName}:ital,wght@0,100..900;1,100..900&display=swap`;

                if (!document.querySelector(`link[href="${fontUrl}"]`)) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = fontUrl;
                    
                    const promise = new Promise((resolve, reject) => {
                        link.onload = resolve;
                        link.onerror = () => reject(new Error('Failed to load font stylesheet.'));
                    });

                    document.head.appendChild(link);
                    await promise;
                }
                
                await document.fonts.load(`1em "${googleFontName}"`);
                
                if (document.fonts.check(`1em "${googleFontName}"`)) {
                    setFontFamily(`'${googleFontName}', sans-serif`);
                } else {
                    throw new Error(`Font "${googleFontName}" could not be activated after loading. It might not exist on Google Fonts.`);
                }
            } catch (err) {
                console.error("Failed to load Google Font:", err);
                setError(`Could not load Google Font: "${googleFontName}". Please check the name and your network connection.`);
            } finally {
                setIsGoogleFontLoading(false);
            }
        };
        loadFont();
    } else if (file) {
        const uniqueFontFamily = `font-preview-${Date.now()}`;
        const reader = new FileReader();
        const style = document.createElement('style');
        let objectUrl: string | null = null;
        
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            setError("Could not read the font file.");
            return;
          }
          try {
            const font = opentype.parse(arrayBuffer);
            onFontParsed(font);
            setParsedFont(font);

            if (font.tables.fvar && font.tables.fvar.axes) {
                const allAxes: VariableAxis[] = font.tables.fvar.axes;
                const wghtAxis = allAxes.find(axis => axis.tag === 'wght');
                const otherAxes = allAxes.filter(axis => axis.tag !== 'wght');
                setWeightAxis(wghtAxis || null);
                setVariableAxes(otherAxes);

                const initialValues: Record<string, number> = {};
                allAxes.forEach(axis => { initialValues[axis.tag] = axis.defaultValue; });
                setAxisValues(initialValues);
            }
          } catch (err) { console.warn("Could not parse font file.", err); }
          
          const blob = new Blob([arrayBuffer], { type: file.type });
          objectUrl = URL.createObjectURL(blob);

          style.textContent = `@font-face { font-family: '${uniqueFontFamily}'; src: url('${objectUrl}'); }`;
          document.head.appendChild(style);
          setFontFamily(uniqueFontFamily);
        };
        
        reader.onerror = () => setError("Could not load the font file.");
        reader.readAsArrayBuffer(file);

        return () => {
          if (style.parentNode) {
            document.head.removeChild(style);
          }
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        }
    } else {
        setFontFamily(null);
    }
}, [file, googleFontName, onFontParsed]);


  useLayoutEffect(() => {
    const container = charSetContainerRef.current;
    if (!container) return;
    const adjustFontSizes = () => {
        requestAnimationFrame(() => {
            if (!container) return;
            const containerWidth = container.clientWidth;
            if (containerWidth === 0) return;
            [upperCaseRef.current, lowerCaseRef.current, symbolsRef.current, metricsTargetRef.current].forEach(el => {
                if (!el) return;
                el.style.whiteSpace = 'nowrap';
                el.style.fontSize = '100px';
                if (el.scrollWidth > 0) {
                    const ideal = (containerWidth / el.scrollWidth) * 100;
                    el.style.fontSize = `${Math.max(10, Math.min(ideal, 120))}px`;
                    el.style.lineHeight = '1.2';
                }
                el.style.whiteSpace = 'normal';
            });
        });
    };
    const observer = new ResizeObserver(adjustFontSizes);
    observer.observe(container);
    adjustFontSizes();
    return () => observer.disconnect();
  }, [fontFamily]);

  useLayoutEffect(() => {
    if (showMetrics && parsedFont && metricsTargetRef.current) {
        const el = metricsTargetRef.current;
        const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
        const scale = fontSize / parsedFont.unitsPerEm;
        setMetricLines({
            ascender: (parsedFont.ascender * scale),
            capHeight: (parsedFont.tables.os2.sCapHeight * scale),
            xHeight: (parsedFont.tables.os2.sxHeight * scale),
            descender: (parsedFont.descender * scale),
        });
    }
  }, [showMetrics, parsedFont, fontFamily]);

  const handleAxisChange = (tag: string, value: number) => setAxisValues(prev => ({ ...prev, [tag]: value }));
  const handleResetControls = () => {
    setLineHeight(1.1);
    setLetterSpacing(0);
    const initialValues: Record<string, number> = {};
    if (weightAxis) initialValues[weightAxis.tag] = weightAxis.defaultValue;
    variableAxes.forEach(axis => { initialValues[axis.tag] = axis.defaultValue; });
    setAxisValues(initialValues);
  };
  
  if (isGoogleFontLoading) return <div className="flex items-center justify-center h-full min-h-[200px] text-secondary">Loading Google Font "{googleFontName}"...</div>;
  if (error) return <div className="flex items-center justify-center h-full text-danger p-4 text-center">{error}</div>;
  if (!fontFamily) return <div className="flex items-center justify-center h-full">Loading font preview...</div>;

  const fontVariationSettings = Object.entries(axisValues).map(([tag, value]) => `'${tag}' ${value}`).join(', ');
  const sampleStyle: React.CSSProperties = { fontFamily, fontVariationSettings, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', color: textColor };

  return (
    <div ref={ref} style={{ backgroundColor }} className="text-primary p-4 rounded-lg space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="text-lg font-bold text-accent">Font Preview</h3>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <label htmlFor="bg-color" className="text-xs text-secondary">BG</label>
                    <input id="bg-color" type="color" value={backgroundColor} onChange={e => onColorChange('bg', e.target.value)} className="w-6 h-6 bg-transparent border-none rounded cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="text-color" className="text-xs text-secondary">Text</label>
                    <input id="text-color" type="color" value={textColor} onChange={e => onColorChange('text', e.target.value)} className="w-6 h-6 bg-transparent border-none rounded cursor-pointer" />
                </div>
            </div>
        </div>
        
        <div className="relative">
             <label htmlFor="preview-text-input" className="text-sm font-semibold text-secondary">Custom Preview Text</label>
             <textarea id="preview-text-input" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Type your own preview text..."
                className="mt-2 w-full bg-surface border border-border rounded-md p-2 text-primary focus:ring-2 focus:ring-accent focus:border-accent transition resize-none" rows={2} style={{ color: textColor, backgroundColor: 'var(--surface-color)' }}/>
            {isGeneratingSentence && (<div role="status" aria-live="polite" className="absolute bottom-2 right-2 text-xs text-secondary animate-pulse">Generating sentence...</div>)}
        </div>

        <div className="border-t border-b border-border py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <label htmlFor="line-height-slider" className="flex justify-between text-sm font-semibold text-secondary"><span>Line Height</span><span className="font-mono text-accent">{lineHeight.toFixed(2)}</span></label>
                    <input id="line-height-slider" type="range" min="0.8" max="3" step="0.05" value={lineHeight} onChange={(e) => setLineHeight(parseFloat(e.target.value))} className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent" aria-label="Adjust line height"/>
                </div>
                <div>
                    <label htmlFor="letter-spacing-slider" className="flex justify-between text-sm font-semibold text-secondary"><span>Letter Spacing</span><span className="font-mono text-accent">{letterSpacing.toFixed(3)} em</span></label>
                    <input id="letter-spacing-slider" type="range" min="-0.1" max="0.5" step="0.005" value={letterSpacing} onChange={(e) => setLetterSpacing(parseFloat(e.target.value))} className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent" aria-label="Adjust letter spacing" />
                </div>
            </div>
            {parsedFont && (
                <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {weightAxis && (
                            <div className="md:col-span-2">
                                <label htmlFor="weight-slider" className="flex justify-between text-sm font-semibold text-secondary"><span>Weight</span><span className="font-mono text-accent">{axisValues[weightAxis.tag]}</span></label>
                                <input id="weight-slider" type="range" min={weightAxis.minValue} max={weightAxis.maxValue} step="1" value={axisValues[weightAxis.tag] || weightAxis.defaultValue} onChange={(e) => handleAxisChange(weightAxis.tag, parseFloat(e.target.value))} className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent mt-1" aria-label="Adjust font weight"/>
                            </div>
                        )}
                        {variableAxes.map(axis => (
                            <div key={axis.tag}>
                                <label htmlFor={`${axis.tag}-slider`} className="flex justify-between items-center text-sm font-semibold text-secondary">
                                    <div className="flex items-center gap-1.5">
                                        <span>{axis.name}</span>
                                        <div className="relative group flex items-center">
                                            <TooltipInfoIcon tabIndex={0} className="w-4 h-4 text-secondary/70 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full" aria-label={`More info about ${axis.name}`} />
                                            <div role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs bg-background border border-border text-primary rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-opacity duration-300 pointer-events-none z-10">{getAxisDescription(axis.tag)}</div>
                                        </div>
                                    </div>
                                    <span className="font-mono text-accent">{axisValues[axis.tag]}</span>
                                </label>
                                <input id={`${axis.tag}-slider`} type="range" min={axis.minValue} max={axis.maxValue} step="1" value={axisValues[axis.tag] || axis.defaultValue} onChange={(e) => handleAxisChange(axis.tag, parseFloat(e.target.value))} className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent mt-1" aria-label={`Adjust ${axis.name}`}/>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-4 mt-4">
                        <button onClick={() => setShowMetrics(!showMetrics)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${showMetrics ? 'bg-accent/30 text-accent' : 'bg-secondary/50 text-primary'} hover:bg-secondary/70`}><LineChartIcon className="w-4 h-4"/>Metrics</button>
                        {(weightAxis || variableAxes.length > 0) && <button onClick={handleResetControls} className="px-4 py-2 text-xs bg-secondary/50 text-primary font-semibold rounded-lg hover:bg-secondary/70 transition-colors">Reset Controls</button>}
                    </div>
                </div>
            )}
        </div>
        
        <div style={sampleStyle} className="break-words pt-4">
            <p style={{ fontSize: 'clamp(2rem, 8vw, 4rem)', lineHeight, letterSpacing: `${letterSpacing}em` }} className="mb-6 overflow-hidden break-words">{previewText}</p>
            <div ref={charSetContainerRef} className="space-y-2 text-secondary break-all">
                <div className="relative">
                    {showMetrics && parsedFont && <div className="absolute inset-0 z-10 overflow-hidden">
                        <div className="absolute w-full border-b border-dashed border-cyan-400/50" style={{ top: `calc(50% - ${metricLines.ascender || 0}px)` }}><span className="text-xs text-cyan-400/80 bg-background/50 px-1">Ascender</span></div>
                        <div className="absolute w-full border-b border-dashed border-green-400/50" style={{ top: `calc(50% - ${metricLines.capHeight || 0}px)` }}><span className="text-xs text-green-400/80 bg-background/50 px-1">Cap Height</span></div>
                        <div className="absolute w-full border-b border-dashed border-yellow-400/50" style={{ top: `calc(50% - ${metricLines.xHeight || 0}px)` }}><span className="text-xs text-yellow-400/80 bg-background/50 px-1">x-Height</span></div>
                        <div className="absolute w-full border-b border-dashed border-red-400/50" style={{ top: '50%' }}><span className="text-xs text-red-400/80 bg-background/50 px-1">Baseline</span></div>
                        <div className="absolute w-full border-b border-dashed border-purple-400/50" style={{ top: `calc(50% - ${metricLines.descender || 0}px)` }}><span className="text-xs text-purple-400/80 bg-background/50 px-1">Descender</span></div>
                    </div>}
                    <p ref={metricsTargetRef}>Abc Xyz</p>
                </div>
                <p ref={upperCaseRef}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p ref={lowerCaseRef}>abcdefghijklmnopqrstuvwxyz</p>
                <p ref={symbolsRef}>0123456789 `!@#$%^&amp;*()_+-=[]\{}|;':",./&lt;&gt;?</p>
            </div>
        </div>
    </div>
  );
});

export default FontPreview;