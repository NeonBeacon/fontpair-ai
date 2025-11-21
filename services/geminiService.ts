import { GoogleGenAI, Type } from "@google/genai";
import type { FontAnalysis, PairingCritique, GlyphComparisonResult, AIMode, FontSuggestionRequest, FontSuggestionResult, FontDNAResult, TypographyContextResult, BatchCompatibilityResult } from '../types';
import { getAIMode, getAPIKey, validateAIMode } from '../utils/aiSettings';
import { FULL_CONSTITUTION } from '../data/typographyConstitution';

// Initialize Cloud AI lazily when needed
let cloudAI: GoogleGenAI | null = null;

const getCloudAI = (): GoogleGenAI => {
    const apiKey = getAPIKey();
    if (!apiKey) {
        throw new Error("No Gemini API key configured. Please add your API key in settings.");
    }

    if (!cloudAI || cloudAI.apiKey !== apiKey) {
        cloudAI = new GoogleGenAI({ apiKey });
    }

    return cloudAI;
};

/**
 * Parse API errors and return user-friendly messages
 * Distinguishes between AI provider issues and app issues
 */
const parseAPIError = (error: unknown): string => {
    const errorString = error instanceof Error ? error.message : String(error);

    // Check for specific API error codes/messages
    if (errorString.includes('503') || errorString.includes('UNAVAILABLE') || errorString.includes('overloaded')) {
        return "Gemini API is temporarily overloaded. This is an issue with Google's servers, not the app. Please wait a few minutes and try again.";
    }

    if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota')) {
        return "Gemini API rate limit exceeded. You've made too many requests. Please wait a minute before trying again, or check your API quota at Google AI Studio.";
    }

    if (errorString.includes('401') || errorString.includes('UNAUTHENTICATED') || errorString.includes('invalid') && errorString.includes('key')) {
        return "Invalid Gemini API key. Please check your API key in Settings and ensure it's correct.";
    }

    if (errorString.includes('403') || errorString.includes('PERMISSION_DENIED')) {
        return "Gemini API access denied. Your API key may not have permission for this model. Check your API key settings at Google AI Studio.";
    }

    if (errorString.includes('400') || errorString.includes('INVALID_ARGUMENT')) {
        return "Invalid request to Gemini API. The image or text may be too large or in an unsupported format.";
    }

    if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('Failed to fetch')) {
        return "Network error connecting to Gemini API. Please check your internet connection and try again.";
    }

    if (errorString.includes('timeout') || errorString.includes('DEADLINE_EXCEEDED')) {
        return "Gemini API request timed out. The server took too long to respond. Please try again.";
    }

    // Default message - still indicates it's an AI provider issue
    return "Gemini API error: " + (errorString.length > 100 ? errorString.substring(0, 100) + '...' : errorString);
};

/**
 * Retry operation helper for handling transient API errors (503 overload)
 * Waits progressively longer between retries: 1s, 2s, 3s
 */
