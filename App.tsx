import React, { useState, useEffect, useRef } from 'react';
import { CadmusLogoIcon, SparklesIcon, HistoryIcon, SettingsIcon, LockIcon } from './components/Icons';
import AnalysisColumn, { type AnalysisColumnHandle } from './components/AnalysisColumn';
import type { FontAnalysis, PairingCritique, GlyphComparisonResult, AIMode, Project } from './types';
import { critiqueFontPairing, compareGlyphs, analyzeFont } from './services/geminiService';
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
import { generateFontImage, stripBase64Prefix } from './utils/fontUtils';
import { decodeShareData } from './utils/fileUtils';
import { checkActivationStatus, getStoredLicense } from './services/licenseService';
import { getSession, supabase } from './services/authService';
import { getHistory } from './historyService';
import { getUserTier, setUserTier, isProfessional, canPerformAnalysis, canPerformCritique, incrementLifetimeCritiqueCount, hasUsedFreeCritique, type UserTier } from './services/tierService';

type ViewMode = 'comparison' | 'suggestions';

// Read a shared analysis out of the URL hash.
// Share links are UTF-8 + base64; older links are plain base64 and still open.
const readSharedLink = (): { analysis: FontAnalysis | null; error: string | null } => {
  const hash = window.location.hash.slice(1);
  // No hash, or an auth redirect (e.g. #error=...&error_code=...), which is not a share link
  if (!hash || hash.includes('&')) return { analysis: null, error: null };
  try {
    const data = decodeShareData(hash) as FontAnalysis;
    if (!data || typeof data !== 'object' || typeof data.fontName !== 'string') {
      throw new Error('Share link does not contain an analysis');
    }
    return { analysis: data, error: null };
  } catch (e) {
    console.error("Failed to parse shared data from URL", e);
    return { analysis: null, error: "This share link couldn't be opened. It may be incomplete or damaged." };
  }
};

// A purchased licence beats a free magic-link session: a buyer who once signed in
// with an email link must not be downgraded to Free on every reload.
const resolveSessionTier = async (): Promise<UserTier> => {
  if (getStoredLicense()) {
    const licenseResult = await checkActivationStatus();
    if (licenseResult.valid) return 'professional';
  }
  return 'free';
};


