import { GoogleGenAI, Type } from "@google/genai";
import type { FontAnalysis, PairingCritique, GlyphComparisonResult, AIMode, FontSuggestionRequest, FontSuggestionResult } from '../types';
import { getAIMode, getAPIKey, validateAIMode } from '../utils/aiSettings';

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
        description: "An array of 3-5 similar fonts from well-known libraries like Google Fonts.",
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
  },
  required: ['status', 'fontName', 'fontType', 'analysis', 'designer', 'historicalContext', 'isVariable', 'weightRecommendations', 'usageRecommendations', 'businessSuitability', 'fontPairings', 'similarFonts', 'accessibility', 'licenseInfo']
};

/**
 * Analyze font using Cloud AI (Gemini API)
 * This function processes images and requires an API key
 */
const analyzeFont_Cloud = async (fileContent: string, mimeType: string, fileName: string, fontMetadata?: string): Promise<FontAnalysis> => {
    const ai = getCloudAI();
    let prompt = `You are a world-class typographer and font analyst. Your task is to analyze the provided image which contains text. The original filename was "${fileName}".
Based on your analysis, provide a detailed breakdown covering these areas:
1.  **Core Analysis:** Identify the font, its type, its designer/foundry, and describe its characteristics, personality, and mood.
2.  **Historical Context:** Detail the font's history and the influences behind its design.
3.  **Variable Font:** Determine if the font appears to be a variable font.
4.  **Recommendations:** Suggest appropriate weights, use cases, and business types.
5.  **Font Pairings:** Suggest 2-3 pairings with complementary fonts from Google Fonts and explain why they work.
6.  **Similar Fonts:** Suggest 3-5 similar font alternatives from Google Fonts.
7.  **Accessibility Audit:** Analyze the font's legibility. Comment on its x-height, character ambiguity (e.g., I/l/1), and general suitability for UI and body text.

If you cannot clearly identify the font or there isn't enough text to analyze, your response must set the status to "not_enough_data" and fill other fields with placeholder text or empty arrays.`;

    if (fontMetadata) {
        prompt += `\n\nCRITICAL: The following metadata was extracted directly from the font file: "${fontMetadata}". Use this to populate the 'licenseInfo' field. Summarize any copyright or license information. If the metadata is empty, state that no specific license information was found in the file.`;
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: fontAnalysisSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (!fontMetadata && result.licenseInfo && !result.licenseInfo.includes("cannot be determined")) {
            result.licenseInfo = "License information cannot be determined from an image or web font. Please identify the font and verify its license from a reputable source.";
        }

        return result as FontAnalysis;

    } catch (error) {
        console.error("Error analyzing font with Gemini:", error);
        throw new Error("Failed to get a valid analysis from the AI model.");
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
 * Uses the new window.ai.languageModel API
 */
const critiqueFontPairing_Chrome = async (font1: FontAnalysis, font2: FontAnalysis): Promise<PairingCritique> => {
    if (!window.ai?.languageModel) {
        throw new Error("Chrome AI is not available. Please enable it or switch to Cloud AI mode.");
    }

    const prompt = `You are a typography expert. Critique the pairing of two fonts.

Font 1 (likely for headlines):
- Name: ${font1.fontName}
- Type: ${font1.fontType}
- Analysis: ${font1.analysis}

Font 2 (likely for body text):
- Name: ${font2.fontName}
- Type: ${font2.fontType}
- Analysis: ${font2.analysis}

Evaluate their harmony, contrast, x-height relationship, and overall effectiveness. Provide a score from 1-10 and a detailed analysis.

You MUST respond with ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "overallScore": <number 1-10>,
  "analysis": "<detailed paragraph>",
  "pros": ["<strength 1>", "<strength 2>", ...],
  "cons": ["<weakness 1>", "<weakness 2>", ...]
}`;

    try {
        const session = await window.ai.languageModel.create();
        const response = await session.prompt(prompt);
        session.destroy();

        // Parse the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Chrome AI did not return valid JSON");
        }

        return JSON.parse(jsonMatch[0]) as PairingCritique;
    } catch (error) {
        console.error("Error critiquing font pairing with Chrome AI:", error);
        throw new Error("Failed to get a valid critique from Chrome AI.");
    }
};

/**
 * Critique font pairing using Cloud AI (Gemini API)
 */
const critiqueFontPairing_Cloud = async (font1: FontAnalysis, font2: FontAnalysis): Promise<PairingCritique> => {
    const ai = getCloudAI();
    const prompt = `You are a typography expert. Critique the pairing of two fonts.
Font 1 (likely for headlines):
- Name: ${font1.fontName}
- Type: ${font1.fontType}
- Analysis: ${font1.analysis}

Font 2 (likely for body text):
- Name: ${font2.fontName}
- Type: ${font2.fontType}
- Analysis: ${font2.analysis}

Evaluate their harmony, contrast, x-height relationship, and overall effectiveness. Provide a score from 1-10 and a detailed analysis. Your response MUST be a JSON object conforming to the schema. Do not output markdown format.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: pairingCritiqueSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PairingCritique;

    } catch (error) {
        console.error("Error critiquing font pairing with Cloud AI:", error);
        throw new Error("Failed to get a valid critique from Cloud AI.");
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
        throw new Error("Failed to get a valid comparison from the AI model.");
    }
};

// ===========================
// Font Suggestion Service
// ===========================

const fontSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        fontName: {
            type: Type.STRING,
            description: "The name of the Google Font (must match exactly from the provided list)"
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
        }
    },
    required: ['fontName', 'category', 'rationale', 'useCases', 'matchScore']
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
 * Suggests Google Fonts based on user requirements.
 * Uses Gemini AI to intelligently filter and rank fonts.
 *
 * @param request - User's search criteria and preferences
 * @param availableFonts - Array of font names to choose from
 * @returns Structured font suggestions with rationales
 */
export const suggestFonts = async (
    request: FontSuggestionRequest,
    availableFonts: string[]
): Promise<FontSuggestionResult> => {
    // Validate Cloud AI is available
    const validation = await validateAIMode('cloud');
    if (!validation.valid) {
        throw new Error(validation.error || "Cloud AI is required for font suggestions");
    }

    const ai = getCloudAI();

    // Build categories description
    const categoriesDesc: string[] = [];
    if (request.usageTypes?.length) {
        categoriesDesc.push(`Usage Types: ${request.usageTypes.join(', ')}`);
    }
    if (request.businessTypes?.length) {
        categoriesDesc.push(`Business Types: ${request.businessTypes.join(', ')}`);
    }
    if (request.themes?.length) {
        categoriesDesc.push(`Themes: ${request.themes.join(', ')}`);
    }
    if (request.fontCategories?.length) {
        categoriesDesc.push(`Font Categories: ${request.fontCategories.join(', ')}`);
    }

    const maxResults = request.maxResults || 5;

    // Limit font list to prevent token overflow (top 800 is reasonable)
    const fontList = availableFonts.slice(0, 800);

    const prompt = `You are an expert typography consultant specializing in font selection for digital and print projects. Your task is to recommend Google Fonts based on the user's requirements.

USER'S PROJECT:
${request.description || 'Not specified'}

SELECTED CATEGORIES:
${categoriesDesc.length > 0 ? categoriesDesc.join('\n') : 'None specified'}

AVAILABLE GOOGLE FONTS (${fontList.length} total):
${fontList.join(', ')}

INSTRUCTIONS:
1. Analyze the user's requirements carefully
2. Select ${maxResults} fonts from the available Google Fonts list that best match the criteria
3. For each font, provide:
   - The exact font name (must match the list exactly, case-sensitive)
   - Font category (serif, sans-serif, display, handwriting, monospace)
   - Clear rationale (2-3 sentences) explaining why it fits
   - Specific use cases (Headers, Body Text, Logo, UI, etc.)
   - Match score (1-10) based on relevance

4. Prioritize:
   - Versatility: Fonts with multiple weights/styles when possible
   - Readability: Especially for body text use cases
   - Appropriateness: Match the business type and theme
   - Availability: Only recommend fonts from the provided list

5. Order suggestions by match score (highest first)

IMPORTANT:
- Font names must EXACTLY match the provided list (case-sensitive)
- Do not recommend fonts not in the list
- Provide diverse suggestions (mix of serif/sans-serif if appropriate)
- Consider pairing potential if user needs multiple font types

Your response MUST be a JSON object conforming to the schema. Do not output markdown format.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: fontSuggestionResultSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as FontSuggestionResult;

    } catch (error) {
        console.error("Error getting font suggestions:", error);
        throw new Error("Failed to get font suggestions from AI.");
    }
};
