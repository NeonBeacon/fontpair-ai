<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# FontPair AI

AI-powered font pairing critique and analysis tool for professional designers. Upload fonts or images to get expert AI evaluation, compare glyph legibility, analyze accessibility, and receive detailed pairing recommendations with reasoning.

View your app in AI Studio: https://ai.studio/apps/drive/1KkjXGcoHACEU3kUjB3sdn_KZ3kcD82px

## Features

- **Dual AI Mode**: Switch between Cloud AI (Gemini API) and Chrome AI (local, experimental)
- **Font Analysis**: Upload font files or images for detailed AI-powered typography analysis
- **Font Pairing Critique**: Get AI suggestions for combining fonts effectively
- **Glyph Comparison**: Visual analysis of character differences between fonts
- **License System**: Supabase-based one-time payment validation with device management

## Quick Start

**Prerequisites:** Node.js

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env.local`
   - Set your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - (Optional) Configure Supabase for license validation - see [LICENSE_SETUP.md](LICENSE_SETUP.md)

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Open [http://localhost:3000](http://localhost:3000)

## License System Setup

This app includes a complete license key validation system powered by Supabase. For full setup instructions, see [LICENSE_SETUP.md](LICENSE_SETUP.md).

## Development

```bash
# Install dependencies
npm install

# Run dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Documentation

- [LICENSE_SETUP.md](LICENSE_SETUP.md) - Complete guide for setting up the Supabase license system
- [CLAUDE.md](CLAUDE.md) - Technical documentation for AI assistants
- [supabase-schema.sql](supabase-schema.sql) - Database schema for license system

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Google Gemini API
- Supabase (PostgreSQL)
- FingerprintJS