const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  // Read the share link up front so a recipient never flashes the licence check first
  const [initialShare] = useState(readSharedLink);
  const [sharedAnalysis, setSharedAnalysis] = useState<FontAnalysis | null>(initialShare.analysis);
  const [shareLinkError, setShareLinkError] = useState<string | null>(initialShare.error);
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
  const [hasAPIKey, setHasAPIKey] = useState(() => !!getAPIKey());
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showTypeScale, setShowTypeScale] = useState(false);
  const [showBatchMatrix, setShowBatchMatrix] = useState(false);
  
  // Quick Analysis State
  const [quickAnalysisFont, setQuickAnalysisFont] = useState<string | null>(null);

  // Column handles, used to swap what's loaded in each column
  const leftColumnRef = useRef<AnalysisColumnHandle>(null);
  const rightColumnRef = useRef<AnalysisColumnHandle>(null);

  // Queued Fonts State
  const [leftQueuedFont, setLeftQueuedFont] = useState<string | null>(null);
  const [rightQueuedFont, setRightQueuedFont] = useState<string | null>(null);

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

  // Clear queued font after it's been used
  const handleLeftQueuedFontUsed = () => setLeftQueuedFont(null);
  const handleRightQueuedFontUsed = () => setRightQueuedFont(null);

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
            
            const sessionTier = await resolveSessionTier();
            if (mounted) {
              setUserTier(sessionTier);
              setUserTierState(sessionTier);
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
          // A valid licence on this device wins over the free session
          const sessionTier = await resolveSessionTier();
          if (mounted) {
            setUserTier(sessionTier);
            setUserTierState(sessionTier);
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
          // Run outside this callback: awaiting other Supabase calls inside it can deadlock the auth client
          setTimeout(async () => {
            const sessionTier = await resolveSessionTier();
            if (!mounted) return;
            setUserTier(sessionTier);
            setUserTierState(sessionTier);
            setIsLicenseValid(true);
            setIsCheckingLicense(false);
          }, 0);
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
      const { analysis, error } = readSharedLink();
      setSharedAnalysis(analysis);
      setShareLinkError(error);
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

    // Show onboarding once, for new users. The "connect your AI" banner covers a missing key.
    if (!hasCompleted && isLicenseValid) {
      // Delay slightly to ensure DOM is ready
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, [isLicenseValid]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    setToast({ message, type });
    // A newer toast must not be cleared by an older toast's timer; errors stay longer so they can be read
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), type === 'error' ? 8000 : 4000);
  };

  // Process queued fonts from Find Fonts
  useEffect(() => {
    const processQueue = async () => {
      if (viewMode !== 'comparison') return;

      const leftQueue = localStorage.getItem('fontPair_leftQueue');
      const rightQueue = localStorage.getItem('fontPair_rightQueue');
      
      if (!leftQueue && !rightQueue) return;

      if (leftQueue) {
        try {
          const { fontName } = JSON.parse(leftQueue);
          setLeftQueuedFont(fontName);
          localStorage.removeItem('fontPair_leftQueue');
          showToast(`${fontName} ready in Left column`, 'info');
        } catch (e) {
          console.error("Failed to parse left queue", e);
          localStorage.removeItem('fontPair_leftQueue');
        }
      }
      
      if (rightQueue) {
        try {
          const { fontName } = JSON.parse(rightQueue);
          setRightQueuedFont(fontName);
          localStorage.removeItem('fontPair_rightQueue');
          showToast(`${fontName} ready in Right column`, 'info');
        } catch (e) {
          console.error("Failed to parse right queue", e);
          localStorage.removeItem('fontPair_rightQueue');
        }
      }
    };
    
    processQueue();
  }, [viewMode]); // Removed unused dependencies

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
          setCritiqueError(e instanceof Error && e.message ? e.message : "The AI critique failed. Please try again.");
          setTimeout(() => setCritiqueError(null), 8000);
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
      showToast(e instanceof Error && e.message ? e.message : "The glyph comparison failed. Please try again.", 'error');
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

  const handleSwapFonts = () => {
    const tempAnalysis = leftAnalysis;
    const tempPreview = leftPreviewImage;
    setLeftAnalysis(rightAnalysis);
    setLeftPreviewImage(rightPreviewImage);
    setRightAnalysis(tempAnalysis);
    setRightPreviewImage(tempPreview);

    // Also swap what each column has loaded (uploaded file / Google font), so the
    // live preview and analysis in a column stay about the same font
    const leftInput = leftColumnRef.current?.getInputState();
    const rightInput = rightColumnRef.current?.getInputState();
    if (leftInput && rightInput) {
      leftColumnRef.current?.setInputState(rightInput);
      rightColumnRef.current?.setInputState(leftInput);
    }
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

  // A shared link is read-only and must open for the recipient without a licence,
  // so it is rendered before the licence checks below.
  if (sharedAnalysis || shareLinkError) {
    return (
      <div className="min-h-screen bg-background text-text-dark flex flex-col font-sans">
        <PaperTexture />
        <header className="w-full px-4 sm:px-6 paper-texture-bg border-b-2 flex justify-center" style={{ borderBottomColor: 'rgba(107, 93, 79, 0.3)' }}>
          <CadmusLogoIcon aria-hidden="true" className="w-auto icon-embossed" style={{ color: '#8B7355', height: '88px' }} />
        </header>

        <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl">
            <div className="mb-4 text-center">
              {sharedAnalysis ? (
                <p className="text-secondary">You are viewing a shared analysis.</p>
              ) : (
                <p role="alert" className="text-danger font-semibold">{shareLinkError}</p>
              )}
              <button onClick={resetToComparisonView} className="text-accent font-semibold hover:underline">
                {isLicenseValid ? 'Return to Comparison View' : 'Open FontPair AI'}
              </button>
            </div>
            {sharedAnalysis && (
              <AnalysisColumn key="shared" analysisResult={sharedAnalysis} onAnalysisComplete={() => {}} isSharedView={true} />
            )}
          </div>
        </main>

        <footer className="w-full p-4 text-center text-secondary/70 text-sm border-t border-border">
          <a href="https://www.fontpairai.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent underline">
            Made with FontPair AI — fontpairai.com
          </a>
        </footer>
      </div>
    );
  }

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

      <header className="w-full px-3 sm:px-6 py-2 sm:py-0 h-auto sm:h-[100px] paper-texture-bg border-b-2" style={{ borderBottomColor: 'rgba(107, 93, 79, 0.3)' }}>
        <div className="container mx-auto flex flex-wrap sm:flex-nowrap justify-between items-center gap-x-3 gap-y-2 sm:gap-6 sm:h-full">
          {/* Left: Logo with embossed effect */}
          <div className="flex items-center">
            <CadmusLogoIcon aria-hidden="true" className="w-auto icon-embossed h-[72px] sm:h-[150px]" style={{ color: '#8B7355' }} />
          </div>

          {/* Center: Cloud AI status. Without a key it becomes a prompt to add one. */}
          {hasAPIKey ? (
            <div className="order-last sm:order-none basis-full sm:basis-auto justify-center px-4 py-2 bg-[#1A3431] border border-[#2D4E4A] rounded-lg flex items-center gap-2 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#FF8E24] animate-pulse"></span>
              <span className="text-sm font-medium text-[#F5F2EB]">Cloud AI Active</span>
            </div>
          ) : (
            <button
              onClick={() => setShowSettings(true)}
              className="order-last sm:order-none basis-full sm:basis-auto justify-center px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-600 rounded-lg flex items-center gap-2 shadow-inner text-sm font-bold transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse"></span>
              Add Gemini key
            </button>
          )}

          {/* Right: Action Buttons with paper inset effect */}
          <div className="flex items-center gap-2 sm:gap-3">
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
              className={`p-2.5 sm:px-5 rounded-md font-semibold transition-all duration-200 flex items-center ${
                viewMode === 'suggestions'
                  ? 'button-inset-active'
                  : 'button-inset'
              }`}
              aria-label={viewMode === 'suggestions' ? 'Switch to Font Pair' : 'Switch to Find Fonts'}
              style={{
                color: viewMode === 'suggestions' ? '#3d3226' : '#6b5d4f'
              }}
            >
              <svg className="h-6 w-6 sm:hidden icon-embossed" style={{ color: '#8B7355' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <span className="hidden sm:inline text-sm">
                {viewMode === 'suggestions' ? 'Font Pair' : 'Find Fonts'}
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
        {/* First-run: the app needs the buyer's own Gemini key before any AI feature works */}
        {!hasAPIKey && (
          <section
            aria-label="Connect your AI"
            className="w-full max-w-7xl mb-6 rounded-xl border-2 border-accent bg-paper-light p-5 shadow-md flex flex-col md:flex-row md:items-center gap-4"
          >
            <div className="flex-1">
              <h2 className="text-xl font-bold text-teal-dark">One step left: connect your AI</h2>
              <p className="mt-1 text-text-secondary">
                FontPair AI runs on your own free Google Gemini key. It takes about two minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg font-bold border-2 border-teal-dark text-teal-dark hover:bg-teal-dark hover:text-text-light transition-colors"
              >
                Get a free key ↗
              </a>
              <button
                onClick={() => setShowSettings(true)}
                className="px-5 py-2.5 rounded-lg font-bold bg-accent text-text-dark hover:bg-accent-dark transition-colors"
              >
                Paste my key
              </button>
            </div>
          </section>
        )}

        {viewMode === 'suggestions' ? (
          <FontSuggestionView
            onAnalyzeFont={handleAnalyzeFontFromSuggestions}
            persistedState={findFontsState}
            onStateChange={setFindFontsState}
          />
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

              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 w-full relative">
                  {/* Left Column - Display/Header Font */}
                  <div data-tour="analysis-column">
                    <div className="text-center mb-3">
                      <span className="text-xs uppercase tracking-widest text-teal-light font-semibold">Display / Header Font</span>
                    </div>
                    <AnalysisColumn
                        key="left"
                        ref={leftColumnRef}
                        analysisResult={leftAnalysis}
                        onAnalysisComplete={setLeftAnalysis} 
                        onPreviewCaptured={setLeftPreviewImage} 
                        savedPreviewImage={leftPreviewImage}
                        preSelectedGoogleFont={leftQueuedFont || undefined}
                        onPreSelectedFontUsed={handleLeftQueuedFontUsed}
                    />
                  </div>

                  {/* Swap Button - Mobile (between stacked columns) */}
                  {leftAnalysis && rightAnalysis && (
                    <div className="flex justify-center py-4 lg:hidden">
                      <button
                        onClick={handleSwapFonts}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-text-light font-semibold rounded-full hover:bg-accent-dark transition-all shadow-lg"
                        title="Swap fonts between columns"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Swap Fonts
                      </button>
                    </div>
                  )}

                  {/* Swap Button - Desktop (centered between columns) */}
                  {leftAnalysis && rightAnalysis && (
                    <div className="hidden lg:flex absolute left-1/2 top-8 -translate-x-1/2 z-10">
                      <button
                        onClick={handleSwapFonts}
                        className="p-3 bg-accent text-text-light rounded-full hover:bg-accent-dark transition-all shadow-lg hover:scale-110"
                        title="Swap fonts between columns"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Right Column - Body/Paragraph Font */}
                  <div className="relative">
                    <div className="text-center mb-3">
                      <span className="text-xs uppercase tracking-widest text-teal-light font-semibold">Body / Paragraph Font</span>
                    </div>
                    <AnalysisColumn
                        key="right"
                        ref={rightColumnRef}
                        analysisResult={rightAnalysis}
                        onAnalysisComplete={setRightAnalysis} 
                        onPreviewCaptured={setRightPreviewImage} 
                        savedPreviewImage={rightPreviewImage}
                        preSelectedGoogleFont={rightQueuedFont || undefined}
                        onPreSelectedFontUsed={handleRightQueuedFontUsed}
                    />
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
        onApiKeyChange={() => setHasAPIKey(!!getAPIKey())}
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
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[10000] max-w-[calc(100vw-2rem)] px-6 py-3 rounded-lg shadow-lg animate-fade-in-up ${
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-teal-dark text-text-light border border-teal-medium'
          }`}
        >
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