const retryOperation = async <T>(
    fn: () => Promise<T>,
    retries: number = 3
): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorString = lastError.message.toLowerCase();

            // Only retry on 503/overload errors
            if (errorString.includes('503') || errorString.includes('overloaded') || errorString.includes('unavailable')) {
                if (attempt < retries) {
                    const waitTime = 1000 * attempt;
                    console.log(`API overloaded, retrying in ${waitTime}ms (attempt ${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
            }

            // For non-retryable errors or final attempt, throw immediately
            throw lastError;
        }
    }

    // Should not reach here, but TypeScript needs this
    throw lastError || new Error("Retry operation failed");
};

const fontPairingSchema = {
    type: Type.OBJECT,
    properties: {
        primary: {
            type: Type.STRING,
            description: "The name of the primary font in the pairing. This should usually be the analyzed font if it's suitable for headlines."
        },
        secondary: {
            type: Type.STRING,
            description: "The name of a complementary secondary font, suitable for body text or subheadings (e.g., from Google Fonts)."
        },
        rationale: {
            type: Type.STRING,
            description: "A brief explanation of why this pairing works well together (e.g., contrast, shared characteristics, mood)."
        }
    },
    required: ['primary', 'secondary', 'rationale']
};

const similarFontSchema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: "The name of the similar font."
        },
        source: {
            type: Type.STRING,
            description: "The source of the font, e.g., 'Google Fonts', 'Adobe Fonts'."
        },
        rationale: {
            type: Type.STRING,
            description: "A brief explanation of why this font is a good alternative."
        }
    },
    required: ['name', 'source', 'rationale']
};

const accessibilitySchema = {
    type: Type.OBJECT,
    properties: {
        analysis: {
            type: Type.STRING,
            description: "A paragraph summarizing the font's overall accessibility and legibility characteristics."
        },
        notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of specific observations, such as 'Clear distinction between 'I', 'l', and '1'' or 'Large x-height enhances readability'."
        }
    },
    required: ['analysis', 'notes']
};


const fontAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
        type: Type.STRING,
        description: 'Set to "success" if analysis is possible, otherwise "not_enough_data".'
    },
    fontName: {
      type: Type.STRING,
      description: 'The name of the font. If unidentified, state "Unknown Font".',
    },
    fontType: {
      type: Type.STRING,
      description: 'The primary classification of the font (e.g., Serif, Sans-Serif, Script, Display, Monospace).',
    },
    analysis: {
      type: Type.STRING,
      description: "A detailed paragraph describing the font's characteristics: its personality, mood, legibility, and unique features. Describe what you see in the font's design.",
    },
    designer: {
        type: Type.STRING,
        description: "The name of the font's designer or foundry. If unknown, state 'Unknown Designer'."
    },
    historicalContext: {
        type: Type.STRING,
        description: "A paragraph detailing the font's history, its designer, the foundry it came from, and the historical period or artistic movement that influenced it."
    },
    isVariable: {
        type: Type.BOOLEAN,
        description: "Set to true if the font appears to be a variable font with multiple axes, otherwise false."
    },
    weightRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'An array of strings suggesting appropriate font weights for different uses (e.g., "Regular (400) for body text", "Bold (700) for headlines").',
    },
    usageRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'An array of strings recommending where to use this font style (e.g., "Titles, headings, logos", "Paragraphs, UI elements").',
    },
    businessSuitability: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'An array of strings suggesting types of businesses or industries this font would be suitable for (e.g., "Tech startups", "Fashion brands", "Law firms").',
    },
    fontPairings: {
        type: Type.ARRAY,
        description: "An array of 2-3 suggested font pairings. The primary font should typically be the one being analyzed.",
        items: fontPairingSchema
    },
    similarFonts: {
        type: Type.ARRAY,
        description: "An array of 3-5 similar fonts from well-known libraries like Google Fonts, Adobe Fonts, or other well-known foundries.",
        items: similarFontSchema
    },
    accessibility: {
        ...accessibilitySchema,
        description: "An analysis of the font's accessibility and legibility."
    },
    licenseInfo: {
        type: Type.STRING,
        description: "A summary of the font's license from its metadata, OR a warning that license info cannot be determined from an image. This field must not be speculative.",
    },
    fontFoundry: {
        type: Type.STRING,
        description: "The foundry or company that created/published the font (e.g., 'Adobe', 'Google', 'Monotype', 'Linotype', 'Font Bureau'). If unknown, state 'Unknown Foundry'."
    },
    characterSets: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Language/script support including Latin, Cyrillic, Greek, Arabic, Hebrew, CJK, etc. List all character sets the font appears to support based on typical coverage for this font."
    },
    releaseYear: {
        type: Type.STRING,
        description: "The year the font was originally released or designed. If unknown, state 'Unknown'."
    },
    licensingNotes: {
        type: Type.STRING,
        description: "Professional licensing considerations for commercial use. Include notes about: free for personal/commercial use, subscription required (Adobe Fonts), desktop vs web licensing, or if the license needs verification. Be specific about commercial usage implications."
    },
  },
  required: ['status', 'fontName', 'fontType', 'analysis', 'designer', 'historicalContext', 'isVariable', 'weightRecommendations', 'usageRecommendations', 'businessSuitability', 'fontPairings', 'similarFonts', 'accessibility', 'licenseInfo', 'fontFoundry', 'characterSets', 'releaseYear', 'licensingNotes']
};

/**
 * Analyze font using Cloud AI (Gemini API)
 * This function processes images and requires an API key
 */
const analyzeFont_Cloud = async (fileContent: string, mimeType: string, fileName: string, fontMetadata?: string): Promise<FontAnalysis> => {
    const ai = getCloudAI();
    let prompt = `You are a world-class typographer and font analyst with expertise in font licensing and commercial usage. Your task is to analyze the provided image which contains text. The original filename was "${fileName}".

Based on your analysis, provide a detailed breakdown covering these areas:

1.  **Core Analysis:** Identify the font, its type, its designer/foundry, and describe its characteristics, personality, and mood.
2.  **Historical Context:** Detail the font's history, release year, and the influences behind its design.
3.  **Font Foundry & Source:** Identify the foundry or company that created/published this font (e.g., Adobe, Google, Monotype, Linotype, Font Bureau, Indian Type Foundry for Fontshare fonts, etc.). Consider these common font sources:
    - Google Fonts (free, open-source)
    - Adobe Fonts (subscription via Creative Cloud)
    - MyFonts (commercial marketplace)
    - Fontshare (free from Indian Type Foundry)
    - Font Squirrel (free commercial-use fonts)
    - DaFont (mostly free for personal use)
    - Velvetyne (libre fonts)
    - League of Moveable Type (open-source)
    - The Northern Block (commercial foundry)
    - Atipo Foundry (commercial/free options)
4.  **Variable Font:** Determine if the font appears to be a variable font.
5.  **Character Sets:** List the language/script support (Latin, Cyrillic, Greek, Arabic, Hebrew, CJK, etc.).
6.  **Release Year:** Identify when the font was originally released or designed.
7.  **Recommendations:** Suggest appropriate weights, use cases, and business types.
8.  **Font Pairings:** Suggest 2-3 pairings with complementary fonts from Google Fonts and explain why they work.
9.  **Similar Fonts:** Suggest 3-5 similar font alternatives from various sources (Google Fonts, Adobe Fonts, MyFonts, Fontshare, etc.). For each alternative, specify its source and whether it's free or commercial.
10. **Accessibility Audit:** Analyze the font's legibility. Comment on its x-height, character ambiguity (e.g., I/l/1), and general suitability for UI and body text.
11. **Licensing Notes for Commercial Use:** Provide specific guidance for professional designers about:
    - Whether the font is free for commercial projects
    - If a license needs to be purchased and typical cost range
    - Desktop vs web vs app licensing differences
    - Subscription requirements (e.g., Adobe Creative Cloud)
    - Any attribution requirements

If you cannot clearly identify the font or there isn't enough text to analyze, your response must set the status to "not_enough_data" and fill other fields with placeholder text or empty arrays.`;

    if (fontMetadata) {
        prompt += `\n\nCRITICAL: The following metadata was extracted directly from the font file: "${fontMetadata}". Use this to populate the 'licenseInfo' field and help identify the 'fontFoundry'. Summarize any copyright or license information. If the metadata is empty, state that no specific license information was found in the file.`;
    } else {
        prompt += `\n\nCRITICAL: Since this analysis is based on an image or a web font, you cannot determine the license. The 'licenseInfo' field MUST state: "License information cannot be determined from an image or web font. Please identify the font and verify its license from a reputable source."`;
    }

    prompt += `\n\nYour response MUST be a JSON object that conforms to the provided schema. Do not output markdown format (e.g. \`\`\`json).`;

    const filePart = {
        inlineData: {
            data: fileContent,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const contents = { parts: [textPart, filePart] };

    try {
        const response = await retryOperation(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: fontAnalysisSchema,
                },
            })
        );

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (!fontMetadata && result.licenseInfo && !result.licenseInfo.includes("cannot be determined")) {
            result.licenseInfo = "License information cannot be determined from an image or web font. Please identify the font and verify its license from a reputable source.";
        }

        return result as FontAnalysis;

    } catch (error) {
        console.error("Error analyzing font with Gemini:", error);
        throw new Error(parseAPIError(error));
    }
};

/**
 * Main analyzeFont function - routes to appropriate implementation
 *
 * NOTE: Font analysis requires image processing, which Chrome AI (Prompt API) does not support.
 * Therefore, this function ALWAYS uses Cloud AI regardless of the selected mode.
 *
 * This is part of the hybrid approach where:
 * - Image analysis (font analysis, glyph comparison) → Cloud AI only
 * - Text-only operations (font pairing critique) → Can use either mode
 */
export const analyzeFont = async (fileContent: string, mimeType: string, fileName: string, fontMetadata?: string): Promise<FontAnalysis> => {
    // Font analysis requires image processing, so we always use Cloud AI
    // Validate that Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for font analysis but is not available.");
    }

    return analyzeFont_Cloud(fileContent, mimeType, fileName, fontMetadata);
};

const pairingCritiqueSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: {
            type: Type.INTEGER,
            description: "A score from 1 (poor) to 10 (excellent) for how well the two fonts pair together."
        },
        analysis: {
            type: Type.STRING,
            description: "A detailed paragraph explaining the rationale behind the score, discussing harmony, contrast, and suitability for common use cases."
        },
        pros: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of specific strengths of this font pairing."
        },
        cons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of potential weaknesses or considerations for this font pairing."
        }
    },
    required: ['overallScore', 'analysis', 'pros', 'cons']
};

/**
 * Critique font pairing using Chrome AI (built-in Prompt API)
 * Uses the new window.ai.languageModel API with systemPrompt
 */
const critiqueFontPairing_Chrome = async (font1: FontAnalysis, font2: FontAnalysis): Promise<PairingCritique> => {
    if (!window.ai?.languageModel) {
        throw new Error("CHROME_AI_UNAVAILABLE: Chrome AI is not available. Falling back to Cloud AI.");
    }

    const systemPrompt = `ROLE: Internal Typographic Analysis Engine.

KNOWLEDGE BASE:
${FULL_CONSTITUTION}

SCORING NORMALIZATION: Convert 100-point scale to 1-10 integer.
- 0-40 pts = Score 1-3 (Fail) | 41-60 pts = Score 4-5 (Weak)
- 61-80 pts = Score 6-7 (Good) | 81-100 pts = Score 8-10 (Excellent)

TONE: No self-introduction. No meta-references. Direct analysis only.

You MUST respond with ONLY a valid JSON object (no markdown):
{
  "overallScore": <integer 1-10>,
  "analysis": "<objective typographic analysis>",
  "pros": ["<strength 1>", "<strength 2>", ...],
  "cons": ["<weakness 1>", "<weakness 2>", ...]
}`;

    const userPrompt = `Critique this font pairing:

Font 1 (Header): ${font1.fontName} (${font1.fontType})
Font 2 (Body): ${font2.fontName} (${font2.fontType})

Output JSON with score 1-10, analysis, pros, and cons.`;

    let session;
    try {
        session = await window.ai.languageModel.create({
            systemPrompt: systemPrompt
        });

        const response = await session.prompt(userPrompt);
        session.destroy();

        // Strict JSON parsing
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("CHROME_AI_INVALID_RESPONSE: Chrome AI did not return valid JSON. Falling back to Cloud AI.");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (typeof parsed.overallScore !== 'number' || !parsed.analysis || !Array.isArray(parsed.pros) || !Array.isArray(parsed.cons)) {
            throw new Error("CHROME_AI_INVALID_RESPONSE: Chrome AI returned incomplete data. Falling back to Cloud AI.");
        }

        return parsed as PairingCritique;
    } catch (error) {
        // Clean up session if it exists
        if (session) {
            try { session.destroy(); } catch {}
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error critiquing font pairing with Chrome AI:", error);

        // Handle specific Chrome AI errors
        if (errorMessage.includes('NotAvailableError') || errorMessage.includes('not available')) {
            throw new Error("CHROME_AI_NOT_AVAILABLE: The Chrome AI model is not available. Falling back to Cloud AI.");
        }

        if (errorMessage.includes('InvalidStateError') || errorMessage.includes('invalid state')) {
            throw new Error("CHROME_AI_INVALID_STATE: Chrome AI is in an invalid state. Falling back to Cloud AI.");
        }

        // Re-throw errors that already have our prefix
        if (errorMessage.startsWith('CHROME_AI_')) {
            throw error;
        }

        // Generic fallback error
        throw new Error("CHROME_AI_ERROR: Chrome AI failed. Falling back to Cloud AI.");
    }
};

/**
 * Critique font pairing using Cloud AI (Gemini API)
 */
const critiqueFontPairing_Cloud = async (font1: FontAnalysis, font2: FontAnalysis): Promise<PairingCritique> => {
    const ai = getCloudAI();
    const prompt = `ROLE: Internal Typographic Analysis Engine.

KNOWLEDGE BASE:
${FULL_CONSTITUTION}

TASK: Critique this font pairing based strictly on the KNOWLEDGE BASE logic.

INPUT:
- Font 1 (Header): ${font1.fontName} (${font1.fontType})
- Font 2 (Body): ${font2.fontName} (${font2.fontType})

CRITICAL OUTPUT RULES:

1. SCORING NORMALIZATION (CRITICAL):
   - The Knowledge Base uses a 100-point deduction scale. You MUST CONVERT this to a 1-10 integer.
   - 0-40 points in Knowledge Base = Score 1-3 (Fail)
   - 41-60 points = Score 4-5 (Weak)
   - 61-80 points = Score 6-7 (Good)
   - 81-100 points = Score 8-10 (Excellent)
   - The 'overallScore' field MUST be an integer between 1 and 10. Never higher.

2. CRITICAL TIE-BREAKER (OVERRIDE ALL OTHER LOGIC):
   If the pairing triggers ANY of these Red Flags, the score CANNOT exceed 3:
   - Double Display fonts (two display/decorative fonts together)
   - Body text legibility failure (display font used for body, weight < 300 or > 600)
   - Uncanny Valley conflict (two fonts too similar: same category, slight differences)
   - Script + Script pairing
   DO NOT award "artistic merit" if functional legibility is broken. Function > Form.

3. TONE:
   - Do NOT introduce yourself ("As a...", "I am...", etc.)
   - Do NOT reference "the document", "the constitution", or "the knowledge base"
   - Output objective typographic analysis directly and professionally

4. FORMAT: Return ONLY valid JSON matching the schema. No markdown.`;

    try {
        const response = await retryOperation(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: pairingCritiqueSchema,
                    temperature: 0.2, // Low temperature for deterministic, consistent scoring
                },
            })
        );

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PairingCritique;

    } catch (error) {
        console.error("Error critiquing font pairing with Cloud AI:", error);
        throw new Error(parseAPIError(error));
    }
};

