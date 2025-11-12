export interface FontPairing {
  primary: string;
  secondary: string;
  rationale: string;
}

export interface SimilarFont {
    name: string;
    source: string; // e.g., "Google Fonts"
    rationale: string;
}

export interface FontAccessibility {
    analysis: string; // A general summary
    notes: string[]; // Specific points like "Clear distinction between I and l"
}

export interface VariableAxis {
    tag: string; // e.g., 'wght'
    name: string; // e.g., 'Weight'
    minValue: number;
    maxValue: number;
    defaultValue: number;
}

export interface FontAnalysis {
  status: 'success' | 'not_enough_data';
  fontName: string;
  fontType: string;
  analysis: string;
  designer: string;
  historicalContext: string;
  weightRecommendations: string[];
  usageRecommendations: string[];
  businessSuitability: string[];
  fontPairings: FontPairing[];
  licenseInfo: string;
  accessibility: FontAccessibility;
  similarFonts: SimilarFont[];
  isVariable: boolean;
}

export interface PairingCritique {
    overallScore: number; // 1-10
    analysis: string;
    pros: string[];
    cons: string[];
}

export interface GlyphComparison {
    character: string;
    font1Analysis: string;
    font2Analysis: string;
    differences: string[];
    readabilityScore: number;
}

export interface GlyphComparisonResult {
    overallAssessment: string;
    comparisons: GlyphComparison[];
}

// AI Mode types
export type AIMode = 'chrome' | 'cloud';

export interface AISettings {
    mode: AIMode;
    apiKey: string;
}

// Chrome AI API types (Built-in AI / Prompt API)
declare global {
    interface Window {
        ai?: {
            languageModel?: {
                capabilities(): Promise<AILanguageModelCapabilities>;
                create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
            };
        };
    }
}

export interface AILanguageModelCapabilities {
    available: 'readily' | 'after-download' | 'no';
    defaultTopK?: number;
    maxTopK?: number;
    defaultTemperature?: number;
}

export interface AILanguageModelCreateOptions {
    systemPrompt?: string;
    initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    topK?: number;
    temperature?: number;
}

export interface AILanguageModel {
    prompt(input: string): Promise<string>;
    promptStreaming(input: string): ReadableStream;
    destroy(): void;
}

// Font Suggestion types
export interface FontSuggestionRequest {
    description: string;              // User's text input
    usageTypes?: string[];            // Selected usage categories
    businessTypes?: string[];         // Selected business categories
    themes?: string[];                // Selected theme categories
    fontCategories?: string[];        // serif, sans-serif, etc.
    maxResults?: number;              // Default: 5
}

export interface FontSuggestion {
    fontName: string;                 // Google Font name
    category: string;                 // serif, sans-serif, display, etc.
    rationale: string;                // Why this font fits (2-3 sentences)
    useCases: string[];               // Specific use cases: ["Headers", "Logo"]
    matchScore: number;               // 1-10 relevance score
    previewText?: string;             // Optional custom preview text
}

export interface FontSuggestionResult {
    suggestions: FontSuggestion[];    // 3-5 font recommendations
    searchSummary: string;            // Overview of what was searched
    additionalNotes?: string;         // Any helpful context from AI
}

// Google Fonts API types
export interface GoogleFontMetadata {
    family: string;                   // Font name
    category: string;                 // serif, sans-serif, display, handwriting, monospace
    variants: string[];               // Available weights/styles
    subsets: string[];                // language support
    popularity?: number;              // Usage rank (optional)
}

// Onboarding Tour types
export interface OnboardingStep {
    id: string;
    targetSelector: string;           // CSS selector for target element
    title: string;
    message: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    actionText: string;               // Button text
    condition?: () => boolean;        // Optional: only show if condition true
}

export interface OnboardingState {
    isActive: boolean;
    currentStep: number;
    hasCompleted: boolean;
}
