# Translate Helper

A Chrome extension for quick translation: from any language into your main language (Russian by default), and from your main language into a secondary one (English by default).

## Features

- Translate selected text: select text on a page and open the popup (`Alt+Q` or the toolbar icon).
- The "Translate text" item in the right-click menu opens Google Translate with the selected text.
- **Chrome AI** (default): on-device translation with Chrome's built-in Translator and Language Detector APIs. If a language model is missing, the popup offers to download it and uses Google Translate in the meantime.
- **Google Translate API**: the fallback, which can also be selected in the options.
- Main and secondary languages are set in the options. Light and dark themes are supported.

## Development

```sh
git clone https://github.com/iliyaking46/translate-chrome-extension.git
```

1. Open `chrome://extensions` and turn on Developer mode.
2. Click "Load unpacked" and select the repository folder.

There is no build step: after making changes, click the reload button on the extension card.

## Building for the Chrome Web Store

```sh
./build.sh
```

The script reads the version from `manifest.json` and creates `dist/translate-helper-<version>.zip`. Bump `version` in the manifest before each new upload.

## Privacy

See [PRIVACY.md](PRIVACY.md).