/**
 * Main critiqueFontPairing function - routes to appropriate implementation based on current AI mode
 */
export const critiqueFontPairing = async (font1: FontAnalysis, font2: FontAnalysis): Promise<PairingCritique> => {
    const mode = await getAIMode();
    const validation = await validateAIMode(mode);

    if (!validation.valid) {
        throw new Error(validation.error || `${mode} AI is not available.`);
    }

    if (mode === 'chrome') {
        return critiqueFontPairing_Chrome(font1, font2);
    } else {
        return critiqueFontPairing_Cloud(font1, font2);
    }
};


/**
 * Generate funny sentence using Chrome AI
 * Uses the new window.ai.languageModel API
 */
const generateFunnySentence_Chrome = async (): Promise<string> => {
    if (!window.ai?.languageModel) {
        throw new Error("Chrome AI is not available.");
    }

    const prompt = "Generate a single, short, funny sentence that is a pangram (contains all letters of the alphabet). Make it creative and whimsical. Only return the sentence itself, with no extra text or quotation marks.";

    try {
        const session = await window.ai.languageModel.create();
        const response = await session.prompt(prompt);
        session.destroy();
        return response.trim();
    } catch (error) {
        console.error("Error generating sentence with Chrome AI:", error);
        return "The quick brown fox jumps over the lazy dog.";
    }
};

/**
 * Generate funny sentence using Cloud AI
 */
const generateFunnySentence_Cloud = async (): Promise<string> => {
    const ai = getCloudAI();
    const prompt = "Generate a single, short, funny sentence that is a pangram (contains all letters of the alphabet). Make it creative and whimsical. Only return the sentence itself, with no extra text or quotation marks.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating sentence with Cloud AI:", error);
        return "The quick brown fox jumps over the lazy dog.";
    }
};

/**
 * Main generateFunnySentence function - routes to appropriate implementation
 */
export const generateFunnySentence = async (): Promise<string> => {
    try {
        const mode = await getAIMode();
        const validation = await validateAIMode(mode);

        if (!validation.valid) {
            return "The quick brown fox jumps over the lazy dog.";
        }

        if (mode === 'chrome') {
            return await generateFunnySentence_Chrome();
        } else {
            return await generateFunnySentence_Cloud();
        }
    } catch (error) {
        console.error("Error in generateFunnySentence:", error);
        return "The quick brown fox jumps over the lazy dog.";
    }
};

const glyphComparisonSchema = {
    type: Type.OBJECT,
    properties: {
        character: {
            type: Type.STRING,
            description: "The character being compared."
        },
        font1Analysis: {
            type: Type.STRING,
            description: "Analysis of how this character appears in the first font."
        },
        font2Analysis: {
            type: Type.STRING,
            description: "Analysis of how this character appears in the second font."
        },
        differences: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of specific differences between the two glyphs."
        },
        readabilityScore: {
            type: Type.INTEGER,
            description: "A score from 1 (poor) to 10 (excellent) for overall readability and clarity of this character across both fonts."
        }
    },
    required: ['character', 'font1Analysis', 'font2Analysis', 'differences', 'readabilityScore']
};

