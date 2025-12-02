// Tier types
export type UserTier = 'free' | 'professional';

export interface TierLimits {
  dailyAnalysisLimit: number | null; // null = unlimited
  dailyFindFontsLimit: number | null; // NEW: null = unlimited
  lifetimeCritiqueLimit: number | null; // NEW: null = unlimited
  historyLimit: number;
  maxDevices: number;
  features: {
    pairingCritique: boolean;
    batchAnalysis: boolean;
    glyphComparison: 'basic' | 'full';
    wcagReports: boolean;
    pdfWatermark: boolean;
    cssExport: boolean;
    shareableLinks: boolean;
    projectOrganization: boolean;
    typeScaleBuilder: boolean;
    dualFontSlots: boolean; // NEW: controls second font slot
  };
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    dailyAnalysisLimit: 3,
    dailyFindFontsLimit: 3, // NEW
    lifetimeCritiqueLimit: 1, // NEW
    historyLimit: 3,
    maxDevices: 1,
    features: {
      pairingCritique: true, // CHANGED: now allowed (but limited by lifetimeCritiqueLimit)
      batchAnalysis: false,
      glyphComparison: 'basic',
      wcagReports: false,
      pdfWatermark: true,
      cssExport: false,
      shareableLinks: false,
      projectOrganization: false,
      typeScaleBuilder: false,
      dualFontSlots: true, // NEW: allow second font slot
    }
  },
  professional: {
    dailyAnalysisLimit: null,
    dailyFindFontsLimit: null, // NEW
    lifetimeCritiqueLimit: null, // NEW
    historyLimit: 100,
    maxDevices: 3,
    features: {
      pairingCritique: true,
      batchAnalysis: true,
      glyphComparison: 'full',
      wcagReports: true,
      pdfWatermark: false,
      cssExport: true,
      shareableLinks: true,
      projectOrganization: true,
      typeScaleBuilder: true,
      dualFontSlots: true, // NEW
    }
  }
};

// Storage keys
const TIER_STORAGE_KEY = 'fontpair_user_tier';
const DAILY_COUNT_KEY = 'fontpair_daily_analysis_count';
const DAILY_DATE_KEY = 'fontpair_daily_analysis_date';
const DAILY_FIND_FONTS_COUNT_KEY = 'fontpair_daily_find_fonts_count'; // NEW
const DAILY_FIND_FONTS_DATE_KEY = 'fontpair_daily_find_fonts_date'; // NEW
const LIFETIME_CRITIQUE_COUNT_KEY = 'fontpair_lifetime_critique_count'; // NEW

export function getUserTier(): UserTier {
  return (localStorage.getItem(TIER_STORAGE_KEY) as UserTier) || 'free';
}

export function setUserTier(tier: UserTier): void {
  localStorage.setItem(TIER_STORAGE_KEY, tier);
}

export function getTierLimits(): TierLimits {
  return TIER_LIMITS[getUserTier()];
}

export function canUseFeature(feature: keyof TierLimits['features']): boolean {
  const limits = getTierLimits();
  const value = limits.features[feature];
  return typeof value === 'boolean' ? value : true;
}

// Daily analysis tracking
export function getDailyAnalysisCount(): number {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(DAILY_DATE_KEY);
  
  if (storedDate !== today) {
    // Reset counter for new day
    localStorage.setItem(DAILY_DATE_KEY, today);
    localStorage.setItem(DAILY_COUNT_KEY, '0');
    return 0;
  }
  
  return parseInt(localStorage.getItem(DAILY_COUNT_KEY) || '0', 10);
}

export function incrementDailyAnalysisCount(): void {
  const count = getDailyAnalysisCount();
  localStorage.setItem(DAILY_COUNT_KEY, String(count + 1));
}

export function canPerformAnalysis(): { allowed: boolean; remaining: number | null; message?: string } {
  const limits = getTierLimits();
  
  if (limits.dailyAnalysisLimit === null) {
    return { allowed: true, remaining: null };
  }
  
  const count = getDailyAnalysisCount();
  const remaining = limits.dailyAnalysisLimit - count;
  
  if (remaining <= 0) {
    return { 
      allowed: false, 
      remaining: 0,
      message: `You've reached your daily limit of ${limits.dailyAnalysisLimit} analyses. Upgrade to Professional for unlimited analyses.`
    };
  }
  
  return { allowed: true, remaining };
}

export function isProfessional(): boolean {
  return getUserTier() === 'professional';
}

export async function initializeTierFromSession(): Promise<UserTier> {
  // Check localStorage first for pro users
  const storedTier = getUserTier();
  if (storedTier === 'professional') {
    return 'professional';
  }
  
  // For non-pro users, they're free tier if they have a session
  return 'free';
}

// === NEW: Find Fonts tracking ===
export function getDailyFindFontsCount(): number {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(DAILY_FIND_FONTS_DATE_KEY);
  
  if (storedDate !== today) {
    localStorage.setItem(DAILY_FIND_FONTS_DATE_KEY, today);
    localStorage.setItem(DAILY_FIND_FONTS_COUNT_KEY, '0');
    return 0;
  }
  
  return parseInt(localStorage.getItem(DAILY_FIND_FONTS_COUNT_KEY) || '0', 10);
}

export function incrementDailyFindFontsCount(): void {
  const count = getDailyFindFontsCount();
  localStorage.setItem(DAILY_FIND_FONTS_COUNT_KEY, String(count + 1));
}

export function canPerformFindFonts(): { allowed: boolean; remaining: number | null; message?: string } {
  const limits = getTierLimits();
  
  if (limits.dailyFindFontsLimit === null) {
    return { allowed: true, remaining: null };
  }
  
  const count = getDailyFindFontsCount();
  const remaining = limits.dailyFindFontsLimit - count;
  
  if (remaining <= 0) {
    return { 
      allowed: false, 
      remaining: 0,
      message: `You've used all ${limits.dailyFindFontsLimit} font searches for today. Upgrade to Professional for unlimited searches.`
    };
  }
  
  return { allowed: true, remaining };
}

// === NEW: Lifetime Critique tracking ===
export function getLifetimeCritiqueCount(): number {
  return parseInt(localStorage.getItem(LIFETIME_CRITIQUE_COUNT_KEY) || '0', 10);
}

export function incrementLifetimeCritiqueCount(): void {
  const count = getLifetimeCritiqueCount();
  localStorage.setItem(LIFETIME_CRITIQUE_COUNT_KEY, String(count + 1));
}

export function canPerformCritique(): { allowed: boolean; remaining: number | null; message?: string } {
  const limits = getTierLimits();
  
  // Pro users have unlimited
  if (limits.lifetimeCritiqueLimit === null) {
    return { allowed: true, remaining: null };
  }
  
  const count = getLifetimeCritiqueCount();
  const remaining = limits.lifetimeCritiqueLimit - count;
  
  if (remaining <= 0) {
    return { 
      allowed: false, 
      remaining: 0,
      message: `You've used your free pairing critique. Upgrade to Professional for unlimited critiques.`
    };
  }
  
  return { allowed: true, remaining };
}

export function hasUsedFreeCritique(): boolean {
  if (isProfessional()) return false;
  return getLifetimeCritiqueCount() >= (TIER_LIMITS.free.lifetimeCritiqueLimit || 0);
}
