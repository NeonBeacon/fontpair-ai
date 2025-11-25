// Tier types
export type UserTier = 'free' | 'professional';

export interface TierLimits {
  dailyAnalysisLimit: number | null; // null = unlimited
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
  };
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    dailyAnalysisLimit: 3,
    historyLimit: 3,
    maxDevices: 1,
    features: {
      pairingCritique: false,
      batchAnalysis: false,
      glyphComparison: 'basic',
      wcagReports: false,
      pdfWatermark: true,
      cssExport: false,
      shareableLinks: false,
      projectOrganization: false,
      typeScaleBuilder: false,
    }
  },
  professional: {
    dailyAnalysisLimit: null,
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
    }
  }
};

// Storage keys
const TIER_STORAGE_KEY = 'fontpair_user_tier';
const DAILY_COUNT_KEY = 'fontpair_daily_analysis_count';
const DAILY_DATE_KEY = 'fontpair_daily_analysis_date';

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