const glyphComparisonResultSchema = {
    type: Type.OBJECT,
    properties: {
        overallAssessment: {
            type: Type.STRING,
            description: "A paragraph summarizing the overall comparison between the two fonts' glyph characteristics and legibility."
        },
        comparisons: {
            type: Type.ARRAY,
            items: glyphComparisonSchema,
            description: "An array of individual glyph comparisons for the specified characters."
        }
    },
    required: ['overallAssessment', 'comparisons']
};

/**
 * Compare glyphs between two fonts
 *
 * NOTE: This function requires image processing, which Chrome AI (Prompt API) does not support.
 * Therefore, this function ALWAYS uses Cloud AI regardless of the selected mode.
 */
export const compareGlyphs = async (
    font1ImageBase64: string,
    font2ImageBase64: string,
    font1Name: string,
    font2Name: string,
    charactersToCompare: string[] = ['I', 'l', '1', 'O', '0', 'a', 'g', 'q']
): Promise<GlyphComparisonResult> => {
    // Validate that Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for glyph comparison but is not available.");
    }

    const ai = getCloudAI();
    const prompt = `You are a typography expert specializing in glyph analysis and character legibility. Compare the following characters between two fonts:

Font 1: ${font1Name}
Font 2: ${font2Name}

Characters to compare: ${charactersToCompare.join(', ')}

For each character:
1. Analyze how it appears in each font (form, stroke weight, distinguishing features)
2. Identify key differences that affect legibility
3. Note potential confusion with other similar characters
4. Rate the overall readability (1-10, where 10 is perfectly clear and distinct)

Provide an overall assessment of which font has superior glyph clarity and why. Your response MUST be a JSON object conforming to the schema. Do not output markdown format.`;

    const filePart1 = {
        inlineData: {
            data: font1ImageBase64.split(',')[1] || font1ImageBase64,
            mimeType: 'image/png',
        },
    };

    const filePart2 = {
        inlineData: {
            data: font2ImageBase64.split(',')[1] || font2ImageBase64,
            mimeType: 'image/png',
        },
    };

    const textPart = {
        text: prompt,
    };

    const contents = { parts: [textPart, filePart1, filePart2] };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: glyphComparisonResultSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as GlyphComparisonResult;

    } catch (error) {
        console.error("Error comparing glyphs:", error);
        throw new Error(parseAPIError(error));
    }
};

// ===========================
// Font Suggestion Service
// ===========================

const fontAlternativeSchema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: "The name of the premium alternative font"
        },
        source: {
            type: Type.STRING,
            description: "Where to get this font: Adobe Fonts, Fontshare, Monotype, Type Network, etc."
        },
        similarity: {
            type: Type.STRING,
            description: "Brief description of similarity/difference (e.g., '95% match', 'More geometric', 'Higher contrast')"
        }
    },
    required: ['name', 'source', 'similarity']
};

const fontSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        fontName: {
            type: Type.STRING,
            description: "The exact name of the Google Font (primary suggestion with live preview)"
        },
        category: {
            type: Type.STRING,
            description: "The font category: serif, sans-serif, display, handwriting, or monospace"
        },
        rationale: {
            type: Type.STRING,
            description: "2-3 sentences explaining why this font is suitable for the user's requirements"
        },
        useCases: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Specific use cases where this font excels (e.g., Headers, Body Text, Logo)"
        },
        matchScore: {
            type: Type.INTEGER,
            description: "Relevance score from 1-10 indicating how well this font matches the requirements"
        },
        source: {
            type: Type.STRING,
            description: "Where to get this font (should be 'Google Fonts' for primary suggestions)"
        },
        alternatives: {
            type: Type.ARRAY,
            items: fontAlternativeSchema,
            description: "1-2 premium alternatives from Adobe Fonts, Fontshare, or commercial foundries"
        }
    },
    required: ['fontName', 'category', 'rationale', 'useCases', 'matchScore', 'source', 'alternatives']
};

const fontSuggestionResultSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: fontSuggestionSchema,
            description: "Array of 3-5 font recommendations, ranked by relevance"
        },
        searchSummary: {
            type: Type.STRING,
            description: "A brief summary of what was searched for and the approach taken"
        },
        additionalNotes: {
            type: Type.STRING,
            description: "Any additional context or recommendations for the user"
        }
    },
    required: ['suggestions', 'searchSummary']
};

/**
 * Suggests professional typefaces based on user requirements.
 * Uses Gemini AI to recommend fonts from any source (Google, Adobe, commercial foundries).
 *
 * @param request - User's search criteria and preferences
 * @returns Structured font suggestions with rationales and sources
 */
