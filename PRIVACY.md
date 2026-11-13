# Privacy Policy — Translate Helper

_Last updated: November 13, 2026_

Translate Helper is a Chrome extension that translates text you select on a web page or type into its popup. This policy explains what data the extension handles and where it goes.

## What the extension does not do

- It does not collect, store, sell or share personal data.
- It has no analytics, tracking, advertising or user accounts.
- It does not read pages in the background. Selected text is read only from the active tab, and only when you open the popup.

## Text you translate

The text you select or type is used only to translate it:

- **Chrome built-in AI (default).** Translation and language detection run on your device through Chrome's built-in Translator and Language Detector APIs. The text is not sent anywhere by the extension.
- **Google Translate.** If you choose the API method, or the built-in AI is unavailable for a language pair, the text is sent to `translate.googleapis.com` to get the translation. The link "Translate on Google" and the right-click menu item open `translate.google.com` with the text in the address. These requests are handled by Google under the [Google Privacy Policy](https://policies.google.com/privacy).

The extension does not keep a history of translated text.

## Settings

Your settings (translation method, main and secondary language) are stored with `chrome.storage.sync`, so Chrome may sync them across your signed-in browsers. They are not sent to the developer or any third party.

## Fonts

The popup and options page load the Inter font from Google Fonts (`fonts.googleapis.com`), which means Google receives a standard request from your browser for the font files.

## Permissions

- `activeTab`, `scripting` — read the text you selected in the current tab when you open the popup.
- `contextMenus` — add the "Translate text" item to the right-click menu.
- `storage` — save your settings.
- `https://translate.googleapis.com/*` — request translations from Google Translate.

## Contact

Questions about this policy: open an issue at <https://github.com/iliyaking46/translate-chrome-extension/issues>.
