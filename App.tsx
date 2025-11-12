import React, { useState, useEffect, useRef } from 'react';
import { CadmusLogoIcon, SparklesIcon, HistoryIcon, SettingsIcon } from './components/Icons';
import AnalysisColumn from './components/AnalysisColumn';
import type { FontAnalysis, PairingCritique, GlyphComparisonResult, AIMode } from './types';
import { critiqueFontPairing, compareGlyphs } from './services/geminiService';
import PairingCritiqueModal from './components/PairingCritiqueModal';
import HistoryPanel from './components/HistoryPanel';
import GlyphComparisonModal from './components/GlyphComparisonModal';
import SettingsModal from './components/SettingsModal';
import LicenseKeyScreen from './components/LicenseKeyScreen';
import FontSuggestionView from './components/FontSuggestionView';
import OnboardingTour from './components/OnboardingTour';
import PaperTexture from './components/PaperTexture';
import { getAIMode, setAIMode, getAPIKey, validateAIMode, isChromeAIAvailable } from './utils/aiSettings';
import { checkActivationStatus } from './services/licenseService';

type ViewMode = 'comparison' | 'suggestions';


const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  const [sharedAnalysis, setSharedAnalysis] = useState<FontAnalysis | null>(null);
  const [leftAnalysis, setLeftAnalysis] = useState<FontAnalysis | null>(null);
  const [rightAnalysis, setRightAnalysis] = useState<FontAnalysis | null>(null);
  const [critique, setCritique] = useState<PairingCritique | null>(null);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [glyphComparison, setGlyphComparison] = useState<GlyphComparisonResult | null>(null);
  const [isComparingGlyphs, setIsComparingGlyphs] = useState(false);
  const [leftPreviewImage, setLeftPreviewImage] = useState<string | null>(null);
  const [rightPreviewImage, setRightPreviewImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiMode, setAiModeState] = useState<AIMode>('cloud');
  const [chromeAIAvailable, setChromeAIAvailable] = useState(false);
  const [hasAPIKey, setHasAPIKey] = useState(false);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check license on mount
  useEffect(() => {
    const checkLicense = async () => {
      setIsCheckingLicense(true);
      try {
        const result = await checkActivationStatus();
        setIsLicenseValid(result.valid);
      } catch (error) {
        console.error('License check failed:', error);
        setIsLicenseValid(false);
      } finally {
        setIsCheckingLicense(false);
      }
    };

    checkLicense();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        try {
          const decodedJson = atob(hash);
          const data = JSON.parse(decodedJson);
          setSharedAnalysis(data as FontAnalysis);
        } catch (e) {
          console.error("Failed to parse shared data from URL", e);
          window.location.hash = ''; // Clear invalid hash
        }
      } else {
        setSharedAnalysis(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check hash on initial load

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Initialize AI mode and check availability
  useEffect(() => {
    const initAISettings = async () => {
      // Check Chrome AI availability
      const chromeAvailable = await isChromeAIAvailable();
      setChromeAIAvailable(chromeAvailable);

      // Load saved AI mode
      const savedMode = await getAIMode();
      setAiModeState(savedMode);

      // Check if API key exists
      const apiKey = getAPIKey();
      setHasAPIKey(!!apiKey);
    };

    initAISettings();
  }, []);

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompleted = localStorage.getItem('onboarding_completed');
    if (!hasCompleted && isLicenseValid) {
      // Delay slightly to ensure DOM is ready
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, [isLicenseValid]);

  const handleToggleAIMode = async () => {
    const newMode: AIMode = aiMode === 'chrome' ? 'cloud' : 'chrome';

    // Validate the new mode
    const validation = await validateAIMode(newMode);
    if (!validation.valid) {
      // If Chrome AI fails, auto-fallback to Cloud AI
      if (validation.shouldFallback && newMode === 'chrome') {
        alert('Chrome AI is experimental and not available on your system. Using Cloud AI instead.');
        // Stay on cloud mode
        return;
      }

      // For Cloud AI, show settings to add API key
      alert(validation.error);
      if (newMode === 'cloud') {
        setShowSettings(true);
      }
      return;
    }

    // Mode is valid, switch to it
    setAiModeState(newMode);
    setAIMode(newMode);
  };
  
  const resetToComparisonView = () => {
      window.location.hash = '';
      setSharedAnalysis(null);
  }
  
  const handleCritique = async () => {
      if (!leftAnalysis || !rightAnalysis) return;
      setIsCritiquing(true);
      setCritique(null);
      setCritiqueError(null);
      try {
          const result = await critiqueFontPairing(leftAnalysis, rightAnalysis);
          setCritique(result);
      } catch (e) {
          console.error("Critique failed:", e);
          setCritiqueError("The AI critique failed. Please try again.");
          setTimeout(() => setCritiqueError(null), 4000);
      } finally {
          setIsCritiquing(false);
      }
  };

  const handleLoadFromHistory = (analysis: FontAnalysis) => {
    setLeftAnalysis(analysis);
  };

  const handleGlyphComparison = async () => {
    if (!leftAnalysis || !rightAnalysis || !leftPreviewImage || !rightPreviewImage) return;
    setIsComparingGlyphs(true);
    setGlyphComparison(null);
    try {
      const result = await compareGlyphs(
        leftPreviewImage,
        rightPreviewImage,
        leftAnalysis.fontName,
        rightAnalysis.fontName
      );
      setGlyphComparison(result);
    } catch (e) {
      console.error("Glyph comparison failed:", e);
    } finally {
      setIsComparingGlyphs(false);
    }
  };

  const handleLicenseValidated = () => {
    setIsLicenseValid(true);
  };

  const handleAnalyzeFontFromSuggestions = (fontName: string) => {
    // Switch to comparison view - user can then select the font from Google Fonts dropdown
    setViewMode('comparison');
    // TODO: Could enhance this to auto-select the font in the Google Fonts dropdown
    console.log(`Suggested font to analyze: ${fontName}`);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // Show loading screen while checking license
  if (isCheckingLicense) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <CadmusLogoIcon className="h-16 w-16 text-accent mx-auto mb-4 animate-pulse" />
          <p className="text-secondary">Checking license...</p>
        </div>
      </div>
    );
  }

  // Show license screen if license is invalid
  if (!isLicenseValid) {
    return <LicenseKeyScreen onLicenseValidated={handleLicenseValidated} />;
  }

  // Main app (only shown if license is valid)
  return (
    <div className="min-h-screen bg-background text-text-dark flex flex-col font-sans">
      {/* SVG Filters for paper texture */}
      <PaperTexture />

      <header className="w-full px-6 paper-texture-bg border-b-2" style={{ borderBottomColor: 'rgba(107, 93, 79, 0.3)', height: '100px' }}>
        <div className="container mx-auto flex justify-between items-center gap-6 h-full">
          {/* Left: Logo with embossed effect */}
          <div className="flex items-center">
            <CadmusLogoIcon aria-hidden="true" className="w-auto icon-embossed" style={{ color: '#8B7355', height: '150px' }} />
          </div>

          {/* Center: AI Mode Toggle with paper inset effect */}
          <div className="flex items-center gap-3 ai-toggle-inset rounded-lg p-3">
            {/* Cloud AI - Primary Option */}
            <button
              onClick={handleToggleAIMode}
              disabled={aiMode === 'cloud' && !hasAPIKey}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-md transition-all duration-200 ${
                aiMode === 'cloud'
                  ? 'button-inset-active'
                  : 'button-inset'
              } ${aiMode === 'cloud' && !hasAPIKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={aiMode === 'cloud' && !hasAPIKey ? 'Add API key in settings' : 'Switch to Cloud AI'}
              style={{
                color: aiMode === 'cloud' ? '#3d3226' : '#6b5d4f',
                fontWeight: aiMode === 'cloud' ? '700' : '600'
              }}
            >
              <span className="text-sm">Cloud AI</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                aiMode === 'cloud' ? 'paper-accent-bg text-primary' : 'bg-black/15'
              }`}>
                {hasAPIKey ? 'Recommended' : 'Setup'}
              </span>
            </button>

            <div className="w-px h-8 bg-black/15"></div>

            {/* Chrome AI - Experimental Option */}
            <button
              onClick={handleToggleAIMode}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-md transition-all duration-200 ${
                aiMode === 'chrome'
                  ? 'button-inset-active'
                  : 'button-inset'
              }`}
              title={!chromeAIAvailable ? 'Chrome AI is experimental and not available' : 'Switch to Chrome AI (Experimental)'}
              style={{
                color: aiMode === 'chrome' ? '#3d3226' : '#6b5d4f',
                fontWeight: aiMode === 'chrome' ? '700' : '600'
              }}
            >
              <span className="text-sm">Chrome AI</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                aiMode === 'chrome' ? 'paper-accent-bg text-primary' : 'bg-black/15'
              }`}>
                Beta
              </span>
            </button>
          </div>

          {/* Right: Action Buttons with paper inset effect */}
          <div className="flex items-center gap-3">
            <button
              data-tour="find-fonts-button"
              onClick={() => setViewMode(viewMode === 'comparison' ? 'suggestions' : 'comparison')}
              className={`px-5 py-2.5 rounded-md font-semibold transition-all duration-200 ${
                viewMode === 'suggestions'
                  ? 'button-inset-active'
                  : 'button-inset'
              }`}
              aria-label="Toggle view mode"
              style={{
                color: viewMode === 'suggestions' ? '#3d3226' : '#6b5d4f'
              }}
            >
              <span className="text-sm">
                {viewMode === 'suggestions' ? 'Compare Fonts' : 'Find Fonts'}
              </span>
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="button-inset p-2.5 rounded-md transition-all duration-200 flex items-center gap-2"
              aria-label="View history"
              style={{ color: '#6b5d4f' }}
            >
              <HistoryIcon className="h-6 w-6 icon-embossed" style={{ color: '#8B7355' }} />
              <span className="hidden sm:inline text-sm font-semibold">History</span>
            </button>
            <button
              data-tour="settings-button"
              onClick={() => setShowSettings(true)}
              className="button-inset p-2.5 rounded-md transition-all duration-200"
              aria-label="Settings"
            >
              <SettingsIcon className="h-6 w-6 icon-embossed" style={{ color: '#8B7355' }} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
        {viewMode === 'suggestions' ? (
          <FontSuggestionView onAnalyzeFont={handleAnalyzeFontFromSuggestions} />
        ) : sharedAnalysis ? (
          <div className="w-full max-w-4xl">
             <div className="mb-4 text-center">
                <p className="text-secondary">You are viewing a shared analysis.</p>
                <button onClick={resetToComparisonView} className="text-accent font-semibold hover:underline">Return to Comparison View</button>
            </div>
            <AnalysisColumn key="shared" analysisResult={sharedAnalysis} onAnalysisComplete={() => {}} isSharedView={true} />
          </div>
        ) : (
          <div className="w-full max-w-7xl">
            <p className="text-center text-lg text-light-secondary mb-8 max-w-4xl mx-auto">
              Upload a font file or an image of text in each column to get a side-by-side AI-powered analysis of the typefaces.
            </p>
            <div data-tour="comparison-area" className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 w-full relative">
                <div data-tour="analysis-column">
                  <AnalysisColumn key="left" analysisResult={leftAnalysis} onAnalysisComplete={setLeftAnalysis} onPreviewCaptured={setLeftPreviewImage} />
                </div>
                <AnalysisColumn key="right" analysisResult={rightAnalysis} onAnalysisComplete={setRightAnalysis} onPreviewCaptured={setRightPreviewImage} />

                {leftAnalysis && rightAnalysis && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
                        <button
                            onClick={handleCritique}
                            disabled={isCritiquing}
                            className="px-6 py-3 bg-accent text-surface font-bold rounded-full hover:opacity-90 disabled:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-accent flex items-center gap-2"
                        >
                            <SparklesIcon className={`w-5 h-5 ${isCritiquing ? 'animate-spin' : ''}`} />
                            {isCritiquing ? 'Critiquing...' : 'Critique Pairing'}
                        </button>
                        <button
                            onClick={handleGlyphComparison}
                            disabled={isComparingGlyphs || !leftPreviewImage || !rightPreviewImage}
                            className="px-6 py-3 bg-secondary text-primary font-bold rounded-full hover:bg-secondary/80 disabled:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-secondary flex items-center gap-2"
                        >
                            <SparklesIcon className={`w-5 h-5 ${isComparingGlyphs ? 'animate-spin' : ''}`} />
                            {isComparingGlyphs ? 'Comparing...' : 'Compare Glyphs'}
                        </button>
                        {critiqueError && <p className="text-xs bg-danger text-primary p-2 rounded-md">{critiqueError}</p>}
                    </div>
                )}
            </div>
          </div>
        )}
      </main>
      
      {critique && <PairingCritiqueModal critique={critique} onClose={() => setCritique(null)} font1Name={leftAnalysis?.fontName} font2Name={rightAnalysis?.fontName} />}

      {glyphComparison && (
        <GlyphComparisonModal
          comparison={glyphComparison}
          onClose={() => setGlyphComparison(null)}
          font1Name={leftAnalysis?.fontName || 'Font 1'}
          font2Name={rightAnalysis?.fontName || 'Font 2'}
        />
      )}

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadAnalysis={handleLoadFromHistory}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // Refresh AI settings after closing settings
          const initAISettings = async () => {
            const chromeAvailable = await isChromeAIAvailable();
            setChromeAIAvailable(chromeAvailable);
            const apiKey = getAPIKey();
            setHasAPIKey(!!apiKey);
          };
          initAISettings();
        }}
        onRestartTour={() => {
          setShowSettings(false);
          localStorage.removeItem('onboarding_completed');
          setTimeout(() => setShowOnboarding(true), 300);
        }}
      />

      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      <footer className="w-full p-4 text-center text-secondary/70 text-sm border-t border-border">
        Powered by Google Gemini
      </footer>
    </div>
  );
};

export default App;