export const suggestFonts = async (
    request: FontSuggestionRequest
): Promise<FontSuggestionResult> => {
    // Validate Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for font suggestions");
    }

    const ai = getCloudAI();

    const maxResults = request.maxResults || 5;

    const prompt = `ROLE: Senior Design Director.

KNOWLEDGE BASE:
${FULL_CONSTITUTION}

---

TASK: Recommend ${maxResults} distinct, high-quality typefaces based on the user's project.

USER'S PROJECT:
${request.description || 'Not specified'}

USAGE: ${request.usageTypes?.join(', ') || 'Not specified'}
MOOD: ${request.themes?.join(', ') || 'Not specified'}
BUSINESS TYPE: ${request.businessTypes?.join(', ') || 'Not specified'}
FONT CATEGORY PREFERENCE: ${request.fontCategories?.join(', ') || 'Any'}

---

DYNAMIC RISK ADJUSTMENT (CRITICAL):
Analyze the user's "Mood" and "Usage" inputs above.

- IF inputs include 'Creative', 'Playful', 'Bold', 'Logo', or 'Display':
  * ACTIVATE "WILD MODE":
  * Suggestions #1, #2, and #3 MUST be "High Character" options (e.g., Expressive Display Serifs, Chunky Slabs, Unique Scripts, Geometric Display, or Experimental typefaces). ABSOLUTELY NO standard neutral Sans-Serifs (Open Sans, Roboto, Inter, Lato) in these slots.
  * Suggestions #4 and #5 can be "Safe Anchors" (Professional, highly legible options) to balance the list.

- ELSE (if "Corporate", "Minimal", "Finance", "Legal", "Healthcare"):
  * ACTIVATE "STABILITY MODE":
  * Prioritize stability, legibility, and professionalism across all suggestions.
  * Still avoid clichés - suggest refined, distinguished options (not just the obvious choices).

---

SOURCE MANDATE (CRITICAL):
1. GOOGLE FONTS PRIORITY: You MUST prioritize Google Fonts for 100% of suggestions whenever possible to ensure the user can see the Live Preview.
2. DIG DEEP: Do NOT just suggest "Open Sans". Use your knowledge of the full 1600+ Google Fonts library to find "Wild" and "Creative" options that match commercial vibes.
   - Instead of "Futura" (Paid) -> Suggest "Jost" or "Kumbh Sans" (Google).
   - Instead of "Ogg" (Paid) -> Suggest "Fraunces" or "Playfair Display" (Google).
   - Instead of "Druk" (Paid) -> Suggest "Anton" or "Six Caps" (Google).
   - Instead of "Proxima Nova" (Paid) -> Suggest "Nunito Sans" or "Outfit" (Google).
   - Instead of "Gotham" (Paid) -> Suggest "Poppins" or "Manrope" (Google).
   - Instead of "Brandon Grotesque" (Paid) -> Suggest "Nunito" or "Lexend" (Google).
3. COMMERCIAL FALLBACK: Only suggest a non-Google font if the requested mood is IMPOSSIBLE to achieve with Google Fonts. This should be extremely rare (<5% of suggestions).
4. CLICHÉ BAN: Absolutely NO 'Lobster', 'Bebas Neue', 'Pacifico', 'Comic Sans', 'Papyrus', or 'Bleeding Cowboys'. Refer to Section 4 of Knowledge Base.

HIERARCHY RULES (Section 3):
- IF Role="Header/Display": Suggest Display/Serif/High-Contrast Sans. NO generic body text fonts (e.g., Open Sans, Roboto for headers).
- IF Role="Body Text": Suggest highly legible Text fonts with good x-height and open apertures.

---

PREMIUM MAPPING (CRITICAL):
For EACH Google Font suggestion, you MUST provide 1-2 "Premium Alternatives" from sources like Adobe Fonts, Fontshare, Monotype, or commercial foundries.
- These alternatives should be the "Pro" version of the style the Google Font represents.
- Examples:
  * If suggesting "Jost" -> list "Futura" (Adobe Fonts) as alternative
  * If suggesting "Fraunces" -> list "Ogg" or "Canela" (Commercial) as alternatives
  * If suggesting "Poppins" -> list "Gotham" or "Proxima Nova" (Adobe Fonts) as alternatives
  * If suggesting "Playfair Display" -> list "Didot" or "Bodoni" (Adobe Fonts) as alternatives
- This allows users to see a free preview (Google) but find the pro version if they have a subscription.

---

FOR EACH SUGGESTION PROVIDE:
- fontName: Exact Google Font name (for live preview)
- category: serif, sans-serif, display, handwriting, or monospace
- rationale: 2-3 sentences explaining fit using typographic principles
- useCases: Array of use cases (Headers, Body Text, Logo, UI, etc.)
- matchScore: 1-10 relevance score
- source: "Google Fonts" (primary suggestions must be Google Fonts)
- alternatives: Array of 1-2 premium alternatives, each with:
  * name: Font name (e.g., "Futura")
  * source: Where to get it (e.g., "Adobe Fonts", "Fontshare", "Monotype")
  * similarity: Brief comparison (e.g., "95% match", "More refined curves", "Higher contrast")

Order by match score (highest first). Do NOT introduce yourself or reference internal documents.

Your response MUST be a JSON object conforming to the schema. No markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: fontSuggestionResultSchema,
                temperature: 0.2, // Low temperature for consistent, deterministic suggestions
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as FontSuggestionResult;

    } catch (error) {
        console.error("Error getting font suggestions:", error);
        throw new Error(parseAPIError(error));
    }
};

// ===========================
// Font DNA Matching Service
// ===========================

const fontDNAMatchSchema = {
    type: Type.OBJECT,
    properties: {
        fontName: {
            type: Type.STRING,
            description: "The name of the similar font"
        },
        source: {
            type: Type.STRING,
            description: "Where to get this font (Google Fonts, Adobe Fonts, MyFonts, Fontshare, etc.)"
        },
        matchScore: {
            type: Type.INTEGER,
            description: "Similarity score from 1-100 indicating how closely this matches the reference font"
        },
        visualSimilarity: {
            type: Type.STRING,
            description: "Description of the visual characteristics that make this font similar (stroke weight, x-height, proportions, etc.)"
        },
        differingCharacteristics: {
            type: Type.STRING,
            description: "What makes this font different or unique compared to the reference"
        },
        bestUseCase: {
            type: Type.STRING,
            description: "When to use this alternative instead of the reference font"
        },
        isPremium: {
            type: Type.BOOLEAN,
            description: "Whether this font requires a paid license"
        },
        directLink: {
            type: Type.STRING,
            description: "Direct URL to the font's page on its source website"
        }
    },
    required: ['fontName', 'source', 'matchScore', 'visualSimilarity', 'differingCharacteristics', 'bestUseCase', 'isPremium']
};

const fontDNAResultSchema = {
    type: Type.OBJECT,
    properties: {
        referenceFont: {
            type: Type.STRING,
            description: "The name of the font being analyzed"
        },
        totalMatches: {
            type: Type.INTEGER,
            description: "Total number of similar fonts found"
        },
        matches: {
            type: Type.ARRAY,
            items: fontDNAMatchSchema,
            description: "Array of 5-10 similar fonts, sorted by match score"
        },
        analysisNotes: {
            type: Type.STRING,
            description: "AI commentary on the matching process and what characteristics were used to find similar fonts"
        },
        characteristics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Key visual DNA characteristics identified in the reference font that were used for matching (e.g., 'high x-height', 'humanist sans-serif', 'geometric forms')"
        }
    },
    required: ['referenceFont', 'totalMatches', 'matches', 'analysisNotes', 'characteristics']
};

/**
 * Find similar fonts based on a reference font's "DNA" (visual characteristics)
 *
 * @param referenceFont - The FontAnalysis of the font to find alternatives for
 * @returns FontDNAResult with 5-10 similar fonts from various sources
 */
export const findSimilarFonts = async (referenceFont: FontAnalysis): Promise<FontDNAResult> => {
    // Validate Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for Font DNA matching");
    }

    const ai = getCloudAI();

    const prompt = `You are a typography expert specializing in font matching and alternatives. Your task is to find fonts that are visually similar to a reference font, useful when designers need alternatives for licensing, cost, or availability reasons.

