import React, { useState, useEffect, useRef } from 'react';
import { CadmusLogoIcon, SparklesIcon, HistoryIcon, SettingsIcon, LockIcon } from './components/Icons';
import AnalysisColumn from './components/AnalysisColumn';
import type { FontAnalysis, PairingCritique, GlyphComparisonResult, AIMode, Project } from './types';
import { critiqueFontPairing, compareGlyphs } from './services/geminiService';
import PairingCritiqueModal from './components/PairingCritiqueModal';
import HistoryPanel from './components/HistoryPanel';
import GlyphComparisonModal from './components/GlyphComparisonModal';
import SettingsModal from './components/SettingsModal';
import LicenseKeyScreen from './components/LicenseKeyScreen';
import FontSuggestionView from './components/FontSuggestionView';
import OnboardingTour from './components/OnboardingTour';
import PaperTexture from './components/PaperTexture';
import ProjectPanel from './components/ProjectPanel';
import TypeScaleBuilder from './components/TypeScaleBuilder';
import BatchCompatibilityMatrix from './components/BatchCompatibilityMatrix';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import LockedFeatureOverlay from './components/LockedFeatureOverlay';
import UpgradePrompt from './components/UpgradePrompt';
import QuickAnalysisModal from './components/QuickAnalysisModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getAIMode, setAIMode, getAPIKey, validateAIMode, isChromeAIAvailable } from './utils/aiSettings';
import { checkActivationStatus } from './services/licenseService';
import { getSession, supabase } from './services/authService';
import { getHistory } from './historyService';
import { getUserTier, setUserTier, isProfessional, canPerformAnalysis, canPerformCritique, incrementLifetimeCritiqueCount, hasUsedFreeCritique, type UserTier } from './services/tierService';

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
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiMode, setAiModeState] = useState<AIMode>('cloud');
  const [chromeAIAvailable, setChromeAIAvailable] = useState(false);
  const [hasAPIKey, setHasAPIKey] = useState(false);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showTypeScale, setShowTypeScale] = useState(false);
  const [showBatchMatrix, setShowBatchMatrix] = useState(false);
  
  // Quick Analysis State
  const [quickAnalysisFont, setQuickAnalysisFont] = useState<string | null>(null);

  // Find Fonts state persistence
  const [findFontsState, setFindFontsState] = useState<{
    description: string;
    selectedUsageTypes: string[];
    selectedBusinessTypes: string[];
    selectedThemes: string[];
    selectedFontCategories: string[];
    results: import('./types').FontSuggestionResult | null;
  }>({
    description: '',
    selectedUsageTypes: [],
    selectedBusinessTypes: [],
    selectedThemes: [],
    selectedFontCategories: [],
    results: null,
  });
  
  // Tier State
  const [userTier, setUserTierState] = useState<UserTier>(getUserTier());
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');

  const checkFeatureAccess = (feature: string): boolean => {
    if (isProfessional()) return true;
    setUpgradeFeature(feature);
    setShowUpgradePrompt(true);
    return false;
  };

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onToggleHelp: () => setShowShortcuts(prev => !prev),
    onOpenSettings: () => setShowSettings(true),
    onToggleProjects: () => setShowProjects(prev => !prev),
    onFindFonts: () => setViewMode('suggestions'),
    onRestartTour: () => setShowOnboarding(true),
    onCloseModal: () => {
      setShowSettings(false);
      setShowHistory(false);
      setShowProjects(false);
      setShowShortcuts(false);
      setShowTypeScale(false);
      setShowBatchMatrix(false);
      setShowUpgradePrompt(false);
      setCritique(null);
      setGlyphComparison(null);
    }
  });

  // Consolidated Authentication & License Check on mount
  useEffect(() => {
    let mounted = true;

    const handleAuthAndLicenseCheck = async () => {
      if (!mounted) return;
      
      setIsCheckingLicense(true);
      
      try {
        // STEP 1: Check for PKCE code in URL (Magic Link redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          console.log("🔑 Found auth code in URL, exchanging for session...");
          
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error("❌ Code exchange failed:", error.message);
            // Don't return yet - fall through to check for existing session
          } else if (data.session) {
            console.log("✅ Session established from code exchange:", data.session.user?.email);
            
            // Clean up the URL (remove the code parameter)
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (mounted) {
              setUserTier('free');
              setUserTierState('free');
              setIsLicenseValid(true);
              setIsCheckingLicense(false);
            }
            return; // Successfully authenticated!
          }
        }

        // STEP 2: Check for existing session (returning users)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
        if (session) {
          console.log("✅ Existing session found for:", session.user?.email);
          if (mounted) {
            setUserTier('free');
            setUserTierState('free');
            setIsLicenseValid(true);
            setIsCheckingLicense(false);
          }
          return;
        }

        // STEP 3: No session - check for Professional License Key
        console.log("No session, checking license key...");
        const result = await checkActivationStatus();
        
        if (mounted) {
          setIsLicenseValid(result.valid);
          setUserTierState(getUserTier());
          setIsCheckingLicense(false);
        }
        
      } catch (error) {
        console.error('Auth/license check failed:', error);
        if (mounted) {
          setIsLicenseValid(false);
          setIsCheckingLicense(false);
        }
      }
    };

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Session:', !!session);
        
        if (!mounted) return;

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          console.log("✅ Auth state changed - user authenticated:", session.user?.email);
          setUserTier('free');
          setUserTierState('free');
          setIsLicenseValid(true);
          setIsCheckingLicense(false);
        } else if (event === 'SIGNED_OUT') {
          console.log("👋 User signed out");
          setIsLicenseValid(false);
          setUserTier('free');
          setUserTierState('free');
        }
      }
    );

    // Run the auth check
    handleAuthAndLicenseCheck();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount.

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

  // Check if user has completed onboarding OR needs to add API key
  useEffect(() => {
    const hasCompleted = localStorage.getItem('onboarding_completed');
    const apiKey = getAPIKey();

    // Show onboarding if: (not completed AND license valid) OR (no API key - force BYOK setup)
    if ((!hasCompleted && isLicenseValid) || (!apiKey && isLicenseValid)) {
      // Delay slightly to ensure DOM is ready
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, [isLicenseValid]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleAIMode = async () => {
    const newMode: AIMode = aiMode === 'chrome' ? 'cloud' : 'chrome';

    // Validate the new mode
    const validation = await validateAIMode(newMode);
    if (!validation.valid) {
      // If Chrome AI fails, auto-fallback to Cloud AI
      if (validation.shouldFallback && newMode === 'chrome') {
        showToast('Chrome AI unavailable. Using Cloud AI for reliable results.', 'info');
        // Auto-switch to cloud mode
        setAiModeState('cloud');
        setAIMode('cloud');
        return;
      }

      // For Cloud AI, show settings to add API key
      showToast(validation.error || 'Please configure your API key in Settings.', 'warning');
      if (newMode === 'cloud') {
        setShowSettings(true);
      }
      return;
    }

    // Mode is valid, switch to it
    setAiModeState(newMode);
    setAIMode(newMode);
    showToast(`Switched to ${newMode === 'chrome' ? 'Chrome AI (Local)' : 'Cloud AI (Gemini)'}`, 'info');
  };
  
  const resetToComparisonView = () => {
      window.location.hash = '';
      setSharedAnalysis(null);
  }
  
  const handleCritique = async () => {
      if (!leftAnalysis || !rightAnalysis) return;
      
      // Check if user can perform critique
      const critiqueCheck = canPerformCritique();
      if (!critiqueCheck.allowed) {
        setUpgradeFeature('Pairing Critique');
        setShowUpgradePrompt(true);
        return;
      }

      setIsCritiquing(true);
      setCritique(null);
      setCritiqueError(null);
      try {
          const result = await critiqueFontPairing(leftAnalysis, rightAnalysis);
          setCritique(result);
          
          // Track usage AFTER successful critique (only for free users)
          if (!isProfessional()) {
            incrementLifetimeCritiqueCount();
          }
      } catch (e) {
          console.error("Critique failed:", e);
          setCritiqueError("The AI critique failed. Please try again.");
          setTimeout(() => setCritiqueError(null), 4000);
      } finally {
          setIsCritiquing(false);
      }
  };

  const handleLoadFromHistory = (item: import('./historyService').HistoryItem, target: 'left' | 'right') => {
    if (target === 'left') {
      setLeftAnalysis(item.analysis);
      if (item.thumbnail) setLeftPreviewImage(item.thumbnail);
    } else {
      setRightAnalysis(item.analysis);
      if (item.thumbnail) setRightPreviewImage(item.thumbnail);
    }
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
    setUserTierState(getUserTier());
  };

  const handleAnalyzeFontFromSuggestions = (fontName: string) => {
    setQuickAnalysisFont(fontName);
  };

  const handleQuickAnalysisLoadToColumn = (analysis: FontAnalysis, target: 'left' | 'right', previewImage?: string) => {
    if (target === 'left') {
      setLeftAnalysis(analysis);
      if (previewImage) setLeftPreviewImage(previewImage);
    } else {
      setRightAnalysis(analysis);
      if (previewImage) setRightPreviewImage(previewImage);
    }
    setViewMode('comparison');
  };

  const handleLoadSearchFromHistory = (item: import('./historyService').SearchHistoryItem) => {
    setFindFontsState({
      description: item.searchCriteria.description,
      selectedUsageTypes: item.searchCriteria.usageTypes,
      selectedBusinessTypes: item.searchCriteria.businessTypes,
      selectedThemes: item.searchCriteria.themes,
      selectedFontCategories: item.searchCriteria.fontCategories,
      results: item.results,
    });
    setViewMode('suggestions');
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
          <CadmusLogoIcon className="w-auto mx-auto mb-6 animate-pulse icon-embossed" style={{ height: '200px', color: '#8B7355' }} />
          <p className="text-secondary text-lg">Checking license...</p>
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

          {/* Center: Cloud AI Status Badge */}
          <div className="px-4 py-2 bg-[#1A3431] border border-[#2D4E4A] rounded-lg flex items-center gap-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#FF8E24] animate-pulse"></span>
            <span className="text-sm font-medium text-[#F5F2EB]">Cloud AI Active</span>
          </div>

          {/* Right: Action Buttons with paper inset effect */}
          <div className="flex items-center gap-3">
            {!isProfessional() && (
              <div className="hidden md:flex items-center gap-4 mr-2 text-xs text-teal-light/70 bg-black/10 px-3 py-1.5 rounded-full">
                <span>{canPerformAnalysis().remaining}/3 analyses</span>
                <span className="border-l border-teal-light/30 pl-3">
                  {hasUsedFreeCritique() ? (
                    <span className="text-amber-400">Critique used</span>
                  ) : (
                    <span>1 critique available</span>
                  )}
                </span>
                {canPerformAnalysis().remaining === 0 && (
                  <button onClick={() => setShowUpgradePrompt(true)} className="text-accent font-bold hover:underline ml-2">
                    Upgrade
                  </button>
                )}
              </div>
            )}
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
              onClick={() => setShowProjects(true)}
              className={`button-inset p-2.5 rounded-md transition-all duration-200 flex items-center gap-2 ${
                activeProject ? 'ring-2 ring-accent/50' : ''
              }`}
              aria-label="View projects"
              style={{ color: '#6b5d4f' }}
            >
              <svg className="h-6 w-6 icon-embossed" style={{ color: '#8B7355' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="hidden sm:inline text-sm font-semibold">
                {activeProject ? activeProject.name : 'Projects'}
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
          <FontSuggestionView 
            onAnalyzeFont={handleAnalyzeFontFromSuggestions} 
            persistedState={findFontsState}
            onStateChange={setFindFontsState}
          />
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
            <div data-tour="comparison-area" className="desk-surface p-8 rounded-xl shadow-2xl border border-white/5">
              {/* Sticky Action Buttons - Inside desk surface */}
              {leftAnalysis && rightAnalysis && (
                  <div className="sticky top-4 z-20 flex justify-center gap-3 mb-6 flex-wrap">
                      <button
                          onClick={() => {
                            const critiqueCheck = canPerformCritique();
                            if (!critiqueCheck.allowed) {
                              setUpgradeFeature('Pairing Critique');
                              setShowUpgradePrompt(true);
                              return;
                            }
                            handleCritique();
                          }}
                          disabled={!leftAnalysis || !rightAnalysis || isCritiquing || hasUsedFreeCritique()}
                          className={`px-6 py-3 bg-accent text-text-light font-bold rounded-full hover:opacity-90 disabled:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-accent flex items-center gap-2 ${
                            hasUsedFreeCritique() ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                      >
                          <SparklesIcon className={`w-5 h-5 ${isCritiquing ? 'animate-spin' : ''}`} />
                          {isCritiquing ? 'Critiquing...' : 'Critique Pairing'}
                          {!isProfessional() && !hasUsedFreeCritique() && (
                            <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                              1 free
                            </span>
                          )}
                          {hasUsedFreeCritique() && (
                            <LockIcon className="w-4 h-4 ml-1" />
                          )}
                      </button>
                      <button
                          onClick={handleGlyphComparison}
                          disabled={isComparingGlyphs || !leftPreviewImage || !rightPreviewImage}
                          className="px-6 py-3 bg-teal-dark text-text-light font-bold rounded-full hover:bg-teal-medium disabled:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-teal-medium flex items-center gap-2"
                      >
                          <SparklesIcon className={`w-5 h-5 ${isComparingGlyphs ? 'animate-spin' : ''}`} />
                          {isComparingGlyphs ? 'Comparing...' : 'Compare Glyphs'}
                      </button>
                      <button
                          onClick={() => {
                            if (userTier === 'free') {
                                setUpgradeFeature('Type Scale Builder');
                                setShowUpgradePrompt(true);
                                return;
                            }
                            setShowTypeScale(true);
                          }}
                          disabled={userTier === 'free'}
                          className={`px-6 py-3 bg-teal-medium text-text-light font-bold rounded-full hover:bg-teal-dark transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-teal-light flex items-center gap-2 ${userTier === 'free' ? 'opacity-70 cursor-not-allowed' : ''}`}
                          title={userTier === 'free' ? 'Professional Tier Only' : undefined}
                      >
                          {userTier === 'free' ? <LockIcon className="w-4 h-4" /> : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          )}
                          Type Scale
                      </button>
                      <button
                          onClick={() => {
                            if (userTier === 'free') {
                                setUpgradeFeature('Batch Analysis');
                                setShowUpgradePrompt(true);
                                return;
                            }
                            setShowBatchMatrix(true);
                          }}
                          disabled={userTier === 'free'}
                          className={`px-6 py-3 bg-surface text-accent font-bold rounded-full border-2 border-accent hover:bg-accent hover:text-surface transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-accent flex items-center gap-2 ${userTier === 'free' ? 'opacity-70 cursor-not-allowed' : ''}`}
                          title={userTier === 'free' ? 'Professional Tier Only' : undefined}
                      >
                          {userTier === 'free' ? <LockIcon className="w-4 h-4" /> : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                            </svg>
                          )}
                          Batch Matrix
                      </button>
                      {critiqueError && <p className="text-xs bg-danger text-text-light p-2 rounded-md">{critiqueError}</p>}
                  </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 w-full">
                  <div data-tour="analysis-column">
                    <AnalysisColumn key="left" analysisResult={leftAnalysis} onAnalysisComplete={setLeftAnalysis} onPreviewCaptured={setLeftPreviewImage} savedPreviewImage={leftPreviewImage} />
                  </div>
                  <div className="relative">
                    <AnalysisColumn key="right" analysisResult={rightAnalysis} onAnalysisComplete={setRightAnalysis} onPreviewCaptured={setRightPreviewImage} savedPreviewImage={rightPreviewImage} />
                  </div>
              </div>
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
        onLoadSearch={handleLoadSearchFromHistory}
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

      <UpgradePrompt 
        isOpen={showUpgradePrompt} 
        onClose={() => setShowUpgradePrompt(false)} 
        feature={upgradeFeature} 
      />

      <QuickAnalysisModal
        isOpen={!!quickAnalysisFont}
        onClose={() => setQuickAnalysisFont(null)}
        fontName={quickAnalysisFont || ''}
        onLoadToColumn={handleQuickAnalysisLoadToColumn}
      />

      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      <ProjectPanel
        isOpen={showProjects}
        onClose={() => setShowProjects(false)}
        currentLeftFont={leftAnalysis}
        currentRightFont={rightAnalysis}
        currentCritique={critique}
        leftPreview={leftPreviewImage || undefined}
        rightPreview={rightPreviewImage || undefined}
        onProjectChange={setActiveProject}
      />

      <TypeScaleBuilder
        isOpen={showTypeScale}
        onClose={() => setShowTypeScale(false)}
        availableFonts={[leftAnalysis, rightAnalysis].filter((f): f is FontAnalysis => f !== null)}
      />

      <BatchCompatibilityMatrix
        isOpen={showBatchMatrix}
        onClose={() => setShowBatchMatrix(false)}
        availableFonts={Array.from(new Map([
          ...getHistory().map(h => [h.analysis.fontName, h.analysis] as [string, FontAnalysis]),
          ...(leftAnalysis ? [[leftAnalysis.fontName, leftAnalysis] as [string, FontAnalysis]] : []),
          ...(rightAnalysis ? [[rightAnalysis.fontName, rightAnalysis] as [string, FontAnalysis]] : [])
        ]).values())}
      />

      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg animate-fade-in-up ${
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'warning' ? 'bg-yellow-500 text-black' :
          'bg-teal-dark text-text-light border border-teal-medium'
        }`}>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      <footer className="w-full p-4 text-center text-secondary/70 text-sm border-t border-border">
        Powered by Google Gemini
      </footer>
    </div>
  );
};

export default App;
