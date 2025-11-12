# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FontPair AI** is an AI-powered font pairing critique and analysis tool built with React, TypeScript, and Vite. It uses Google's Gemini AI to analyze fonts from uploaded files, images, or Google Fonts, providing detailed typography insights including characteristics, usage recommendations, accessibility analysis, and professional font pairing suggestions with scoring and rationale.

## Development Commands

### Essential Commands
- **Install dependencies**: `npm install`
- **Start dev server**: `npm run dev` (runs on port 3000)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

### Environment Setup
Before running the app, set `GEMINI_API_KEY` in `.env.local` at the project root. The Vite config (vite.config.ts:14-15) exposes this as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

## Architecture

### Core Application Flow

1. **Two-Column Comparison View** (App.tsx): The main interface displays two `AnalysisColumn` components side-by-side for comparing fonts. Users can also view shared analyses via URL hash.

2. **Font Input Methods** (AnalysisColumn.tsx):
   - **Upload Mode**: Accept font files (.ttf, .otf, .woff, .woff2) or images of text
   - **Google Fonts Mode**: Select from curated list of popular Google Fonts

3. **Analysis Pipeline** (AnalysisColumn.tsx:60-100):
   - Uses `html2canvas` to capture a visual snapshot of the `FontPreview` component
   - Converts canvas to base64 PNG image
   - For font files: extracts metadata (copyright, license, designer) using opentype.js parser
   - Sends image + metadata to Gemini AI via `geminiService.analyzeFont()`
   - Returns structured `FontAnalysis` object with 14 required fields

4. **AI Integration** (services/geminiService.ts):
   - Uses `@google/genai` SDK with `gemini-2.5-flash` model
   - Employs **structured output** with JSON schemas for predictable responses
   - Three main functions:
     - `analyzeFont()`: Font analysis with 14-field schema (types.ts:26-41)
     - `critiqueFontPairing()`: Compares two fonts with scoring (1-10)
     - `generateFunnySentence()`: Creates pangrams for font preview

### Key Architectural Patterns

**Structured AI Responses**: All Gemini API calls use `responseMimeType: 'application/json'` with explicit `responseSchema` definitions. Schemas use `Type.OBJECT`, `Type.STRING`, `Type.ARRAY`, etc. from `@google/genai` to ensure type-safe, predictable responses.

**Font Preview System**:
- `FontPreview` component renders text using either uploaded font files (via opentype.js) or Google Fonts (via dynamic stylesheet injection)
- Supports customizable background/text colors for better visualization
- For font files: parses with opentype.js to extract variable font axes and metadata
- Preview is captured as PNG before analysis to provide visual context to AI

**Shared Analysis**: Font analyses can be shared via URL hash containing base64-encoded JSON. The hash is parsed on mount (App.tsx:18-41) to display read-only shared results.

**Font Pairing Critique**: When both columns have analyses, a "Critique Pairing" button appears (App.tsx:97-109) that uses AI to evaluate the harmony between fonts.

### TypeScript Types (types.ts)

All AI responses conform to interfaces defined in types.ts:
- `FontAnalysis`: 14 fields including status, fontName, analysis, designer, historicalContext, accessibility, similarFonts, etc.
- `PairingCritique`: overallScore (1-10), analysis, pros[], cons[]
- `FontAccessibility`: analysis + specific notes array
- `SimilarFont`: name, source, rationale
- `FontPairing`: primary, secondary, rationale

### Service Layer

**geminiService.ts**: All AI interactions use structured schemas to enforce response format. Error handling wraps API calls with try/catch and throws descriptive errors.

**googleFontsService.ts**: Returns curated static list of 49 popular Google Fonts (sorted alphabetically). Could be extended to fetch from Google Fonts API.

**fontUtils.ts**: Provides descriptions for standard variable font axes (wght, wdth, slnt, ital, opsz).

**fileUtils.ts**: Converts File objects to base64 strings for API transmission.

## Component Structure

- **App.tsx**: Root component managing shared/comparison modes and font pairing critique
- **AnalysisColumn.tsx**: Main column logic including file upload, Google Fonts selection, preview rendering, and analysis triggering
- **AnalysisResult.tsx**: Displays formatted analysis with sections for each field
- **FontPreview.tsx**: Renders font preview with color customization; handles both file and Google Fonts rendering
- **FileUpload.tsx**: Drag-and-drop and click-to-upload interface
- **GoogleFontSearch.tsx**: Searchable dropdown for Google Fonts selection
- **PairingCritiqueModal.tsx**: Modal displaying font pairing critique results
- **Loader.tsx**: Loading spinner
- **Icons.tsx**: SVG icon components

## Critical Implementation Details

### License Information Handling
The AI is explicitly instructed (geminiService.ts:146-150) to:
- For font files: summarize license info from extracted metadata
- For images/web fonts: state "License information cannot be determined from an image or web font"
- Post-processing enforces this constraint (geminiService.ts:180-182)

### Font File Metadata Extraction
When analyzing font files (AnalysisColumn.tsx:78-84), the code extracts `copyright`, `license`, and `designer` from opentype.js parsed font names table and passes to AI as context.

### Variable Font Detection
The AI determines if a font is variable (`isVariable` boolean) based on visual analysis. For uploaded font files, opentype.js parses actual variable axes data displayed in the preview.

### html2canvas Dependency
The app relies on `html2canvas` loaded via CDN (check index.html). It's declared as `declare var html2canvas: any` in AnalysisColumn.tsx:11 to avoid TypeScript errors.

## Path Aliases

Both tsconfig.json and vite.config.ts define `@/*` as an alias to the project root (`./*`), allowing imports like `@/types` or `@/services/geminiService`.

## AI Studio Integration

This project was generated by Google AI Studio (https://ai.studio/apps/drive/1KkjXGcoHACEU3kUjB3sdn_KZ3kcD82px). The metadata.json file contains app description and permissions.