REFERENCE FONT ANALYSIS:
- Name: ${referenceFont.fontName}
- Type: ${referenceFont.fontType}
- Designer: ${referenceFont.designer}
- Foundry: ${referenceFont.fontFoundry || 'Unknown'}
- Analysis: ${referenceFont.analysis}
- Historical Context: ${referenceFont.historicalContext}

TASK:
Find 5-10 fonts that share similar visual DNA with the reference font. Consider these characteristics when matching:

1. **Structural DNA:**
   - Serif style (hairline, slab, bracketed, etc.) or sans-serif construction
   - Stroke contrast and weight distribution
   - x-height and proportions
   - Letter width and spacing characteristics

2. **Personality DNA:**
   - Geometric vs humanist vs grotesque forms
   - Formal vs informal feeling
   - Modern vs classic aesthetic
   - Technical vs organic character shapes

3. **Practical DNA:**
   - Similar use cases (body text, headlines, UI)
   - Comparable legibility at different sizes
   - Weight/style range availability

REQUIREMENTS:
- Include fonts from MULTIPLE sources (mix free and premium):
  * Google Fonts (free)
  * Adobe Fonts (subscription)
  * Fontshare (free)
  * MyFonts (commercial)
  * Font Squirrel (free commercial-use)
  * Other reputable foundries
- Sort by match score (highest first)
- Be specific about visual similarities
- Explain when each alternative would be preferable
- Include direct links where possible (e.g., https://fonts.google.com/specimen/FontName)

Your response MUST be a JSON object conforming to the schema. Do not output markdown format.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: fontDNAResultSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as FontDNAResult;

    } catch (error) {
        console.error("Error finding similar fonts:", error);
        throw new Error(parseAPIError(error));
    }
};

// ===========================
// Typography Context Service
// ===========================

const typographyContextSchema = {
    type: Type.OBJECT,
    properties: {
        fontName: {
            type: Type.STRING,
            description: "The name of the font being analyzed"
        },
        historicalUsage: {
            type: Type.STRING,
            description: "Detailed historical usage of this font, including when it was popular and how its usage has evolved over time"
        },
        currentTrends: {
            type: Type.STRING,
            description: "Current typography trends in 2025 and how this font fits into them. Is it trending up, classic and timeless, or fading?"
        },
        pairingTrends: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of 3-5 fonts that are commonly paired with this font in professional design work"
        },
        recommendations: {
            type: Type.STRING,
            description: "Professional recommendations for when and how to use this font effectively"
        },
        culturalContext: {
            type: Type.STRING,
            description: "Cultural or regional considerations - is this font more popular in certain regions? Any cultural associations to be aware of?"
        }
    },
    required: ['fontName', 'historicalUsage', 'currentTrends', 'pairingTrends', 'recommendations', 'culturalContext']
};

/**
 * Get typography context and trends for a font
 *
 * @param fontAnalysis - The FontAnalysis of the font to get context for
 * @returns TypographyContextResult with historical usage, trends, and recommendations
 */
