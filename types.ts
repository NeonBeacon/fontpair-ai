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
  fontFoundry?: string; // The foundry/company that created the font (e.g., "Adobe", "Google", "Monotype")
  fontSource?: FontSource; // Where the font was analyzed from (optional for backward compatibility)
  characterSets?: string[]; // Language support (Latin, Cyrillic, Greek, etc.)
  releaseYear?: string; // When the font was released
  licensingNotes?: string; // Commercial usage considerations
}

// Font source types - expanded for universal font support
export type FontSource =
  | 'google-fonts'
  | 'adobe-fonts'
  | 'uploaded-file'
  | 'image'
  | 'myfonts'
  | 'fontshare'
  | 'font-squirrel'
  | 'dafont'
  | 'fontesk'
  | 'velvetyne'
  | 'league-of-moveable-type'
  | 'the-northern-block'
  | 'atipo'
  | 'other';

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
    fontName: string;                 // Font name
    category: string;                 // serif, sans-serif, display, etc.
    rationale: string;                // Why this font fits (2-3 sentences)
    useCases: string[];               // Specific use cases: ["Headers", "Logo"]
    matchScore: number;               // 1-10 relevance score
    source?: string;                  // Where to get: Google Fonts, Adobe Fonts, Fontshare, etc.
    previewText?: string;             // Optional custom preview text
    alternatives?: Array<{            // Premium alternatives for users with pro subscriptions
        name: string;                 // Font name (e.g., "Futura")
        source: string;               // Source (e.g., "Adobe Fonts", "Monotype")
        similarity: string;           // Match description (e.g., "95% match", "More geometric")
    }>;
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

// Font DNA Matching types
export interface FontDNAMatch {
    fontName: string;                  // Name of the similar font
    source: string;                    // Where to get it (Google Fonts, Adobe Fonts, etc.)
    matchScore: number;                // 1-100 similarity score
    visualSimilarity: string;          // Description of visual similarities
    differingCharacteristics: string;  // What makes it different/unique
    bestUseCase: string;               // When to use this alternative instead
    isPremium: boolean;                // Whether it requires a paid license
    directLink?: string;               // Optional: Direct link to font source
}

export interface FontDNAResult {
    referenceFont: string;             // The font we're finding alternatives for
    totalMatches: number;              // How many alternatives were found
    matches: FontDNAMatch[];           // Array of similar fonts
    analysisNotes: string;             // AI's commentary on the matching process
    characteristics: string[];         // Key DNA characteristics identified
}

// Project Management types
export interface ProjectPairing {
    id: string;                        // Unique ID for this pairing
    leftFont: FontAnalysis | null;     // Left column analysis
    rightFont: FontAnalysis | null;    // Right column analysis
    leftPreview?: string;              // Preview image base64
    rightPreview?: string;             // Preview image base64
    critique?: PairingCritique;        // Optional critique
    createdAt: number;                 // Timestamp when added
    notes?: string;                    // User notes for this pairing
}

export interface Project {
    id: string;                        // Unique project ID
    name: string;                      // Project name (e.g., "Client Brand Refresh")
    description?: string;              // Optional project description
    pairings: ProjectPairing[];        // Array of font pairings in this project
    createdAt: number;                 // Timestamp when created
    updatedAt: number;                 // Timestamp when last modified
    color?: string;                    // Optional color tag for the project
}

export interface ProjectsState {
    projects: Project[];               // All projects
    activeProjectId: string | null;    // Currently active project ID
}

// Typography Context & Trends types
export interface TypographyContextResult {
    fontName: string;                  // The font being analyzed
    historicalUsage: string;           // Historical usage and notable examples
    currentTrends: string;             // Current typography trends (2025)
    pairingTrends: string[];           // What fonts are commonly paired with this
    recommendations: string;           // Professional recommendations
    culturalContext: string;           // Cultural/regional considerations
}

// Batch Compatibility Matrix types
export interface PairingScore {
    font1: string;                     // First font name
    font2: string;                     // Second font name
    score: number;                     // Compatibility score 1-10
    quickNote: string;                 // Brief note about the pairing
}

export interface BatchCompatibilityResult {
    fonts: string[];                   // List of font names analyzed
    pairings: PairingScore[];          // All pairwise compatibility scores
    topPairings: PairingScore[];       // Top 3 best pairings
    worstPairings: PairingScore[];     // Bottom 3 worst pairings
    overallNotes: string;              // General observations about the font set
}
