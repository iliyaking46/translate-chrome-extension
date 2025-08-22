# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a vanilla JavaScript Chrome extension with no build process required.

### No Build Process
- Direct JavaScript development - no compilation needed
- Changes take effect after extension reload in Chrome
- No package.json, dependencies, or build tools used

## Architecture Overview

### Chrome Extension Structure (Manifest V3)
- **Background Service Worker**: `background.js` - handles context menus and tab integration
- **Popup Interface**: `popup.html/js/css` - main translation UI with keyboard shortcut (Alt+Q)
- **Options Page**: `options.html` - user settings configuration
- **Content Scripts**: None - uses scripting API for text selection

### Translation System Architecture

#### Dual Translation Methods
1. **Chrome Built-in AI** (`ai-translator.js`) - Primary method using experimental Chrome AI Translation API
2. **Google Translate API** (`api-translator.js`) - Fallback using unofficial Google Translate endpoint

#### Language Detection System
- **Chrome AI Language Detection**: Primary detection using `LanguageDetector.create()`
- **Pattern-based Fallback**: Regex patterns for 15+ languages with confidence scoring
- **Smart Direction Logic**: Auto-determines Russian ↔ English translation direction

### Key Modules

#### Core Translation Logic
- `popup.js` - Main UI controller with debounced translation (500ms delay)
- `settings.js` - Chrome storage sync management with graceful fallbacks
- `languages.js` - Comprehensive language mapping (100+ languages)

#### Translation Flow
1. Text input → Language detection (AI → pattern matching)
2. Settings check → Determine source/target languages  
3. Translation method selection (AI preferred → API fallback)
4. Result display → Update UI with detected language info

### Storage & Settings
- **Chrome Sync Storage**: Cross-device settings persistence
- **Default Configuration**: AI translation method, Russian/English languages
- **Graceful Degradation**: Multiple fallback layers for reliability

### UI Patterns
- **Progressive Enhancement**: AI-first with API fallbacks
- **Visual Feedback**: Loading states, language swap animations
- **Auto-selection**: Captures selected text from active tab
- **Responsive Design**: Adapts for content over 300 characters

## Development Notes

### Language Detection Logic
The extension uses a two-tier detection system:
1. Chrome AI detection (when available)
2. Regex pattern matching for Cyrillic, Latin, CJK, and other scripts

### Error Handling Strategy
- Multiple fallback layers ensure translation always works
- Chrome AI unavailable → falls back to Google Translate API
- API fails → provides user-friendly error messages
- Storage unavailable → uses default settings

### Extension Permissions
- `scripting` - for text selection from web pages
- `activeTab` - for accessing current tab content
- `contextMenus` - for right-click translation
- `storage` - for settings persistence

### Security Considerations
- Uses minimal required permissions
- No sensitive data storage
- External API calls only to Google Translate