export const getTypographyContext = async (fontAnalysis: FontAnalysis): Promise<import('../types').TypographyContextResult> => {
    // Validate Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for typography context");
    }

    const ai = getCloudAI();

    const prompt = `You are a typography historian and trends expert. Provide comprehensive context about a font's usage, history, and current relevance in professional design.

FONT INFORMATION:
- Name: ${fontAnalysis.fontName}
- Type: ${fontAnalysis.fontType}
- Designer: ${fontAnalysis.designer}
- Foundry: ${fontAnalysis.fontFoundry || 'Unknown'}
- Historical Context: ${fontAnalysis.historicalContext}
- Analysis: ${fontAnalysis.analysis}

TASK:
Provide detailed typography context including:

1. **Historical Usage**: When was this font most popular? How has its usage evolved over time? Describe historical applications in print, advertising, signage, etc.

2. **Current Trends (2025)**: Is this font trending? Part of a resurgence? A timeless classic? How does it fit into current design movements (minimalism, neo-brutalism, Y2K revival, etc.)?

3. **Common Pairings**: What fonts are professionals typically pairing with this one?

4. **Professional Recommendations**: Best practices for using this font effectively. What to avoid. Optimal use cases.

5. **Cultural Context**: Regional popularity, cultural associations, any considerations designers should be aware of.

Your response MUST be a JSON object conforming to the schema. Do not output markdown format.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: typographyContextSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error getting typography context:", error);
        throw new Error(parseAPIError(error));
    }
};

// ===========================
// Batch Compatibility Matrix
// ===========================

const pairingScoreSchema = {
    type: Type.OBJECT,
    properties: {
        font1: {
            type: Type.STRING,
            description: "Name of the first font in the pairing"
        },
        font2: {
            type: Type.STRING,
            description: "Name of the second font in the pairing"
        },
        score: {
            type: Type.INTEGER,
            description: "Compatibility score from 1-10"
        },
        quickNote: {
            type: Type.STRING,
            description: "Brief 1-2 sentence note about why this pairing works or doesn't work"
        }
    },
    required: ['font1', 'font2', 'score', 'quickNote']
};

const batchCompatibilitySchema = {
    type: Type.OBJECT,
    properties: {
        fonts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of font names that were analyzed"
        },
        pairings: {
            type: Type.ARRAY,
            items: pairingScoreSchema,
            description: "All pairwise compatibility scores for the fonts"
        },
        topPairings: {
            type: Type.ARRAY,
            items: pairingScoreSchema,
            description: "Top 3 best font pairings from the set"
        },
        worstPairings: {
            type: Type.ARRAY,
            items: pairingScoreSchema,
            description: "Bottom 3 worst font pairings from the set"
        },
        overallNotes: {
            type: Type.STRING,
            description: "General observations about the font collection and how well it works together as a system"
        }
    },
    required: ['fonts', 'pairings', 'topPairings', 'worstPairings', 'overallNotes']
};

/**
 * Analyze compatibility between multiple fonts in batch
 * Creates a compatibility matrix showing how well each font pairs with others
 *
 * @param fonts - Array of FontAnalysis objects to compare
 * @returns BatchCompatibilityResult with pairwise scores and recommendations
 */
export const analyzeBatchCompatibility = async (fonts: FontAnalysis[]): Promise<BatchCompatibilityResult> => {
    // Validate Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for batch compatibility analysis");
    }

    if (fonts.length < 2) {
        throw new Error("At least 2 fonts are required for compatibility analysis");
    }

    if (fonts.length > 8) {
        throw new Error("Maximum 8 fonts can be analyzed at once");
    }

    const ai = getCloudAI();

    // Build font descriptions for the prompt
    const fontDescriptions = fonts.map((font, index) =>
        `${index + 1}. **${font.fontName}**
   - Type: ${font.fontType}
   - Characteristics: ${font.analysis.substring(0, 200)}...`
    ).join('\n\n');

    const prompt = `ROLE: Internal Typographic Analysis Engine.

KNOWLEDGE BASE:
${FULL_CONSTITUTION}

---

FONTS TO ANALYZE:
${fontDescriptions}

---

TASK:
Analyze every possible pairing between these ${fonts.length} fonts.

CRITICAL OUTPUT RULES:

1. SCORING NORMALIZATION (CRITICAL):
   - Grading Scale: 1 (Conflict) to 10 (Perfect)
   - Convert all 100-point deductions from Knowledge Base to this 1-10 scale:
     * 0-40 pts = Score 1-3 (Fail/Conflict)
     * 41-60 pts = Score 4-5 (Weak)
     * 61-80 pts = Score 6-7 (Good)
     * 81-100 pts = Score 8-10 (Excellent)
   - All scores MUST be integers between 1 and 10. Never higher.

2. CRITICAL TIE-BREAKER (OVERRIDE ALL OTHER LOGIC):
   If ANY pairing triggers these Red Flags, that pairing's score CANNOT exceed 3:
   - Double Display fonts (two display/decorative fonts together)
   - Body text legibility failure (display font as body, extreme weights)
   - Uncanny Valley conflict (two fonts too similar: same category, slight differences)
   - Script + Script pairing
   DO NOT award "artistic merit" if functional legibility is broken. Function > Form.

3. TONE:
   - Do NOT introduce yourself or reference internal documents
   - Output objective analysis directly

For each pairing, provide:
1. **Score**: Integer 1-10 (converted from 100-point scale, capped at 3 if Red Flag present)
2. **Quick Note**: 1-2 sentences with specific typographic rationale

ALSO PROVIDE:
- Top 3 best pairings (rank them even if mediocre)
- Bottom 3 worst pairings with specific reasons
- Overall assessment of this font collection

FORMAT: Return ONLY valid JSON matching the schema. No markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: batchCompatibilitySchema,
                temperature: 0.2, // Low temperature for deterministic, consistent scoring
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as BatchCompatibilityResult;

    } catch (error) {
        console.error("Error analyzing batch compatibility:", error);
        throw new Error(parseAPIError(error));
    }
};
